"use client";

import { useMachine } from "@xstate/react";
import { useCallback, useEffect } from "react";
import { ProseMirrorEditor } from "./prosemirror-editor";
import { useChat } from "@ai-sdk/react";
import { editorMachine, getHTMLFromState } from "@/lib/editor-store";
import { AppProvider } from "./provider";

export function Editor() {
  const [state, send] = useMachine(editorMachine);

  const { status, stop, sendMessage } = useChat({
    onFinish: (options) => {
      console.log("OPTIONS ON FINISH ::", options);
      try {
        const aiSuggestion = options.message.parts
          .filter((part) => part.type === "text")
          .map((part) => part.text)
          .join("");

        send({ type: "STREAM_CHUNK", content: aiSuggestion });
        send({ type: "END_STREAMING" });
      } catch (error) {
        console.error("Error in onFinish:", error);
        send({ type: "AI_ERROR", error: "Failed to process AI response" });
      }
    },
    onData: (data) => {
      try {
        console.log("DATA ON DATA ::", data);
        send({ type: "STREAM_CHUNK", content: data.data as string });
      } catch (error) {
        console.error("Error in onData:", error);
        send({ type: "AI_ERROR", error: "Failed to process streaming data" });
      }
    },
    onError: (error) => {
      console.error("AI generation error on ERROR ::", error);
      send({ type: "AI_ERROR", error: error.message });
    },
  });

  console.log({ status });

  // Custom AI generation function using useChat
  const generateAIContent = useCallback(
    async (prompt: string, contextBefore: string, contextAfter: string) => {
      try {
        send({ type: "START_STREAMING" });

        const fullPrompt =
          contextBefore || contextAfter
            ? `Context before: "${contextBefore}"\n\nContext after: "${contextAfter}"\n\nTask: ${prompt}`
            : prompt;

        // Ensure sendMessage is available before calling
        if (!sendMessage) {
          throw new Error("sendMessage is not available");
        }

        await sendMessage(
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

  const handleAIPromptSubmit = useCallback(
    (prompt: string) => {
      send({ type: "UPDATE_AI_PROMPT", prompt });
      send({ type: "CLEAR_AI_SUGGESTION" });
      send({ type: "GENERATE_AI_CONTENT" });

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

      // Call AI generation function (which will handle the sendMessage call)
      generateAIContent(prompt, contextBefore, contextAfter);
    },
    [
      send,
      generateAIContent,
      state.context.editorState,
      state.context.cursorPosition,
    ]
  );

  return (
    <AppProvider>
      <div className="min-h-screen">
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
                aiPromptOpen={state.context.aiPromptOpen}
                onCloseAIPrompt={() => send({ type: "CLOSE_AI_PROMPT" })}
                onAIPromptSubmit={handleAIPromptSubmit}
                aiSuggestion={state.context.aiSuggestion}
                isStreaming={state.context.isStreaming}
                onAcceptSuggestion={() => send({ type: "ACCEPT_SUGGESTION" })}
                onRejectSuggestion={() => send({ type: "REJECT_SUGGESTION" })}
              />
            </div>
          </div>
        </div>
      </div>
    </AppProvider>
  );
}
