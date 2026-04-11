/**
 * Vercel Blob operations for the worker.
 * Uses the same blob paths as the Next.js app.
 */

import { put, list, del, get } from "@vercel/blob";
import type {
  SubscriptionIndex,
  SubscriptionResultsEnvelope,
  Subscription,
} from "./types.js";

const INDEX_PATH = "subscriptions/index.json";
const RESULTS_PREFIX = "subscriptions/results/";

function resultsPath(id: string): string {
  return `${RESULTS_PREFIX}${id}.json`;
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
  await writeBlob(resultsPath(envelope.subscriptionId), envelope);
}

export async function deleteResults(id: string): Promise<void> {
  const { blobs } = await list({ prefix: resultsPath(id), limit: 1 });
  const blob = blobs.find((b) => b.pathname === resultsPath(id));
  if (blob) await del(blob.url);
}
