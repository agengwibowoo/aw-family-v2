import Link from "next/link";

import { BarSecondary, BottomBar } from "@/components/bottom-bar";
import { Card, Stack } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { requireApproved } from "@/server/auth";
import { listHospitals } from "@/server/services/hospitals";

/**
 * Ruled out keeps its reason, loses its border and its price, and is never
 * deleted. Knowing why you said no to a place is worth as much six weeks later
 * as knowing why you said yes.
 */
export default async function RuledOut() {
  await requireApproved("/hospitals/ruled-out");

  const rows = (await listHospitals()).filter((h) => h.decision === "ruled_out");

  return (
    <>
      <header className="px-[18px] pt-[20px] pb-[13px]">
        <p className="text-ink2 text-[13px]">Where to give birth</p>
        <h1 className="mt-[2px] text-[19px] font-semibold tracking-[-0.02em]">
          Ruled out
        </h1>
      </header>

      <div className="px-[18px]">
        {rows.length === 0 ? (
          <Card>
            <EmptyState headline="Nothing ruled out yet." />
          </Card>
        ) : (
          <Stack>
            {rows.map((h) => (
              <Link key={h.id} href={`/hospitals/${h.id}`} className="block">
                <div className="py-[12px] opacity-55">
                  <p className="text-[15.5px] font-medium">{h.name}</p>
                  <p className="text-ink2 mt-[2px] text-[13px]">
                    {h.decisionReason}
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
