import { MoneyProvider } from "@/components/money";
import { TabBar } from "@/components/tab-bar";
import { requireApproved } from "@/server/auth";

/**
 * Everything inside this group is behind the approval gate.
 *
 * Money visibility wraps the whole shell because it is one decision every
 * screen obeys, and it resets each session by design.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireApproved();

  return (
    <MoneyProvider>
      {/* The shell is the fixed-height box and the content region is the only
          scroller, so the tab bar is always the bottom row of the screen and
          the bottom action bar can never ride over it. See the handoff's
          `.ph` / `.bd` / `.tb` in `Newborn Prep Prototype.dc.html`. */}
      <div className="mx-auto flex h-dvh w-full max-w-[420px] flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
        <TabBar />
      </div>
    </MoneyProvider>
  );
}
