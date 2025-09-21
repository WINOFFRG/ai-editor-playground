"use client";

import { useState, useRef, useEffect } from "react";
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputSubmit,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import {
  X,
  Check,
  XCircle,
  FileText,
  ThumbsUpIcon,
  ThumbsDownIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEditorEffect } from "@handlewithcare/react-prosemirror";
import { EditorView } from "prosemirror-view";
import { Loader } from "@/components/ai-elements/loader";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { useAppActor } from "./provider";
import { useAIPromptState } from "@/lib/hooks";
import { Action } from "./ai-elements/actions";
import { Actions } from "./ai-elements/actions";

export interface AINotionPromptProps {
  placeholder?: string;
  className?: string;
}

export function AINotionPrompt({ className }: AINotionPromptProps) {
  const [prompt, setPrompt] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const appActor = useAppActor();
  const {
    isOpen,
    suggestion: aiSuggestion,
    isStreaming,
    includeContext,
  } = useAIPromptState();
  const editorViewRef = useRef<EditorView | null>(null);

  const refocusEditor = () => {
    if (editorViewRef.current) {
      editorViewRef.current.focus();
    }
  };

  const placeholder = "Ask AI anything ...";

  useEffect(() => {
    if (isOpen) {
      setPrompt("");

      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  useEditorEffect(
    (view) => {
      editorViewRef.current = view;

      if (!isOpen || !view || !triggerRef.current) return;

      try {
        const coords = view.coordsAtPos(view.state.selection.anchor);
        const viewClientRect = view.dom.getBoundingClientRect();

        // DEV: The position weren't coming up correctly, so I just did random hit trial to setup the position
        const relativeTop = viewClientRect.top + coords.top - 80;
        const relativeLeft = viewClientRect.left + 10;

        const trigger = triggerRef.current;

        trigger.style.top = relativeTop + "px";
        trigger.style.left = relativeLeft + "px";
      } catch (error) {
        console.warn("Error positioning AI prompt trigger:", error);
      }
    },
    [isOpen]
  );

  const handleToggleContext = () => {
    appActor.send({ type: "TOGGLE_INCLUDE_CONTEXT" });
  };

  const handleSubmit = (message: PromptInputMessage) => {
    if (message.text?.trim()) {
      appActor.send({ type: "UPDATE_AI_PROMPT", prompt: message.text });
      appActor.send({ type: "CLEAR_AI_SUGGESTION" });
      appActor.send({ type: "GENERATE_AI_CONTENT" });
      setPrompt("");
      refocusEditor();
    }
  };

  const handleClose = () => {
    appActor.send({ type: "CLOSE_AI_PROMPT" });
    refocusEditor();
  };

  const handleAcceptSuggestion = () => {
    appActor.send({ type: "ACCEPT_SUGGESTION" });
    refocusEditor();
  };

  const handleRejectSuggestion = () => {
    appActor.send({ type: "REJECT_SUGGESTION" });
    refocusEditor();
  };

  if (!isOpen) return null;

  return (
    <Popover open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <PopoverTrigger asChild>
        <div
          ref={triggerRef}
          className="absolute text-sm text-foreground bg-secondary rounded-md py-1 px-2 fade-in animate-in slide-out-to-top-2 transition-all duration-300 hover:scale-105 hover:bg-secondary/80"
        >
          /assistant
        </div>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className={cn(
          "absolute w-[28rem] p-0",
          "animate-in fade-in-0 border-0 rounded-xl slide-in-from-bottom-2 duration-300 ease-out",
          className
        )}
      >
        <div className="flex items-center justify-between p-2 rounded-t-xl border border-b-0 bg-accent/50 animate-in slide-in-from-top-2 fade-in-0 duration-300">
          <h3 className="text-xs font-semibold text-foreground">
            AI Assistant
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-6 w-6 p-0 hover:bg-accent-foreground/30 transition-all duration-200 hover:scale-110 active:scale-95"
          >
            <X className="h-3 w-3 transition-transform duration-200" />
          </Button>
        </div>

        <PromptInput
          onSubmit={handleSubmit}
          className="rounded-t-none border-t-0"
        >
          <PromptInputBody>
            {(aiSuggestion || isStreaming) && (
              <div className="p-4 border-b border-border bg-muted/50 animate-in slide-in-from-top-2 fade-in-0 duration-300">
                <div className="flex items-center justify-between mb-2">
                  {isStreaming && (
                    <div className="flex items-center space-x-2 animate-pulse">
                      <Loader size={12} />
                      <span className="text-xs text-muted-foreground">
                        Generating...
                      </span>
                    </div>
                  )}
                </div>
                <div className="relative max-h-32 overflow-y-auto transition-all duration-300">
                  {(aiSuggestion || isStreaming) && (
                    <p className="text-sm text-foreground whitespace-pre-wrap animate-in fade-in-0 slide-in-from-left-2 duration-500">
                      {aiSuggestion}
                      {isStreaming && (
                        <span className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse"></span>
                      )}
                    </p>
                  )}
                  {!isStreaming && aiSuggestion && (
                    <Actions className="gap-0 py-1 justify-end animate-in slide-in-from-bottom-2 fade-in-0 duration-300 delay-200">
                      <Action label="Like">
                        <ThumbsUpIcon className="size-3" />
                      </Action>
                      <Action label="Dislike">
                        <ThumbsDownIcon className="size-3" />
                      </Action>
                    </Actions>
                  )}{" "}
                </div>
              </div>
            )}

            <PromptInputTextarea
              ref={textareaRef}
              placeholder={placeholder}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-12 max-h-32 text-sm font-medium text-foreground focus:ring-2 focus:ring-ring transition-all duration-300 ease-in-out focus:min-h-18"
              disabled={isStreaming}
              autoFocus
            />
            <PromptInputToolbar className="flex flex-row justify-between items-center gap-2 mb-2 transition-all duration-300">
              <div className="flex items-center space-x-2">
                <Button
                  size="xs"
                  variant={includeContext ? "default" : "outline"}
                  onClick={handleToggleContext}
                  disabled={isStreaming}
                  className="text-xs transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  <FileText className="h-3 w-3 mr-1 transition-transform duration-200" />
                  {includeContext ? "Context On" : "Include Context"}
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                {(aiSuggestion || isStreaming) && (
                  <>
                    <Button
                      size="xs"
                      variant="secondary"
                      onClick={handleRejectSuggestion}
                      disabled={isStreaming}
                      className="transition-all duration-300 hover:scale-105 active:scale-95 animate-in slide-in-from-right-2 fade-in-0"
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      Reject
                    </Button>
                    <Button
                      size="xs"
                      onClick={handleAcceptSuggestion}
                      disabled={isStreaming}
                      className="transition-all duration-300 hover:scale-105 active:scale-95 animate-in slide-in-from-right-2 fade-in-0 delay-100"
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Accept
                    </Button>
                  </>
                )}
                <PromptInputSubmit
                  size="icon"
                  disabled={!prompt.trim() || isStreaming}
                  className="bg-neutral-300 rounded-full text-black hover:bg-neutral-200 transition-all duration-200 hover:scale-110 active:scale-95"
                />
              </div>
            </PromptInputToolbar>
          </PromptInputBody>
        </PromptInput>
      </PopoverContent>
    </Popover>
  );
}
