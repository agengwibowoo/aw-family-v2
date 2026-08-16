import "server-only";

import { asc } from "drizzle-orm";

import { db } from "../db";
import { ageBands } from "../schema";
import type { AgeBand, Origin } from "@/domain/age";

/**
 * The one child record and the age bands, which together are the origin every
 * age-relative thing in the app derives from.
 */

export async function getOrigin(): Promise<Origin | null> {
  const child = await db.query.children.findFirst();
  if (!child) return null;
  return { dueDate: child.dueDate, birthDate: child.birthDate };
}

export async function getChild() {
  return db.query.children.findFirst();
}

export async function listAgeBands(): Promise<AgeBand[]> {
  const rows = await db
    .select({
      id: ageBands.id,
      name: ageBands.name,
      sortOrder: ageBands.sortOrder,
      ageFromMonths: ageBands.ageFromMonths,
      ageToMonths: ageBands.ageToMonths,
    })
    .from(ageBands)
    .orderBy(asc(ageBands.sortOrder));

  return rows;
}
