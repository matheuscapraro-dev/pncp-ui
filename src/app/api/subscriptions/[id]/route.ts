import { NextRequest, NextResponse } from "next/server";
import {
  getSubscription,
  updateSubscription,
  deleteSubscription,
  getSubscriptionResults,
} from "@/lib/blob-storage";

type RouteParams = { params: Promise<{ id: string }> };

// ─── GET /api/subscriptions/[id] — subscription + cached results ─────────────

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const sub = await getSubscription(id);
    if (!sub) {
      return NextResponse.json({ error: "Inscrição não encontrada." }, { status: 404 });
    }

    const results = await getSubscriptionResults(id);

    return NextResponse.json({
      subscription: sub,
      results: results?.items ?? [],
      totalApiResults: results?.totalApiResults ?? 0,
      filteredCount: results?.filteredCount ?? 0,
      refreshedAt: results?.refreshedAt ?? null,
    });
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
    const updated = await updateSubscription(id, body);

    if (!updated) {
      return NextResponse.json({ error: "Inscrição não encontrada." }, { status: 404 });
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
