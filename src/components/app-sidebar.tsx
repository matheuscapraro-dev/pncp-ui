"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Moon, Sun, Menu, Search } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  const { theme, setTheme } = useTheme();

  return (
    <>
      <div className="flex h-14 items-center gap-2 px-4 font-semibold">
        <FileText className="h-5 w-5 text-sidebar-primary" />
        <span>PNCP Search</span>
      </div>
      <Separator />
      <div className="flex-1 px-2 py-2">
        <nav className="flex flex-col gap-1">
          <Link href="/" onClick={onNavClick}>
            <span className="flex items-center gap-2 rounded-md bg-sidebar-accent px-3 py-2 text-sm font-medium text-sidebar-accent-foreground">
              <Search className="h-4 w-4" />
              Consulta PNCP
            </span>
          </Link>
        </nav>
        <p className="mt-4 px-3 text-[10px] leading-relaxed text-muted-foreground">
          Use os botões de &quot;Tipo de Consulta&quot; na página para alternar entre contratações, contratos e atas.
        </p>
      </div>
      <Separator />
      <div className="flex items-center justify-between p-3">
        <span className="text-xs text-muted-foreground">Tema</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Alternar tema</span>
        </Button>
      </div>
    </>
  );
}

export function AppSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger */}
      <div className="fixed left-0 top-0 z-40 flex h-14 w-full items-center gap-2 border-b bg-background px-4 md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-60 p-0">
            <aside className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
              <SidebarContent onNavClick={() => setOpen(false)} />
            </aside>
          </SheetContent>
        </Sheet>
        <span className="font-semibold">PNCP Search</span>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden h-screen w-60 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
        <SidebarContent />
      </aside>
    </>
  );
}
