import Link from "next/link";
import { notFound } from "next/navigation";

import { BarPrimary, BarSecondary, BottomBar } from "@/components/bottom-bar";
import { Card, SectionLabel, Stack } from "@/components/card";
import { Chip } from "@/components/chip";
import { KeyValue } from "@/components/key-value";
import { Money, MoneyToggle } from "@/components/money";
import { VerdictCard } from "@/components/verdict-card";
import { assessCover, quoteAgeNote } from "@/domain/insurance";
import { todayInHousehold } from "@/domain/dates";
import { HOSPITAL_DECISION_WORDS, type HospitalDecision } from "@/domain/status";
import { requireApproved } from "@/server/auth";
import { getOrigin } from "@/server/services/household";
import {
  completeness,
  COMPLETENESS_TOTAL,
  coverFor,
  getHospital,
  getPolicy,
} from "@/server/services/hospitals";

import { setDecisionAction } from "../actions";

/**
 * S3 — One hospital.
 *
 * Holds around thirty fields without feeling like a form. The computed
 * insurance answer is the first thing on the screen, above even the decision
 * chip, because it is the fact that can cause financial harm.
 *
 * Groups are questions, not schema. Three open and the rest collapsed, so
 * arriving cold shows the shape of the decision without thirty fields of
 * scroll. No wizard, no steps, no progress gate.
 */
