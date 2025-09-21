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
import { EditorView } from "prosemirror-view";
import { Loader } from "@/components/ai-elements/loader";
import {
	Popover,
	PopoverTrigger,
	PopoverContent,
} from "@/components/ui/popover";
import { useAppActor } from "./provider";
import { useAIPromptState } from "@/lib/hooks";

export interface AINotionPromptProps {
	placeholder?: string;
	className?: string;
}

export function AINotionPrompt({ className }: AINotionPromptProps) {
	const [prompt, setPrompt] = useState("");
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const triggerRef = useRef<HTMLDivElement>(null);

	const appActor = useAppActor();
	const { isOpen, suggestion: aiSuggestion, isStreaming } = useAIPromptState();
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
		[isOpen],
	);

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
					className="absolute text-sm text-gray-700 bg-secondary rounded-md py-1 px-2 fade-in animate-in slide-out-to-top-2"
				>
					/assistant
				</div>
			</PopoverTrigger>
			<PopoverContent
				align="start"
				sideOffset={8}
				className={cn(
					"absolute w-[60vw] max-w-[90vw] p-0",
					"animate-in fade-in-0 border-0 rounded-xl slide-in-from-bottom-2 duration-200",
					className,
				)}
			>
				<div className="flex items-center justify-between p-2 rounded-t-xl border border-b-0 bg-accent">
					<h3 className="text-xs font-semibold text-gray-700">AI Assistant</h3>
					<Button
						variant="ghost"
						size="sm"
						onClick={handleClose}
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
							className="min-h-18 max-h-32 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							disabled={isStreaming}
							autoFocus
						/>
						<PromptInputToolbar className="flex flex-row justify-end gap-2">
							{(aiSuggestion || isStreaming) && (
								<div className="flex items-center space-x-2">
									<Button
										size="sm"
										variant="outline"
										onClick={handleRejectSuggestion}
										disabled={isStreaming}
									>
										<XCircle className="h-3 w-3 mr-1" />
										Reject
									</Button>
									<Button
										size="sm"
										onClick={handleAcceptSuggestion}
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
