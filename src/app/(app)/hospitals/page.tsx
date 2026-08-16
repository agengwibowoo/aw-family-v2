import Link from "next/link";

import { BarPrimary, BottomBar } from "@/components/bottom-bar";
import { Card, Stack } from "@/components/card";
import { Chip } from "@/components/chip";
import { EmptyState } from "@/components/empty-state";
import { Money, MoneyToggle } from "@/components/money";
import { ProgressBar } from "@/components/progress";
import { assessCover } from "@/domain/insurance";
import { HOSPITAL_DECISION_WORDS, type HospitalDecision } from "@/domain/status";
import { requireApproved } from "@/server/auth";
import { getOrigin } from "@/server/services/household";
import {
  cheapestNormalPrice,
  completeness,
  COMPLETENESS_TOTAL,
  listHospitals,
  getPolicy,
  type Hospital,
} from "@/server/services/hospitals";

/**
 * S2 — Where to give birth.
 *
 * Answers "where are we up to", not "what are these places". Decision word
 * first, name second.
 *
 * The insurance sentence is on the list rather than two taps down: it is the
 * fact most likely to cause financial harm.
 */
export default async function Hospitals() {
  await requireApproved("/hospitals");

  const [rows, policy, origin] = await Promise.all([
    listHospitals(),
    getPolicy(),
    getOrigin(),
  ]);

  const cheapestBy = await cheapestNormalPrice();

  const inPlay = rows.filter((h) => h.decision !== "ruled_out");
  const ruledOut = rows.filter((h) => h.decision === "ruled_out");

  return (
    <>
      <header className="flex items-start justify-between gap-3 px-[18px] pt-[20px] pb-[13px]">
        <div>
          <p className="text-ink2 text-[13px]">
            {inPlay.length} still in the running
          </p>
          <h1 className="mt-[2px] text-[19px] font-semibold tracking-[-0.02em]">
            Where to give birth
          </h1>
        </div>
        <MoneyToggle />
      </header>

      <div className="px-[18px]">
        {rows.length === 0 ? (
          <Card>
            <EmptyState
              headline="No places on the list yet."
              sub="Add the first one you're thinking about."
              action={{ label: "Add a place", href: "/hospitals/new" }}
            />
          </Card>
        ) : (
          <Stack>
            {inPlay.map((h) => (
              <HospitalCard
                key={h.id}
                hospital={h}
                price={cheapestBy.get(h.id) ?? null}
                sentence={
                  origin
                    ? assessCover(
                        policy ?? {
                          insurerName: null,
                          policyStartedOn: null,
                          maternityWaitingPeriodMonths: null,
                          roomEntitlement: null,
                        },
                        origin.dueDate,
                      ).headline
                    : null
                }
              />
            ))}

            {ruledOut.length > 0 && (
              <Link
                href="/hospitals/ruled-out"
                className="text-ink2 border-ln flex min-h-[52px] items-center justify-between rounded-[14px] border px-[16px] text-[14.5px]"
              >
                <span>
                  {ruledOut.length} ruled out
                </span>
                <span aria-hidden>›</span>
              </Link>
            )}
          </Stack>
        )}
      </div>

      <BottomBar>
        <BarPrimary href="/hospitals/new">Add a place</BarPrimary>
      </BottomBar>
    </>
  );
}

function HospitalCard({
  hospital,
  price,
  sentence,
}: {
  hospital: Hospital;
  price: string | null;
  sentence: string | null;
}) {
  const filled = completeness(hospital);
  const thin = filled < COMPLETENESS_TOTAL / 2;

  const facts = [
    hospital.driveMinutesPeak !== null &&
      `${hospital.driveMinutesPeak} min in traffic`,
    hospital.hasNicu === true && "Baby intensive care",
    hospital.hasNicu === false && "No baby intensive care",
    hospital.hasIgd24h === true && "Open at 2am",
  ].filter(Boolean) as string[];

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        {/* Decision word first, name second. */}
        <Chip tone={hospital.decision === "picked" ? "solid" : "quiet"}>
          {HOSPITAL_DECISION_WORDS[hospital.decision as HospitalDecision]}
        </Chip>
        <span className="tabular text-ink3 shrink-0 text-[13px]">
          {filled} of {COMPLETENESS_TOTAL} filled in
        </span>
      </div>

      <Link href={`/hospitals/${hospital.id}`} className="mt-[8px] block">
        <h2 className="text-[19px] font-semibold tracking-[-0.02em]">
          {hospital.name}
        </h2>
      </Link>

      {facts.length > 0 && (
        <div className="mt-[9px] flex flex-wrap gap-[6px]">
          {facts.map((f) => (
            <Chip key={f} tone="outline">
              {f}
            </Chip>
          ))}
        </div>
      )}

      {/* Unknown is a sentence, never an absence. */}
      <p className="text-ink2 mt-[10px] text-[13px]">
        {sentence ?? "Nobody has checked the insurance for this one."}
      </p>

      <div className="border-ln mt-[10px] flex items-baseline justify-between border-t pt-[10px]">
        <span className="text-ink2 text-[14.5px]">Normal birth</span>
        <Money amount={price} className="text-[14.5px] font-medium" />
      </div>

      {thin && (
        <div className="mt-[13px]">
          <ProgressBar have={filled} need={COMPLETENESS_TOTAL} />
          <Link
            href={`/hospitals/${hospital.id}`}
            className="text-acl mt-[9px] inline-block text-[14.5px] font-medium"
          >
            Fill in the rest
          </Link>
        </div>
      )}
    </Card>
  );
}