export default async function OneHospital({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireApproved(`/hospitals/${id}`);

  const [data, policy, origin] = await Promise.all([
    getHospital(id),
    getPolicy(),
    getOrigin(),
  ]);
  if (!data) notFound();

  const { hospital, quotes, insurers, papers } = data;
  const today = todayInHousehold();
  const filled = completeness(hospital);
  const blanks = COMPLETENESS_TOTAL - filled;

  const verdict = origin
    ? assessCover(
        policy ?? {
          insurerName: null,
          policyStartedOn: null,
          maternityWaitingPeriodMonths: null,
          roomEntitlement: null,
        },
        origin.dueDate,
        coverFor(insurers, policy),
      )
    : null;

  return (
    <>
      <header className="flex items-start justify-between gap-3 px-[18px] pt-[20px] pb-[13px]">
        <div className="min-w-0">
          <p className="text-ink2 text-[13px]">
            {hospital.type ?? "not filled in"}
          </p>
          <h1 className="mt-[2px] text-[22px] font-semibold tracking-[-0.02em]">
            {hospital.name}
          </h1>
        </div>
        <MoneyToggle />
      </header>

      <div className="px-[18px]">
        <Stack>
          {/* First on the screen. Three sentences of plain English, never two
              dates and a subtraction. */}
          {verdict && <VerdictCard verdict={verdict} />}

          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-wrap gap-[8px]">
              {(["picked", "shortlisted", "ruled_out"] as const).map((d) => (
                <form key={d} action={setDecisionAction}>
                  <input type="hidden" name="id" value={hospital.id} />
                  <input type="hidden" name="decision" value={d} />
                  {d === "ruled_out" && (
                    <input
                      type="hidden"
                      name="reason"
                      value={hospital.decisionReason ?? "Ruled out"}
                    />
                  )}
                  <button type="submit" disabled={hospital.decision === d}>
                    <Chip
                      tone={
                        hospital.decision === d
                          ? d === "picked"
                            ? "solid"
                            : "quiet"
                          : "outline"
                      }
                    >
                      {HOSPITAL_DECISION_WORDS[d as HospitalDecision]}
                    </Chip>
                  </button>
                </form>
              ))}
            </div>
            <span className="tabular text-ink3 shrink-0 text-[13px]">
              {filled} of {COMPLETENESS_TOTAL} filled in
            </span>
          </div>

          {hospital.decision === "ruled_out" && hospital.decisionReason && (
            <Card>
              <SectionLabel>Why it was ruled out</SectionLabel>
              <p className="mt-[6px] text-[14.5px]">{hospital.decisionReason}</p>
            </Card>
          )}

          <Group title="Getting there">
            <KeyValue
              label="In traffic"
              value={
                hospital.driveMinutesPeak !== null
                  ? `${hospital.driveMinutesPeak} min`
                  : undefined
              }
              mono
            />
            <KeyValue
              label="Normally"
              value={
                hospital.driveMinutesNormal !== null
                  ? `${hospital.driveMinutesNormal} min`
                  : undefined
              }
              mono
            />
            <KeyValue
              label="How far"
              value={hospital.distanceKm ? `${hospital.distanceKm} km` : undefined}
              mono
            />
            <KeyValue label="Open at 2am" value={yesNo(hospital.hasIgd24h)} />
            <KeyValue label="Address" value={hospital.address ?? undefined} />
          </Group>

          <Group title="If the baby needs help">
            <KeyValue
              label="Baby intensive care"
              value={yesNo(hospital.hasNicu)}
            />
            <KeyValue label="What level" value={hospital.nicuLevel ?? undefined} />
            <KeyValue
              label="Baby stays with you"
              value={yesNo(hospital.roomingIn)}
            />
            <KeyValue
              label="Skin to skin at birth"
              value={yesNo(hospital.supportsImd)}
            />
            <KeyValue
              label="Someone to help with feeding"
              value={yesNo(hospital.hasLactationConsultant)}
            />
          </Group>

          <Group title="Money">
            {quotes.length === 0 ? (
              <KeyValue label="Package price" />
            ) : (
              quotes.map((q) => (
                <KeyValue
                  key={q.id}
                  label={`${q.deliveryType} · ${q.roomClass}`}
                  value={<Money amount={q.priceIdr} />}
                  mono
                  note={quoteAgeNote(q.quotedOn, today) ?? undefined}
                />
              ))
            )}
            <KeyValue
              label="Deposit on arrival"
              value={
                hospital.depositIdr ? (
                  <Money amount={hospital.depositIdr} />
                ) : undefined
              }
              mono
            />
            <div className="pt-[10px]">
              <Link
                href={`/hospitals/${hospital.id}/money`}
                className="text-acl text-[14.5px] font-medium"
              >
                Prices and insurance
              </Link>
            </div>
          </Group>

          <Collapsed
            title="Being there"
            summary="Who can be in the room, photos"
          >
            <KeyValue
              label="Husband in the room"
              value={yesNo(hospital.allowsHusbandInRoom)}
            />
            <KeyValue
              label="Photographer allowed"
              value={yesNo(hospital.allowsPhotographer)}
            />
          </Collapsed>

          <Collapsed
            title="Insurance"
            summary={
              insurers.length > 0
                ? `${insurers.length} checked`
                : "Nobody has checked"
            }
            href={`/hospitals/${hospital.id}/money`}
          >
            {insurers.length === 0 ? (
              <KeyValue label="Your insurer" />
            ) : (
              insurers.map((i) => (
                <KeyValue
                  key={i.id}
                  label={i.insurerName}
                  value={
                    i.accepted === null
                      ? undefined
                      : i.accepted
                        ? i.settlement === "reimbursement"
                          ? "Taken — you pay first"
                          : "Taken — they settle directly"
                        : "Not taken"
                  }
                />
              ))
            )}
          </Collapsed>

          <Collapsed
            title="Papers they want"
            summary={
              papers.length > 0 ? `${papers.length} listed` : "Nothing listed yet"
            }
            href={`/hospitals/${hospital.id}/papers`}
          >
            {papers.length === 0 ? (
              <KeyValue label="What to bring" />
            ) : (
              papers.map((p) => (
                <KeyValue
                  key={p.documentId}
                  label={p.name}
                  value={
                    p.copiesRequired > 0
                      ? `${p.copiesRequired} ${p.copiesRequired === 1 ? "copy" : "copies"}`
                      : "The original"
                  }
                />
              ))
            )}
            <div className="pt-[10px]">
              <Link href="/papers" className="text-acl text-[14.5px] font-medium">
                What we have so far
              </Link>
            </div>
          </Collapsed>

          <Collapsed title="How to reach them" summary="Phone, website, socials">
            <KeyValue label="Phone" value={hospital.phone ?? undefined} mono />
            <KeyValue label="WhatsApp" value={hospital.whatsapp ?? undefined} mono />
            <KeyValue label="Website" value={hospital.website ?? undefined} />
            <KeyValue label="Instagram" value={hospital.instagram ?? undefined} />
          </Collapsed>

          {hospital.notes && (
            <Card>
              <SectionLabel>Notes</SectionLabel>
              <p className="mt-[6px] text-[14.5px] whitespace-pre-wrap">
                {hospital.notes}
              </p>
            </Card>
          )}
        </Stack>
      </div>

      <BottomBar>
        <BarPrimary href={`/hospitals/${hospital.id}/edit`}>
          {blanks > 0 ? `Fill in the ${blanks} blanks` : "Change something"}
        </BarPrimary>
        <BarSecondary href="/hospitals" width={126}>
          All places
        </BarSecondary>
      </BottomBar>
    </>
  );
}

/** Null is not "no". A blank that could be misread as no is a bug. */
function yesNo(v: boolean | null): string | undefined {
  if (v === null) return undefined;
  return v ? "Yes" : "No";
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <SectionLabel>{title}</SectionLabel>
      <div className="mt-[6px]">{children}</div>
    </Card>
  );
}

function Collapsed({
  title,
  summary,
  href,
  children,
}: {
  title: string;
  summary: string;
  /** Where filling this group in actually happens. */
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <Card as="section">
      <details>
        <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-3">
          <span className="flex flex-col gap-[2px]">
            <span className="text-[15.5px] font-medium">{title}</span>
            <span className="text-ink2 text-[13px]">{summary}</span>
          </span>
          <span aria-hidden className="text-ink3">
            ›
          </span>
        </summary>
        <div className="mt-[6px]">{children}</div>
        {href && (
          <div className="pt-[10px]">
            <Link href={href} className="text-acl text-[14.5px] font-medium">
              Fill this in
            </Link>
          </div>
        )}
      </details>
    </Card>
  );
}
