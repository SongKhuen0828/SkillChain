"""
Training Service
Orchestrates model training and management
"""

import os
from typing import Dict, List, Any
import logging
from datetime import datetime

from models.scheduling_model import SchedulingModel
from models.recommendation_model import RecommendationModel
from models.performance_model import PerformanceModel

logger = logging.getLogger(__name__)


class TrainingService:
    """Service for training and managing AI models"""
    
    def __init__(self):
        self.models = {
            'scheduling': SchedulingModel(),
            'recommendation': RecommendationModel(),
            'performance': PerformanceModel()
        }
    
    async def train(
        self, 
        model_type: str, 
        data: List[Dict],
        force_retrain: bool = False
    ) -> Dict[str, Any]:
        """Train a specific model"""
        
        if model_type not in self.models:
            raise ValueError(f"Unknown model type: {model_type}")
        
        model = self.models[model_type]
        
        logger.info(f"Training {model_type} model with {len(data)} samples...")
        
        # Train the model
        metrics = model.train(data)
        
        # Save the model
        try:
            model.save()
            logger.info(f"Model {model_type} saved successfully")
        except Exception as e:
            logger.warning(f"Failed to save model {model_type}: {e}")
        
        return {
            'model_type': model_type,
            'metrics': metrics,
            'trained_at': datetime.utcnow().isoformat(),
            'samples': len(data)
        }
    
    async def train_all(
        self, 
        data: Dict[str, List[Dict]],
        force_retrain: bool = False
    ) -> Dict[str, Any]:
        """Train all models"""
        
        results = {}
        
        for model_type in self.models.keys():
            model_data = data.get(model_type, data.get('all', []))
            
            if not model_data:
                results[model_type] = {
                    'success': False,
                    'error': 'No training data provided'
                }
                continue
            
            try:
                result = await self.train(model_type, model_data, force_retrain)
                results[model_type] = {
                    'success': True,
                    **result
                }
            except Exception as e:
                logger.error(f"Error training {model_type}: {e}")
                results[model_type] = {
                    'success': False,
                    'error': str(e)
                }
        
        return results
    
    def get_model(self, model_type: str):
        """Get a specific model instance"""
        if model_type not in self.models:
            raise ValueError(f"Unknown model type: {model_type}")
        return self.models[model_type]
    
    def load_all_models(self):
        """Load all saved models from disk"""
        for model_type, model in self.models.items():
            try:
                loaded = model.__class__.load()
                if loaded.is_trained:
                    self.models[model_type] = loaded
                    logger.info(f"Loaded {model_type} model from disk")
            except Exception as e:
                logger.warning(f"Could not load {model_type} model: {e}")
    
    def get_model_status(self) -> Dict[str, Dict]:
        """Get status of all models"""
        status = {}
        
        for model_type, model in self.models.items():
            status[model_type] = {
                'is_trained': model.is_trained,
                'model_class': model.__class__.__name__
            }
        
        return status

