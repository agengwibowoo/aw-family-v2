import Link from "next/link";
import { notFound } from "next/navigation";

import { BarPrimary, BottomBar } from "@/components/bottom-bar";
import { Card } from "@/components/card";
import { Field, TextArea, TextInput } from "@/components/field";
import { requireApproved } from "@/server/auth";
import { getThing } from "@/server/services/things";

import { addCandidateAction } from "../../actions";

/**
 * One of the ones we're looking at.
 *
 * Reached by answering "still looking" to the one question behind Add. Nothing
 * on this screen calls it a candidate or an option — she is writing down a
 * thing somebody is thinking of buying.
 *
 * The price here is what it would cost, not what was paid. What was paid lives
 * on the receipt, and the legacy app's two "actual price" fields — one of them
 * a decoy — are why that separation is worth a whole screen.
 */
export default async function StillLooking({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireApproved(`/list/${id}/looking`);

  const data = await getThing(id);
  if (!data) notFound();

  return (
    <form action={addCandidateAction}>
      <input type="hidden" name="itemId" value={id} />

      <header className="flex items-end justify-between gap-3 px-[18px] pt-[20px] pb-[13px]">
        <div className="min-w-0">
          <p className="text-ink2 text-[13px]">{data.thing.name}</p>
          <h1 className="mt-[2px] text-[19px] font-semibold tracking-[-0.02em]">
            One we&rsquo;re looking at
          </h1>
        </div>
        <Link
          href={`/list/${id}`}
          className="text-ink2 shrink-0 text-[13px] font-semibold"
        >
          Close
        </Link>
      </header>

      <div className="px-[18px] pb-[20px]">
        <Card>
          <Field label="Which brand?">
            <TextInput name="brand" placeholder="Pigeon" />
          </Field>
          <Field label="Which one of theirs?">
            <TextInput name="name" placeholder="Wide Neck PPSU 240ml" />
          </Field>
          <Field label="Where would you buy it?">
            <TextInput name="whereToBuy" placeholder="Tokopedia" />
          </Field>
          <Field label="Roughly what does it cost?" hint="You can skip this">
            <TextInput name="estPriceIdr" mono placeholder="180000" />
          </Field>
        </Card>

        <div className="border-ln2 mt-[13px] rounded-[14px] border border-dashed px-[16px] py-[15px]">
          <p className="text-[14px] font-semibold">
            Everything below is optional.
          </p>
          <Field label="A link to it">
            <TextInput name="link" type="url" />
          </Field>
          <Field label="Anything to remember">
            <TextArea name="notes" />
          </Field>
        </div>
      </div>

      <BottomBar>
        <BarPrimary type="submit">Save it</BarPrimary>
      </BottomBar>
    </form>
  );
}
