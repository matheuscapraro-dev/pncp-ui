/**
 * Vercel Blob operations for the worker.
 * Uses the same blob paths as the Next.js app.
 */

import { put, list, del, get } from "@vercel/blob";
import type {
  SubscriptionIndex,
  SubscriptionResultsEnvelope,
  SubscriptionRawEnvelope,
  Subscription,
} from "./types.js";

const INDEX_PATH = "subscriptions/index.json";
const RESULTS_PREFIX = "subscriptions/results/";
const RAW_PREFIX = "subscriptions/raw/";
const LOCK_PATH = "subscriptions/worker-lock.json";
const TRIGGER_REQUEST_PATH = "subscriptions/trigger-request.json";

/** Lock is considered stale after 30 minutes (crashed worker). */
const LOCK_TTL_MS = 30 * 60 * 1000;

function resultsPath(id: string): string {
  return `${RESULTS_PREFIX}${id}.json`;
}

function rawPath(id: string): string {
  return `${RAW_PREFIX}${id}.json`;
}

async function readBlob<T>(pathname: string): Promise<T | null> {
  const result = await get(pathname, { access: "private" });
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  const text = await new Response(result.stream).text();
  return JSON.parse(text) as T;
}

async function writeBlob(pathname: string, data: unknown): Promise<void> {
  await put(pathname, JSON.stringify(data), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

/**
 * Stream a JSON envelope with a large `items` array to Vercel Blob without
 * ever materializing the entire JSON string in memory.  Each item is
 * stringified individually (~1-2 KB), keeping peak allocation minimal.
 */
function streamEnvelopeToBlob(
  pathname: string,
  headerFields: Record<string, string | number>,
  items: unknown[],
): Promise<void> {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // Build the opening JSON: {"field1":"val",...,"items":[
      const parts = Object.entries(headerFields).map(
        ([k, v]) => `${JSON.stringify(k)}:${JSON.stringify(v)}`,
      );
      controller.enqueue(encoder.encode(`{${parts.join(",")},"items":[`));

      for (let i = 0; i < items.length; i++) {
        const prefix = i > 0 ? "," : "";
        controller.enqueue(encoder.encode(prefix + JSON.stringify(items[i])));
      }

      controller.enqueue(encoder.encode("]}"));
      controller.close();
    },
  });

  return put(pathname, stream, {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  }).then(() => undefined);
}

export async function loadSubscriptions(): Promise<Subscription[]> {
  const index = await readBlob<SubscriptionIndex>(INDEX_PATH);
  return index?.subscriptions ?? [];
}

export async function saveSubscriptions(subs: Subscription[]): Promise<void> {
  await writeBlob(INDEX_PATH, {
    subscriptions: subs,
    updatedAt: new Date().toISOString(),
  } satisfies SubscriptionIndex);
}

export async function saveResults(
  envelope: SubscriptionResultsEnvelope,
): Promise<void> {
  await streamEnvelopeToBlob(
    resultsPath(envelope.subscriptionId),
    {
      subscriptionId: envelope.subscriptionId,
      refreshedAt: envelope.refreshedAt,
      totalApiResults: envelope.totalApiResults,
      filteredCount: envelope.filteredCount,
    },
    envelope.items,
  );
}

export async function saveRawResults(
  envelope: SubscriptionRawEnvelope,
): Promise<void> {
  await streamEnvelopeToBlob(
    rawPath(envelope.subscriptionId),
    {
      subscriptionId: envelope.subscriptionId,
      refreshedAt: envelope.refreshedAt,
      totalApiResults: envelope.totalApiResults,
    },
    envelope.items,
  );
}

export async function deleteResults(id: string): Promise<void> {
  const { blobs } = await list({ prefix: resultsPath(id), limit: 1 });
  const blob = blobs.find((b) => b.pathname === resultsPath(id));
  if (blob) await del(blob.url);
  // Also delete raw results
  const { blobs: rawBlobs } = await list({ prefix: rawPath(id), limit: 1 });
  const rawBlob = rawBlobs.find((b) => b.pathname === rawPath(id));
  if (rawBlob) await del(rawBlob.url);
}

// ─── Worker lock ─────────────────────────────────────────────────────────────

export interface WorkerLock {
  startedAt: string;
  pid: number;
  subscriptionId?: string;
}

/**
 * Try to acquire the worker lock.
 * Returns `true` if the lock was acquired, `false` if another run is active.
 * Automatically breaks stale locks (older than LOCK_TTL_MS).
 */
export async function acquireLock(subscriptionId?: string): Promise<boolean> {
  const existing = await readBlob<WorkerLock>(LOCK_PATH);

  if (existing) {
    const age = Date.now() - new Date(existing.startedAt).getTime();
    if (age < LOCK_TTL_MS) {
      return false; // another run is active
    }
    // Stale lock — proceed and overwrite
    console.log(`⚠ Lock stale (${(age / 60_000).toFixed(0)}min), quebrando.`);
  }

  const lock: WorkerLock = {
    startedAt: new Date().toISOString(),
    pid: process.pid,
    ...(subscriptionId && { subscriptionId }),
  };

  await writeBlob(LOCK_PATH, lock);
  return true;
}

export async function releaseLock(): Promise<void> {
  try {
    const { blobs } = await list({ prefix: LOCK_PATH, limit: 1 });
    const blob = blobs.find((b) => b.pathname === LOCK_PATH);
    if (blob) await del(blob.url);
  } catch {
    // Best-effort — stale lock will be broken by TTL
  }
}

// ─── Trigger request ─────────────────────────────────────────────────────────

export interface TriggerRequest {
  subscriptionId: string;
  requestedAt: string;
}

/**
 * Read a trigger-request blob written by the Next.js API.
 * Returns the request or null if none exists.
 */
export async function readTriggerRequest(): Promise<TriggerRequest | null> {
  return readBlob<TriggerRequest>(TRIGGER_REQUEST_PATH);
}

/**
 * Delete the trigger-request blob so it isn't picked up by future runs.
 */
export async function deleteTriggerRequest(): Promise<void> {
  try {
    const { blobs } = await list({ prefix: TRIGGER_REQUEST_PATH, limit: 1 });
    const blob = blobs.find((b) => b.pathname === TRIGGER_REQUEST_PATH);
    if (blob) await del(blob.url);
  } catch {
    // Best-effort
  }
}
