import Link from "next/link";

import { BarSecondary, BottomBar } from "@/components/bottom-bar";
import { Card, Stack } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { requireApproved } from "@/server/auth";
import { listHospitals } from "@/server/services/hospitals";

/**
 * Places taken off the list — a duplicate, a typo, something that was never
 * really a candidate.
 *
 * Not the same screen as Ruled out, and deliberately not the same word. Ruling
 * a place out is a decision worth reading back six weeks later. This is a
 * mistake being tidied up, and everything it knew is still underneath it.
 */
export default async function Removed() {
  await requireApproved("/hospitals/removed");

  const rows = await listHospitals({ removedOnly: true });

  return (
    <>
      <header className="px-[18px] pt-[20px] pb-[13px]">
        <p className="text-ink2 tabular text-[13px]">
          {rows.length === 1
            ? "1 place, taken off the list"
            : `${rows.length} places, taken off the list`}
        </p>
        <h1 className="mt-[2px] text-[19px] font-semibold tracking-[-0.02em]">
          Removed
        </h1>
      </header>

      <div className="px-[18px]">
        {rows.length === 0 ? (
          <Card>
            <EmptyState headline="Nothing has been taken off the list." />
          </Card>
        ) : (
          <Stack>
            {rows.map((h) => (
              <Link key={h.id} href={`/hospitals/${h.id}`} className="block">
                <div className="py-[12px] opacity-55">
                  <p className="text-[15.5px] font-medium">{h.name}</p>
                  <p className="text-ink2 mt-[2px] text-[13px]">
                    Open it to put it back.
                  </p>
                </div>
              </Link>
            ))}
          </Stack>
        )}
      </div>

      <BottomBar>
        <BarSecondary href="/hospitals" width={160}>
          All places
        </BarSecondary>
      </BottomBar>
    </>
  );
}
