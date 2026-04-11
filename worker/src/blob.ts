/**
 * Vercel Blob operations for the worker.
 * Uses the same blob paths as the Next.js app.
 */

import { put, list, del } from "@vercel/blob";
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
  const { blobs } = await list({ prefix: pathname, limit: 1 });
  const blob = blobs.find((b) => b.pathname === pathname);
  if (!blob) return null;

  const resp = await fetch(blob.url);
  if (!resp.ok) return null;
  return resp.json() as Promise<T>;
}

async function writeBlob(pathname: string, data: unknown): Promise<void> {
  await put(pathname, JSON.stringify(data), {
    access: "private",
    addRandomSuffix: false,
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
