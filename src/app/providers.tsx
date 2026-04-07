"use client";

import { LicitacoesProvider } from "@/store/licitacoes-context";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TooltipProvider delayDuration={300}>
        <LicitacoesProvider>
          {children}
          <Toaster richColors position="bottom-right" />
        </LicitacoesProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}
