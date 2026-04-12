"use client";

import { useState, useEffect, useCallback } from "react";
import type { FilterPreset, FilterState } from "@/types/pncp";

const STORAGE_KEY = "pncp-filter-presets";

const DEFAULT_PRESETS: FilterPreset[] = [
  {
    id: "default-engenharia-500k",
    nome: "Engenharia 500k+",
    filters: {
      valorMinimo: "500000",
      palavrasIncluir:
        "engenharia, construção, obra, reforma, pavimentação, ampliação, edificação, projeto",
      palavrasExcluir: "execução",
    },
    createdAt: new Date().toISOString(),
  },
  {
    id: "default-propostas-abertas",
    nome: "Propostas Abertas (A Receber)",
    filters: {
      searchMode: "proposta",
      statusProposta: "a_receber",
    },
    createdAt: new Date().toISOString(),
  },
];

function loadPresets(): FilterPreset[] {
  if (typeof window === "undefined") return DEFAULT_PRESETS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // First visit — seed with default presets
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PRESETS));
      return DEFAULT_PRESETS;
    }
    const parsed = JSON.parse(raw) as FilterPreset[];
    return Array.isArray(parsed) ? parsed : DEFAULT_PRESETS;
  } catch {
    return DEFAULT_PRESETS;
  }
}

function persistPresets(presets: FilterPreset[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

export function useFilterPresets() {
  const [presets, setPresets] = useState<FilterPreset[]>([]);

  useEffect(() => {
    setPresets(loadPresets());
  }, []);

  const savePreset = useCallback(
    (nome: string, filters: Partial<FilterState>, relativeDateRange?: number) => {
      setPresets((prev) => {
        const next = [
          ...prev,
          {
            id: crypto.randomUUID(),
            nome,
            filters,
            createdAt: new Date().toISOString(),
            ...(relativeDateRange != null ? { relativeDateRange } : {}),
          },
        ];
        persistPresets(next);
        return next;
      });
    },
    []
  );

  const deletePreset = useCallback((id: string) => {
    setPresets((prev) => {
      const next = prev.filter((p) => p.id !== id);
      persistPresets(next);
      return next;
    });
  }, []);

  const updatePreset = useCallback(
    (id: string, partial: Partial<Pick<FilterPreset, "nome" | "filters">>) => {
      setPresets((prev) => {
        const next = prev.map((p) => (p.id === id ? { ...p, ...partial } : p));
        persistPresets(next);
        return next;
      });
    },
    []
  );

  return { presets, savePreset, deletePreset, updatePreset };
}
