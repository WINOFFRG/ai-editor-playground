import { createMachine, assign } from "xstate";
import { EditorState, Plugin } from "prosemirror-state";
import { Schema } from "prosemirror-model";
import { schema as basicSchema } from "prosemirror-schema-basic";
import { addListNodes } from "prosemirror-schema-list";
import { history, undo, redo } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { baseKeymap, toggleMark } from "prosemirror-commands";
import { buildKeymap } from "prosemirror-example-setup";
import { inputRules } from "prosemirror-inputrules";
import { PluginKey } from "prosemirror-state";
import { DOMParser as PmDOMParser, DOMSerializer } from "prosemirror-model";
import { reactKeys } from "@handlewithcare/react-prosemirror";

export const schema = new Schema({
  nodes: addListNodes(basicSchema.spec.nodes, "paragraph block*", "block"),
  marks: basicSchema.spec.marks,
});

export const createSlashCommandPlugin = (onSlashCommand?: () => void) => {
  const slashCommandPluginKey = new PluginKey("slashCommand");

  return new Plugin({
    key: slashCommandPluginKey,
    props: {
      handleKeyDown: (view, event) => {
        if (event.key === "/") {
          const { state } = view;
          const { selection } = state;
          const { $from } = selection;

          const textBefore = $from.nodeBefore?.textContent || "";
          const isAtStartOfLine = $from.parentOffset === 0;
          const isAfterWhitespace = /^\s*$/.test(textBefore);

          if (isAtStartOfLine || isAfterWhitespace) {
            onSlashCommand?.();

            return true;
          }
        }
        return false;
      },
    },
  });
};

export const createEditorState = (
  content: string = "",
  onSlashCommand?: () => void
): EditorState => {
  const plugins = [
    history(),
    keymap({
      "Mod-z": undo,
      "Mod-y": redo,
      "Mod-Shift-z": redo,
      "Mod-b": toggleMark(schema.marks.strong),
      "Mod-i": toggleMark(schema.marks.em),
    }),
    keymap(baseKeymap),
    keymap(buildKeymap(schema)),
    inputRules({ rules: [] }),
    reactKeys(),
    createSlashCommandPlugin(onSlashCommand),
  ];

  let doc;
  if (content) {
    const wrap = document.createElement("div");
    wrap.innerHTML = content;
    doc = PmDOMParser.fromSchema(schema).parse(wrap);
  }

  return EditorState.create({
    schema,
    doc,
    plugins,
  });
};

// Helper function to get HTML from editor state
export const getHTMLFromState = (state: EditorState): string => {
  const fragment = DOMSerializer.fromSchema(schema).serializeFragment(
    state.doc.content
  );
  const div = document.createElement("div");
  div.appendChild(fragment);
  return div.innerHTML;
};

