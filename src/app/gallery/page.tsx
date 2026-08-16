"use client";

import { useState } from "react";

import { ActionCard, LaterButton } from "@/components/action-card";
import { BarPrimary, BarSecondary, BottomBar } from "@/components/bottom-bar";
import { Card, SectionLabel, Stack } from "@/components/card";
import { Chip } from "@/components/chip";
import { CompareCell } from "@/components/compare-cell";
import { ConfirmationCard } from "@/components/confirmation";
import { DateBlock, WindowBlock } from "@/components/date-block";
import { AllDone, NothingMatches, NothingYet } from "@/components/empty-state";
import { KeyValue } from "@/components/key-value";
import { LinkCard } from "@/components/link-card";
import { Money, MoneyProvider, MoneyToggle } from "@/components/money";
import { PhotoSlot } from "@/components/photo-slot";
import { ProgressWithCount } from "@/components/progress";
import { ReadinessBanner } from "@/components/readiness-banner";
import { TabBar } from "@/components/tab-bar";
import { ThingRow } from "@/components/thing-row";
import { assessCover } from "@/domain/insurance";
import { countdownLine } from "@/domain/age";

/**
 * Every component, in the states that are easy to get wrong. Not a screen —
 * a reference to hold next to design-handoff/Newborn Prep Hi-Fi.dc.html.
 */

const TODAY = "2026-08-15";
const ORIGIN = { dueDate: "2026-10-14", birthDate: null };

