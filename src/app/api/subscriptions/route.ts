import { NextRequest, NextResponse } from "next/server";
import {
  listSubscriptions,
  createSubscription,
} from "@/lib/blob-storage";
import type { Subscription, SubscriptionFilters } from "@/types/subscription";

// ─── Render API trigger ──────────────────────────────────────────────────────

async function triggerRenderCron() {
  const apiKey = process.env.RENDER_API_KEY;
  const serviceId = process.env.RENDER_SERVICE_ID;
  if (!apiKey || !serviceId) return; // silently skip if not configured

  try {
    await fetch(`https://api.render.com/v1/services/${serviceId}/jobs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    // Non-critical — the daily cron will catch up
  }
}

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

    // Fire-and-forget: trigger the Render cron to process immediately
    triggerRenderCron();

    return NextResponse.json(sub, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao criar inscrição";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
