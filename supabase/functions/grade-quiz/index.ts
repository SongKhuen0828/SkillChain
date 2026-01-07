import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { questionText, userAnswer, correctAnswer, maxPoints } = await req.json()
    
    // 获取 GROQ_API_KEY
    const apiKey = Deno.env.get('GROQ_API_KEY')
    if (!apiKey) {
      throw new Error('Missing GROQ_API_KEY secret')
    }

    const prompt = `
      You are an expert teacher grading a technical quiz.
      Question: "${questionText}"
      Correct Context: "${correctAnswer || 'Grade based on relevance'}"
      Student Answer: "${userAnswer}"
      
      Grade this answer on a scale of 0 to ${maxPoints}.
      Provide a helpful, constructive feedback message (max 2 sentences).
      
      CRITICAL: Return ONLY valid JSON. Do NOT use Markdown.
      Format: {"score": number, "feedback": "string"}
    `

    console.log("📤 Sending to Groq...");

    // 调用 Groq API
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile', // 免费且强大的模型
        messages: [
          { role: 'system', content: 'You are a JSON-only grading assistant.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1
      }),
    })

    const data = await response.json()

    if (data.error) {
      console.error("❌ Groq Error:", data.error)
      throw new Error(data.error.message || 'Error from Groq API')
    }

    // 清洗和解析
    let rawText = data.choices?.[0]?.message?.content || "{}"
    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim()

    const result = JSON.parse(rawText)
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error("🔥 Function Failed:", error.message)
    return new Response(JSON.stringify({ 
      score: 0, 
      feedback: `System Error: ${error.message}` 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
