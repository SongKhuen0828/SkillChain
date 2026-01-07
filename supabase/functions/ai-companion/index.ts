import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { prompt, context, type, data: requestData } = await req.json()
    
    // Get Groq API Key from environment
    const apiKey = Deno.env.get('GROQ_API_KEY')
    if (!apiKey) {
      throw new Error('Missing GROQ_API_KEY secret')
    }

    // Handle course recommendation type
    if (type === 'course_recommendation' && requestData) {
      const { goal, skill, proficiency, availableCourses } = requestData;
      
      const systemPrompt = `You are an AI Study Companion for SkillChain. 
Generate personalized course recommendations based on user goals and skills.
Keep responses concise (1 sentence), friendly, and specific.`;

      const userPrompt = `Based on the user's goal to "${goal}" and their ${proficiency}% proficiency in "${skill}", 
recommend a course from this list: ${availableCourses.map((c: any) => c.title).join(', ')}.
Format: "Based on your goal to [goal] and your ${proficiency}% proficiency in [skill], I suggest [Course Name]."`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 100,
        }),
      });

      const groqData = await response.json();
      if (groqData.error) {
        throw new Error(groqData.error.message || 'Error from Groq API');
      }

      const recommendation = groqData.choices?.[0]?.message?.content || 
        `Based on your goal to ${goal}, I suggest exploring our recommended courses.`;

      return new Response(JSON.stringify({ recommendation, message: recommendation }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Default behavior (existing prompt/context handling)
    // Prepare system prompt
    const systemPrompt = `You are an AI Study Companion for SkillChain, an adaptive learning platform. 
Your role is to motivate students, explain study recommendations, and provide encouraging feedback.
Keep responses concise (1-2 sentences), friendly, and actionable.`

    console.log("📤 Sending to Groq AI Companion...")

    // Call Groq API
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${prompt}\n\nContext: ${JSON.stringify(context)}` }
        ],
        temperature: 0.7,
        max_tokens: 150,
      }),
    })

    const groqResponse = await response.json()

    if (groqResponse.error) {
      console.error("❌ Groq Error:", groqResponse.error)
      throw new Error(groqResponse.error.message || 'Error from Groq API')
    }

    // Extract response
    const aiResponse = groqResponse.choices?.[0]?.message?.content || "I'm here to help you learn!"

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error("🔥 Function Failed:", error.message)
    return new Response(JSON.stringify({ 
      response: "I'm ready to help you achieve your learning goals!",
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

