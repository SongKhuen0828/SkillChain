import os
import json
import re
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client
from dotenv import load_dotenv
import google.generativeai as genai

# 1. 加载环境变量
load_dotenv()

app = FastAPI(
    title="SkillChain AI Engine",
    version="1.0.0",
    description="AI-powered study schedule generation service for SkillChain",
)

# === CORS 配置 (允许前端访问) ===
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:5173"],  # 允许的前端地址
    allow_credentials=True,
    allow_methods=["*"],  # 允许所有方法 (POST, GET...)
    allow_headers=["*"],  # 允许所有 Header
)
# =======================================

# 2. 初始化 Supabase
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

# 3. 初始化 Google Gemini
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
    model = genai.GenerativeModel('gemini-2.5-flash')
else:
    model = None
    print("⚠️ Warning: GOOGLE_API_KEY not set. Gemini features will be disabled.")

# 请求模型
class AIRequest(BaseModel):
    user_id: str

# 辅助函数：清理 Gemini 返回的 Markdown 格式 (有时候它会包在 ```json ... ``` 里)
def clean_json_string(json_str):
    if "```json" in json_str:
        json_str = json_str.replace("```json", "").replace("```", "")
    elif "```" in json_str:
        json_str = json_str.replace("```", "")
    return json_str.strip()

@app.post("/api/ai/analyze")
async def analyze_learning_habits(request: AIRequest):
    print(f"🧠 AI Brain: Analyzing user {request.user_id} using Gemini...")

    if not model:
        return {
            "recommended_mode": "pomodoro",
            "reason": "AI 服务未配置，建议使用标准番茄钟模式。",
            "confidence": 0.5
        }

    try:
        # Step A: 从 Supabase 获取最近 7 天日志
        response = supabase.table('study_logs')\
            .select('*')\
            .eq('user_id', request.user_id)\
            .order('session_start', desc=True)\
            .limit(5)\
            .execute()
        
        logs = response.data
        
        # 如果是新用户（没数据），返回默认值
        if not logs:
            return {
                "recommended_mode": "pomodoro",
                "reason": "欢迎！作为新用户，Gemini 建议你从番茄钟开始，建立良好的学习节奏。",
                "confidence": 1.0
            }

        # Step B: 构建 Prompt 给 Gemini
        # 我们把日志转换成字符串喂给 AI
        logs_summary = json.dumps(logs, default=str)
        
        prompt = f"""
        你是一个专业的教育心理学家。请分析以下用户的最近学习日志，并推荐一个时间管理模式。
        
        用户日志数据:
        {logs_summary}
        
        可选模式:
        1. 'pomodoro' (番茄钟): 适合分心多、切屏频繁、时长短的用户。
        2. 'flow' (心流): 适合专注度高、切屏少、时长长的用户。
        3. 'sprint' (冲刺): 适合碎片化时间学习的用户。
        
        要求:
        - 分析用户的 distractions (切屏次数) 和 duration (时长)。
        - 必须返回纯 JSON 格式。
        - JSON 字段必须包含: "recommended_mode", "reason" (简短的一句话建议), "confidence" (0.0-1.0).
        - 不要返回任何其他文字，只返回 JSON。
        """

        # Step C: 调用 Gemini
        ai_response = model.generate_content(prompt)
        response_text = ai_response.text
        
        print(f"🤖 Gemini Raw Response: {response_text}")

        # Step D: 解析 JSON
        cleaned_json = clean_json_string(response_text)
        result = json.loads(cleaned_json)

        # Step E: 存回 Supabase (更新用户档案)
        supabase.table('user_ai_profiles')\
            .update({
                'recommended_mode': result['recommended_mode'],
                'ai_insights': result['reason']
            })\
            .eq('user_id', request.user_id)\
            .execute()

        return result

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        # 降级策略：如果 AI 挂了，返回规则引擎的结果
        return {
            "recommended_mode": "pomodoro",
            "reason": "AI 服务暂时繁忙，建议使用标准番茄钟模式。",
            "confidence": 0.5
        }

@app.get("/")
async def root():
    """Root endpoint - API health check"""
    return {
        "service": "SkillChain AI Engine",
        "version": "1.0.0",
        "status": "running",
        "gemini_enabled": bool(GOOGLE_API_KEY),
    }

@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    from datetime import datetime
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat() + "Z"}

# 启动命令: uvicorn main:app --reload
