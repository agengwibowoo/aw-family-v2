import Link from "next/link";
import { notFound } from "next/navigation";

import { BarPrimary, BarSecondary, BottomBar } from "@/components/bottom-bar";
import { Card, SectionLabel, Stack } from "@/components/card";
import { Chip } from "@/components/chip";
import { LinkCard } from "@/components/link-card";
import { Money, MoneyToggle } from "@/components/money";
import { ProgressBar } from "@/components/progress";
import { Sheet, SheetChoice } from "@/components/sheet";
import { formatDayMonth } from "@/domain/dates";
import { CANDIDATE_DECISION_WORDS, ITEM_STATUS_WORDS } from "@/domain/status";
import type { CandidateDecision } from "@/domain/status";
import { requireApproved } from "@/server/auth";
import { spendFor } from "@/server/services/purchases";
import { getThing } from "@/server/services/things";

/**
 * S9 — One thing.
 *
 * Collapses the three-level model underneath — the need, what we're looking at,
 * what we have — into something she never has to understand. The two lists are
 * titled in her words and she is never asked to classify anything. There is one
 * Add button, and the branch behind it is a question, not a concept.
 *
 * Nothing on this screen is called an option, a candidate or a purchase.
 *
 * `see the detail` is the whole of the two-audience solution: it opens his
 * density, in place, at the same URL. His view is a layer, not a second app.
 */
