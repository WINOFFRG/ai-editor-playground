"use client";
import { useEditorEventCallback } from "@handlewithcare/react-prosemirror";
import { MarkType, NodeType } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { Bold, Italic, List, ListOrdered, Undo, Redo } from "lucide-react";
import { schema } from "@/lib/editor-store";
import { toggleMark, wrapIn } from "prosemirror-commands";
import { undo, redo } from "prosemirror-history";
import { useEditorState } from "@/lib/hooks";

function useMarkCommand(markType: MarkType) {
	return useEditorEventCallback((view) => {
		if (!view) return;
		const toggleMarkCommand = toggleMark(markType);
		toggleMarkCommand(view.state, view.dispatch, view);
	});
}

function useWrapCommand(nodeType: NodeType) {
	return useEditorEventCallback((view) => {
		if (!view) return;
		const wrapCommand = wrapIn(nodeType);
		wrapCommand(view.state, view.dispatch, view);
	});
}

function useHistoryCommand(command: typeof undo | typeof redo) {
	return useEditorEventCallback((view) => {
		if (!view) return;
		command(view.state, view.dispatch, view);
	});
}

function useIsMarkActive(editorState: EditorState | null, markType: MarkType) {
	if (!editorState) return false;
	const { from, to } = editorState.selection;
	return editorState.doc.rangeHasMark(from, to, markType);
}

interface ToolbarButtonProps {
	onClick: () => void;
	icon: React.ReactNode;
	tooltip: string;
	isActive?: boolean;
	className?: string;
}

function ToolbarButton({
	onClick,
	icon,
	tooltip,
	isActive,
	className = "",
}: ToolbarButtonProps) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					onClick={onClick}
					className={`h-8 w-8 p-0 hover:bg-gray-100 rounded transition-colors ${
						isActive ? "bg-gray-200 text-blue-600" : ""
					} ${className}`}
					type="button"
				>
					{icon}
				</Button>
			</TooltipTrigger>
			<TooltipContent side="top">
				<p className="text-xs">{tooltip}</p>
			</TooltipContent>
		</Tooltip>
	);
}

export function EditorToolbar() {
	const editorState = useEditorState();

	const toggleBold = useMarkCommand(schema.marks.strong);
	const toggleItalic = useMarkCommand(schema.marks.em);
	const insertBulletList = useWrapCommand(schema.nodes.bullet_list);
	const insertOrderedList = useWrapCommand(schema.nodes.ordered_list);
	const undoCommand = useHistoryCommand(undo);
	const redoCommand = useHistoryCommand(redo);

	const isBoldActive = useIsMarkActive(editorState, schema.marks.strong);
	const isItalicActive = useIsMarkActive(editorState, schema.marks.em);

	return (
		<div className="border border-gray-300 px-3 py-2 flex items-center gap-1 bg-gray-50/50">
			<div className="flex items-center">
				<ToolbarButton
					onClick={undoCommand}
					icon={<Undo className="h-3.5 w-3.5 text-gray-600" />}
					tooltip="Undo (Cmd+Z)"
				/>
				<ToolbarButton
					onClick={redoCommand}
					icon={<Redo className="h-3.5 w-3.5 text-gray-600" />}
					tooltip="Redo (Cmd+Y)"
				/>
			</div>

			<Separator orientation="vertical" className="h-5 mx-1 bg-gray-200" />

			<div className="flex items-center">
				<ToolbarButton
					onClick={toggleBold}
					icon={<Bold className="h-3.5 w-3.5" />}
					tooltip="Bold (Cmd+B)"
					isActive={isBoldActive}
				/>
				<ToolbarButton
					onClick={toggleItalic}
					icon={<Italic className="h-3.5 w-3.5" />}
					tooltip="Italic (Cmd+I)"
					isActive={isItalicActive}
				/>
			</div>

			<Separator orientation="vertical" className="h-5 mx-1 bg-gray-200" />

			<div className="flex items-center">
				<ToolbarButton
					onClick={insertBulletList}
					icon={<List className="h-3.5 w-3.5 text-gray-600" />}
					tooltip="Bullet List"
				/>
				<ToolbarButton
					onClick={insertOrderedList}
					icon={<ListOrdered className="h-3.5 w-3.5 text-gray-600" />}
					tooltip="Numbered List"
				/>
			</div>
		</div>
	);
}
