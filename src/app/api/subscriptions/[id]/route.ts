import { NextRequest, NextResponse } from "next/server";
import {
  getSubscription,
  updateSubscription,
  deleteSubscription,
  getSubscriptionResults,
  getSubscriptionRawResults,
} from "@/lib/blob-storage";
import { triggerWorker } from "@/lib/trigger-worker";

type RouteParams = { params: Promise<{ id: string }> };

// ─── GET /api/subscriptions/[id] — subscription + cached results ─────────────
// Add ?raw=1 to also include raw (unfiltered) items for interactive filtering.

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const wantRaw = request.nextUrl.searchParams.get("raw") === "1";

  try {
    const sub = await getSubscription(id);
    if (!sub) {
      return NextResponse.json({ error: "Inscrição não encontrada." }, { status: 404 });
    }

    const results = await getSubscriptionResults(id);

    const payload: Record<string, unknown> = {
      subscription: sub,
      results: results?.items ?? [],
      totalApiResults: results?.totalApiResults ?? 0,
      filteredCount: results?.filteredCount ?? 0,
      refreshedAt: results?.refreshedAt ?? null,
    };

    if (wantRaw) {
      const raw = await getSubscriptionRawResults(id);
      payload.rawItems = raw?.items ?? [];
    }

    return NextResponse.json(payload);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao buscar inscrição";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── PATCH /api/subscriptions/[id] — update subscription ─────────────────────

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const body = await request.json();
    const previous = await getSubscription(id);
    const updated = await updateSubscription(id, body);

    if (!updated) {
      return NextResponse.json({ error: "Inscrição não encontrada." }, { status: 404 });
    }

    // Trigger worker when filters change or subscription is re-enabled
    const filtersChanged = body.filters !== undefined;
    const wasEnabled = body.enabled === true && previous && !previous.enabled;
    if (filtersChanged || wasEnabled) {
      triggerWorker(id).then((r) => {
        if (!r.ok) console.error(`[subscriptions/PATCH] trigger failed for ${id}: ${r.error}`);
      });
    }

    return NextResponse.json(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao atualizar inscrição";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── DELETE /api/subscriptions/[id] — remove subscription + results ──────────

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const deleted = await deleteSubscription(id);
    if (!deleted) {
      return NextResponse.json({ error: "Inscrição não encontrada." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao excluir inscrição";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
