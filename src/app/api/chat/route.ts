import { NextRequest } from 'next/server';
import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set in server environment');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_BASE = `You are AuraXPro AI — a helpful, professional assistant.

You answer questions about AuraXPro's services, stack, process, and general dev topics.

If the user asks about AuraXPro, prioritize the knowledge provided as truth.

Be concise. Provide steps or examples when useful.`;

export async function POST(req: NextRequest) {
  try {
    const { messages, kbContext } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Messages array is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Limit messages to last 50 for context efficiency
    const recentMessages = messages.slice(-50);
    
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      stream: true,
      messages: [
        { role: 'system', content: SYSTEM_BASE + (kbContext ? `\n\n=== AuraXPro Knowledge ===\n${kbContext}\n==========================` : '') },
        ...recentMessages.map((msg: any) => ({ role: msg.role, content: msg.content }))
      ]
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const part of stream) {
            const token = part.choices?.[0]?.delta?.content || '';
            if (token) {
              controller.enqueue(encoder.encode(token));
            }
          }
        } catch (error) {
          controller.error(error);
        } finally {
          controller.close();
        }
      }
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store'
      }
    });
  } catch (error: any) {
    console.error('OpenAI API Error:', error);
    
    // Handle specific OpenAI errors
    let errorMessage = 'Failed to get response';
    let statusCode = 500;

    if (error.status === 429) {
      if (error.code === 'insufficient_quota') {
        errorMessage = 'API quota exceeded. Please check your OpenAI billing.';
        statusCode = 429;
      } else {
        errorMessage = 'Rate limit exceeded. Please try again later.';
        statusCode = 429;
      }
    } else if (error.status === 401) {
      errorMessage = 'Invalid API key. Please check your server configuration.';
      statusCode = 401;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

