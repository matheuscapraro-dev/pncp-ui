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
