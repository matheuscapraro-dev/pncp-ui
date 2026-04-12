"use client";

import { Badge } from "@/components/ui/badge";
import {
  CircleCheck,
  CircleX,
  Ban,
  CirclePause,
  Bookmark,
} from "lucide-react";
import type { SituacaoCompraId } from "@/types/pncp";

// ─── Situação badge (contratações) ───────────────────────────────────────────

const SITUACAO_CONFIG: Record<
  string,
  { label: string; icon: typeof CircleCheck; className: string }
> = {
  "1": {
    label: "Divulgada",
    icon: CircleCheck,
    className:
      "border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-400",
  },
  "2": {
    label: "Revogada",
    icon: CircleX,
    className:
      "border-red-500/40 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-950/40 dark:text-red-400",
  },
  "3": {
    label: "Anulada",
    icon: Ban,
    className:
      "border-orange-500/40 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-950/40 dark:text-orange-400",
  },
  "4": {
    label: "Suspensa",
    icon: CirclePause,
    className:
      "border-amber-500/40 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-400",
  },
};

export function SituacaoBadge({ id }: { id: SituacaoCompraId | string }) {
  const config = SITUACAO_CONFIG[String(id)] ?? {
    label: String(id),
    icon: CircleCheck,
    className:
      "border-gray-500/40 bg-gray-50 text-gray-700 dark:border-gray-500/30 dark:bg-gray-950/40 dark:text-gray-400",
  };
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={`gap-1 font-medium ${config.className}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

// ─── SRP badge ───────────────────────────────────────────────────────────────

export function SrpBadge({ srp }: { srp: boolean }) {
  if (!srp) return null;
  return (
    <Badge
      variant="outline"
      className="gap-1 border-blue-500/40 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-950/40 dark:text-blue-400"
    >
      <Bookmark className="h-2.5 w-2.5" />
      SRP
    </Badge>
  );
}

// ─── Cancelado badge (atas) ──────────────────────────────────────────────────

export function CanceladoBadge({ cancelado }: { cancelado: boolean }) {
  return (
    <Badge
      variant="outline"
      className={`gap-1 font-medium ${
        cancelado
          ? "border-red-500/40 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-950/40 dark:text-red-400"
          : "border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-400"
      }`}
    >
      {cancelado ? <CircleX className="h-3 w-3" /> : <CircleCheck className="h-3 w-3" />}
      {cancelado ? "Cancelada" : "Vigente"}
    </Badge>
  );
}
