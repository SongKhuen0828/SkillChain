# Grade Quiz Edge Function

This Supabase Edge Function provides AI-powered auto-grading for essay quiz questions using OpenAI's GPT models.

## Setup

1. **Set OpenAI API Key**: 
   ```bash
   supabase secrets set OPENAI_API_KEY=your_openai_api_key_here
   ```

2. **Deploy the function**:
   ```bash
   supabase functions deploy grade-quiz
   ```

## Usage

Send a POST request to the function endpoint:

```typescript
const response = await fetch('https://your-project.supabase.co/functions/v1/grade-quiz', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${supabaseAnonKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    questionText: 'Explain the concept of blockchain.',
    userAnswer: 'Blockchain is a distributed ledger technology...',
    correctAnswer: 'Blockchain is a decentralized digital ledger...',
    maxPoints: 10,
  }),
})

const result = await response.json()
// { score: 8, feedback: "Good understanding but missing some key details." }
```

## Request Body

- `questionText` (string, required): The quiz question text
- `userAnswer` (string, required): The student's answer
- `correctAnswer` (string, required): The correct answer or context for comparison
- `maxPoints` (number, required): Maximum points for this question

## Response

- `score` (number): The awarded score (0 to maxPoints)
- `feedback` (string): AI-generated feedback explaining the score

## Error Handling

The function returns appropriate HTTP status codes:
- `400`: Missing required fields
- `500`: Server error (OpenAI API error, parsing error, etc.)

