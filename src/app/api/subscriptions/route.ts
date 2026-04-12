import { NextRequest, NextResponse } from "next/server";
import {
  listSubscriptions,
  createSubscription,
} from "@/lib/blob-storage";
import { triggerWorker } from "@/lib/trigger-worker";
import type { Subscription, SubscriptionFilters } from "@/types/subscription";

// ─── GET /api/subscriptions — list all subscriptions ─────────────────────────

export async function GET() {
  try {
    const subs = await listSubscriptions();
    return NextResponse.json(subs);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao listar inscrições";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── POST /api/subscriptions — create a new subscription ────────────────────

interface CreateBody {
  nome: string;
  filters: SubscriptionFilters;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateBody;

    if (!body.nome || typeof body.nome !== "string" || body.nome.trim().length === 0) {
      return NextResponse.json({ error: "Nome é obrigatório." }, { status: 400 });
    }
    if (!body.filters || typeof body.filters !== "object") {
      return NextResponse.json({ error: "Filtros são obrigatórios." }, { status: 400 });
    }

    const sub: Subscription = {
      id: crypto.randomUUID(),
      nome: body.nome.trim(),
      filters: body.filters,
      enabled: true,
      status: "pending",
      createdAt: new Date().toISOString(),
      lastRefreshedAt: null,
      lastResultCount: 0,
      totalApiResults: 0,
      lastError: null,
    };

    await createSubscription(sub);

    // Fire-and-forget: trigger the worker for this specific subscription
    triggerWorker(sub.id);

    return NextResponse.json(sub, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao criar inscrição";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
