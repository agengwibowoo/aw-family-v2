import { notFound } from "next/navigation";

import { BarPrimary, BarSecondary, BottomBar } from "@/components/bottom-bar";
import { Card, SectionLabel, Stack } from "@/components/card";
import { Field, TextArea, TextInput, TriState } from "@/components/field";
import { requireApproved } from "@/server/auth";
import { getHospital } from "@/server/services/hospitals";

import { saveHospitalAction } from "../../actions";

/**
 * Groups are questions, not schema. Nothing here is required, nothing blocks
 * saving, and the form can be abandoned half-done — which is how thirty fields
 * actually get filled in, over a fortnight of phone calls.
 */
export default async function EditHospital({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireApproved(`/hospitals/${id}/edit`);

  const data = await getHospital(id);
  if (!data) notFound();
  const h = data.hospital;

  return (
    <form action={saveHospitalAction}>
      <input type="hidden" name="id" value={h.id} />

      <header className="px-[18px] pt-[20px] pb-[13px]">
        <p className="text-ink2 text-[13px]">{h.name}</p>
        <h1 className="mt-[2px] text-[19px] font-semibold tracking-[-0.02em]">
          Fill in what you know
        </h1>
      </header>

      <div className="px-[18px]">
        <Stack>
          <Card>
            <SectionLabel>The basics</SectionLabel>
            <Field label="What's it called?">
              <TextInput name="name" defaultValue={h.name} />
            </Field>
            <Field label="What sort of place is it?" hint="RSIA, RS umum, klinik, bidan">
              <TextInput name="type" defaultValue={h.type} />
            </Field>
            <Field label="Where is it?">
              <TextInput name="address" defaultValue={h.address} />
            </Field>
            <Field label="Link to the map">
              <TextInput name="mapsUrl" type="url" defaultValue={h.mapsUrl} />
            </Field>
          </Card>

          <Card>
            <SectionLabel>Getting there</SectionLabel>
            <Field
              label="How long in traffic?"
              hint="Minutes. This is the number that decides it at 3am."
            >
              <TextInput
                name="driveMinutesPeak"
                type="number"
                defaultValue={h.driveMinutesPeak}
                mono
              />
            </Field>
            <Field label="How long normally?" hint="Minutes">
              <TextInput
                name="driveMinutesNormal"
                type="number"
                defaultValue={h.driveMinutesNormal}
                mono
              />
            </Field>
            <Field label="How far?" hint="Kilometres">
              <TextInput name="distanceKm" defaultValue={h.distanceKm} mono />
            </Field>
            <Field label="Can you turn up at 2am?">
              <TriState name="hasIgd24h" defaultValue={h.hasIgd24h} />
            </Field>
          </Card>

          <Card>
            <SectionLabel>If the baby needs help</SectionLabel>
            <Field
              label="Can they care for a sick newborn?"
              hint="Without this the baby gets moved somewhere else, and you are separated."
            >
              <TriState name="hasNicu" defaultValue={h.hasNicu} />
            </Field>
            <Field label="What level?" hint="NICU level, if they told you">
              <TextInput name="nicuLevel" defaultValue={h.nicuLevel} />
            </Field>
            <Field label="Does the baby stay in the room with you?">
              <TriState name="roomingIn" defaultValue={h.roomingIn} />
            </Field>
            <Field label="Skin to skin straight after the birth?">
              <TriState name="supportsImd" defaultValue={h.supportsImd} />
            </Field>
            <Field label="Someone there to help with feeding?">
              <TriState
                name="hasLactationConsultant"
                defaultValue={h.hasLactationConsultant}
              />
            </Field>
          </Card>

          <Card>
            <SectionLabel>Being there</SectionLabel>
            <Field label="Can your husband be in the room?">
              <TriState
                name="allowsHusbandInRoom"
                defaultValue={h.allowsHusbandInRoom}
              />
            </Field>
            <Field label="Can you bring a photographer?">
              <TriState
                name="allowsPhotographer"
                defaultValue={h.allowsPhotographer}
              />
            </Field>
          </Card>

          <Card>
            <SectionLabel>Money</SectionLabel>
            <Field
              label="Deposit on arrival"
              hint="Rupiah. Knowing this in advance prevents a bad night."
            >
              <TextInput name="depositIdr" defaultValue={h.depositIdr} mono />
            </Field>
          </Card>

          <Card>
            <SectionLabel>How to reach them</SectionLabel>
            <Field label="Phone">
              <TextInput name="phone" type="tel" defaultValue={h.phone} mono />
            </Field>
            <Field label="WhatsApp">
              <TextInput name="whatsapp" type="tel" defaultValue={h.whatsapp} mono />
            </Field>
            <Field label="Website">
              <TextInput name="website" type="url" defaultValue={h.website} />
            </Field>
            <Field label="Instagram">
              <TextInput name="instagram" defaultValue={h.instagram} />
            </Field>
          </Card>

          <Card>
            <SectionLabel>Anything else</SectionLabel>
            <Field label="Notes">
              <TextArea name="notes" defaultValue={h.notes} />
            </Field>
          </Card>
        </Stack>
      </div>

      <BottomBar>
        <BarPrimary type="submit">Save it</BarPrimary>
        <BarSecondary href={`/hospitals/${h.id}`} width={126}>
          Cancel
        </BarSecondary>
      </BottomBar>
    </form>
  );
}
