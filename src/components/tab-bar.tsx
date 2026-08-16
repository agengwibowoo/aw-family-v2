"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";

/**
 * Component 9 — tab bar.
 *
 * Three tabs at cutover. Money becomes a fourth when S12 is built; adding it is
 * additive, which is why there is no account-level landing preference to
 * migrate. See ADR-0002 and the plan's account decision.
 */

const TABS = [
  { href: "/", label: "Today" },
  { href: "/list", label: "List" },
  { href: "/dates", label: "Dates" },
] as const;

export function TabBar() {
  const pathname = usePathname();

  return (
    // The tab bar is the bottom-most row of the screen, so it is the one place
    // that owes the home indicator its space. 26px is the design's number; a
    // real device reports more.
    <nav className="border-ln bg-bg flex shrink-0 border-t pb-[max(26px,env(safe-area-inset-bottom))]">
      {TABS.map((tab) => {
        const active =
          tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className="relative flex min-h-[52px] flex-1 items-center justify-center pt-[10px]"
          >
            {active && (
              <span
                aria-hidden
                className="bg-ac absolute top-0 h-[2px] w-[26px] rounded-full"
              />
            )}
            <span
              className={cn(
                "text-[12px]",
                active ? "text-ink font-semibold" : "text-ink3 font-medium",
              )}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
