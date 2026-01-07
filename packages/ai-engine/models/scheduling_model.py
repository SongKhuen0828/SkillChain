"""
Scheduling Model
Predicts optimal study methods and times based on user behavior
"""

import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import joblib
import os
from typing import Dict, List, Any, Optional
import logging

logger = logging.getLogger(__name__)

MODEL_PATH = os.path.join(os.path.dirname(__file__), '../saved_models/scheduling_model.joblib')
SCALER_PATH = os.path.join(os.path.dirname(__file__), '../saved_models/scheduling_scaler.joblib')
ENCODER_PATH = os.path.join(os.path.dirname(__file__), '../saved_models/scheduling_encoder.joblib')


class SchedulingModel:
    """
    Neural network model for predicting optimal study method and time
    
    Features:
    - Hour of day (0-23)
    - Day of week (0-6)
    - User's historical completion rate
    - Average session duration
    - Tab switch frequency
    - Previous method success rate
    
    Output:
    - Recommended study method
    - Confidence score
    """
    
    METHODS = ['pomodoro', 'flowtime', 'blitz', '52_17']
    
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.label_encoder = LabelEncoder()
        self.label_encoder.fit(self.METHODS)
        self.is_trained = False
    
    def prepare_features(self, data: List[Dict]) -> np.ndarray:
        """Convert raw data to feature matrix"""
        features = []
        
        for record in data:
            started_at = record.get('started_at', '')
            
            # Parse hour from timestamp
            if isinstance(started_at, str) and started_at:
                try:
                    hour = int(started_at[11:13]) if len(started_at) > 13 else 12
                except:
                    hour = 12
            else:
                hour = 12
            
            # Get day of week (0 = Monday)
            try:
                from datetime import datetime
                dt = datetime.fromisoformat(started_at.replace('Z', '+00:00'))
                day_of_week = dt.weekday()
            except:
                day_of_week = 0
            
            # Feature vector
            feature = [
                hour / 24.0,  # Normalized hour
                day_of_week / 7.0,  # Normalized day
                self.METHODS.index(record.get('method_used', 'pomodoro')) / 4.0,  # Method encoding
                record.get('duration_seconds', 1500) / 7200.0,  # Normalized duration (max 2 hours)
                record.get('tab_switch_count', 0) / 20.0,  # Normalized tab switches
                1.0 if record.get('completed', False) else 0.0,  # Completion flag
            ]
            features.append(feature)
        
        return np.array(features)
    
    def prepare_labels(self, data: List[Dict]) -> np.ndarray:
        """Convert raw data to labels (method that led to completion)"""
        labels = []
        
        for record in data:
            method = record.get('method_used', 'pomodoro')
            if method not in self.METHODS:
                method = 'pomodoro'
            labels.append(method)
        
        return self.label_encoder.transform(labels)
    
    def train(self, data: List[Dict]) -> Dict[str, float]:
        """Train the scheduling model"""
        logger.info(f"Training scheduling model with {len(data)} samples...")
        
        # Prepare data
        X = self.prepare_features(data)
        y = self.prepare_labels(data)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Train Random Forest (good for this type of classification)
        self.model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            min_samples_split=5,
            random_state=42
        )
        self.model.fit(X_train_scaled, y_train)
        
        # Evaluate
        y_pred = self.model.predict(X_test_scaled)
        
        metrics = {
            'accuracy': accuracy_score(y_test, y_pred),
            'precision': precision_score(y_test, y_pred, average='weighted', zero_division=0),
            'recall': recall_score(y_test, y_pred, average='weighted', zero_division=0),
            'f1Score': f1_score(y_test, y_pred, average='weighted', zero_division=0),
        }
        
        logger.info(f"Training complete. Metrics: {metrics}")
        
        self.is_trained = True
        return metrics
    
    def predict(
        self, 
        user_data: List[Dict],
        hour: Optional[int] = None,
        day_of_week: Optional[int] = None
    ) -> Dict[str, Any]:
        """Predict optimal study method for a user"""
        
        if not self.is_trained and not self.load():
            return self._default_prediction()
        
        # Calculate user statistics
        total_sessions = len(user_data)
        completed_sessions = sum(1 for d in user_data if d.get('completed', False))
        completion_rate = completed_sessions / total_sessions if total_sessions > 0 else 0.5
        
        # Method success rates
        method_success = {}
        for method in self.METHODS:
            method_sessions = [d for d in user_data if d.get('method_used') == method]
            if method_sessions:
                method_completed = sum(1 for d in method_sessions if d.get('completed', False))
                method_success[method] = method_completed / len(method_sessions)
            else:
                method_success[method] = 0.5
        
        # Current context
        from datetime import datetime
        now = datetime.now()
        current_hour = hour if hour is not None else now.hour
        current_day = day_of_week if day_of_week is not None else now.weekday()
        
        # Predict for each method at current time
        predictions = {}
        for method in self.METHODS:
            feature = np.array([[
                current_hour / 24.0,
                current_day / 7.0,
                self.METHODS.index(method) / 4.0,
                0.5,  # Average duration
                0.1,  # Low tab switches (optimal)
                completion_rate,
            ]])
            
            feature_scaled = self.scaler.transform(feature)
            prob = self.model.predict_proba(feature_scaled)[0]
            predictions[method] = float(np.max(prob))
        
        # Find best method
        best_method = max(predictions, key=predictions.get)
        confidence = predictions[best_method]
        
        # Find optimal hours (when completion rate is highest)
        optimal_hours = self._find_optimal_hours(user_data)
        
        # Generate reasoning
        reasoning = self._generate_reasoning(
            best_method, confidence, method_success, 
            current_hour, optimal_hours
        )
        
        return {
            'recommended_method': best_method,
            'confidence': confidence,
            'optimal_hours': optimal_hours,
            'reasoning': reasoning
        }
    
    def _find_optimal_hours(self, user_data: List[Dict]) -> List[int]:
        """Find hours with highest completion rates"""
        hour_stats = {}
        
        for record in user_data:
            try:
                started_at = record.get('started_at', '')
                hour = int(started_at[11:13]) if len(started_at) > 13 else 12
                
                if hour not in hour_stats:
                    hour_stats[hour] = {'total': 0, 'completed': 0}
                
                hour_stats[hour]['total'] += 1
                if record.get('completed', False):
                    hour_stats[hour]['completed'] += 1
            except:
                continue
        
        # Calculate completion rate per hour
        hour_rates = []
        for hour, stats in hour_stats.items():
            if stats['total'] >= 3:  # Minimum samples
                rate = stats['completed'] / stats['total']
                hour_rates.append((hour, rate))
        
        # Sort by rate and take top hours
        hour_rates.sort(key=lambda x: x[1], reverse=True)
        optimal = [h[0] for h in hour_rates[:6]] if hour_rates else [9, 10, 11, 14, 15, 16]
        
        return sorted(optimal)
    
    def _generate_reasoning(
        self, method: str, confidence: float, 
        method_success: Dict, current_hour: int, optimal_hours: List[int]
    ) -> str:
        """Generate human-readable reasoning"""
        
        time_quality = "optimal" if current_hour in optimal_hours else "suboptimal"
        success_rate = method_success.get(method, 0.5) * 100
        
        method_descriptions = {
            'pomodoro': "25-minute focused sessions with 5-minute breaks",
            'flowtime': "flexible sessions based on natural focus flow",
            'blitz': "short intense 15-minute sessions",
            '52_17': "52-minute work sessions with 17-minute breaks"
        }
        
        reasoning = f"Based on your study patterns, {method.upper()} ({method_descriptions[method]}) "
        reasoning += f"is recommended with {confidence*100:.0f}% confidence. "
        
        if time_quality == "optimal":
            reasoning += f"Current time ({current_hour}:00) is one of your optimal study hours. "
        else:
            reasoning += f"Consider studying during hours {optimal_hours[:3]} for better results. "
        
        reasoning += f"Your historical success rate with this method is {success_rate:.0f}%."
        
        return reasoning
    
    def _default_prediction(self) -> Dict[str, Any]:
        """Default prediction for new users or untrained model"""
        return {
            'recommended_method': 'pomodoro',
            'confidence': 0.5,
            'optimal_hours': [9, 10, 11, 14, 15, 16],
            'reasoning': "Starting with Pomodoro technique is recommended for new users. "
                        "25-minute sessions help build focus gradually."
        }
    
    def save(self):
        """Save model to disk"""
        os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
        
        joblib.dump(self.model, MODEL_PATH)
        joblib.dump(self.scaler, SCALER_PATH)
        joblib.dump(self.label_encoder, ENCODER_PATH)
        
        logger.info(f"Model saved to {MODEL_PATH}")
    
    @classmethod
    def load(cls) -> 'SchedulingModel':
        """Load model from disk"""
        instance = cls()
        
        try:
            if os.path.exists(MODEL_PATH):
                instance.model = joblib.load(MODEL_PATH)
                instance.scaler = joblib.load(SCALER_PATH)
                instance.label_encoder = joblib.load(ENCODER_PATH)
                instance.is_trained = True
                logger.info("Scheduling model loaded from disk")
            else:
                logger.warning("No saved model found")
        except Exception as e:
            logger.error(f"Error loading model: {e}")
        
        return instance

