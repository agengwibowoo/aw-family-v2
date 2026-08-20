import { Card, SectionLabel, Stack } from "@/components/card";
import { Chip } from "@/components/chip";
import { Field, TextInput } from "@/components/field";
import { GotPaperConfirmation } from "@/components/got-paper-confirmation";
import { PhotoSlot } from "@/components/photo-slot";
import { ScanUpload } from "@/components/scan-upload";
import { ReadinessBanner } from "@/components/readiness-banner";
import { SubmitButton } from "@/components/submit-button";
import { todayInHousehold } from "@/domain/dates";
import { NOT_FILLED_IN } from "@/domain/status";
import { requireApproved } from "@/server/auth";
import { getOrigin } from "@/server/services/household";
import {
  describeChange,
  getPapersPack,
  type PaperLine,
} from "@/server/services/papers";

import { signedScanUrls } from "@/server/services/scans";

import {
  attachPaperScanAction,
  seenChangeAction,
  setCopiesAction,
  setWhereKeptAction,
  signPaperScanAction,
  toggleHaveAction,
} from "./actions";

/**
 * S5 — Papers for the hospital.
 *
 * Answers "can we leave for the hospital right now?" at 3am, with no signal,
 * half asleep. One unmistakable state at the top, and only the missing things
 * above the fold — the ones that are done are proof, not work.
 *
 * Not-ready uses an ink border, never red. Nothing here is an error; it is work
 * remaining.
 */
export default async function Papers() {
  await requireApproved("/papers");

  const origin = await getOrigin();
  const dueDate = origin?.dueDate ?? todayInHousehold();
  const pack = await getPapersPack(dueDate);

  // Short-lived, always. A cached URL is worthless at 3am because it has
  // expired, so offline reads come from cached bytes rather than a long
  // expiry (ADR-0007).
  const scanUrls = await signedScanUrls(pack.lines.flatMap((l) => l.scans));

  const ready = pack.missing.length === 0 && pack.lines.length > 0;

  return (
    <main className="px-[18px] py-[20px]">
      <header className="mb-[13px]">
        <p className="text-ink2 text-[13px]">
          {pack.hospitalName ?? "No hospital picked yet"}
        </p>
        <h1 className="mt-[2px] text-[19px] font-semibold tracking-[-0.02em]">
          Papers for the hospital
        </h1>
      </header>

      {/* Empty on every visit but the one straight after a tick, so it carries
          its own spacing rather than the page reserving room. */}
      <div className="empty:hidden mb-[13px]">
        <GotPaperConfirmation />
      </div>

      {/* Never a silent re-score. Papers going from ready to not-ready with no
          explanation is how you arrive at 3am missing a letter you had no idea
          you needed. */}
      {pack.changed && pack.hospitalId && (
        <Card className="border-ink mb-[13px]">
          <h2 className="text-[17.5px] font-semibold tracking-[-0.015em]">
            {describeChange(pack.changed)}
          </h2>
          <p className="text-ink2 mt-[6px] text-[13px]">
            You picked {pack.changed.toName} instead of {pack.changed.fromName},
            so this list is different now.
          </p>
          <form action={seenChangeAction} className="mt-[13px]">
            <input type="hidden" name="hospitalId" value={pack.hospitalId} />
            <SubmitButton
              busyLabel="Saving…"
              className="border-ln2 text-ink min-h-[52px] w-full rounded-[11px] border text-[14.5px] font-medium"
            >
              Seen it
            </SubmitButton>
          </form>
        </Card>
      )}

      <ReadinessBanner
        ready={ready}
        headline={
          ready ? `All ${pack.lines.length} ready` : "Not ready yet"
        }
        sub={
          ready
            ? "You can leave whenever you need to."
            : `${pack.missing.length} still to sort out.`
        }
        have={pack.ready.length}
        need={pack.lines.length}
      />

      {pack.provisional && (
        <p className="text-ink2 mt-[13px] text-[13px]">
          This is what every hospital asks for. The list may grow once one is
          picked.
        </p>
      )}

      {pack.missing.length > 0 && (
        <section className="mt-[20px]">
          <div className="mb-[9px]">
            <SectionLabel>Missing</SectionLabel>
          </div>
          <Stack>
            {pack.missing.map((line) => (
              <PaperCard key={line.documentId} line={line} scanUrls={scanUrls} />
            ))}
          </Stack>
        </section>
      )}

      {pack.ready.length > 0 && (
        <section className="mt-[20px]">
          <div className="mb-[9px]">
            <SectionLabel>Ready · {pack.ready.length}</SectionLabel>
          </div>
          <Card className="py-0">
            {pack.ready.map((line) => (
              <ReadyPaper key={line.documentId} line={line} />
            ))}
          </Card>
        </section>
      )}

      {/* The offline promise, said out loud. */}
      <p className="text-ink3 mt-[20px] text-[13px]">
        This screen works with no signal. Everything here is on your phone.
      </p>
    </main>
  );
}

