import "server-only";

import { createClient } from "@supabase/supabase-js";
import { eq, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

import { db } from "../db";
import { env } from "../env";
import { documentStatus, items, scheduleEvents } from "../schema";

/**
 * Photographs of papers, scans and receipts.
 *
 * The only images in this app are ones somebody here took, and the ones that
 * matter most are KTP, Kartu Keluarga, the marriage book and insurance cards.
 * So the bucket is private and every URL is short-lived (ADR-0007): a leaked
 * year-long signed URL would be a year of unauthenticated access to the
 * household's identity documents.
 *
 * The service worker caches the *bytes* keyed by object path rather than the
 * URLs, because a cached URL is worthless at 3am — it has expired. That is why
 * nothing here ever mints a long expiry "for offline".
 */

export const MEDIA_BUCKET = "media";

/** Long enough to render a screen. Re-signed on the next render. */
const READ_URL_SECONDS = 60 * 5;

/** A phone photo of a document. Anything larger is a mistake, not a scan. */
export const MAX_SCAN_BYTES = 10 * 1024 * 1024;

/**
 * Storage needs the secret key: the bucket is private, so the browser must
 * never hold a key that can read it. This client is only ever constructed on
 * the server, inside the one module allowed to touch storage.
 */
function storage() {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false },
  }).storage.from(MEDIA_BUCKET);
}

/**
 * Add one path to an array column, as a bound parameter.
 *
 * Never string-built. A path reaches here from a caller, and an object name
 * containing a quote must be a broken filename rather than a statement.
 */
function appended(column: AnyPgColumn, path: string) {
  return sql`coalesce(${column}, '{}'::text[]) || array[${path}]::text[]`;
}

export type ScanTarget =
  | { kind: "paper"; documentId: number }
  | { kind: "date"; eventId: string }
  | { kind: "thing"; itemId: string };

function pathFor(target: ScanTarget, filename: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-64);
  const stamp = Date.now();

  switch (target.kind) {
    case "paper":
      return `papers/${target.documentId}/${stamp}-${safe}`;
    case "date":
      return `dates/${target.eventId}/${stamp}-${safe}`;
    case "thing":
      return `things/${target.itemId}/${stamp}-${safe}`;
  }
}

/**
 * Somewhere to put a photo, valid for two minutes.
 *
 * The bytes go straight from the phone to storage rather than through this
 * app, which keeps a 10MB photo off the request path entirely.
 */
export async function signUpload(
  target: ScanTarget,
  filename: string,
): Promise<{ path: string; token: string; url: string }> {
  const path = pathFor(target, filename);
  const { data, error } = await storage().createSignedUploadUrl(path);

  if (error || !data) {
    throw new Error(describeStorageError(error?.message));
  }

  return { path: data.path, token: data.token, url: data.signedUrl };
}

/**
 * Confirm the object landed, then record where it is.
 *
 * The path is only written after storage says the object exists and is within
 * size — otherwise a failed upload leaves a row pointing at nothing, and the
 * papers screen shows a broken photo at 3am.
 */
export async function attachScan(
  target: ScanTarget,
  path: string,
  by: string,
): Promise<void> {
  const { data, error } = await storage().list(dirOf(path), {
    search: baseOf(path),
    limit: 1,
  });

  if (error) throw new Error(describeStorageError(error.message));

  const object = data?.[0];
  if (!object) {
    throw new Error("That photo didn't arrive. Try taking it again.");
  }

  const size = (object.metadata as { size?: number } | null)?.size ?? 0;
  if (size > MAX_SCAN_BYTES) {
    await storage().remove([path]);
    throw new Error("That photo is too big. Try again with a smaller one.");
  }

  switch (target.kind) {
    case "paper":
      await db
        .insert(documentStatus)
        .values({
          documentId: target.documentId,
          imagePaths: [path],
          createdBy: by,
          updatedBy: by,
        })
        .onConflictDoUpdate({
          target: documentStatus.documentId,
          set: {
            imagePaths: appended(documentStatus.imagePaths, path),
            updatedBy: by,
            updatedAt: new Date(),
          },
        });
      return;

    case "date":
      await db
        .update(scheduleEvents)
        .set({
          imagePaths: appended(scheduleEvents.imagePaths, path),
          updatedBy: by,
          updatedAt: new Date(),
        })
        .where(eq(scheduleEvents.id, target.eventId));
      return;

    case "thing":
      await db
        .update(items)
        .set({
          imagePaths: appended(items.imagePaths, path),
          updatedBy: by,
          updatedAt: new Date(),
        })
        .where(eq(items.id, target.itemId));
      return;
  }
}

/**
 * A URL good for the next few minutes.
 *
 * Never longer. Anything that needs a scan without a network needs the cached
 * bytes, not a longer-lived link.
 */
export async function signedScanUrls(
  paths: readonly string[],
): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map();

  const { data, error } = await storage().createSignedUrls(
    [...paths],
    READ_URL_SECONDS,
  );

  // A missing bucket must not take down the papers screen — the words and the
  // copy counts are the part that matters at 3am, and they work without any
  // photo at all.
  if (error || !data) return new Map();

  const urls = new Map<string, string>();
  for (const d of data) {
    if (d.path && d.signedUrl) urls.set(d.path, d.signedUrl);
  }
  return urls;
}

export async function removeScan(
  target: ScanTarget,
  path: string,
  by: string,
): Promise<void> {
  await storage().remove([path]);

  const without = sql`array_remove(coalesce(image_paths, '{}'), ${path})`;

  switch (target.kind) {
    case "paper":
      await db
        .update(documentStatus)
        .set({ imagePaths: without, updatedBy: by, updatedAt: new Date() })
        .where(eq(documentStatus.documentId, target.documentId));
      return;
    case "date":
      await db
        .update(scheduleEvents)
        .set({ imagePaths: without, updatedBy: by, updatedAt: new Date() })
        .where(eq(scheduleEvents.id, target.eventId));
      return;
    case "thing":
      await db
        .update(items)
        .set({ imagePaths: without, updatedBy: by, updatedAt: new Date() })
        .where(eq(items.id, target.itemId));
      return;
  }
}

/** Whether storage is set up at all — the bucket is created by hand. */
export async function mediaBucketExists(): Promise<boolean> {
  const { error } = await storage().list("", { limit: 1 });
  return !error;
}

function dirOf(path: string): string {
  return path.slice(0, path.lastIndexOf("/"));
}

function baseOf(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}

/** The bucket is created by a human, so say which step is missing. */
function describeStorageError(message?: string): string {
  if (message?.toLowerCase().includes("bucket not found")) {
    return "The media bucket hasn't been created yet — see docs/setup.md.";
  }
  return message ?? "Storage didn't answer.";
}