export default async function OneThing({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ detail?: string; add?: string }>;
}) {
  const { id } = await params;
  await requireApproved(`/list/${id}`);
  const { detail, add } = await searchParams;

  const data = await getThing(id);
  if (!data) notFound();

  const { thing, detail: meta, candidates, purchases, unattributed } = data;
  const { spent, unitPrice } = await spendFor(id);

  const stillNeeded = Math.max(0, thing.need - thing.have);
  const roughly = unitPrice !== null ? unitPrice * stillNeeded : null;

  const lookingAt = candidates.filter((c) => c.decision !== "ruled_out");
  const ruledOut = candidates.filter((c) => c.decision === "ruled_out");

  return (
    <>
      <header className="flex items-end justify-between gap-3 px-[18px] pt-[20px] pb-[13px]">
        <div className="flex min-w-0 items-end gap-[12px]">
          <Link href="/list" aria-label="Back" className="text-ink2 text-[20px] leading-none">
            ‹
          </Link>
          <div className="min-w-0">
            <p className="text-ink2 text-[13px]">
              {thing.categoryName}
              {thing.giftable ? " · could be a gift" : " · not for the registry"}
            </p>
            {/* A name someone typed. It stays in whatever language it was
                typed in. */}
            <h1 className="mt-[2px] text-[19px] font-semibold tracking-[-0.02em]">
              {thing.name}
            </h1>
          </div>
        </div>
        <MoneyToggle />
      </header>

      <div className="px-[18px] pb-[20px]">
        <Stack>
          {meta.archivedAt && (
            <Card className="border-ink">
              <p className="text-[15.5px] font-medium">
                We don&rsquo;t need any more of these.
              </p>
              <p className="text-ink2 mt-[4px] text-[13px]">
                Kept, not deleted. Everything below is still here.
              </p>
            </Card>
          )}

          <Card className="gap-[11px]">
            <div className="flex items-baseline gap-[8px]">
              <span className="tabular text-[42px] leading-none font-semibold tracking-[-0.035em]">
                {thing.have}
              </span>
              <span className="text-ink2 text-[17.5px] font-medium">
                of {thing.need}
              </span>
              <span className="ml-auto">
                <Chip tone={thing.status === "got_it" ? "solid" : "quiet"}>
                  {ITEM_STATUS_WORDS[thing.status]}
                </Chip>
              </span>
            </div>
            <ProgressBar have={thing.have} need={thing.need} />
            <p className="text-ink2 text-[13px]">
              {thing.categoryName} · {thing.bandName}
              {thing.giftable && " · could be a gift"}
            </p>
          </Card>

          <section>
            <div className="mb-[9px]">
              <SectionLabel>What we have</SectionLabel>
            </div>
            <Card className="py-0">
              {purchases.length === 0 && unattributed === 0 ? (
                <p className="text-ink3 py-[13px] text-[14.5px]">
                  Nothing yet.
                </p>
              ) : (
                <>
                  {purchases.map((p) => (
                    <div
                      key={p.id}
                      className="border-ln flex items-start justify-between gap-3 border-b py-[12px] last:border-b-0"
                    >
                      <span className="flex min-w-0 flex-col gap-[2px]">
                        <span className="text-[15.5px] font-medium">
                          {[p.brand, p.name].filter(Boolean).join(" · ") ||
                            "No brand written down"}
                        </span>
                        <span className="text-ink2 text-[13px]">
                          <span className="tabular">
                            {p.stillHave} of them
                          </span>
                          {p.whereBought && ` · ${p.whereBought}`}
                          {p.boughtOn && ` · ${formatDayMonth(p.boughtOn)}`}
                        </span>
                      </span>
                      <span className="text-ink2 shrink-0 text-[14.5px]">
                        <Money
                          amount={
                            p.pricePerUnitIdr
                              ? Number(p.pricePerUnitIdr) * p.qty
                              : null
                          }
                        />
                      </span>
                    </div>
                  ))}
                  {unattributed > 0 && (
                    <div className="border-ln flex items-start justify-between gap-3 border-b py-[12px] last:border-b-0">
                      <span className="flex min-w-0 flex-col gap-[2px]">
                        <span className="text-[15.5px] font-medium">
                          Given to us
                        </span>
                        <span className="text-ink2 tabular text-[13px]">
                          {unattributed} of them
                        </span>
                      </span>
                    </div>
                  )}
                </>
              )}
            </Card>
          </section>

          <section>
            <div className="mb-[9px]">
              <SectionLabel>Ones we&rsquo;re looking at</SectionLabel>
            </div>
            <Card className="py-0">
              {candidates.length === 0 ? (
                <p className="text-ink3 py-[13px] text-[14.5px]">
                  Nothing yet.
                </p>
              ) : (
                [...lookingAt, ...ruledOut].map((c) => (
                  <div
                    key={c.id}
                    className={
                      // His comparison work gets quieter, never deleted.
                      c.decision === "ruled_out"
                        ? "border-ln flex items-start justify-between gap-3 border-b py-[12px] opacity-55 last:border-b-0"
                        : "border-ln flex items-start justify-between gap-3 border-b py-[12px] last:border-b-0"
                    }
                  >
                    <span className="flex min-w-0 flex-col gap-[2px]">
                      <span className="text-[15.5px] font-medium">
                        {[c.brand, c.name].filter(Boolean).join(" · ") ||
                          "No name written down"}
                      </span>
                      <span className="text-ink2 text-[13px]">
                        {c.whereToBuy && `${c.whereToBuy} · `}
                        <Money amount={c.estPriceIdr} />
                      </span>
                    </span>
                    <Chip
                      tone={
                        c.decision === "picked"
                          ? "solid"
                          : c.decision === "ruled_out"
                            ? "outline"
                            : "accent"
                      }
                    >
                      {CANDIDATE_DECISION_WORDS[c.decision as CandidateDecision]}
                    </Chip>
                  </div>
                ))
              )}
            </Card>
          </section>

          {data.links.length > 0 && (
            <section>
              <div className="mb-[9px]">
                <SectionLabel>Videos and reviews</SectionLabel>
              </div>
              <div className="flex gap-[9px] overflow-x-auto">
                {data.links.map((l) => (
                  <LinkCard
                    key={l.id}
                    url={l.url}
                    title={l.title}
                    thumbnail={l.thumbnailPath}
                    creator={l.creator}
                    platform={l.platform}
                  />
                ))}
              </div>
            </section>
          )}

          {(data.materials.length > 0 || meta.promptsMaterials) && (
            <section>
              <div className="mb-[9px]">
                <SectionLabel>What it&rsquo;s made of</SectionLabel>
              </div>
              <div className="flex flex-wrap gap-[8px]">
                {data.materials.map((m) => (
                  <Chip key={m.id}>{m.name}</Chip>
                ))}
                {/* A commonly irritating material is a plain extra chip. No
                    icon, no colour, no alert — this app records, a
                    paediatrician concludes. */}
                {data.materials
                  .filter((m) => m.commonlyIrritant)
                  .map((m) => (
                    <Chip key={`${m.id}-note`} tone="outline">
                      {m.name} irritates some babies
                    </Chip>
                  ))}
                <Link href={`/list/${id}/edit`}>
                  <Chip tone="outline">+ add</Chip>
                </Link>
              </div>
            </section>
          )}

          {meta.notes && (
            <section>
              <div className="mb-[9px]">
                <SectionLabel>Notes</SectionLabel>
              </div>
              <div className="border-ln rounded-[14px] border border-dashed px-[16px] py-[15px]">
                <p className="text-[14px] leading-[1.45]">{meta.notes}</p>
              </div>
            </section>
          )}

          {/* His density, in place, at the same URL. A layer, not a second app. */}
          {detail === "1" ? (
            <Card>
              <SectionLabel>What each one would cost</SectionLabel>
              <div className="mt-[9px]">
                {candidates.length === 0 ? (
                  <p className="text-ink3 text-[14px]">
                    Nothing to compare yet.
                  </p>
                ) : (
                  candidates.map((c) => (
                    <div
                      key={c.id}
                      className="border-ln flex items-baseline justify-between gap-3 border-b py-[10px] last:border-b-0"
                    >
                      <span className="text-ink2 text-[14.5px]">
                        {[c.brand, c.name].filter(Boolean).join(" · ") || "Unnamed"}
                      </span>
                      <span className="flex flex-col items-end">
                        <span className="text-[14.5px] font-medium">
                          <Money amount={c.estPriceIdr} />
                        </span>
                        <span className="text-ink3 text-[12px]">
                          {CANDIDATE_DECISION_WORDS[c.decision as CandidateDecision]}
                        </span>
                      </span>
                    </div>
                  ))
                )}
              </div>
              <div className="border-ln mt-[9px] border-t pt-[10px]">
                <p className="text-ink2 text-[13px]">
                  Spent so far <Money amount={spent} />
                  {roughly !== null && stillNeeded > 0 && (
                    <>
                      {" · the "}
                      {stillNeeded} still needed, roughly{" "}
                      <Money amount={roughly} />
                    </>
                  )}
                </p>
                <Link
                  href={`/list/${id}`}
                  className="text-acl mt-[6px] inline-block text-[14.5px] font-medium"
                >
                  hide the detail
                </Link>
              </div>
            </Card>
          ) : (
            <div className="border-ln rounded-[14px] border px-[16px] py-[15px]">
              <p className="text-ink2 text-[13px]">
                Spent so far <Money amount={spent} />
                {roughly !== null && stillNeeded > 0 && (
                  <>
                    {" · the "}
                    {stillNeeded} still needed, roughly <Money amount={roughly} />
                  </>
                )}
                {" · "}
                <Link href={`/list/${id}?detail=1`} className="text-acl font-medium">
                  see the detail
                </Link>
              </p>
            </div>
          )}
        </Stack>
      </div>

      {/* One Add button. The branch is a question, not a concept. */}
      {add === "1" && (
        <Sheet title="Add">
          <p className="mb-[16px] text-center text-[24px] leading-[1.2] font-semibold tracking-[-0.02em]">
            Already got it, or still looking?
          </p>
          <div className="flex flex-col gap-[12px]">
            <SheetChoice href={`/add?thing=${id}`} tone="primary">
              Already got it
            </SheetChoice>
            <SheetChoice href={`/list/${id}/looking`}>Still looking</SheetChoice>
          </div>
          <p className="text-ink3 mt-[16px] text-center text-[13px]">
            One question. Everything else follows from the answer.
          </p>
        </Sheet>
      )}

      <BottomBar>
        <BarPrimary href={`/list/${id}?add=1`}>Add</BarPrimary>
        <BarSecondary href={`/list/${id}/edit`} width={140}>
          Change this
        </BarSecondary>
      </BottomBar>
    </>
  );
}
