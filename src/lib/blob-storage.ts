import { put, list, del } from "@vercel/blob";
import type {
  Subscription,
  SubscriptionIndex,
  SubscriptionResultsEnvelope,
} from "@/types/subscription";

// ─── Blob paths ──────────────────────────────────────────────────────────────

const INDEX_PATH = "subscriptions/index.json";
const RESULTS_PREFIX = "subscriptions/results/";

function resultsPath(id: string): string {
  return `${RESULTS_PREFIX}${id}.json`;
}

// ─── Low-level helpers ───────────────────────────────────────────────────────

async function readBlob<T>(pathname: string): Promise<T | null> {
  const { blobs } = await list({ prefix: pathname, limit: 1 });
  const blob = blobs.find((b) => b.pathname === pathname);
  if (!blob) return null;

  const resp = await fetch(blob.url);
  if (!resp.ok) return null;
  return resp.json() as Promise<T>;
}

async function writeBlob(pathname: string, data: unknown): Promise<string> {
  const blob = await put(pathname, JSON.stringify(data), {
    access: "private",
    addRandomSuffix: false,
    contentType: "application/json",
  });
  return blob.url;
}

async function deleteBlob(pathname: string): Promise<void> {
  const { blobs } = await list({ prefix: pathname, limit: 1 });
  const blob = blobs.find((b) => b.pathname === pathname);
  if (blob) await del(blob.url);
}

// ─── Subscription CRUD ──────────────────────────────────────────────────────

export async function listSubscriptions(): Promise<Subscription[]> {
  const index = await readBlob<SubscriptionIndex>(INDEX_PATH);
  return index?.subscriptions ?? [];
}

export async function getSubscription(id: string): Promise<Subscription | null> {
  const all = await listSubscriptions();
  return all.find((s) => s.id === id) ?? null;
}

export async function createSubscription(sub: Subscription): Promise<void> {
  const all = await listSubscriptions();
  all.push(sub);
  await writeBlob(INDEX_PATH, {
    subscriptions: all,
    updatedAt: new Date().toISOString(),
  } satisfies SubscriptionIndex);
}

export async function updateSubscription(
  id: string,
  partial: Partial<Omit<Subscription, "id">>,
): Promise<Subscription | null> {
  const all = await listSubscriptions();
  const idx = all.findIndex((s) => s.id === id);
  if (idx === -1) return null;

  all[idx] = { ...all[idx], ...partial };
  await writeBlob(INDEX_PATH, {
    subscriptions: all,
    updatedAt: new Date().toISOString(),
  } satisfies SubscriptionIndex);

  return all[idx];
}

export async function deleteSubscription(id: string): Promise<boolean> {
  const all = await listSubscriptions();
  const filtered = all.filter((s) => s.id !== id);
  if (filtered.length === all.length) return false;

  await writeBlob(INDEX_PATH, {
    subscriptions: filtered,
    updatedAt: new Date().toISOString(),
  } satisfies SubscriptionIndex);

  // Also delete cached results
  await deleteBlob(resultsPath(id));
  return true;
}

// ─── Results ─────────────────────────────────────────────────────────────────

export async function getSubscriptionResults(
  id: string,
): Promise<SubscriptionResultsEnvelope | null> {
  return readBlob<SubscriptionResultsEnvelope>(resultsPath(id));
}

export async function saveSubscriptionResults(
  envelope: SubscriptionResultsEnvelope,
): Promise<void> {
  await writeBlob(resultsPath(envelope.subscriptionId), envelope);
}
