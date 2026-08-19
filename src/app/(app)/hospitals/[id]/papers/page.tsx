import { notFound } from "next/navigation";

import { BarPrimary, BarSecondary, BottomBar } from "@/components/bottom-bar";
import { Card } from "@/components/card";
import { requireApproved } from "@/server/auth";
import { getHospital } from "@/server/services/hospitals";
import { listDocuments } from "@/server/services/papers";

import { saveHospitalPapersAction } from "./actions";

/**
 * What this place asks you to bring.
 *
 * Copy counts are first-class rather than a note: "fotokopi KTP 3 lembar" is a
 * real, common, easily-forgotten requirement, and it is the line that gets
 * discovered at 3am in a photocopy shop.
 */
export default async function HospitalPapers({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireApproved(`/hospitals/${id}/papers`);

  const [data, allDocuments] = await Promise.all([
    getHospital(id),
    listDocuments(),
  ]);
  if (!data) notFound();

  const { hospital, papers } = data;
  const current = new Map(papers.map((p) => [p.documentId, p]));
  const untouched = papers.length === 0;

  return (
    <form action={saveHospitalPapersAction}>
      <input type="hidden" name="hospitalId" value={hospital.id} />

      <header className="px-[18px] pt-[20px] pb-[13px]">
        <p className="text-ink2 text-[13px]">{hospital.name}</p>
        <h1 className="mt-[2px] text-[19px] font-semibold tracking-[-0.02em]">
          What they want you to bring
        </h1>
        {untouched && (
          <p className="text-ink2 mt-[6px] text-[13px]">
            Nobody has asked them yet. Until then the papers screen shows what
            every hospital asks for.
          </p>
        )}
      </header>

      <div className="px-[18px]">
        <Card className="py-0">
          {allDocuments.map((doc) => {
            const existing = current.get(doc.id);
            return (
              <div
                key={doc.id}
                className="border-ln border-b py-[12px] last:border-b-0"
              >
                <input type="hidden" name="documentId" value={doc.id} />
                <label className="flex min-h-[52px] items-center gap-[10px]">
                  <input
                    type="checkbox"
                    name={`want_${doc.id}`}
                    defaultChecked={
                      existing ? true : untouched && doc.universallyNeeded
                    }
                    className="h-[20px] w-[20px] shrink-0"
                  />
                  <span className="flex min-w-0 flex-col gap-[2px]">
                    <span className="text-[15.5px] font-medium">{doc.name}</span>
                    {doc.issuedBy && (
                      <span className="text-ink2 text-[13px]">
                        From {doc.issuedBy}
                      </span>
                    )}
                  </span>
                </label>
                <label className="mt-[6px] flex items-center gap-[10px] pl-[30px]">
                  <span className="text-ink2 text-[13px]">
                    How many photocopies?
                  </span>
                  <input
                    type="number"
                    name={`copies_${doc.id}`}
                    min={0}
                    defaultValue={existing?.copiesRequired ?? 0}
                    className="bg-sf border-ln2 text-ink tabular h-[52px] w-[80px] rounded-[11px] border px-[10px] text-[15.5px]"
                  />
                </label>
              </div>
            );
          })}
        </Card>
      </div>

      <BottomBar>
        <BarPrimary type="submit" busyLabel="Saving…">
          Save it
        </BarPrimary>
        <BarSecondary href={`/hospitals/${hospital.id}`} width={126}>
          Cancel
        </BarSecondary>
      </BottomBar>
    </form>
  );
}
