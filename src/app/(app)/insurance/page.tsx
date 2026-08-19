import { BarPrimary, BarSecondary, BottomBar } from "@/components/bottom-bar";
import { Card, SectionLabel, Stack } from "@/components/card";
import { Field, TextArea, TextInput } from "@/components/field";
import { Money, MoneyToggle } from "@/components/money";
import { VerdictCard } from "@/components/verdict-card";
import { assessCover, coverStartsOn } from "@/domain/insurance";
import { formatFullDate } from "@/domain/dates";
import { requireApproved } from "@/server/auth";
import { getPolicyRow } from "@/server/services/hospitals";
import { getOrigin } from "@/server/services/household";

import { savePolicyAction } from "./actions";

/**
 * The policy, tracked once for the household rather than once per hospital.
 *
 * The waiting period is the field that ruins people: many Indonesian private
 * policies impose nine to twelve months, so a policy taken out after conception
 * may not cover the delivery at all. The answer is computed and shown at the
 * top as a sentence — never two dates for the reader to subtract.
 */
export default async function Insurance() {
  await requireApproved("/insurance");

  const [row, origin] = await Promise.all([
    getPolicyRow(),
    getOrigin(),
  ]);

  const policy = {
    insurerName: row?.insurerName ?? null,
    policyStartedOn: row?.policyStartedOn ?? null,
    maternityWaitingPeriodMonths: row?.maternityWaitingPeriodMonths ?? null,
    roomEntitlement: row?.roomEntitlement ?? null,
  };

  const verdict = origin ? assessCover(policy, origin.dueDate) : null;
  const starts = coverStartsOn(policy);

  return (
    <form action={savePolicyAction}>
      <header className="flex items-start justify-between gap-3 px-[18px] pt-[20px] pb-[13px]">
        <div>
          <p className="text-ink2 text-[13px]">
            {policy.insurerName ?? "No insurer recorded"}
          </p>
          <h1 className="mt-[2px] text-[19px] font-semibold tracking-[-0.02em]">
            Your insurance
          </h1>
        </div>
        <MoneyToggle />
      </header>

      <div className="px-[18px]">
        <Stack>
          {verdict && (
            <VerdictCard verdict={verdict}>
              {starts && (
                <p className="text-ink3 mt-[6px] text-[13px]">
                  Cover for the birth begins {formatFullDate(starts)}.
                </p>
              )}
            </VerdictCard>
          )}

          <Card>
            <SectionLabel>The policy</SectionLabel>
            <Field label="Who is it with?">
              <TextInput name="insurerName" defaultValue={row?.insurerName} />
            </Field>
            <Field label="Policy number">
              <TextInput name="policyNumber" defaultValue={row?.policyNumber} mono />
            </Field>
            <Field
              label="When did it start?"
              hint="The date cover began, not the date you signed up"
            >
              <TextInput
                name="policyStartedOn"
                type="date"
                defaultValue={row?.policyStartedOn}
                mono
              />
            </Field>
            <Field
              label="How long is the wait for maternity?"
              hint="Months. Usually nine to twelve on Indonesian private policies — worth asking rather than assuming."
            >
              <TextInput
                name="maternityWaitingPeriodMonths"
                type="number"
                defaultValue={row?.maternityWaitingPeriodMonths}
                mono
              />
            </Field>
          </Card>

          <Card>
            <SectionLabel>What it pays</SectionLabel>
            <Field label="Limit for a normal birth" hint="Rupiah">
              <TextInput
                name="maternityLimitNormalIdr"
                defaultValue={row?.maternityLimitNormalIdr}
                mono
              />
            </Field>
            <Field
              label="Limit for a caesar"
              hint="Often different, and it is the one you'll need if things turn"
            >
              <TextInput
                name="maternityLimitCaesarIdr"
                defaultValue={row?.maternityLimitCaesarIdr}
                mono
              />
            </Field>
            <Field
              label="What room does it cover?"
              hint="Choosing above it means paying the difference on everything, not just the room"
            >
              <TextInput
                name="roomEntitlement"
                defaultValue={row?.roomEntitlement}
                placeholder="Kelas 1"
              />
            </Field>
            <Field
              label="From what day is the baby covered?"
              hint="Days after birth. Matters enormously if there is a stay in intensive care."
            >
              <TextInput
                name="coversNewbornFromDay"
                type="number"
                defaultValue={row?.coversNewbornFromDay}
                mono
              />
            </Field>
          </Card>

          {(row?.maternityLimitNormalIdr || row?.maternityLimitCaesarIdr) && (
            <Card>
              <SectionLabel>What that means</SectionLabel>
              <p className="text-ink2 mt-[6px] text-[13px]">
                Normal birth up to{" "}
                <Money amount={row.maternityLimitNormalIdr} />, caesar up to{" "}
                <Money amount={row.maternityLimitCaesarIdr} />. Anything above
                that is yours to pay.
              </p>
            </Card>
          )}

          <Card>
            <SectionLabel>Anything excluded</SectionLabel>
            <Field label="What isn't covered?">
              <TextArea
                name="excludedConditions"
                defaultValue={row?.excludedConditions}
              />
            </Field>
          </Card>
        </Stack>
      </div>

      <BottomBar>
        <BarPrimary type="submit" busyLabel="Saving…">
          Save it
        </BarPrimary>
        <BarSecondary href="/hospitals" width={126}>
          Places
        </BarSecondary>
      </BottomBar>
    </form>
  );
}
