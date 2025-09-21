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
import { X, Check, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEditorEffect } from "@handlewithcare/react-prosemirror";
import { Loader } from "@/components/ai-elements/loader";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";

export interface AINotionPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (message: string) => void;
  aiSuggestion?: string;
  isStreaming?: boolean;
  onAcceptSuggestion?: () => void;
  onRejectSuggestion?: () => void;
  placeholder?: string;
  className?: string;
}

export function AINotionPrompt({
  isOpen,
  onClose,
  onSubmit,
  aiSuggestion,
  isStreaming = false,
  onAcceptSuggestion,
  onRejectSuggestion,
  placeholder = "Ask AI anything...",
  className,
}: AINotionPromptProps) {
  const [prompt, setPrompt] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEditorEffect(
    (view) => {
      if (!isOpen || !view || !triggerRef.current) return;

      try {
        // Get cursor position coordinates
        const coords = view.coordsAtPos(view.state.selection.anchor);
        const viewClientRect = view.dom.getBoundingClientRect();

        // Calculate position relative to the editor
        const relativeTop = coords.top - viewClientRect.top;
        const relativeLeft = coords.left - viewClientRect.left;

        // Position the trigger element
        const trigger = triggerRef.current;

        trigger.style.position = "absolute";
        trigger.style.top = `${relativeTop + 70}px`;
        trigger.style.left = `${relativeLeft + 20}px`;

        trigger.style.zIndex = "50";
      } catch (error) {
        console.warn("Error positioning AI prompt trigger:", error);
      }
    },
    [isOpen]
  );

  const handleSubmit = (message: PromptInputMessage) => {
    console.log("handleSubmit", message);
    if (message.text?.trim()) {
      onSubmit(message.text);
      setPrompt("");
    }
  };

  if (!isOpen) return null;

  return (
    <Popover open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <PopoverTrigger asChild>
        <div
          ref={triggerRef}
          className="text-sm text-gray-700 bg-secondary rounded-md py-1 px-2 fade-in animate-in slide-out-to-top-2"
        >
          /assistant
        </div>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className={cn(
          "w-[60vw] max-w-[90vw] p-0",
          "animate-in fade-in-0 border-0 rounded-xl slide-in-from-bottom-2 duration-200",
          className
        )}
      >
        <div className="flex items-center justify-between p-2 rounded-t-xl border border-b-0 bg-accent">
          <h3 className="text-xs font-semibold text-gray-700">AI Assistant</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0 hover:bg-gray-100"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>

        <PromptInput
          onSubmit={handleSubmit}
          className="rounded-t-none border-t-0"
        >
          <PromptInputBody>
            {(aiSuggestion || isStreaming) && (
              <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center justify-between mb-2">
                  {isStreaming && (
                    <div className="flex items-center space-x-2">
                      <Loader size={12} />
                      <span className="text-xs text-gray-500">
                        Generating...
                      </span>
                    </div>
                  )}
                </div>
                <div className="relative max-h-32 overflow-y-auto">
                  {(aiSuggestion || isStreaming) && (
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">
                      {aiSuggestion}
                      {isStreaming && (
                        <span className="inline-block w-2 h-4 bg-neutral-500 ml-1 animate-pulse"></span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            )}
            <PromptInputTextarea
              ref={textareaRef}
              placeholder={placeholder}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-18 max-h-32 text-sm font-medium text-gray-700"
              disabled={isStreaming}
            />
            <PromptInputToolbar className="flex flex-row justify-end gap-2">
              {(aiSuggestion || isStreaming) && (
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onRejectSuggestion}
                    disabled={isStreaming}
                  >
                    <XCircle className="h-3 w-3 mr-1" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={onAcceptSuggestion}
                    disabled={isStreaming}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Accept
                  </Button>
                </div>
              )}
              <PromptInputSubmit
                size="icon"
                disabled={!prompt.trim() || isStreaming}
                className="bg-neutral-300 rounded-full text-black hover:bg-neutral-200"
              />
            </PromptInputToolbar>
          </PromptInputBody>
        </PromptInput>
      </PopoverContent>
    </Popover>
  );
}
