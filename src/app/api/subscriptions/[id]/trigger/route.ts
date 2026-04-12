import { NextRequest, NextResponse } from "next/server";
import { getSubscription } from "@/lib/blob-storage";
import { triggerWorker } from "@/lib/trigger-worker";

type RouteParams = { params: Promise<{ id: string }> };

/** Minimum interval between ad-hoc triggers (in milliseconds). */
const TRIGGER_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

// ─── POST /api/subscriptions/[id]/trigger — ad-hoc worker trigger ────────────

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const sub = await getSubscription(id);
    if (!sub) {
      return NextResponse.json({ error: "Inscrição não encontrada." }, { status: 404 });
    }

    if (!sub.enabled) {
      return NextResponse.json(
        { error: "Inscrição está desativada. Ative-a antes de executar." },
        { status: 409 },
      );
    }

    // Enforce cooldown to prevent excessive triggers
    if (sub.lastRefreshedAt) {
      const elapsed = Date.now() - new Date(sub.lastRefreshedAt).getTime();
      if (elapsed < TRIGGER_COOLDOWN_MS) {
        const remainingMin = Math.ceil((TRIGGER_COOLDOWN_MS - elapsed) / 60_000);
        return NextResponse.json(
          { error: `Aguarde ${remainingMin} min antes de executar novamente.` },
          { status: 429 },
        );
      }
    }

    triggerWorker(id);

    return NextResponse.json({ ok: true, message: "Worker disparado." }, { status: 202 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao disparar worker";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
