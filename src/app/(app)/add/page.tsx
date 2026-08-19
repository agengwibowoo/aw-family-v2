import Link from "next/link";

import { Card } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { Stepper } from "@/components/stepper";
import { SubmitButton } from "@/components/submit-button";
import { countOf } from "@/domain/status";
import { requireApproved } from "@/server/auth";
import { currentBand } from "@/domain/age";
import { todayInHousehold } from "@/domain/dates";
import { getOrigin, listAgeBands } from "@/server/services/household";
import { getThing, listThings } from "@/server/services/things";

import { recordPurchaseAction } from "./actions";

/**
 * S11 — Add what we got. The most important screen in the app.
 *
 * Three seconds, one hand, thumb never leaving the bottom third, usually
 * arrived at cold from a chat link. Everything here serves that:
 *
 * Both fields are pre-answered, so the only act required is the tap on Save.
 * The count starts at 1 because the commonest answer is "I got one". The price
 * is labelled "you can skip this" and can never block the save. Everything else
 * is deferred to a dashed card that is not a form.
 *
 * `Close`, not a back arrow — arriving from a message there is no history
 * behind this screen to go back to.
 *
 * Money being hidden does not change this screen. She can enter a price she
 * will never be shown back.
 */
export default async function AddWhatWeGot({
  searchParams,
}: {
  searchParams: Promise<{ thing?: string; from?: string; qty?: string }>;
}) {
  await requireApproved("/add");
  const { thing: thingId, from, qty } = await searchParams;

  const data = thingId ? await getThing(thingId) : null;

  // Opened from the bottom bar rather than a link: the same screen, on a short
  // list of the things still needed.
  if (!data) return <WhichThing from={from} />;

  const { thing } = data;
  const startAt = Math.max(1, Number(qty) || 1);

  return (
    <form action={recordPurchaseAction} className="flex min-h-full flex-col">
      <input type="hidden" name="itemId" value={thing.id} />
      <input type="hidden" name="from" value={from ?? "app"} />

      <header className="flex items-end justify-between gap-3 px-[18px] pt-[20px] pb-[13px]">
        <div className="min-w-0">
          <p className="text-ink2 text-[13px]">{fromLine(from)}</p>
          <h1 className="mt-[2px] text-[19px] font-semibold tracking-[-0.02em]">
            Add what we got
          </h1>
        </div>
        {/* Close, not a back arrow. There is no history. */}
        <Link
          href={from === "link" ? "/" : `/list/${thing.id}`}
          className="text-ink2 shadow-[inset_0_0_0_1px_var(--ln2)] shrink-0 rounded-[7px] px-[9px] py-[4px] text-[12px] font-semibold"
        >
          Close
        </Link>
      </header>

      <div className="flex flex-col gap-[18px] px-[18px] pb-[20px]">
        <Card className="flex-row items-center gap-[14px] px-[15px] py-[13px]">
          <span className="bg-sf2 grid w-[46px] shrink-0 place-items-center rounded-[10px] py-[9px]">
            <span className="tabular text-[16px] leading-none font-medium">
              {thing.have}
            </span>
            <span className="text-ink3 mt-[3px] text-[9.5px] tracking-[0.06em] uppercase">
              of {thing.need}
            </span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[17.5px] font-semibold tracking-[-0.015em]">
              {thing.name}
            </span>
            <span className="text-ink2 block text-[13px]">
              {thing.bandName} ·{" "}
              {/* The escape hatch if the link resolved to the wrong thing. */}
              <Link href="/add" className="text-acl font-medium">
                not this?
              </Link>
            </span>
          </span>
        </Card>

        <div>
          <p className="mb-[9px] text-[15.5px] font-medium tracking-[-0.005em]">
            How many did you get?
          </p>
          <Stepper
            name="qty"
            defaultValue={startAt}
            min={1}
            size="large"
            aria-label="How many you got"
          />
        </div>

        <div>
          <div className="mb-[9px] flex items-baseline justify-between gap-3">
            <p className="text-[15.5px] font-medium tracking-[-0.005em]">
              What did it cost?
            </p>
            <p className="text-ink2 text-[13px]">you can skip this</p>
          </div>
          <div className="bg-sf border-ln2 flex min-h-[56px] items-center gap-[8px] rounded-[11px] border px-[12px]">
            <span className="tabular text-ink3 text-[17px]">Rp</span>
            <input
              name="pricePerUnitIdr"
              inputMode="numeric"
              aria-label="What one cost"
              className="tabular min-h-[56px] w-full bg-transparent text-[17px] outline-none"
            />
          </div>
        </div>

        <div className="border-ln2 rounded-[14px] border border-dashed px-[15px] py-[13px]">
          <p className="text-ink2 text-[14px]">
            Where from, brand, a photo —{" "}
            <Link href={`/list/${thing.id}`} className="text-acl font-medium">
              add later if you want
            </Link>
          </p>
        </div>
      </div>

      {/* One button, 56px. Land, tap Save. */}
      <div className="border-ln bg-bg mt-auto sticky bottom-0 border-t px-[16px] pt-[12px] pb-[max(26px,env(safe-area-inset-bottom))]">
        <SubmitButton
          busyLabel="Saving…"
          className="bg-ac flex min-h-[56px] w-full items-center justify-center rounded-[11px] text-[17px] font-medium text-white"
        >
          Save it
        </SubmitButton>
      </div>
    </form>
  );
}

function fromLine(from?: string): string {
  if (from === "link") return "From your message";
  if (from === "today") return "From Today";
  return "From the list";
}

/**
 * The thing-not-known variant.
 *
 * The same screen, opening on a short list of what is still needed. Picking one
 * drops straight into the flow above.
 */
async function WhichThing({ from }: { from?: string }) {
  const today = todayInHousehold();
  const [origin, bands] = await Promise.all([getOrigin(), listAgeBands()]);
  const band = origin ? currentBand(bands, origin, today) : bands[0];

  const rows = band ? await listThings({ bandId: band.id }) : [];
  const stillNeeded = rows.filter((r) => r.status === "still_need");

  return (
    <>
      <header className="flex items-end justify-between gap-3 px-[18px] pt-[20px] pb-[13px]">
        <div className="min-w-0">
          <p className="text-ink2 text-[13px]">{fromLine(from)}</p>
          <h1 className="mt-[2px] text-[19px] font-semibold tracking-[-0.02em]">
            What did you get?
          </h1>
        </div>
        <Link
          href="/"
          className="text-ink2 shadow-[inset_0_0_0_1px_var(--ln2)] shrink-0 rounded-[7px] px-[9px] py-[4px] text-[12px] font-semibold"
        >
          Close
        </Link>
      </header>

      <div className="px-[18px] pb-[20px]">
        {stillNeeded.length === 0 ? (
          <Card>
            <EmptyState
              headline="Nothing is waiting to be bought."
              sub="Find anything on the list and add it from there."
              action={{ label: "Find a thing", href: "/find" }}
            />
          </Card>
        ) : (
          <Card className="py-0">
            {stillNeeded.slice(0, 12).map((thing) => (
              <Link
                key={thing.id}
                href={`/add?thing=${thing.id}${from ? `&from=${from}` : ""}`}
                className="border-ln flex min-h-[52px] items-center justify-between gap-3 border-b py-[12px] last:border-b-0"
              >
                <span className="flex min-w-0 flex-col gap-[2px]">
                  <span className="text-[15.5px] font-medium">{thing.name}</span>
                  <span className="text-ink2 tabular text-[13px]">
                    {countOf(thing.have, thing.need)}
                  </span>
                </span>
                <span aria-hidden className="text-ink3">
                  ›
                </span>
              </Link>
            ))}
          </Card>
        )}

        <Link
          href="/find"
          className="border-ln2 text-ink mt-[13px] flex min-h-[46px] items-center justify-center rounded-[11px] border border-dashed text-[14px] font-medium"
        >
          Something else
        </Link>
      </div>
    </>
  );
}
