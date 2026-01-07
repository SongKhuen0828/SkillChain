"""
Performance Prediction Model
Predicts user's learning outcomes based on study behavior
"""

import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
import joblib
import os
from typing import Dict, List, Any
import logging

logger = logging.getLogger(__name__)

MODEL_PATH = os.path.join(os.path.dirname(__file__), '../saved_models/performance_model.joblib')
SCALER_PATH = os.path.join(os.path.dirname(__file__), '../saved_models/performance_scaler.joblib')


class PerformanceModel:
    """
    Gradient Boosting model for predicting learning performance
    
    Features:
    - Average session duration
    - Session completion rate
    - Tab switch frequency
    - Study consistency (variance in study times)
    - Preferred study method
    - Quiz attempt patterns
    
    Output:
    - Predicted completion rate
    - Predicted quiz score
    - Risk level
    - Personalized recommendations
    """
    
    def __init__(self):
        self.completion_model = None
        self.score_model = None
        self.scaler = StandardScaler()
        self.is_trained = False
    
    def prepare_features(self, data: List[Dict]) -> np.ndarray:
        """Convert raw data to feature matrix"""
        
        # Group by user for aggregate features
        user_stats = {}
        
        for record in data:
            user_id = record.get('userId', record.get('user_id'))
            if not user_id:
                continue
            
            if user_id not in user_stats:
                user_stats[user_id] = {
                    'sessions': [],
                    'durations': [],
                    'tab_switches': [],
                    'completed': [],
                    'methods': [],
                    'hours': []
                }
            
            stats = user_stats[user_id]
            stats['sessions'].append(record)
            stats['durations'].append(record.get('duration_seconds', record.get('duration', 1500)))
            stats['tab_switches'].append(record.get('tabSwitchCount', record.get('tab_switch_count', 0)))
            stats['completed'].append(1 if record.get('completed', False) else 0)
            stats['methods'].append(record.get('method', record.get('method_used', 'pomodoro')))
            
            # Extract hour from timestamp
            started_at = record.get('started_at', '')
            try:
                hour = int(started_at[11:13]) if len(started_at) > 13 else 12
            except:
                hour = 12
            stats['hours'].append(hour)
        
        # Convert to feature vectors
        features = []
        labels_completion = []
        labels_score = []
        
        for user_id, stats in user_stats.items():
            if len(stats['sessions']) < 3:
                continue
            
            # Aggregate features
            feature = [
                np.mean(stats['durations']) / 3600,  # Avg duration in hours
                np.std(stats['durations']) / 3600 if len(stats['durations']) > 1 else 0,  # Duration variance
                np.mean(stats['tab_switches']),  # Avg tab switches
                np.mean(stats['completed']),  # Historical completion rate
                len(set(stats['methods'])) / 4,  # Method diversity
                np.std(stats['hours']) if len(stats['hours']) > 1 else 0,  # Time consistency
                len(stats['sessions']) / 100,  # Total sessions (normalized)
                1 if 'pomodoro' in stats['methods'] else 0,  # Uses pomodoro
            ]
            
            features.append(feature)
            labels_completion.append(np.mean(stats['completed']))
            
            # Estimate score based on completion and focus
            avg_focus = 1 - (np.mean(stats['tab_switches']) / 10)
            estimated_score = (np.mean(stats['completed']) * 0.6 + avg_focus * 0.4) * 100
            labels_score.append(min(100, max(0, estimated_score)))
        
        return np.array(features), np.array(labels_completion), np.array(labels_score)
    
    def train(self, data: List[Dict]) -> Dict[str, float]:
        """Train the performance prediction model"""
        logger.info(f"Training performance model with {len(data)} samples...")
        
        # Prepare data
        X, y_completion, y_score = self.prepare_features(data)
        
        if len(X) < 10:
            logger.warning("Not enough aggregated user data")
            return {
                'accuracy': 0,
                'precision': 0,
                'recall': 0,
                'f1Score': 0
            }
        
        # Split data
        X_train, X_test, y_comp_train, y_comp_test = train_test_split(
            X, y_completion, test_size=0.2, random_state=42
        )
        _, _, y_score_train, y_score_test = train_test_split(
            X, y_score, test_size=0.2, random_state=42
        )
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Train completion rate predictor
        self.completion_model = GradientBoostingRegressor(
            n_estimators=100,
            max_depth=5,
            learning_rate=0.1,
            random_state=42
        )
        self.completion_model.fit(X_train_scaled, y_comp_train)
        
        # Train score predictor
        self.score_model = GradientBoostingRegressor(
            n_estimators=100,
            max_depth=5,
            learning_rate=0.1,
            random_state=42
        )
        self.score_model.fit(X_train_scaled, y_score_train)
        
        # Evaluate
        y_comp_pred = self.completion_model.predict(X_test_scaled)
        y_score_pred = self.score_model.predict(X_test_scaled)
        
        # Calculate metrics
        completion_mae = mean_absolute_error(y_comp_test, y_comp_pred)
        score_mae = mean_absolute_error(y_score_test, y_score_pred)
        r2 = r2_score(y_comp_test, y_comp_pred)
        
        # Convert to classification-like metrics for consistency
        # "Accuracy" = 1 - normalized MAE
        accuracy = 1 - (completion_mae / (max(y_comp_test) - min(y_comp_test) + 0.001))
        
        metrics = {
            'accuracy': max(0, min(1, accuracy)),
            'precision': max(0, min(1, r2)),
            'recall': max(0, 1 - (score_mae / 100)),
            'f1Score': max(0, min(1, (2 * accuracy * r2) / (accuracy + r2 + 0.001))),
        }
        
        logger.info(f"Training complete. Metrics: {metrics}")
        
        self.is_trained = True
        return metrics
    
    def predict(
        self, 
        user_data: List[Dict],
        course_data: Dict
    ) -> Dict[str, Any]:
        """Predict performance for a user in a course"""
        
        if not self.is_trained and not self._load_model():
            return self._default_prediction()
        
        # Calculate user features
        if not user_data:
            return self._default_prediction()
        
        durations = [d.get('duration_seconds', d.get('duration', 1500)) for d in user_data]
        tab_switches = [d.get('tabSwitchCount', d.get('tab_switch_count', 0)) for d in user_data]
        completed = [1 if d.get('completed', False) else 0 for d in user_data]
        methods = [d.get('method', d.get('method_used', 'pomodoro')) for d in user_data]
        
        hours = []
        for d in user_data:
            started_at = d.get('started_at', '')
            try:
                hour = int(started_at[11:13]) if len(started_at) > 13 else 12
            except:
                hour = 12
            hours.append(hour)
        
        # Create feature vector
        feature = np.array([[
            np.mean(durations) / 3600,
            np.std(durations) / 3600 if len(durations) > 1 else 0,
            np.mean(tab_switches),
            np.mean(completed),
            len(set(methods)) / 4,
            np.std(hours) if len(hours) > 1 else 0,
            len(user_data) / 100,
            1 if 'pomodoro' in methods else 0,
        ]])
        
        feature_scaled = self.scaler.transform(feature)
        
        # Predict
        completion_rate = float(self.completion_model.predict(feature_scaled)[0])
        quiz_score = float(self.score_model.predict(feature_scaled)[0])
        
        # Clamp values
        completion_rate = max(0, min(1, completion_rate))
        quiz_score = max(0, min(100, quiz_score))
        
        # Determine risk level
        risk_level = self._calculate_risk_level(completion_rate, quiz_score, tab_switches)
        
        # Generate recommendations
        recommendations = self._generate_recommendations(
            completion_rate=completion_rate,
            quiz_score=quiz_score,
            tab_switches=np.mean(tab_switches),
            methods=methods,
            user_data=user_data
        )
        
        return {
            'predicted_completion_rate': completion_rate,
            'predicted_quiz_score': quiz_score,
            'risk_level': risk_level,
            'recommendations': recommendations
        }
    
    def _calculate_risk_level(
        self, 
        completion_rate: float,
        quiz_score: float,
        tab_switches: List
    ) -> str:
        """Calculate risk level based on predictions"""
        
        risk_score = 0
        
        if completion_rate < 0.5:
            risk_score += 2
        elif completion_rate < 0.7:
            risk_score += 1
        
        if quiz_score < 60:
            risk_score += 2
        elif quiz_score < 75:
            risk_score += 1
        
        avg_switches = np.mean(tab_switches)
        if avg_switches > 5:
            risk_score += 1
        
        if risk_score >= 4:
            return 'high'
        elif risk_score >= 2:
            return 'medium'
        else:
            return 'low'
    
    def _generate_recommendations(
        self,
        completion_rate: float,
        quiz_score: float,
        tab_switches: float,
        methods: List[str],
        user_data: List[Dict]
    ) -> List[str]:
        """Generate personalized recommendations"""
        
        recommendations = []
        
        if completion_rate < 0.6:
            recommendations.append("Try shorter study sessions to improve completion rate")
            recommendations.append("Set specific goals before each study session")
        
        if quiz_score < 70:
            recommendations.append("Review material before taking quizzes")
            recommendations.append("Take notes during video lessons")
        
        if tab_switches > 5:
            recommendations.append("Minimize distractions by closing unnecessary tabs")
            recommendations.append("Use website blockers during study sessions")
        
        if 'pomodoro' not in methods:
            recommendations.append("Try the Pomodoro technique for better focus")
        
        # Add time-based recommendations
        if len(user_data) >= 5:
            hours = []
            for d in user_data:
                started_at = d.get('started_at', '')
                try:
                    hours.append(int(started_at[11:13]))
                except:
                    pass
            
            if hours:
                avg_hour = np.mean(hours)
                if avg_hour < 8 or avg_hour > 22:
                    recommendations.append("Consider studying during daytime hours for better retention")
        
        # Ensure we have at least some recommendations
        if not recommendations:
            recommendations.append("Keep up the good work!")
            recommendations.append("Try challenging yourself with advanced courses")
        
        return recommendations[:5]  # Max 5 recommendations
    
    def _default_prediction(self) -> Dict[str, Any]:
        """Default prediction for new users"""
        return {
            'predicted_completion_rate': 0.5,
            'predicted_quiz_score': 65.0,
            'risk_level': 'medium',
            'recommendations': [
                "Set a consistent study schedule",
                "Start with shorter study sessions",
                "Review material before quizzes",
                "Minimize distractions during study"
            ]
        }
    
    def _load_model(self) -> bool:
        """Try to load model from disk"""
        try:
            if os.path.exists(MODEL_PATH):
                model_data = joblib.load(MODEL_PATH)
                self.completion_model = model_data['completion_model']
                self.score_model = model_data['score_model']
                self.scaler = model_data['scaler']
                self.is_trained = True
                return True
        except Exception as e:
            logger.error(f"Error loading model: {e}")
        return False
    
    def save(self):
        """Save model to disk"""
        os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
        
        model_data = {
            'completion_model': self.completion_model,
            'score_model': self.score_model,
            'scaler': self.scaler,
        }
        
        joblib.dump(model_data, MODEL_PATH)
        logger.info(f"Performance model saved to {MODEL_PATH}")
    
    @classmethod
    def load(cls) -> 'PerformanceModel':
        """Load model from disk"""
        instance = cls()
        instance._load_model()
        return instance

