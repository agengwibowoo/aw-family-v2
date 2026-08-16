import { Card } from "@/components/card";
import { EmptyState } from "@/components/empty-state";

export default function DatesScreen() {
  return (
    <main className="px-[18px] py-[20px]">
      <h1 className="text-[19px] font-semibold tracking-[-0.02em]">Dates</h1>
      <div className="mt-[13px]">
        <Card>
          <EmptyState headline="Nothing coming up." sub="Add the first appointment." />
        </Card>
      </div>
    </main>
  );
}