export const editorMachine = createMachine({
  id: "editor",
  initial: "writing",
  context: {
    // Editor state
    cursorPosition: 0,
    editorState: null as EditorState | null,

    aiPromptOpen: false,

    // AI state
    aiPrompt: "",
    aiSuggestion: "",
    isGenerating: false,
    isStreaming: false,

    // Error state
    error: null as string | null,
  },
  types: {
    context: {} as {
      cursorPosition: number;
      editorState: EditorState | null;
      aiPromptOpen: boolean;
      aiPrompt: string;
      aiSuggestion: string;
      isGenerating: boolean;
      isStreaming: boolean;
      error: string | null;
    },
    events: {} as
      | { type: "UPDATE_EDITOR_STATE"; editorState: EditorState }
      | { type: "ACCEPT_SUGGESTION" }
      | {
          type: "OPEN_AI_PROMPT";
          prompt?: string;
        }
      | { type: "CLOSE_AI_PROMPT" }
      | { type: "UPDATE_AI_PROMPT"; prompt: string }
      | { type: "GENERATE_AI_CONTENT" }
      | { type: "START_STREAMING" }
      | { type: "STREAM_CHUNK"; content: string }
      | { type: "END_STREAMING" }
      | { type: "AI_ERROR"; error: string }
      | { type: "REJECT_SUGGESTION" }
      | { type: "CLEAR_AI_SUGGESTION" }
      | { type: "OPEN_SLASH_COMMAND" }
      | {
          type: "INITIALIZE_EDITOR";
          onSlashCommand?: () => void;
          content?: string;
        },
  },
  states: {
    writing: {
      on: {
        UPDATE_EDITOR_STATE: {
          actions: assign({
            editorState: ({ event }) => event.editorState,
            cursorPosition: ({ event }) => event.editorState.selection.from,
          }),
        },
        CLEAR_AI_SUGGESTION: {
          actions: assign({
            aiSuggestion: "",
            isStreaming: false,
            error: null,
          }),
        },
        OPEN_AI_PROMPT: {
          target: "aiPromptOpen",
          actions: assign({
            aiPromptOpen: true,
            aiPrompt: ({ event }) => event.prompt || "",
            aiSuggestion: "",
            error: null,
          }),
        },
        OPEN_SLASH_COMMAND: {
          target: "aiPromptOpen",
          actions: assign({
            aiPromptOpen: true,
            aiPrompt: "",
            aiSuggestion: "",
            error: null,
          }),
        },
        INITIALIZE_EDITOR: {
          actions: assign({
            editorState: ({ event }) => {
              console.log("INITIALIZE_EDITOR: Creating editor state");
              return createEditorState(
                event.content || "",
                event.onSlashCommand
              );
            },
          }),
        },
        ACCEPT_SUGGESTION: {
          target: "writing",
          actions: assign({
            editorState: ({ context }) => {
              if (!context.editorState) return context.editorState;

              // Use ProseMirror's transaction system to insert text properly
              const state = context.editorState;
              const { tr } = state;
              const cursorPos = context.cursorPosition;

              // Insert the AI suggestion at the cursor position
              tr.insertText(context.aiSuggestion, cursorPos, cursorPos);

              // Apply the transaction to get the new state
              const newState = state.apply(tr);

              console.log(
                "ACCEPT_SUGGESTION: Inserted text at position",
                cursorPos
              );
              return newState;
            },
            cursorPosition: ({ context }) => {
              return context.cursorPosition + context.aiSuggestion.length;
            },
            aiPromptOpen: false,
            aiSuggestion: "",
            aiPrompt: "",
          }),
        },
        REJECT_SUGGESTION: {
          target: "writing",
          actions: assign({
            aiPromptOpen: false,
            aiSuggestion: "",
            aiPrompt: "",
            isStreaming: false,
            error: null,
          }),
        },
      },
    },
    aiPromptOpen: {
      on: {
        CLOSE_AI_PROMPT: {
          target: "writing",
          actions: assign({
            aiPromptOpen: false,
            aiPrompt: "",
            aiSuggestion: "",
            error: null,
          }),
        },
        UPDATE_AI_PROMPT: {
          actions: assign({
            aiPrompt: ({ event }) => event.prompt,
          }),
        },
        GENERATE_AI_CONTENT: {
          target: "generating",
          actions: assign({
            isGenerating: true,
            error: null,
          }),
        },
        CLEAR_AI_SUGGESTION: {
          actions: assign({
            aiSuggestion: "",
            isStreaming: false,
            error: null,
          }),
        },
        REJECT_SUGGESTION: {
          target: "writing",
          actions: assign({
            aiPromptOpen: false,
            aiSuggestion: "",
            aiPrompt: "",
            isStreaming: false,
            error: null,
          }),
        },
      },
    },
    generating: {
      on: {
        START_STREAMING: {
          target: "streaming",
          actions: assign({
            isGenerating: false,
            isStreaming: true,
            aiSuggestion: "",
          }),
        },
        AI_ERROR: {
          target: "writing",
          actions: assign({
            isGenerating: false,
            error: ({ event }) => event.error,
          }),
        },
      },
    },
    streaming: {
      on: {
        STREAM_CHUNK: {
          actions: assign({
            aiSuggestion: ({ context, event }) =>
              context.aiSuggestion + event.content,
          }),
        },
        END_STREAMING: {
          target: "writing",
          actions: assign({
            isStreaming: false,
            aiPrompt: "",
          }),
        },
        AI_ERROR: {
          target: "writing",
          actions: assign({
            isStreaming: false,
            error: ({ event }) => event.error,
          }),
        },
      },
    },
  },
});
