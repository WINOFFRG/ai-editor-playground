import { NextRequest, NextResponse } from "next/server";
import { createAzure } from "@ai-sdk/azure";
import { streamText, convertToModelMessages, UIMessage } from "ai";
import { isAuthenticated } from "@/lib/auth";

export const maxDuration = 30;

const azureProvider = createAzure({
  apiKey: process.env.AZURE_API_KEY,
  resourceName: process.env.AZURE_RESOURCE_NAME,
});

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json(
      {
        error: "Authentication required",
        message: "Please authenticate to use AI features",
        code: "AUTH_REQUIRED",
      },
      { status: 401 }
    );
  }

  try {
    const { messages }: { messages: UIMessage[] } = await request.json();

    const result = streamText({
      model: azureProvider.chat("o4-mini"),
      messages: convertToModelMessages(messages),
      temperature: 0.7,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      {
        error: "AI service unavailable",
        message: "Failed to process your request. Please try again.",
        code: "AI_ERROR",
      },
      { status: 500 }
    );
  }
}
