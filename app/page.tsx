"use client";

import { Editor } from "@/components/editor";
import { AppProvider } from "@/components/provider";
import { useEffect } from "react";
import { handleTokenAuth } from "@/lib/auth-client";

export default function Home() {
  useEffect(() => {
    handleTokenAuth();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <AppProvider>
        <Editor />
      </AppProvider>
    </div>
  );
}
