"use client";
import { ProseMirror, ProseMirrorDoc } from "@handlewithcare/react-prosemirror";
import { useCallback } from "react";
import { EditorState, Transaction } from "prosemirror-state";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AINotionPrompt } from "./ai-notion-prompt";
import { Skeleton } from "./ui/skeleton";
import { EditorToolbar } from "./editor-toolbar";
import { useEditorState, useAIPromptState } from "@/lib/hooks";

interface ProseMirrorEditorProps {
	onChange?: (editorState: EditorState) => void;
}

export function ProseMirrorEditor({ onChange }: ProseMirrorEditorProps) {
	const editorState = useEditorState();
	const { isOpen: aiPromptOpen } = useAIPromptState();

	const handleDispatchTransaction = useCallback(
		(tr: Transaction) => {
			if (!editorState) return;

			const newState = editorState.apply(tr);
			onChange?.(newState);
		},
		[editorState, onChange],
	);

	if (!editorState) {
		return <Skeleton className="h-[350px] w-full animate-caret-blink!" />;
	}

	return (
		<TooltipProvider>
			<div>
				<ProseMirror
					className="p-2 rounded-t-none min-h-[400px] sm:min-h-[500px] border border-gray-200 rounded-sm"
					state={editorState}
					dispatchTransaction={handleDispatchTransaction}
				>
					<EditorToolbar />
					<ProseMirrorDoc />
					{aiPromptOpen && <AINotionPrompt />}
				</ProseMirror>
			</div>
		</TooltipProvider>
	);
}
