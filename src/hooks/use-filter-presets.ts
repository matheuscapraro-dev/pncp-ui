"use client";

import { useState, useEffect, useCallback } from "react";
import type { FilterPreset, FilterState } from "@/types/pncp";

const STORAGE_KEY = "pncp-filter-presets";

const DEFAULT_PRESET: FilterPreset = {
  id: "default-engenharia-500k",
  nome: "Engenharia 500k+",
  filters: {
    valorMinimo: "500000",
    palavrasIncluir:
      "engenharia, construção, obra, reforma, pavimentação, ampliação, edificação, projeto",
    palavrasExcluir: "execução",
  },
  createdAt: new Date().toISOString(),
};

function loadPresets(): FilterPreset[] {
  if (typeof window === "undefined") return [DEFAULT_PRESET];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // First visit — seed with default preset
      localStorage.setItem(STORAGE_KEY, JSON.stringify([DEFAULT_PRESET]));
      return [DEFAULT_PRESET];
    }
    const parsed = JSON.parse(raw) as FilterPreset[];
    return Array.isArray(parsed) ? parsed : [DEFAULT_PRESET];
  } catch {
    return [DEFAULT_PRESET];
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
    (nome: string, filters: Partial<FilterState>) => {
      setPresets((prev) => {
        const next = [
          ...prev,
          {
            id: crypto.randomUUID(),
            nome,
            filters,
            createdAt: new Date().toISOString(),
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
