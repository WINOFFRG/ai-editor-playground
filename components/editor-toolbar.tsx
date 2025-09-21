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
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Undo,
  Redo,
  Sparkles,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { schema } from "@/lib/editor-store";
import { toggleMark, wrapIn } from "prosemirror-commands";
import { undo, redo } from "prosemirror-history";
import { useEditorState } from "@/lib/hooks";
import { useAppActor } from "./provider";

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
          className={`h-9 w-9 p-0 hover:bg-accent/50 rounded-md transition-all duration-200 hover:scale-105 ${
            isActive
              ? "bg-primary/10 text-primary border border-primary/20"
              : "text-muted-foreground hover:text-foreground"
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
  const appActor = useAppActor();

  const toggleBold = useMarkCommand(schema.marks.strong);
  const toggleItalic = useMarkCommand(schema.marks.em);
  const insertBulletList = useWrapCommand(schema.nodes.bullet_list);
  const insertOrderedList = useWrapCommand(schema.nodes.ordered_list);
  const undoCommand = useHistoryCommand(undo);
  const redoCommand = useHistoryCommand(redo);

  const isBoldActive = useIsMarkActive(editorState, schema.marks.strong);
  const isItalicActive = useIsMarkActive(editorState, schema.marks.em);

  const handleContinueWriting = () => {
    appActor.send({ type: "CONTINUE_WRITING" });
  };

  return (
    <div className="rounded-t-sm bg-accent dark:bg-card/70 backdrop-blur-sm px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <ToolbarButton
            onClick={undoCommand}
            icon={<Undo className="h-4 w-4 text-muted-foreground" />}
            tooltip="Undo (Cmd+Z)"
          />
          <ToolbarButton
            onClick={redoCommand}
            icon={<Redo className="h-4 w-4 text-muted-foreground" />}
            tooltip="Redo (Cmd+Y)"
          />
        </div>

        <Separator orientation="vertical" className="h-6 bg-border/60" />

        <div className="flex items-center gap-1">
          <ToolbarButton
            onClick={toggleBold}
            icon={<Bold className="h-4 w-4" />}
            tooltip="Bold (Cmd+B)"
            isActive={isBoldActive}
          />
          <ToolbarButton
            onClick={toggleItalic}
            icon={<Italic className="h-4 w-4" />}
            tooltip="Italic (Cmd+I)"
            isActive={isItalicActive}
          />
        </div>

        <Separator orientation="vertical" className="h-6 bg-border/60" />

        <div className="flex items-center gap-1">
          <ToolbarButton
            onClick={insertBulletList}
            icon={<List className="h-4 w-4 text-muted-foreground" />}
            tooltip="Bullet List"
          />
          <ToolbarButton
            onClick={insertOrderedList}
            icon={<ListOrdered className="h-4 w-4 text-muted-foreground" />}
            tooltip="Numbered List"
          />
        </div>

        <Separator orientation="vertical" className="h-6 bg-border/60" />

        <div className="flex items-center gap-1">
          <Button
            onClick={handleContinueWriting}
            variant="ghost"
            size="sm"
            className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 h-9 px-3 transition-all duration-200"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            <span className="text-sm font-medium">Continue Writing</span>
          </Button>
        </div>
      </div>

      <div className="flex items-center">
        <ThemeToggle />
      </div>
    </div>
  );
}
