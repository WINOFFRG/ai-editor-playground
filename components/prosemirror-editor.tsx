"use client";
import {
  ProseMirror,
  ProseMirrorDoc,
  useEditorEventCallback,
} from "@handlewithcare/react-prosemirror";
import { useCallback } from "react";
import { EditorState, Transaction } from "prosemirror-state";
import { MarkType } from "prosemirror-model";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Bold, Italic, List, ListOrdered, Undo, Redo } from "lucide-react";
import { schema } from "@/lib/editor-store";
import { toggleMark, wrapIn } from "prosemirror-commands";
import { undo, redo } from "prosemirror-history";
import { AINotionPrompt } from "./ai-notion-prompt";
import { Skeleton } from "./ui/skeleton";
import { useSelector } from "@xstate/react";
import { useAppActor } from "./provider";

interface ProseMirrorEditorProps {
  editorState: EditorState | null;
  onChange?: (editorState: EditorState) => void;
  placeholder?: string;
  aiPromptOpen?: boolean;
  onCloseAIPrompt?: () => void;
  onAIPromptSubmit?: (message: string) => void;
  aiSuggestion?: string;
  isStreaming?: boolean;
  onAcceptSuggestion?: () => void;
  onRejectSuggestion?: () => void;
}

function EditorToolbar() {
  const appActor = useAppActor();
  const editorState = useSelector(
    appActor,
    (state) => state.context.editorState
  );

  const toggleBold = useEditorEventCallback((view) => {
    if (!view) return;
    const toggleBoldMark = toggleMark(schema.marks.strong);
    toggleBoldMark(view.state, view.dispatch, view);
  });

  const toggleItalic = useEditorEventCallback((view) => {
    if (!view) return;
    const toggleItalicMark = toggleMark(schema.marks.em);
    toggleItalicMark(view.state, view.dispatch, view);
  });

  const insertBulletList = useEditorEventCallback((view) => {
    if (!view) return;
    const wrapInBulletList = wrapIn(schema.nodes.bullet_list);
    wrapInBulletList(view.state, view.dispatch, view);
  });

  const insertOrderedList = useEditorEventCallback((view) => {
    if (!view) return;
    const wrapInOrderedList = wrapIn(schema.nodes.ordered_list);
    wrapInOrderedList(view.state, view.dispatch, view);
  });

  const undoCommand = useEditorEventCallback((view) => {
    if (!view) return;
    undo(view.state, view.dispatch, view);
  });

  const redoCommand = useEditorEventCallback((view) => {
    if (!view) return;
    redo(view.state, view.dispatch, view);
  });

  // Check if marks are active
  const isMarkActive = (markType: MarkType) => {
    if (!editorState) return false;
    const { from, to } = editorState.selection;
    return editorState.doc.rangeHasMark(from, to, markType);
  };

  return (
    <div className="border-b border-gray-100 px-3 py-2 flex items-center gap-1 bg-gray-50/50">
      <div className="flex items-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={undoCommand}
              className="h-8 w-8 p-0 hover:bg-gray-100 rounded"
              type="button"
            >
              <Undo className="h-3.5 w-3.5 text-gray-600" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">Undo (Cmd+Z)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={redoCommand}
              className="h-8 w-8 p-0 hover:bg-gray-100 rounded"
              type="button"
            >
              <Redo className="h-3.5 w-3.5 text-gray-600" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">Redo (Cmd+Y)</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <Separator orientation="vertical" className="h-5 mx-1 bg-gray-200" />

      <div className="flex items-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleBold}
              className={`h-8 w-8 p-0 hover:bg-gray-100 rounded transition-colors ${
                isMarkActive(schema.marks.strong)
                  ? "bg-gray-200 text-blue-600"
                  : ""
              }`}
              type="button"
            >
              <Bold className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">Bold (Cmd+B)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleItalic}
              className={`h-8 w-8 p-0 hover:bg-gray-100 rounded transition-colors ${
                isMarkActive(schema.marks.em) ? "bg-gray-200 text-blue-600" : ""
              }`}
              type="button"
            >
              <Italic className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">Italic (Cmd+I)</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <Separator orientation="vertical" className="h-5 mx-1 bg-gray-200" />

      <div className="flex items-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={insertBulletList}
              className="h-8 w-8 p-0 hover:bg-gray-100 rounded"
              type="button"
            >
              <List className="h-3.5 w-3.5 text-gray-600" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">Bullet List</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={insertOrderedList}
              className="h-8 w-8 p-0 hover:bg-gray-100 rounded"
              type="button"
            >
              <ListOrdered className="h-3.5 w-3.5 text-gray-600" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">Numbered List</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

export function ProseMirrorEditor({
  editorState,
  onChange,
  placeholder,
  aiPromptOpen = false,
  onCloseAIPrompt,
  onAIPromptSubmit,
  aiSuggestion,
  isStreaming = false,
  onAcceptSuggestion,
  onRejectSuggestion,
}: ProseMirrorEditorProps) {
  // Handle state changes
  const handleDispatchTransaction = useCallback(
    (tr: Transaction) => {
      if (!editorState) return;

      const newState = editorState.apply(tr);
      onChange?.(newState);
    },
    [editorState, onChange]
  );

  if (!editorState) {
    return <Skeleton className="h-[350px] w-full animate-caret-blink!" />;
  }

  return (
    <TooltipProvider>
      <div>
        <ProseMirror
          state={editorState}
          dispatchTransaction={handleDispatchTransaction}
        >
          <EditorToolbar />
          <ProseMirrorDoc />
          {aiPromptOpen && onCloseAIPrompt && onAIPromptSubmit && (
            <AINotionPrompt
              isOpen={aiPromptOpen}
              onClose={onCloseAIPrompt}
              onSubmit={onAIPromptSubmit}
              aiSuggestion={aiSuggestion}
              isStreaming={isStreaming}
              onAcceptSuggestion={onAcceptSuggestion}
              onRejectSuggestion={onRejectSuggestion}
            />
          )}
        </ProseMirror>

        <style jsx global>{`
          .ProseMirror {
            min-height: 350px;
            padding: 20px 24px;
            outline: none;
            font-size: 15px;
            line-height: 1.7;
            color: #1a1a1a;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
              Oxygen, Ubuntu, sans-serif;
          }

          .ProseMirror:focus {
            outline: none;
          }

          .ProseMirror p {
            margin: 0 0 0.5em 0;
          }

          .ProseMirror p:last-child {
            margin-bottom: 0;
          }

          .ProseMirror h1 {
            font-size: 1.875em;
            font-weight: 700;
            margin: 0.5em 0;
            line-height: 1.2;
          }

          .ProseMirror h2 {
            font-size: 1.5em;
            font-weight: 600;
            margin: 0.5em 0;
            line-height: 1.3;
          }

          .ProseMirror h3 {
            font-size: 1.25em;
            font-weight: 600;
            margin: 0.5em 0;
            line-height: 1.4;
          }

          .ProseMirror ul,
          .ProseMirror ol {
            padding-left: 1.5em;
            margin: 0.5em 0;
          }

          .ProseMirror li {
            margin: 0.25em 0;
          }

          .ProseMirror li p {
            margin: 0;
          }

          .ProseMirror blockquote {
            border-left: 3px solid #e5e7eb;
            padding-left: 1em;
            margin: 1em 0;
            color: #6b7280;
          }

          .ProseMirror code {
            background-color: rgba(107, 114, 128, 0.1);
            padding: 0.125em 0.25em;
            border-radius: 0.25rem;
            font-family: "SF Mono", "Monaco", "Inconsolata", "Fira Code",
              monospace;
            font-size: 0.875em;
          }

          .ProseMirror strong {
            font-weight: 600;
          }

          .ProseMirror em {
            font-style: italic;
          }

          /* Empty state placeholder */
          .ProseMirror p.is-empty:first-child::before {
            content: "${placeholder || "Start typing..."}";
            color: #9ca3af;
            pointer-events: none;
            float: left;
            height: 0;
          }

          /* Selection */
          .ProseMirror ::selection {
            background-color: rgba(59, 130, 246, 0.15);
          }

          /* Focus styles */
          .ProseMirror.ProseMirror-focused {
            outline: none;
          }

          /* Cursor */
          .ProseMirror .ProseMirror-gapcursor {
            border-left: 1px solid #000;
          }
        `}</style>
      </div>
    </TooltipProvider>
  );
}
