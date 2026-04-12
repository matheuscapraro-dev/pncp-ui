"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Moon, Sun, Menu, Search, Bell, Clock, AlertCircle, Loader2, BookOpen } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSubscriptions } from "@/hooks/use-subscriptions";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const { subscriptions, loading: subsLoading } = useSubscriptions();

  const isHome = pathname === "/";
  const isConsulta = pathname === "/consulta";

  return (
    <>
      <div className="flex h-14 items-center gap-2 px-4 font-semibold">
        <FileText className="h-5 w-5 text-sidebar-primary" />
        <span>PNCP Search</span>
      </div>
      <Separator />
      <ScrollArea className="flex-1">
        <div className="px-2 py-2">
          <nav className="flex flex-col gap-1">
            <Link href="/" onClick={onNavClick}>
              <span className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${isHome ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/50"}`}>
                <BookOpen className="h-4 w-4" />
                Tutorial
              </span>
            </Link>
            <Link href="/consulta" onClick={onNavClick}>
              <span className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${isConsulta ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/50"}`}>
                <Search className="h-4 w-4" />
                Consulta PNCP
              </span>
            </Link>
          </nav>

          {/* Subscriptions section */}
          <div className="mt-4">
            <div className="flex items-center gap-1.5 px-3 mb-1.5">
              <Bell className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Inscrições
              </span>
              {subscriptions.length > 0 && (
                <Badge variant="secondary" className="ml-auto h-4 px-1 text-[9px]">
                  {subscriptions.length}
                </Badge>
              )}
            </div>

            {subsLoading ? (
              <div className="flex items-center gap-2 px-3 py-2">
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">Carregando...</span>
              </div>
            ) : subscriptions.length === 0 ? (
              <p className="px-3 text-[10px] text-muted-foreground">
                Nenhuma inscrição. Use o botão &quot;Inscrever-se&quot; na busca.
              </p>
            ) : (
              <nav className="flex flex-col gap-0.5">
                {subscriptions.map((sub) => {
                  const isActive = pathname === `/inscricoes/${sub.id}`;
                  return (
                    <Link key={sub.id} href={`/inscricoes/${sub.id}`} onClick={onNavClick}>
                      <span className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs ${isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/50"}`}>
                        <span className="flex-1 truncate">{sub.nome}</span>
                        {sub.status === "pending" && (
                          <Clock className="h-3 w-3 shrink-0 text-muted-foreground" />
                        )}
                        {sub.status === "ready" && sub.lastRefreshedAt && (
                          <span className="shrink-0 text-[9px] text-muted-foreground">
                            {timeAgo(sub.lastRefreshedAt)}
                          </span>
                        )}
                        {sub.status === "error" && (
                          <AlertCircle className="h-3 w-3 shrink-0 text-destructive" />
                        )}
                      </span>
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>
        </div>
      </ScrollArea>
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
