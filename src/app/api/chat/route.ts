import { NextRequest, NextResponse } from 'next/server';
import { sendMessage } from '@/lib/openaiServer';

export async function POST(req: NextRequest) {
  try {
    const { message, conversationHistory } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Validate conversation history format
    if (!Array.isArray(conversationHistory)) {
      return NextResponse.json(
        { error: 'Invalid conversation history' },
        { status: 400 }
      );
    }

    const response = await sendMessage(message, conversationHistory);

    return NextResponse.json({ response });
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

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}

