"""
Data Service
Handles all database operations for AI training and prediction
"""

import os
from typing import Dict, List, Any, Optional
from datetime import datetime
import logging
from supabase import create_client, Client

logger = logging.getLogger(__name__)


class DataService:
    """Service for fetching and managing training data from Supabase"""
    
    def __init__(self):
        supabase_url = os.getenv('SUPABASE_URL') or os.getenv('VITE_SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_KEY') or os.getenv('VITE_SUPABASE_ANON_KEY')
        
        if not supabase_url or not supabase_key:
            logger.warning("Supabase credentials not found. Using mock data.")
            self.supabase = None
        else:
            self.supabase = create_client(supabase_url, supabase_key)
    
    async def fetch_training_data(
        self, 
        model_type: str,
        user_id: Optional[str] = None
    ) -> List[Dict]:
        """Fetch training data for a specific model type"""
        
        if not self.supabase:
            return self._get_mock_data(model_type)
        
        try:
            if model_type == 'scheduling':
                return await self._fetch_scheduling_data(user_id)
            elif model_type == 'recommendation':
                return await self._fetch_recommendation_data(user_id)
            elif model_type == 'performance':
                return await self._fetch_performance_data(user_id)
            else:
                raise ValueError(f"Unknown model type: {model_type}")
        
        except Exception as e:
            logger.error(f"Error fetching training data: {e}")
            return self._get_mock_data(model_type)
    
    async def _fetch_scheduling_data(self, user_id: Optional[str] = None) -> List[Dict]:
        """Fetch data for scheduling model"""
        query = self.supabase.table('study_sessions').select(
            'user_id, course_id, method_used, duration_seconds, completed, started_at, tab_switch_count'
        ).order('started_at', desc=True).limit(2000)
        
        if user_id:
            query = query.eq('user_id', user_id)
        
        response = query.execute()
        return response.data or []
    
    async def _fetch_recommendation_data(self, user_id: Optional[str] = None) -> List[Dict]:
        """Fetch data for recommendation model"""
        query = self.supabase.table('study_sessions').select(
            'user_id, course_id, completed'
        ).order('started_at', desc=True).limit(5000)
        
        response = query.execute()
        return response.data or []
    
    async def _fetch_performance_data(self, user_id: Optional[str] = None) -> List[Dict]:
        """Fetch data for performance model"""
        # Get study sessions
        sessions_query = self.supabase.table('study_sessions').select(
            'user_id, course_id, method_used, duration_seconds, completed, started_at, tab_switch_count'
        ).order('started_at', desc=True).limit(2000)
        
        if user_id:
            sessions_query = sessions_query.eq('user_id', user_id)
        
        sessions_response = sessions_query.execute()
        
        # Get quiz submissions
        quiz_query = self.supabase.table('quiz_submissions').select(
            'user_id, quiz_id, score, passed'
        ).limit(1000)
        
        if user_id:
            quiz_query = quiz_query.eq('user_id', user_id)
        
        quiz_response = quiz_query.execute()
        
        # Combine data
        data = sessions_response.data or []
        
        # Add quiz scores to user data
        quiz_scores = {}
        for quiz in (quiz_response.data or []):
            uid = quiz.get('user_id')
            if uid not in quiz_scores:
                quiz_scores[uid] = []
            quiz_scores[uid].append(quiz.get('score', 0))
        
        for record in data:
            uid = record.get('user_id')
            if uid in quiz_scores:
                record['avg_quiz_score'] = sum(quiz_scores[uid]) / len(quiz_scores[uid])
        
        return data
    
    async def get_user_study_history(self, user_id: str) -> List[Dict]:
        """Get study history for a specific user"""
        if not self.supabase:
            return []
        
        try:
            response = self.supabase.table('study_sessions').select(
                '*'
            ).eq('user_id', user_id).order('started_at', desc=True).limit(100).execute()
            
            return response.data or []
        except Exception as e:
            logger.error(f"Error fetching user history: {e}")
            return []
    
    async def get_user_profile_and_history(self, user_id: str) -> Dict:
        """Get user profile and learning history"""
        if not self.supabase:
            return {'id': user_id, 'preferences': {}}
        
        try:
            # Get profile
            profile = self.supabase.table('profiles').select('*').eq('id', user_id).single().execute()
            
            # Get AI preferences
            prefs = self.supabase.table('ai_preferences').select('*').eq('user_id', user_id).single().execute()
            
            # Get completed courses
            enrollments = self.supabase.table('enrollments').select(
                'course_id, status'
            ).eq('user_id', user_id).execute()
            
            completed_courses = [
                e['course_id'] for e in (enrollments.data or [])
                if e.get('status') == 'completed'
            ]
            
            enrolled_courses = [
                e['course_id'] for e in (enrollments.data or [])
            ]
            
            return {
                'id': user_id,
                'profile': profile.data if profile.data else {},
                'preferences': prefs.data if prefs.data else {},
                'completed_courses': completed_courses,
                'enrolled_courses': enrolled_courses
            }
        
        except Exception as e:
            logger.error(f"Error fetching user profile: {e}")
            return {'id': user_id, 'preferences': {}}
    
    async def get_available_courses(self, user_id: str) -> List[Dict]:
        """Get courses available for recommendation"""
        if not self.supabase:
            return []
        
        try:
            response = self.supabase.table('courses').select(
                'id, title, description, category, difficulty, thumbnail_url'
            ).eq('published', True).limit(100).execute()
            
            return response.data or []
        except Exception as e:
            logger.error(f"Error fetching courses: {e}")
            return []
    
    async def get_course_statistics(self, course_id: str) -> Dict:
        """Get statistics for a specific course"""
        if not self.supabase:
            return {}
        
        try:
            # Get enrollments count
            enrollments = self.supabase.table('enrollments').select(
                'id, status'
            ).eq('course_id', course_id).execute()
            
            total = len(enrollments.data or [])
            completed = sum(1 for e in (enrollments.data or []) if e.get('status') == 'completed')
            
            return {
                'course_id': course_id,
                'total_enrollments': total,
                'completions': completed,
                'completion_rate': completed / total if total > 0 else 0
            }
        except Exception as e:
            logger.error(f"Error fetching course stats: {e}")
            return {}
    
    async def save_model_metrics(
        self, 
        model_type: str, 
        metrics: Dict[str, float],
        training_samples: int
    ):
        """Save model training metrics to database"""
        if not self.supabase:
            logger.info(f"Mock: Saving metrics for {model_type}")
            return
        
        try:
            # Upsert metrics
            self.supabase.table('ai_model_metrics').upsert({
                'model_type': model_type,
                'metrics': metrics,
                'training_samples': training_samples,
                'trained_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat()
            }, on_conflict='model_type').execute()
            
            logger.info(f"Saved metrics for {model_type}")
        except Exception as e:
            logger.error(f"Error saving metrics: {e}")
    
    async def get_model_metrics(self, model_type: str) -> Dict:
        """Get metrics for a specific model"""
        if not self.supabase:
            return {}
        
        try:
            response = self.supabase.table('ai_model_metrics').select(
                '*'
            ).eq('model_type', model_type).single().execute()
            
            return response.data or {}
        except Exception as e:
            logger.error(f"Error fetching metrics: {e}")
            return {}
    
    async def get_all_model_metrics(self) -> List[Dict]:
        """Get metrics for all models"""
        if not self.supabase:
            return []
        
        try:
            response = self.supabase.table('ai_model_metrics').select(
                '*'
            ).order('trained_at', desc=True).execute()
            
            return response.data or []
        except Exception as e:
            logger.error(f"Error fetching all metrics: {e}")
            return []
    
    async def get_training_data_statistics(self) -> Dict:
        """Get statistics about available training data"""
        stats = {
            'study_sessions': 0,
            'quiz_submissions': 0,
            'user_progress': 0,
            'ai_preferences': 0,
            'pause_reasons': 0,
            'unique_users': 0,
            'unique_courses': 0
        }
        
        if not self.supabase:
            return stats
        
        try:
            # Count records in each table
            tables = ['study_sessions', 'quiz_submissions', 'user_progress', 'ai_preferences']
            
            for table in tables:
                try:
                    response = self.supabase.table(table).select('id', count='exact').execute()
                    stats[table] = response.count or 0
                except:
                    pass
            
            # Try pause_reasons
            try:
                response = self.supabase.table('pause_reasons').select('id', count='exact').execute()
                stats['pause_reasons'] = response.count or 0
            except:
                pass
            
            # Unique users
            try:
                response = self.supabase.table('study_sessions').select('user_id').execute()
                stats['unique_users'] = len(set(d.get('user_id') for d in (response.data or [])))
            except:
                pass
            
            # Unique courses
            try:
                response = self.supabase.table('courses').select('id', count='exact').execute()
                stats['unique_courses'] = response.count or 0
            except:
                pass
            
            return stats
        
        except Exception as e:
            logger.error(f"Error fetching data statistics: {e}")
            return stats
    
    async def analyze_user_behavior(self, user_id: str) -> Dict:
        """Analyze learning behavior for a user"""
        if not self.supabase:
            return {}
        
        try:
            # Get study sessions
            sessions = self.supabase.table('study_sessions').select(
                '*'
            ).eq('user_id', user_id).execute()
            
            data = sessions.data or []
            
            if not data:
                return {
                    'user_id': user_id,
                    'message': 'No study data available'
                }
            
            # Analyze patterns
            total_sessions = len(data)
            completed_sessions = sum(1 for d in data if d.get('completed'))
            total_duration = sum(d.get('duration_seconds', 0) for d in data)
            avg_tab_switches = sum(d.get('tab_switch_count', 0) for d in data) / total_sessions
            
            # Method distribution
            methods = {}
            for d in data:
                method = d.get('method_used', 'unknown')
                methods[method] = methods.get(method, 0) + 1
            
            # Hour distribution
            hours = {}
            for d in data:
                try:
                    hour = int(d.get('started_at', '')[11:13])
                    hours[hour] = hours.get(hour, 0) + 1
                except:
                    pass
            
            # Find peak hours
            peak_hours = sorted(hours.items(), key=lambda x: x[1], reverse=True)[:3]
            
            return {
                'user_id': user_id,
                'total_sessions': total_sessions,
                'completed_sessions': completed_sessions,
                'completion_rate': completed_sessions / total_sessions,
                'total_study_time_minutes': total_duration / 60,
                'avg_session_minutes': (total_duration / total_sessions) / 60,
                'avg_tab_switches': avg_tab_switches,
                'method_distribution': methods,
                'preferred_method': max(methods, key=methods.get) if methods else 'none',
                'peak_study_hours': [h[0] for h in peak_hours],
                'focus_score': max(0, 100 - avg_tab_switches * 10)
            }
        
        except Exception as e:
            logger.error(f"Error analyzing user behavior: {e}")
            return {'user_id': user_id, 'error': str(e)}
    
    def _get_mock_data(self, model_type: str) -> List[Dict]:
        """Generate mock data for testing without database"""
        import random
        from datetime import datetime, timedelta
        
        methods = ['pomodoro', 'flowtime', 'blitz', '52_17']
        data = []
        
        for i in range(500):
            user_id = f"mock-user-{i % 20}"
            course_id = f"mock-course-{i % 10}"
            method = random.choice(methods)
            hour = random.randint(6, 23)
            
            # Simulate patterns
            completed = random.random() < (0.7 if 8 <= hour <= 18 else 0.4)
            if method == 'pomodoro':
                completed = completed or random.random() < 0.2
            
            started_at = (datetime.now() - timedelta(days=random.randint(0, 30))).replace(
                hour=hour, minute=random.randint(0, 59)
            ).isoformat()
            
            data.append({
                'user_id': user_id,
                'course_id': course_id,
                'method_used': method,
                'duration_seconds': random.randint(900, 5400),
                'completed': completed,
                'started_at': started_at,
                'tab_switch_count': random.randint(0, 10) if not completed else random.randint(0, 3)
            })
        
        return data

