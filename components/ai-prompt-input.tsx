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
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Message,
  MessageContent,
  MessageAvatar,
} from "@/components/ai-elements/message";

export interface AIPromptInputProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (message: string) => void;
  placeholder?: string;
  className?: string;
  messages?: Array<{
    role: string;
    parts?: Array<{ type: string; text: string }>;
    content?: string;
  }>;
  setMessages?: (
    messages: Array<{
      role: string;
      parts?: Array<{ type: string; text: string }>;
      content?: string;
    }>
  ) => void;
}

export function AIPromptInput({
  isOpen,
  onClose,
  onSubmit,
  placeholder = "Continue writing...",
  className,
  messages = [],
  setMessages,
}: AIPromptInputProps) {
  const [prompt, setPrompt] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // This component should not have its own useChat - it should work with the parent editor's AI system

  // Focus textarea when opened
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isOpen &&
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, onClose]);

  const handleSubmit = (message: PromptInputMessage) => {
    if (message.text?.trim()) {
      onSubmit(message.text);
      setPrompt("");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className={cn(
        "z-50 w-96 max-w-[90vw] fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2",
        "animate-in fade-in-0 zoom-in-95 duration-200",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 rounded-t-xl border border-b-0">
        <h3 className="text-sm font-medium text-gray-700">AI Assistant</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-6 w-6 p-0 hover:bg-gray-100"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      {/* Chat Messages */}
      {messages.length > 0 && (
        <div className="max-h-64 overflow-y-auto border-b border-gray-200">
          <div className="space-y-4 p-4">
            {messages.map((message, index) => (
              <Message key={index} from={message.role}>
                <MessageAvatar
                  src={
                    message.role === "user"
                      ? "/user-avatar.png"
                      : "/ai-avatar.png"
                  }
                  name={message.role === "user" ? "You" : "AI"}
                />
                <MessageContent variant="contained">
                  <div className="whitespace-pre-wrap text-sm">
                    {message.parts?.find(
                      (part: { type: string; text: string }) =>
                        part.type === "text"
                    )?.text ||
                      message.content ||
                      "No content available"}
                  </div>
                </MessageContent>
              </Message>
            ))}
          </div>
        </div>
      )}

      {/* Prompt Input */}
      <PromptInput
        onSubmit={handleSubmit}
        className="rounded-t-none border-t-0"
      >
        <PromptInputBody>
          <PromptInputTextarea
            ref={textareaRef}
            placeholder={placeholder}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-12 max-h-32"
            disabled={false}
          />
          <PromptInputToolbar>
            <PromptInputSubmit disabled={!prompt.trim()} />
          </PromptInputToolbar>
        </PromptInputBody>
      </PromptInput>
    </div>
  );
}

// Quick action buttons for common AI tasks
export interface AIActionButtonProps {
  onSelect: (action: string) => void;
  className?: string;
}

export function AIActionButtons({ onSelect, className }: AIActionButtonProps) {
  const actions = [{ id: "continue", label: "Continue writing", icon: "✏️" }];

  return (
    <div className={cn("flex flex-wrap gap-2 p-2", className)}>
      {actions.map((action) => (
        <Button
          key={action.id}
          variant="ghost"
          size="sm"
          onClick={() => onSelect(action.label)}
          className="h-8 px-3 text-xs hover:bg-gray-100 border border-gray-200"
        >
          <span className="mr-1">{action.icon}</span>
          {action.label}
        </Button>
      ))}
    </div>
  );
}
