/**
 * Trigger the PNCP worker via the Render API.
 *
 * Two strategies depending on the context:
 *
 * 1. **Cron trigger** (`POST /v1/cron-jobs/{id}/runs`)
 *    Triggers the cron service with its configured CMD. No way to pass env vars.
 *    Used as the primary trigger and as fallback when one-off jobs fail.
 *
 * 2. **One-off job** (`POST /v1/services/{id}/jobs`)
 *    Creates a short-lived job with a custom `startCommand`, allowing us to inject
 *    `SUBSCRIPTION_ID=<uuid>` so the worker processes only one subscription.
 *    Used for targeted ad-hoc runs.
 *
 * Returns `{ ok, error? }` so callers can surface real errors to the user.
 */

const RENDER_API = "https://api.render.com/v1";
const TIMEOUT_MS = 8_000;
const DEFAULT_START_CMD = "node --max-old-space-size=512 dist/index.js";

export interface TriggerResult {
  ok: boolean;
  error?: string;
}

function getConfig(): { apiKey: string; serviceId: string } | null {
  const apiKey = process.env.RENDER_API_KEY;
  const serviceId = process.env.RENDER_SERVICE_ID;
  if (!apiKey || !serviceId) return null;
  return { apiKey, serviceId };
}

function authHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

/**
 * Strategy 1: Trigger a cron job run.
 * Works for `crn-*` service IDs. Runs the cron's configured CMD.
 */
async function triggerCronRun(apiKey: string, serviceId: string): Promise<TriggerResult> {
  const resp = await fetch(`${RENDER_API}/cron-jobs/${serviceId}/runs`, {
    method: "POST",
    headers: authHeaders(apiKey),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (resp.ok) return { ok: true };

  const body = await resp.text().catch(() => "");
  return { ok: false, error: `Render cron trigger ${resp.status}: ${body}` };
}

/**
 * Strategy 2: Create a one-off job with a custom startCommand.
 * Allows injecting SUBSCRIPTION_ID for targeted processing.
 */
async function createOneOffJob(
  apiKey: string,
  serviceId: string,
  subscriptionId: string,
): Promise<TriggerResult> {
  const startCommand = `SUBSCRIPTION_ID=${subscriptionId} ${DEFAULT_START_CMD}`;

  const resp = await fetch(`${RENDER_API}/services/${serviceId}/jobs`, {
    method: "POST",
    headers: authHeaders(apiKey),
    body: JSON.stringify({ startCommand }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (resp.ok || resp.status === 201) return { ok: true };

  const body = await resp.text().catch(() => "");
  return { ok: false, error: `Render one-off job ${resp.status}: ${body}` };
}

/**
 * Public API — triggers the worker.
 *
 * - Without `subscriptionId`: triggers the cron run (processes all enabled).
 * - With `subscriptionId`: tries a one-off job first (targeted); falls back to
 *   cron trigger if one-off jobs aren't supported for this service type.
 */
export async function triggerWorker(subscriptionId?: string): Promise<TriggerResult> {
  const cfg = getConfig();
  if (!cfg) {
    return { ok: false, error: "RENDER_API_KEY ou RENDER_SERVICE_ID não configurados." };
  }

  const { apiKey, serviceId } = cfg;

  // No subscription ID — just trigger the cron
  if (!subscriptionId) {
    return triggerCronRun(apiKey, serviceId);
  }

  // Try targeted one-off job first
  const oneOff = await createOneOffJob(apiKey, serviceId, subscriptionId);
  if (oneOff.ok) return oneOff;

  // Fallback: trigger full cron run (processes all, but at least it runs)
  console.warn(
    `[trigger-worker] One-off job failed (${oneOff.error}), falling back to cron trigger.`,
  );
  return triggerCronRun(apiKey, serviceId);
}