export default function Gallery() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  function flip() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.dataset.theme = next;
  }

  const verdict = assessCover(
    {
      insurerName: "Insurer",
      policyStartedOn: "2026-03-01",
      maternityWaitingPeriodMonths: 12,
      roomEntitlement: "Kelas 1",
    },
    ORIGIN.dueDate,
  );

  return (
    <MoneyProvider>
      <div className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col">
        <header className="flex items-center justify-between px-[18px] pt-[20px] pb-[13px]">
          <div>
            <p className="text-ink2 text-[13px]">
              Tue 15 Aug ·{" "}
              <span className="tabular text-[12.5px]">
                {countdownLine(ORIGIN, TODAY)}
              </span>
            </p>
            <h1 className="mt-[2px] text-[19px] font-semibold tracking-[-0.02em]">
              Components
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <MoneyToggle />
            <button
              type="button"
              onClick={flip}
              className="border-ln2 text-ink2 h-[44px] rounded-full border px-3 text-[12px]"
            >
              {theme === "light" ? "Dark" : "Light"}
            </button>
          </div>
        </header>

        <main className="flex flex-col gap-[26px] px-[18px] pb-[26px]">
          <Section label="16 · Readiness banner">
            <Stack>
              <ReadinessBanner
                ready={false}
                headline="Not ready yet"
                sub="Two papers still to sort out."
                have={6}
                need={8}
              />
              <ReadinessBanner
                ready
                headline="All 8 ready"
                sub="You can leave whenever you need to."
                have={8}
                need={8}
              />
            </Stack>
          </Section>

          <Section label="2 · Action card">
            <Stack>
              <ActionCard
                title="Get 8 newborn nappies"
                reason="Hospital bag · wanted by 15 Sep"
                actionLabel="Got it"
                href="/gallery"
                onLater={<LaterButton />}
              />
              <ActionCard
                title="Check-up"
                reason="Tomorrow 10:00 · RS Pondok Indah"
                actionLabel="What to bring"
                href="/gallery"
              />
            </Stack>
          </Section>

          <Section label="1 · Row for one thing">
            <Card className="py-0">
              <ThingRow
                name="Popok newborn"
                have={4}
                need={12}
                status="still_need"
                href="/gallery"
              />
              <ThingRow
                name="Botol susu"
                have={6}
                need={6}
                status="got_it"
                giftable
                href="/gallery"
              />
              <ThingRow
                name="Waslap bayi katun lembut isi 12"
                have={10}
                need={6}
                status="more_than_enough"
                href="/gallery"
              />
            </Card>
          </Section>

          <Section label="4 · Status word chips">
            <Card className="flex flex-wrap gap-[8px]">
              <Chip>Still need this</Chip>
              <Chip tone="solid">Got it</Chip>
              <Chip>More than enough</Chip>
              <Chip tone="accent">Looking at it</Chip>
              <Chip tone="outline">Ruled out</Chip>
              <Chip tone="outline">not filled in</Chip>
            </Card>
          </Section>

          <Section label="3 · Progress with its count">
            <Card>
              <ProgressWithCount label="Hospital bag" have={4} need={11} />
            </Card>
          </Section>

          <Section label="5 · Money, and 10 · key-value rows">
            <Card>
              <KeyValue label="Normal birth" value={<Money amount={18500000} />} mono />
              <KeyValue
                label="Caesar"
                value={<Money amount={32000000} />}
                mono
                note="asked 4 months ago"
              />
              <KeyValue label="Deposit on arrival" />
              <KeyValue label="In traffic" value="55 min" mono />
            </Card>
            <p className="text-ink3 mt-[8px] text-[12px]">
              Toggle the Rp above. Nothing on this card is allowed to move.
            </p>
          </Section>

          <Section label="Computed insurance sentence">
            <Card className="border-ink">
              <p className="text-[16.5px] font-medium tracking-[-0.01em]">
                {verdict.headline}
              </p>
              {verdict.reason && (
                <p className="text-ink2 mt-[6px] text-[13px]">{verdict.reason}</p>
              )}
              {verdict.consequence && (
                <p className="text-ink2 mt-[4px] text-[13px]">
                  {verdict.consequence}
                </p>
              )}
            </Card>
          </Section>

          <Section label="7 · Date blocks — a period is a different shape">
            <Card className="flex items-center gap-[16px]">
              <span className="flex items-center gap-[12px]">
                <DateBlock date="2026-08-18" />
                <span className="text-[13px]">Kontrol kandungan · 10:00</span>
              </span>
            </Card>
            <div className="mt-[13px]">
              <Card className="flex items-center gap-[12px]">
                <WindowBlock from="2026-09-10" to="2026-09-24" />
                <span className="text-[13px]">
                  Any day between 10 and 24 Sep
                  <span className="text-ink3 block">Your paediatrician decides</span>
                </span>
              </Card>
            </div>
          </Section>

          <Section label="13 · Comparison cells">
            <Card className="grid grid-cols-3 gap-x-2 px-0 py-0">
              <CompareCell value="55 min" mono />
              <CompareCell value="Rp32.000.000" mono note="asked 4 months ago" />
              <CompareCell />
            </Card>
          </Section>

          <Section label="11 · Photo slots, and 12 · link cards">
            <Card className="flex items-end gap-[12px]">
              <PhotoSlot size="row" />
              <PhotoSlot size="detail" />
              <PhotoSlot size="scan" />
            </Card>
            <div className="mt-[13px]">
              <Card className="flex gap-[12px] overflow-x-auto">
                <LinkCard
                  url="https://example.com"
                  title="Review botol PPSU vs kaca"
                  thumbnail={null}
                  creator="@ibubayi"
                  platform="tiktok"
                />
                <LinkCard
                  url="https://example.com"
                  title="How to sterilise bottles properly"
                  thumbnail={null}
                  creator={null}
                  platform="youtube"
                />
              </Card>
            </div>
          </Section>

          <Section label="15 · Confirmation with Undo — not a toast">
            <ConfirmationCard
              title="Saved. 6 bottles."
              sub="Saved on your phone. It'll go up when you have signal."
              againHref="/gallery"
            />
          </Section>

          <Section label="14 · Empty states — three kinds, never one">
            <Stack>
              <Card>
                <NothingYet what="list" href="/gallery" />
              </Card>
              <Card>
                <NothingMatches query="botol" href="/gallery" />
              </Card>
              <Card>
                <AllDone count={11} next="15 Sep" />
              </Card>
            </Stack>
          </Section>
        </main>

        <div className="mt-auto">
          <Section label="8 · Bottom action bar">
            <div />
          </Section>
          <BottomBar>
            <BarPrimary href="/gallery">Add what we got</BarPrimary>
            <BarSecondary href="/gallery">Find a thing</BarSecondary>
          </BottomBar>
          <TabBar />
        </div>
      </div>
    </MoneyProvider>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="px-[18px] first:px-0 [&:not(:first-child)]:px-0">
      <div className="mb-[9px]">
        <SectionLabel>{label}</SectionLabel>
      </div>
      {children}
    </section>
  );
}
