/**
 * Trigger the PNCP worker via the Render One-Off Jobs API.
 *
 * - Without `subscriptionId`: processes ALL enabled subscriptions (same as daily cron).
 * - With `subscriptionId`: injects SUBSCRIPTION_ID env var so the worker processes
 *   only that single subscription.
 *
 * Fire-and-forget by design — failures are non-critical because the daily cron
 * will catch up.
 */

const RENDER_API = "https://api.render.com/v1";
const TIMEOUT_MS = 5_000;
const DEFAULT_START_CMD = "node --max-old-space-size=512 dist/index.js";

export async function triggerWorker(subscriptionId?: string): Promise<void> {
  const apiKey = process.env.RENDER_API_KEY;
  const serviceId = process.env.RENDER_SERVICE_ID;
  if (!apiKey || !serviceId) return;

  const startCommand = subscriptionId
    ? `SUBSCRIPTION_ID=${subscriptionId} ${DEFAULT_START_CMD}`
    : DEFAULT_START_CMD;

  try {
    await fetch(`${RENDER_API}/services/${serviceId}/jobs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ startCommand }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    // Non-critical — the daily cron will catch up
  }
}
