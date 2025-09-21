import { ReactNode, createContext, useContext } from "react";
import { useMachine } from "@xstate/react";
import { editorMachine } from "@/lib/editor-store";
import { Actor } from "xstate";

const AppContext = createContext<Actor<typeof editorMachine> | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
	const [, , actor] = useMachine(editorMachine);

	return <AppContext.Provider value={actor}>{children}</AppContext.Provider>;
}

export function useAppActor() {
	const actor = useContext(AppContext);
	if (!actor) throw new Error("useAppActor must be used inside AppProvider");
	return actor;
}
