import { useSelector } from "@xstate/react";
import { useAppActor } from "@/components/provider";

export function useEditorState() {
	const appActor = useAppActor();
	return useSelector(appActor, (state) => state.context.editorState);
}

export function useAIPromptState() {
	const appActor = useAppActor();
	return {
		isOpen: useSelector(appActor, (state) => state.context.aiPromptOpen),
		suggestion: useSelector(appActor, (state) => state.context.aiSuggestion),
		isStreaming: useSelector(appActor, (state) => state.context.isStreaming),
		prompt: useSelector(appActor, (state) => state.context.aiPrompt),
	};
}

export function useCursorPosition() {
	const appActor = useAppActor();
	return useSelector(appActor, (state) => state.context.cursorPosition);
}

export function useErrorState() {
	const appActor = useAppActor();
	return useSelector(appActor, (state) => state.context.error);
}
