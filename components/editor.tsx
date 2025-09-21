"use client";

import { useCallback, useEffect } from "react";
import { ProseMirrorEditor } from "./prosemirror-editor";
import { useChat } from "@ai-sdk/react";
import { useAppActor } from "./provider";
import { getHTMLFromState } from "@/lib/editor-store";
import { useEditorState, useCursorPosition } from "@/lib/hooks";
import { Skeleton } from "./ui/skeleton";
import { toast } from "sonner";
import { EditorState } from "prosemirror-state";

import "prosemirror-view/style/prosemirror.css";

export function Editor() {
  const appActor = useAppActor();

  const { sendMessage } = useChat({
    onFinish: (options) => {
      try {
        const aiSuggestion = options.message.parts
          .filter((part) => part.type === "text")
          .map((part) => part.text)
          .join("");

        appActor.send({ type: "STREAM_CHUNK", content: aiSuggestion });
        appActor.send({ type: "END_STREAMING" });
      } catch {
        appActor.send({
          type: "AI_ERROR",
          error: "Failed to process AI response",
        });
      }
    },
    // TODO: Checked this doesn't https://github.com/vercel/ai/issues/8597
    onData: (data) => {
      try {
        appActor.send({ type: "STREAM_CHUNK", content: data.data as string });
      } catch {
        appActor.send({
          type: "AI_ERROR",
          error: "Failed to process streaming data",
        });
      }
    },
    onError: (error) => {
      if (
        error.message.includes("401") ||
        error.message.includes("Authentication")
      ) {
        toast.error("Authentication Failed", {
          description: "Invalid token. Please check your authentication.",
        });
      } else if (error.message.includes("500")) {
        toast.error("AI Service Error", {
          description:
            "The AI service is currently unavailable. Please try again later.",
        });
      } else {
        toast.error("AI Error", {
          description: error.message,
        });
      }

      appActor.send({ type: "AI_ERROR", error: error.message });
    },
  });

  const editorState = useEditorState();
  const cursorPosition = useCursorPosition();

  const generateAIContent = useCallback(
    async (
      prompt: string,
      contextBefore: string,
      contextAfter: string,
      includeFullContext: boolean = false,
      currentEditorState?: EditorState
    ) => {
      try {
        appActor.send({ type: "START_STREAMING" });

        let fullPrompt = prompt;

        if (includeFullContext && currentEditorState) {
          const fullDocumentContent = getHTMLFromState(currentEditorState);
          fullPrompt = `Full document content:\n\n${fullDocumentContent}\n\nTask: ${prompt}`;
        } else if (contextBefore || contextAfter) {
          fullPrompt = `Context before: "${contextBefore}"\n\nContext after: "${contextAfter}"\n\nTask: ${prompt}`;
        }

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

        return null;
      } catch (error) {
        console.error("AI generation error:", error);

        if (error instanceof Error && error.message.includes("401")) {
          toast.error("Authentication Failed", {
            description: "Invalid token. Please check your authentication.",
          });
        } else {
          toast.error("AI Generation Failed", {
            description:
              error instanceof Error ? error.message : "Unknown error",
          });
        }

        appActor.send({
          type: "AI_ERROR",
          error: error instanceof Error ? error.message : "Unknown error",
        });
        return null;
      }
    },
    [appActor, sendMessage]
  );

  useEffect(() => {
    if (!editorState) {
      appActor.send({
        type: "INITIALIZE_EDITOR",
        content:
          "Welcome to the AI-powered editor! This is a demo document. You can start typing here or use the slash command (/) to get AI suggestions.\n\nTry typing / to see AI commands!",
        onSlashCommand: () => {
          appActor.send({ type: "OPEN_SLASH_COMMAND" });
        },
      });
    }
  }, [editorState, appActor]);

  useEffect(() => {
    const subscription = appActor.subscribe((state) => {
      if (state.matches("generating") && state.context.aiPrompt) {
        if (!state.context.editorState) return;

        const currentContent = getHTMLFromState(state.context.editorState);
        const contextBefore = currentContent.slice(
          Math.max(0, state.context.cursorPosition - 500),
          state.context.cursorPosition
        );
        const contextAfter = currentContent.slice(
          state.context.cursorPosition,
          state.context.cursorPosition + 200
        );

        generateAIContent(
          state.context.aiPrompt,
          contextBefore,
          contextAfter,
          state.context.includeContext,
          state.context.editorState
        );
      }
    });

    return () => subscription.unsubscribe();
  }, [appActor, generateAIContent]);

  if (!editorState) {
    return <Skeleton className="h-[350px] w-full animate-caret-blink!" />;
  }

  return (
    <ProseMirrorEditor
      onChange={(editorState) => {
        appActor.send({
          type: "UPDATE_EDITOR_STATE",
          editorState,
        });
      }}
    />
  );
}
