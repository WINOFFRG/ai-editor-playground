"use client";

import { Editor } from "@/components/editor";
import { AppProvider } from "@/components/provider";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <AppProvider>
        <Editor />
      </AppProvider>
    </div>
  );
}
