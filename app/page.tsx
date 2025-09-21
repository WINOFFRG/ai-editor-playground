import { Editor } from "@/components/editor";
import { AppProvider } from "@/components/provider";

export default function Home() {
  return (
    <section className="min-h-screen bg-background">
      <AppProvider>
        <div className="container flex-1 flex flex-col bg-background/50 mx-auto mt-12">
          <div className="flex-1 p-6">
            <Editor />
            <footer className="mt-4 text-muted-foreground text-xs font-medium">
              😼 Made by @winoffrg
            </footer>
          </div>
        </div>
      </AppProvider>
    </section>
  );
}
