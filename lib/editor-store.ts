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
import { DOMParser as PmDOMParser, DOMSerializer } from "prosemirror-model";
import { reactKeys } from "@handlewithcare/react-prosemirror";

export const schema = new Schema({
  nodes: addListNodes(basicSchema.spec.nodes, "paragraph block*", "block"),
  marks: basicSchema.spec.marks,
});

export const getHTMLFromState = (state: EditorState): string => {
  const fragment = DOMSerializer.fromSchema(schema).serializeFragment(
    state.doc.content
  );
  const div = document.createElement("div");
  div.appendChild(fragment);
  return div.innerHTML;
};

export const parseHTMLToProseMirror = (htmlContent: string): any => {
  try {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = htmlContent;

    const parser = PmDOMParser.fromSchema(schema);
    const parsedDoc = parser.parse(tempDiv);

    return parsedDoc;
  } catch (error) {
    console.warn("Failed to parse HTML content:", error);
    return null;
  }
};

const createSlashCommandRule = (onSlashCommand?: () => void) => ({
  match: /^\/(.*)$/,
  handler: (state: any, match: any, start: number, end: number) => {
    if (onSlashCommand) {
      onSlashCommand();
      const tr = state.tr.delete(start, end);
      return tr;
    }
    return null;
  },
  inCode: false,
  inCodeMark: false,
});

const createEditorPlugins = (onSlashCommand?: () => void) => [
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
  inputRules({ rules: [createSlashCommandRule(onSlashCommand)] }),
  reactKeys(),
];

const createEditorDocument = (content?: string) => {
  if (!content) return undefined;

  const wrap = document.createElement("div");
  wrap.innerHTML = content;
  return PmDOMParser.fromSchema(schema).parse(wrap);
};

const createEditorState = (content?: string, onSlashCommand?: () => void) => {
  const plugins = createEditorPlugins(onSlashCommand);
  const doc = createEditorDocument(content);

  return EditorState.create({
    schema,
    doc,
    plugins,
  });
};

const insertAISuggestion = (
  editorState: EditorState,
  aiSuggestion: string,
  cursorPos: number
) => {
  const { tr } = editorState;

  try {
    const parsedDoc = parseHTMLToProseMirror(aiSuggestion);

    if (parsedDoc && parsedDoc.content.size > 0) {
      const fragment = parsedDoc.content;
      tr.insert(cursorPos, fragment);
    } else {
      tr.insertText(aiSuggestion, cursorPos, cursorPos);
    }
  } catch (error) {
    console.warn("Error parsing AI suggestion:", error);
    tr.insertText(aiSuggestion, cursorPos, cursorPos);
  }

  return editorState.apply(tr);
};

const calculateNewCursorPosition = (
  cursorPosition: number,
  aiSuggestion: string
) => {
  const textLength = aiSuggestion.replace(/<[^>]*>/g, "").length;
  return cursorPosition + textLength;
};

export const editorMachine = createMachine({
  id: "editor",
  initial: "writing",
  context: {
    cursorPosition: 0,
    editorState: null as EditorState | null,
    aiPromptOpen: false,
    aiPrompt: "",
    aiSuggestion: "",
    isGenerating: false,
    isStreaming: false,
    includeContext: true,
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
      includeContext: boolean;
      error: string | null;
    },
    events: {} as
      | { type: "UPDATE_EDITOR_STATE"; editorState: EditorState }
      | { type: "ACCEPT_SUGGESTION" }
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
      | { type: "CONTINUE_WRITING" }
      | { type: "TOGGLE_INCLUDE_CONTEXT" }
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
        OPEN_SLASH_COMMAND: {
          actions: assign({
            aiPromptOpen: true,
            aiPrompt: "",
            aiSuggestion: "",
            error: null,
          }),
        },
        CONTINUE_WRITING: {
          actions: assign({
            aiPromptOpen: true,
            aiPrompt: "Continue writing from where I left off",
            aiSuggestion: "",
            error: null,
          }),
        },
        INITIALIZE_EDITOR: {
          actions: assign({
            editorState: ({ event }) =>
              createEditorState(event.content, event.onSlashCommand),
          }),
        },
        ACCEPT_SUGGESTION: {
          target: "writing",
          actions: assign({
            editorState: ({ context }) => {
              if (!context.editorState) return context.editorState;
              return insertAISuggestion(
                context.editorState,
                context.aiSuggestion,
                context.cursorPosition
              );
            },
            cursorPosition: ({ context }) =>
              calculateNewCursorPosition(
                context.cursorPosition,
                context.aiSuggestion
              ),
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
        TOGGLE_INCLUDE_CONTEXT: {
          actions: assign({
            includeContext: ({ context }) => !context.includeContext,
          }),
        },
        CLOSE_AI_PROMPT: {
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
      },
    },
    generating: {
      on: {
        UPDATE_EDITOR_STATE: {
          actions: assign({
            editorState: ({ event }) => event.editorState,
            cursorPosition: ({ event }) => event.editorState.selection.from,
          }),
        },
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
        UPDATE_EDITOR_STATE: {
          actions: assign({
            editorState: ({ event }) => event.editorState,
            cursorPosition: ({ event }) => event.editorState.selection.from,
          }),
        },
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
