"""
Course Recommendation Model
Recommends courses based on user learning patterns and preferences
"""

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import joblib
import os
from typing import Dict, List, Any, Optional
import logging

logger = logging.getLogger(__name__)

MODEL_PATH = os.path.join(os.path.dirname(__file__), '../saved_models/recommendation_model.joblib')


class RecommendationModel:
    """
    Hybrid recommendation model combining:
    - Collaborative filtering (user behavior similarity)
    - Content-based filtering (course content similarity)
    - Learning style matching
    
    Features:
    - User's completed courses
    - User's quiz performance
    - User's preferred study methods
    - User's learning goals
    - Course categories and tags
    - Course completion rates
    """
    
    def __init__(self):
        self.user_profiles = {}
        self.course_profiles = {}
        self.tfidf = TfidfVectorizer(max_features=100)
        self.is_trained = False
    
    def train(self, data: List[Dict]) -> Dict[str, float]:
        """Train the recommendation model"""
        logger.info(f"Training recommendation model with {len(data)} samples...")
        
        # Build user profiles
        user_course_matrix = {}
        course_completions = {}
        
        for record in data:
            user_id = record.get('userId', record.get('user_id'))
            course_id = record.get('courseId', record.get('course_id'))
            completed = record.get('completed', False)
            
            if not user_id or not course_id:
                continue
            
            # Track user-course interactions
            if user_id not in user_course_matrix:
                user_course_matrix[user_id] = {}
            
            # Score: 1 for completion, 0.5 for incomplete, 0.2 for enrolled
            score = 1.0 if completed else 0.5
            user_course_matrix[user_id][course_id] = max(
                user_course_matrix[user_id].get(course_id, 0),
                score
            )
            
            # Track course completion rates
            if course_id not in course_completions:
                course_completions[course_id] = {'total': 0, 'completed': 0}
            course_completions[course_id]['total'] += 1
            if completed:
                course_completions[course_id]['completed'] += 1
        
        # Store for later use
        self.user_profiles = user_course_matrix
        self.course_profiles = course_completions
        
        # Calculate metrics (for recommendation, we use completion rate as proxy)
        total_users = len(user_course_matrix)
        total_courses = len(course_completions)
        
        # Average completion rate as accuracy proxy
        completion_rates = [
            v['completed'] / v['total'] 
            for v in course_completions.values() 
            if v['total'] > 0
        ]
        avg_completion = np.mean(completion_rates) if completion_rates else 0.5
        
        metrics = {
            'accuracy': avg_completion,
            'precision': avg_completion,
            'recall': len(course_completions) / max(len(data), 1),
            'f1Score': 2 * avg_completion * avg_completion / (avg_completion + avg_completion + 0.001),
        }
        
        logger.info(f"Training complete. Coverage: {total_users} users, {total_courses} courses")
        
        self.is_trained = True
        return metrics
    
    def recommend(
        self, 
        user_data: Dict[str, Any],
        courses: List[Dict],
        limit: int = 5
    ) -> List[Dict]:
        """Recommend courses for a user"""
        
        if not courses:
            return []
        
        user_id = user_data.get('id', user_data.get('user_id'))
        completed_courses = set(user_data.get('completed_courses', []))
        enrolled_courses = set(user_data.get('enrolled_courses', []))
        preferences = user_data.get('preferences', {})
        
        # Score each course
        course_scores = []
        
        for course in courses:
            course_id = course.get('id')
            
            # Skip already enrolled/completed courses
            if course_id in completed_courses or course_id in enrolled_courses:
                continue
            
            score = self._calculate_course_score(
                user_data=user_data,
                course=course,
                user_profiles=self.user_profiles,
                course_profiles=self.course_profiles
            )
            
            reason = self._generate_reason(
                user_data=user_data,
                course=course,
                score=score
            )
            
            course_scores.append({
                'course_id': course_id,
                'score': score,
                'reason': reason
            })
        
        # Sort by score and return top N
        course_scores.sort(key=lambda x: x['score'], reverse=True)
        return course_scores[:limit]
    
    def _calculate_course_score(
        self, 
        user_data: Dict,
        course: Dict,
        user_profiles: Dict,
        course_profiles: Dict
    ) -> float:
        """Calculate recommendation score for a course"""
        score = 0.0
        
        course_id = course.get('id')
        
        # 1. Course popularity (completion rate)
        if course_id in course_profiles:
            stats = course_profiles[course_id]
            if stats['total'] > 0:
                completion_rate = stats['completed'] / stats['total']
                score += completion_rate * 0.3  # 30% weight
        
        # 2. Difficulty matching
        user_level = user_data.get('preferences', {}).get('skill_level', 'beginner')
        course_level = course.get('difficulty', 'beginner')
        
        level_match = {
            ('beginner', 'beginner'): 1.0,
            ('beginner', 'intermediate'): 0.7,
            ('beginner', 'advanced'): 0.3,
            ('intermediate', 'beginner'): 0.6,
            ('intermediate', 'intermediate'): 1.0,
            ('intermediate', 'advanced'): 0.8,
            ('advanced', 'beginner'): 0.3,
            ('advanced', 'intermediate'): 0.7,
            ('advanced', 'advanced'): 1.0,
        }
        score += level_match.get((user_level, course_level), 0.5) * 0.2  # 20% weight
        
        # 3. Category preference
        user_interests = set(user_data.get('preferences', {}).get('interests', []))
        course_category = course.get('category', '')
        
        if course_category.lower() in [i.lower() for i in user_interests]:
            score += 0.3  # 30% weight
        
        # 4. Collaborative filtering (similar users liked this)
        similar_user_boost = self._calculate_collaborative_score(
            user_data=user_data,
            course_id=course_id,
            user_profiles=user_profiles
        )
        score += similar_user_boost * 0.2  # 20% weight
        
        return min(1.0, score)  # Cap at 1.0
    
    def _calculate_collaborative_score(
        self, 
        user_data: Dict,
        course_id: str,
        user_profiles: Dict
    ) -> float:
        """Calculate score based on similar users"""
        user_id = user_data.get('id', user_data.get('user_id'))
        
        if user_id not in user_profiles:
            return 0.5  # Default for new users
        
        user_courses = set(user_profiles[user_id].keys())
        
        # Find similar users (shared course completions)
        similar_scores = []
        
        for other_id, other_courses in user_profiles.items():
            if other_id == user_id:
                continue
            
            other_course_set = set(other_courses.keys())
            overlap = len(user_courses & other_course_set)
            
            if overlap > 0 and course_id in other_courses:
                similarity = overlap / len(user_courses | other_course_set)
                similar_scores.append(other_courses[course_id] * similarity)
        
        if similar_scores:
            return np.mean(similar_scores)
        
        return 0.5
    
    def _generate_reason(
        self, 
        user_data: Dict,
        course: Dict,
        score: float
    ) -> str:
        """Generate human-readable recommendation reason"""
        reasons = []
        
        course_title = course.get('title', 'This course')
        
        if score > 0.8:
            reasons.append(f"Highly recommended based on your learning patterns")
        elif score > 0.6:
            reasons.append(f"Good match for your skill level and interests")
        else:
            reasons.append(f"Explore new topics outside your usual areas")
        
        # Add specific reasons
        course_stats = self.course_profiles.get(course.get('id'), {})
        if course_stats.get('total', 0) > 10:
            completion_rate = course_stats['completed'] / course_stats['total'] * 100
            reasons.append(f"{completion_rate:.0f}% completion rate")
        
        return ". ".join(reasons)
    
    def save(self):
        """Save model to disk"""
        os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
        
        model_data = {
            'user_profiles': self.user_profiles,
            'course_profiles': self.course_profiles,
            'is_trained': self.is_trained
        }
        
        joblib.dump(model_data, MODEL_PATH)
        logger.info(f"Recommendation model saved to {MODEL_PATH}")
    
    @classmethod
    def load(cls) -> 'RecommendationModel':
        """Load model from disk"""
        instance = cls()
        
        try:
            if os.path.exists(MODEL_PATH):
                model_data = joblib.load(MODEL_PATH)
                instance.user_profiles = model_data.get('user_profiles', {})
                instance.course_profiles = model_data.get('course_profiles', {})
                instance.is_trained = model_data.get('is_trained', False)
                logger.info("Recommendation model loaded from disk")
            else:
                logger.warning("No saved model found")
        except Exception as e:
            logger.error(f"Error loading model: {e}")
        
        return instance

