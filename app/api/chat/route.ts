import { NextRequest } from "next/server";
import { createAzure } from "@ai-sdk/azure";
import { streamText, convertToModelMessages, UIMessage } from "ai";

export const maxDuration = 30;

const azureProvider = createAzure({
	apiKey: process.env.AZURE_API_KEY,
	resourceName: process.env.AZURE_RESOURCE_NAME,
});

export async function POST(request: NextRequest) {
	const { messages }: { messages: UIMessage[] } = await request.json();

	const result = streamText({
		model: azureProvider.chat("gpt-4"),
		messages: convertToModelMessages(messages),
		temperature: 0.7,
	});

	return result.toUIMessageStreamResponse();
}