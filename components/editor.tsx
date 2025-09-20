"use client";

import { useMachine } from "@xstate/react";
import { useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, XCircle } from "lucide-react";
import { ProseMirrorEditor } from "./prosemirror-editor";
import { AIPromptInput } from "./ai-prompt-input";
import { useChat } from "@ai-sdk/react";
import { editorMachine, getHTMLFromState } from "@/lib/editor-store";

export function Editor() {
  const [state, send] = useMachine(editorMachine);

  console.log("STATE ::", state);

  const { sendMessage, messages, setMessages } = useChat({
    onFinish: (options) => {
      const aiSuggestion = options.message.parts
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("");

      send({ type: "STREAM_CHUNK", content: aiSuggestion });
      send({ type: "END_STREAMING" });
    },
    onError: (error) => {
      console.error("AI generation error:", error);
      send({ type: "AI_ERROR", error: error.message });
    },
  });

  // Custom AI generation function using useChat
  const generateAIContent = useCallback(
    async (prompt: string, contextBefore: string, contextAfter: string) => {
      try {
        send({ type: "START_STREAMING" });

        const fullPrompt =
          contextBefore || contextAfter
            ? `Context before: "${contextBefore}"\n\nContext after: "${contextAfter}"\n\nTask: ${prompt}`
            : prompt;

        sendMessage(
          { text: fullPrompt },
          {
            body: {
              systemMessage:
                "You are a helpful AI writing assistant. Help the user with their writing task. Provide clear, concise responses that directly address their request.",
            },
          }
        );

        // The response will be handled by onFinish callback
        return null;
      } catch (error) {
        console.error("AI generation error:", error);
        send({
          type: "AI_ERROR",
          error: error instanceof Error ? error.message : "Unknown error",
        });
        return null;
      }
    },
    [send, sendMessage]
  );

  // Initialize editor state on mount
  useEffect(() => {
    if (!state.context.editorState) {
      send({
        type: "INITIALIZE_EDITOR",
        content:
          "Welcome to the AI-powered editor! This is a demo document. You can start typing here or use the slash command (/) to get AI suggestions.\n\nTry typing / to see AI commands!",
        onSlashCommand: () => {
          send({ type: "OPEN_SLASH_COMMAND" });
        },
      });
    }
  }, [state.context.editorState, send]);

  // Handle AI prompt submission
  const handleAIPromptSubmit = useCallback(
    (prompt: string) => {
      send({ type: "UPDATE_AI_PROMPT", prompt });
      send({ type: "GENERATE_AI_CONTENT" });

      // Get context around cursor position from editor state
      const currentContent = state.context.editorState
        ? getHTMLFromState(state.context.editorState)
        : "";
      const contextBefore = currentContent.slice(
        Math.max(0, state.context.cursorPosition - 500),
        state.context.cursorPosition
      );
      const contextAfter = currentContent.slice(
        state.context.cursorPosition,
        state.context.cursorPosition + 200
      );

      // Send message to chat
      sendMessage(
        { text: prompt },
        {
          body: {
            systemMessage:
              "You are a helpful AI writing assistant. Help the user with their writing task. Provide clear, concise responses that directly address their request.",
          },
        }
      );

      // Call AI generation function
      generateAIContent(prompt, contextBefore, contextAfter);
    },
    [
      send,
      generateAIContent,
      state.context.editorState,
      state.context.cursorPosition,
      sendMessage,
    ]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
      {/* Main Editor */}
      <div className="flex-1 flex flex-col bg-gray-50/30">
        <div className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            <ProseMirrorEditor
              editorState={state.context.editorState}
              placeholder="Start writing your document... Type / to ask AI for help"
              onChange={(editorState) => {
                send({
                  type: "UPDATE_EDITOR_STATE",
                  editorState,
                });
              }}
            />
          </div>
        </div>

        {/* AI Prompt Input */}
        <AIPromptInput
          isOpen={state.context.aiPromptOpen}
          onClose={() => send({ type: "CLOSE_AI_PROMPT" })}
          onSubmit={handleAIPromptSubmit}
          messages={messages}
          setMessages={setMessages}
        />

        {/* AI Suggestion Display */}
        {state.context.aiSuggestion &&
          (state.context.aiPromptOpen || state.context.isStreaming) && (
            <div className="z-50 w-96 max-w-[90vw] animate-in fade-in-0 slide-in-from-top-2 duration-200 fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <Card className="border-0 bg-white/98 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-medium text-gray-700">
                        AI Suggestion
                      </h4>
                      {state.context.isStreaming && (
                        <div className="flex items-center space-x-1">
                          <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"></div>
                          <div
                            className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"
                            style={{ animationDelay: "0.1s" }}
                          ></div>
                          <div
                            className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"
                            style={{ animationDelay: "0.2s" }}
                          ></div>
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => send({ type: "REJECT_SUGGESTION" })}
                        className="text-red-600 hover:bg-red-50 h-7 px-2"
                        disabled={state.context.isStreaming}
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          send({ type: "ACCEPT_SUGGESTION" });
                        }}
                        className="bg-green-600 hover:bg-green-700 h-7 px-2"
                        disabled={state.context.isStreaming}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Accept
                      </Button>
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg border-l-4 border-blue-500 relative max-h-48 overflow-y-auto">
                    {state.context.isStreaming && (
                      <div className="absolute top-2 right-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      </div>
                    )}
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">
                      {state.context.aiSuggestion}
                      {state.context.isStreaming && (
                        <span className="inline-block w-2 h-4 bg-blue-500 ml-1 animate-pulse"></span>
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
      </div>
    </div>
  );
}
