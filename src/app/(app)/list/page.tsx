import { Card } from "@/components/card";
import { EmptyState } from "@/components/empty-state";

export default function ListScreen() {
  return (
    <main className="px-[18px] py-[20px]">
      <h1 className="text-[19px] font-semibold tracking-[-0.02em]">The list</h1>
      <div className="mt-[13px]">
        <Card>
          <EmptyState
            headline="Nothing on this list yet."
            sub="The catalog arrives at cutover, from the old app."
          />
        </Card>
      </div>
    </main>
  );
}
