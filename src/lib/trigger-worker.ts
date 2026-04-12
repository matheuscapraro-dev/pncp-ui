/**
 * Trigger the PNCP worker via the Render cron API.
 *
 * Flow:
 * 1. If a `subscriptionId` is provided, write a trigger-request blob so the
 *    worker knows to process only that subscription.
 * 2. Call `POST /v1/cron-jobs/{id}/runs` to start the cron.
 *
 * One-off jobs (`POST /v1/services/{id}/jobs`) are NOT used because cron
 * services on Render don't propagate env vars to one-off jobs, causing
 * silent failures.
 *
 * Returns `{ ok, error? }` so callers can surface real errors to the user.
 */

import { put, get } from "@vercel/blob";

const RENDER_API = "https://api.render.com/v1";
const TIMEOUT_MS = 10_000;
const TRIGGER_REQUEST_PATH = "subscriptions/trigger-request.json";

export interface TriggerResult {
  ok: boolean;
  error?: string;
}

export interface TriggerRequest {
  subscriptionId: string;
  requestedAt: string;
}

function getConfig(): { apiKey: string; serviceId: string } | null {
  const apiKey = process.env.RENDER_API_KEY;
  const serviceId = process.env.RENDER_SERVICE_ID;
  if (!apiKey || !serviceId) return null;
  return { apiKey, serviceId };
}

/** Write a trigger-request blob so the worker processes a single subscription. */
async function writeTriggerRequest(subscriptionId: string): Promise<void> {
  const payload: TriggerRequest = {
    subscriptionId,
    requestedAt: new Date().toISOString(),
  };
  await put(TRIGGER_REQUEST_PATH, JSON.stringify(payload), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

/** Check if the worker lock is currently active (another run in progress). */
async function isWorkerLocked(): Promise<boolean> {
  const LOCK_PATH = "subscriptions/worker-lock.json";
  const LOCK_TTL_MS = 30 * 60 * 1000;
  try {
    const result = await get(LOCK_PATH, { access: "private" });
    if (!result || result.statusCode !== 200 || !result.stream) return false;
    const text = await new Response(result.stream).text();
    const lock = JSON.parse(text) as { startedAt: string };
    const age = Date.now() - new Date(lock.startedAt).getTime();
    return age < LOCK_TTL_MS;
  } catch {
    return false;
  }
}

/** Trigger the cron run via Render API. */
async function triggerCronRun(apiKey: string, serviceId: string): Promise<TriggerResult> {
  const resp = await fetch(`${RENDER_API}/cron-jobs/${serviceId}/runs`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (resp.ok) return { ok: true };

  const body = await resp.text().catch(() => "");
  return { ok: false, error: `Render cron trigger ${resp.status}: ${body}` };
}

/**
 * Public API — triggers the worker.
 *
 * - Without `subscriptionId`: triggers the cron (processes all enabled subs).
 * - With `subscriptionId`: writes a trigger-request blob, then triggers cron.
 *   The worker reads the blob and processes only that subscription.
 */
export async function triggerWorker(subscriptionId?: string): Promise<TriggerResult> {
  const cfg = getConfig();
  if (!cfg) {
    return { ok: false, error: "RENDER_API_KEY ou RENDER_SERVICE_ID não configurados." };
  }

  const { apiKey, serviceId } = cfg;

  // Check if another worker run is active
  const locked = await isWorkerLocked();
  if (locked) {
    return { ok: false, error: "Worker já está em execução. Tente novamente em alguns minutos." };
  }

  // Write trigger request so worker knows which subscription to process
  if (subscriptionId) {
    try {
      await writeTriggerRequest(subscriptionId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao gravar trigger request";
      return { ok: false, error: msg };
    }
  }

  return triggerCronRun(apiKey, serviceId);
}