function PaperCard({
  line,
  scanUrls,
}: {
  line: PaperLine;
  scanUrls: Map<string, string>;
}) {
  const sign = signPaperScanAction.bind(null, line.documentId);
  const attach = attachPaperScanAction.bind(null, line.documentId);

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 flex-col gap-[2px]">
          <span className="text-[15.5px] font-medium">{line.name}</span>
          {line.blocker && (
            <span className="text-ink2 text-[13px]">{line.blocker}</span>
          )}
          {line.expiryNote && (
            <span className="text-ink2 text-[13px]">{line.expiryNote}</span>
          )}
          {line.issuedBy && (
            <span className="text-ink3 text-[13px]">From {line.issuedBy}</span>
          )}
        </span>
      </div>

      {/* The photograph is the proof, at the size you can actually read a KTP
          number off. */}
      <div className="mt-[13px] flex gap-[9px] overflow-x-auto">
        {line.scans.map((path) => (
          <PhotoSlot
            key={path}
            size="scan"
            src={scanUrls.get(path) ?? null}
            alt={line.name}
          />
        ))}
        <ScanUpload signAction={sign} attachAction={attach} />
      </div>

      <div className="mt-[13px] flex flex-wrap items-center gap-[12px]">
        <form action={toggleHaveAction}>
          <input type="hidden" name="documentId" value={line.documentId} />
          <input type="hidden" name="have" value={String(!line.haveOriginal)} />
          <SubmitButton
            busyLabel="Saving…"
            className={
              line.haveOriginal
                ? "border-ln2 text-ink2 min-h-[52px] rounded-[11px] border px-4 text-[14.5px] font-medium whitespace-nowrap"
                : "bg-ac min-h-[52px] rounded-[11px] px-4 text-[14.5px] font-medium whitespace-nowrap text-white"
            }
          >
            {line.haveOriginal ? "Haven't got it" : "We have it"}
          </SubmitButton>
        </form>

        {line.copiesRequired > 0 && (
          <form action={setCopiesAction} className="flex items-center gap-[8px]">
            <input type="hidden" name="documentId" value={line.documentId} />
            <SubmitButton
              name="copies"
              value={Math.max(0, line.copiesMade - 1)}
              aria-label="One fewer copy"
              className="border-ln2 text-ink grid h-[52px] w-[52px] place-items-center rounded-[11px] border text-[18px]"
            >
              −
            </SubmitButton>
            <span className="tabular w-[56px] text-center text-[15.5px]">
              {line.copiesMade} of {line.copiesRequired}
            </span>
            <SubmitButton
              name="copies"
              value={line.copiesMade + 1}
              aria-label="One more copy"
              className="border-ln2 text-ink grid h-[52px] w-[52px] place-items-center rounded-[11px] border text-[18px]"
            >
              +
            </SubmitButton>
          </form>
        )}
      </div>

      <WhereKept line={line} />
    </Card>
  );
}

/**
 * Where the original actually lives.
 *
 * Its own little form, because papers have no edit screen — every control on
 * this screen posts from the row it belongs to, which is what keeps the whole
 * thing usable with no signal.
 */
function WhereKept({ line }: { line: PaperLine }) {
  return (
    <form action={setWhereKeptAction}>
      <input type="hidden" name="documentId" value={line.documentId} />
      <Field label="Where it's kept">
        <TextInput
          name="whereKept"
          defaultValue={line.whereKept}
          // A place someone typed is data, and so is the example of one.
          placeholder="Laci lemari kamar"
        />
      </Field>
      <SubmitButton
        busyLabel="Saving…"
        className="border-ln2 text-ink min-h-[52px] rounded-[11px] border px-4 text-[14.5px] font-medium whitespace-nowrap"
      >
        Save it
      </SubmitButton>
    </form>
  );
}

/**
 * A paper that is done.
 *
 * Closed, it is the same three-line receipt it always was — the ones that are
 * done are proof, not work, and the Ready section has to keep reading that way
 * at a glance. Opening it is what reveals the two things a finished paper still
 * needs: where it is kept, and the way back from a mis-tap.
 *
 * A plain `details`, so it costs no JavaScript and works with no signal.
 */
function ReadyPaper({ line }: { line: PaperLine }) {
  return (
    <details className="border-ln border-b last:border-b-0">
      <summary className="flex min-h-[52px] cursor-pointer list-none items-start justify-between gap-3 py-[12px] [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 flex-col gap-[2px]">
          <span className="text-[15.5px] font-medium">{line.name}</span>
          {line.copiesRequired > 0 && (
            <span className="text-ink2 tabular text-[13px]">
              {line.copiesMade} of {line.copiesRequired} copies
            </span>
          )}
          {line.expiryNote && (
            <span className="text-ink2 text-[13px]">{line.expiryNote}</span>
          )}
          {/* Spelled out rather than hidden when nobody has said. For a paper we
              have, not knowing where it is, is the fact worth surfacing. */}
          <span className="text-ink2 text-[13px]">
            Kept · {line.whereKept ?? NOT_FILLED_IN}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-[8px]">
          <Chip tone="solid">Got it</Chip>
          <span aria-hidden className="text-ink3">
            ›
          </span>
        </span>
      </summary>

      <div className="pb-[13px]">
        <WhereKept line={line} />

        {/* The way back, present but not competing — the same quiet underline
            that takes a place off the list. */}
        <form action={toggleHaveAction} className="mt-[10px]">
          <input type="hidden" name="documentId" value={line.documentId} />
          <input type="hidden" name="have" value="false" />
          <SubmitButton
            busyLabel="Saving…"
            className="text-ink2 min-h-[52px] text-[14.5px] underline underline-offset-2"
          >
            {"Haven't got it"}
          </SubmitButton>
        </form>
      </div>
    </details>
  );
}
