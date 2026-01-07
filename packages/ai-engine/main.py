"""
SkillChain AI Training Service
FastAPI-based ML training and prediction service
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
from dotenv import load_dotenv
from datetime import datetime
import logging

# Import our ML modules
from models.scheduling_model import SchedulingModel
from models.recommendation_model import RecommendationModel
from models.performance_model import PerformanceModel
from services.data_service import DataService
from services.training_service import TrainingService

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="SkillChain AI Service",
    description="Machine Learning training and prediction service for SkillChain",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
data_service = DataService()
training_service = TrainingService()

# Request/Response Models
class TrainRequest(BaseModel):
    model_type: str  # 'scheduling' | 'recommendation' | 'performance'
    user_id: Optional[str] = None
    force_retrain: bool = False

class TrainResponse(BaseModel):
    success: bool
    model_type: str
    metrics: Dict[str, float]
    training_samples: int
    trained_at: str
    message: Optional[str] = None

class PredictScheduleRequest(BaseModel):
    user_id: str
    hour: Optional[int] = None
    day_of_week: Optional[int] = None

class PredictScheduleResponse(BaseModel):
    recommended_method: str
    confidence: float
    optimal_hours: List[int]
    reasoning: str

class RecommendCoursesRequest(BaseModel):
    user_id: str
    limit: int = 5

class CourseRecommendation(BaseModel):
    course_id: str
    score: float
    reason: str

class PredictPerformanceRequest(BaseModel):
    user_id: str
    course_id: str

class PerformancePredict(BaseModel):
    predicted_completion_rate: float
    predicted_quiz_score: float
    risk_level: str  # 'low' | 'medium' | 'high'
    recommendations: List[str]


# Health Check
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    }


# Training Endpoints
@app.post("/train", response_model=TrainResponse)
async def train_model(request: TrainRequest, background_tasks: BackgroundTasks):
    """Train a specific AI model"""
    try:
        logger.info(f"Training {request.model_type} model...")
        
        if request.model_type not in ['scheduling', 'recommendation', 'performance']:
            raise HTTPException(status_code=400, detail=f"Unknown model type: {request.model_type}")
        
        # Fetch training data
        training_data = await data_service.fetch_training_data(
            model_type=request.model_type,
            user_id=request.user_id
        )
        
        if len(training_data) < 50:
            return TrainResponse(
                success=False,
                model_type=request.model_type,
                metrics={},
                training_samples=len(training_data),
                trained_at=datetime.utcnow().isoformat(),
                message=f"Insufficient data: {len(training_data)} samples (minimum 50 required)"
            )
        
        # Train model
        result = await training_service.train(
            model_type=request.model_type,
            data=training_data,
            force_retrain=request.force_retrain
        )
        
        # Save metrics to database (in background)
        background_tasks.add_task(
            data_service.save_model_metrics,
            request.model_type,
            result['metrics'],
            len(training_data)
        )
        
        return TrainResponse(
            success=True,
            model_type=request.model_type,
            metrics=result['metrics'],
            training_samples=len(training_data),
            trained_at=datetime.utcnow().isoformat(),
            message="Model trained successfully"
        )
        
    except Exception as e:
        logger.error(f"Training error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/train/all")
async def train_all_models(background_tasks: BackgroundTasks):
    """Train all AI models"""
    results = {}
    
    for model_type in ['scheduling', 'recommendation', 'performance']:
        try:
            request = TrainRequest(model_type=model_type)
            result = await train_model(request, background_tasks)
            results[model_type] = result.dict()
        except Exception as e:
            results[model_type] = {
                "success": False,
                "error": str(e)
            }
    
    return {
        "results": results,
        "trained_at": datetime.utcnow().isoformat()
    }


# Prediction Endpoints
@app.post("/predict/schedule", response_model=PredictScheduleResponse)
async def predict_schedule(request: PredictScheduleRequest):
    """Predict optimal study schedule for a user"""
    try:
        # Get user's study history
        user_data = await data_service.get_user_study_history(request.user_id)
        
        if not user_data:
            # Return default recommendation for new users
            return PredictScheduleResponse(
                recommended_method="pomodoro",
                confidence=0.5,
                optimal_hours=[9, 10, 11, 14, 15, 16],
                reasoning="Default recommendation for new users. Start with Pomodoro technique during morning or afternoon."
            )
        
        # Load model and predict
        model = SchedulingModel.load()
        prediction = model.predict(
            user_data=user_data,
            hour=request.hour,
            day_of_week=request.day_of_week
        )
        
        return PredictScheduleResponse(**prediction)
        
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/courses", response_model=List[CourseRecommendation])
async def recommend_courses(request: RecommendCoursesRequest):
    """Recommend courses for a user"""
    try:
        # Get user profile and history
        user_data = await data_service.get_user_profile_and_history(request.user_id)
        available_courses = await data_service.get_available_courses(request.user_id)
        
        if not available_courses:
            return []
        
        # Load model and predict
        model = RecommendationModel.load()
        recommendations = model.recommend(
            user_data=user_data,
            courses=available_courses,
            limit=request.limit
        )
        
        return [CourseRecommendation(**r) for r in recommendations]
        
    except Exception as e:
        logger.error(f"Recommendation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/performance", response_model=PerformancePredict)
async def predict_performance(request: PredictPerformanceRequest):
    """Predict user's performance in a course"""
    try:
        # Get user and course data
        user_data = await data_service.get_user_study_history(request.user_id)
        course_data = await data_service.get_course_statistics(request.course_id)
        
        if not user_data:
            return PerformancePredict(
                predicted_completion_rate=0.5,
                predicted_quiz_score=65.0,
                risk_level="medium",
                recommendations=[
                    "Set a consistent study schedule",
                    "Start with shorter study sessions",
                    "Review material before quizzes"
                ]
            )
        
        # Load model and predict
        model = PerformanceModel.load()
        prediction = model.predict(
            user_data=user_data,
            course_data=course_data
        )
        
        return PerformancePredict(**prediction)
        
    except Exception as e:
        logger.error(f"Performance prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Model Status Endpoints
@app.get("/models/status")
async def get_models_status():
    """Get status of all trained models"""
    try:
        metrics = await data_service.get_all_model_metrics()
        return {
            "models": metrics,
            "last_updated": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error fetching model status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/models/{model_type}/metrics")
async def get_model_metrics(model_type: str):
    """Get metrics for a specific model"""
    try:
        if model_type not in ['scheduling', 'recommendation', 'performance']:
            raise HTTPException(status_code=400, detail=f"Unknown model type: {model_type}")
        
        metrics = await data_service.get_model_metrics(model_type)
        return metrics
    except Exception as e:
        logger.error(f"Error fetching metrics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Analytics Endpoints
@app.get("/analytics/training-data")
async def get_training_data_stats():
    """Get statistics about available training data"""
    try:
        stats = await data_service.get_training_data_statistics()
        return stats
    except Exception as e:
        logger.error(f"Error fetching stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/analytics/user/{user_id}/behavior")
async def get_user_behavior(user_id: str):
    """Get behavior analysis for a user"""
    try:
        behavior = await data_service.analyze_user_behavior(user_id)
        return behavior
    except Exception as e:
        logger.error(f"Error analyzing behavior: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )

