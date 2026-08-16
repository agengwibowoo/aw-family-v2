import { notFound } from "next/navigation";

import { BarSecondary, BottomBar } from "@/components/bottom-bar";
import { Card, SectionLabel, Stack } from "@/components/card";
import { Chip } from "@/components/chip";
import { Field, TextInput } from "@/components/field";
import { Money, MoneyToggle } from "@/components/money";
import { todayInHousehold } from "@/domain/dates";
import { quoteAgeNote } from "@/domain/insurance";
import { requireApproved } from "@/server/auth";
import { getHospital, getPolicy } from "@/server/services/hospitals";

import {
  addInsurerAction,
  addQuoteAction,
  deleteInsurerAction,
  deleteQuoteAction,
} from "./actions";

/**
 * Prices and insurance for one place.
 *
 * A caesar in a VIP room can be three or four times a normal delivery in kelas
 * 2, and you do not get to choose which one you will need — so prices are
 * recorded per delivery type and room class rather than as one number.
 */
export default async function HospitalMoney({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireApproved(`/hospitals/${id}/money`);

  const [data, policy] = await Promise.all([getHospital(id), getPolicy()]);
  if (!data) notFound();

  const { hospital, quotes, insurers } = data;
  const today = todayInHousehold();

  return (
    <>
      <header className="flex items-start justify-between gap-3 px-[18px] pt-[20px] pb-[13px]">
        <div className="min-w-0">
          <p className="text-ink2 text-[13px]">{hospital.name}</p>
          <h1 className="mt-[2px] text-[19px] font-semibold tracking-[-0.02em]">
            What it costs
          </h1>
        </div>
        <MoneyToggle />
      </header>

      <div className="px-[18px]">
        <Stack>
          <Card className="py-0">
            {quotes.length === 0 ? (
              <p className="text-ink2 py-[15px] text-[13px]">
                No prices yet. Ring them and put the numbers in below.
              </p>
            ) : (
              quotes.map((q) => {
                const stale = quoteAgeNote(q.quotedOn, today);
                return (
                  <div
                    key={q.id}
                    className="border-ln flex items-start justify-between gap-3 border-b py-[12px] last:border-b-0"
                  >
                    <span className="flex min-w-0 flex-col gap-[2px]">
                      <span className="text-[15.5px] font-medium">
                        {q.deliveryType} · {q.roomClass}
                      </span>
                      <Money amount={q.priceIdr} className="text-[14.5px]" />
                      {q.nightsIncluded !== null && (
                        <span className="text-ink2 tabular text-[13px]">
                          {q.nightsIncluded} nights included
                        </span>
                      )}
                      {stale && (
                        <span className="text-ink3 text-[13px]">{stale}</span>
                      )}
                    </span>
                    <form action={deleteQuoteAction} className="shrink-0">
                      <input type="hidden" name="id" value={q.id} />
                      <input type="hidden" name="hospitalId" value={hospital.id} />
                      <button
                        type="submit"
                        className="text-ink2 text-[13px] underline underline-offset-2"
                      >
                        Remove
                      </button>
                    </form>
                  </div>
                );
              })
            )}
          </Card>

          <Card>
            <SectionLabel>Add a price</SectionLabel>
            <form action={addQuoteAction}>
              <input type="hidden" name="hospitalId" value={hospital.id} />
              <Field label="What sort of birth?">
                <select
                  name="deliveryType"
                  className="bg-sf border-ln2 text-ink min-h-[52px] w-full rounded-[11px] border px-[12px] text-[15.5px]"
                >
                  <option>Normal</option>
                  <option>Caesar</option>
                  <option>ERACS</option>
                  <option>Water birth</option>
                </select>
              </Field>
              <Field label="Which room?">
                <select
                  name="roomClass"
                  className="bg-sf border-ln2 text-ink min-h-[52px] w-full rounded-[11px] border px-[12px] text-[15.5px]"
                >
                  <option>Kelas 3</option>
                  <option>Kelas 2</option>
                  <option>Kelas 1</option>
                  <option>VIP</option>
                  <option>Suite</option>
                </select>
              </Field>
              <Field label="How much?" hint="Rupiah">
                <TextInput name="priceIdr" mono />
              </Field>
              <Field label="How many nights does that include?">
                <TextInput name="nightsIncluded" type="number" mono />
              </Field>
              <Field label="When did they tell you?">
                <TextInput name="quotedOn" type="date" defaultValue={today} mono />
              </Field>
              <Field label="How did you find out?">
                <select
                  name="source"
                  className="bg-sf border-ln2 text-ink min-h-[52px] w-full rounded-[11px] border px-[12px] text-[15.5px]"
                >
                  <option value="phone">Rang them</option>
                  <option value="website">Their website</option>
                  <option value="visit">Went there</option>
                </select>
              </Field>
              <button
                type="submit"
                className="bg-ac mt-[6px] min-h-[52px] w-full rounded-[11px] px-4 text-[14.5px] font-medium text-white"
              >
                Add this price
              </button>
            </form>
          </Card>

          <Card className="py-0">
            <div className="py-[15px]">
              <SectionLabel>Do they take your insurance?</SectionLabel>
            </div>
            {insurers.length === 0 ? (
              <p className="text-ink2 pb-[15px] text-[13px]">
                Nobody has checked.
                {policy?.insurerName
                  ? ` Ask them about ${policy.insurerName}.`
                  : " Record your policy first so there is something to ask about."}
              </p>
            ) : (
              insurers.map((i) => (
                <div
                  key={i.id}
                  className="border-ln flex items-start justify-between gap-3 border-b py-[12px] last:border-b-0"
                >
                  <span className="flex min-w-0 flex-col gap-[2px]">
                    <span className="text-[15.5px] font-medium">
                      {i.insurerName}
                    </span>
                    <span className="text-ink2 text-[13px]">
                      {i.accepted === null
                        ? "Nobody has checked"
                        : i.accepted
                          ? i.settlement === "reimbursement"
                            ? "Taken — you pay first and claim it back"
                            : "Taken — they settle with the insurer directly"
                          : "Not taken"}
                    </span>
                    {i.requiresPreauth && (
                      <span className="text-ink2 text-[13px]">
                        {i.preauthLeadDays
                          ? `Approval needed ${i.preauthLeadDays} days ahead`
                          : "Approval needed in advance"}
                      </span>
                    )}
                  </span>
                  <form action={deleteInsurerAction} className="shrink-0">
                    <input type="hidden" name="id" value={i.id} />
                    <input type="hidden" name="hospitalId" value={hospital.id} />
                    <button
                      type="submit"
                      className="text-ink2 text-[13px] underline underline-offset-2"
                    >
                      Remove
                    </button>
                  </form>
                </div>
              ))
            )}
          </Card>

          <Card>
            <SectionLabel>Add an insurer</SectionLabel>
            <form action={addInsurerAction}>
              <input type="hidden" name="hospitalId" value={hospital.id} />
              <Field label="Which insurer?">
                <TextInput
                  name="insurerName"
                  defaultValue={policy?.insurerName ?? ""}
                />
              </Field>
              <Field label="Do they take it?">
                <select
                  name="accepted"
                  className="bg-sf border-ln2 text-ink min-h-[52px] w-full rounded-[11px] border px-[12px] text-[15.5px]"
                >
                  <option value="">Nobody has checked</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </Field>
              <Field label="Who pays first?">
                <select
                  name="settlement"
                  className="bg-sf border-ln2 text-ink min-h-[52px] w-full rounded-[11px] border px-[12px] text-[15.5px]"
                >
                  <option value="">Nobody has checked</option>
                  <option value="cashless">They settle with the insurer</option>
                  <option value="reimbursement">
                    We pay first and claim it back
                  </option>
                </select>
              </Field>
              <label className="flex min-h-[52px] items-center gap-[10px] py-[10px]">
                <input
                  type="checkbox"
                  name="requiresPreauth"
                  className="h-[20px] w-[20px]"
                />
                <span className="text-[14.5px]">
                  They want approval from the insurer in advance
                </span>
              </label>
              <Field label="How many days ahead?">
                <TextInput name="preauthLeadDays" type="number" mono />
              </Field>
              <button
                type="submit"
                className="bg-ac mt-[6px] min-h-[52px] w-full rounded-[11px] px-4 text-[14.5px] font-medium text-white"
              >
                Add this insurer
              </button>
            </form>
          </Card>

          {hospital.decision === "picked" && (
            <p className="text-ink3 text-[13px]">
              <Chip tone="outline">Picked this one</Chip> — the papers screen is
              built from what this place asks for.
            </p>
          )}
        </Stack>
      </div>

      <BottomBar>
        <BarSecondary href={`/hospitals/${hospital.id}`} width={160}>
          Back to the place
        </BarSecondary>
      </BottomBar>
    </>
  );
}
