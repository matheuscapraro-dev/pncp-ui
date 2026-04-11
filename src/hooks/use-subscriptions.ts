"use client";

import { useState, useEffect, useCallback } from "react";
import type { Subscription } from "@/types/subscription";

export function useSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const resp = await fetch("/api/subscriptions");
      if (resp.ok) {
        const data = await resp.json();
        setSubscriptions(data);
      }
    } catch {
      // Silently fail — subscriptions are a secondary feature
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (nome: string, filters: Subscription["filters"]) => {
      const resp = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, filters }),
      });
      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Erro ao criar inscrição");
      }
      const sub = await resp.json();
      setSubscriptions((prev) => [...prev, sub]);
      return sub as Subscription;
    },
    [],
  );

  const remove = useCallback(async (id: string) => {
    const resp = await fetch(`/api/subscriptions/${id}`, { method: "DELETE" });
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || "Erro ao excluir inscrição");
    }
    setSubscriptions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const toggle = useCallback(async (id: string, enabled: boolean) => {
    const resp = await fetch(`/api/subscriptions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || "Erro ao atualizar inscrição");
    }
    const updated = await resp.json();
    setSubscriptions((prev) =>
      prev.map((s) => (s.id === id ? updated : s)),
    );
  }, []);

  return { subscriptions, loading, refresh, create, remove, toggle };
}
