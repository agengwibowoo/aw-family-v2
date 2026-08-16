"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { cn } from "@/lib/cn";
import { renderIdr } from "@/domain/money";

/**
 * Components 5 and 6 — money value and money toggle.
 *
 * Money is off by default for both accounts, and the setting lasts the session
 * rather than being stored. It lives in context because it is one decision that
 * every screen obeys, not a prop threaded through each of them.
 *
 * Hiding must not change any layout, which is why both states render in
 * tabular mono at the same width.
 */

type MoneyState = { shown: boolean; toggle: () => void };

const MoneyContext = createContext<MoneyState>({
  shown: false,
  toggle: () => {},
});

export function MoneyProvider({ children }: { children: React.ReactNode }) {
  const [shown, setShown] = useState(false);
  const toggle = useCallback(() => setShown((s) => !s), []);
  const value = useMemo(() => ({ shown, toggle }), [shown, toggle]);
  return <MoneyContext value={value}>{children}</MoneyContext>;
}

export function useMoney(): MoneyState {
  return useContext(MoneyContext);
}

export function Money({
  amount,
  className,
}: {
  amount: number | string | null | undefined;
  className?: string;
}) {
  const { shown } = useMoney();
  const text = renderIdr(amount, shown);

  if (!text) {
    return <span className={cn("text-ink3", className)}>not filled in</span>;
  }

  return (
    <span
      className={cn("tabular", className)}
      aria-label={shown ? undefined : "amount hidden"}
    >
      {text}
    </span>
  );
}

/**
 * A struck-through currency mark, not an eye icon. An eye says "look at this";
 * a struck Rp says exactly what is being withheld.
 *
 * Render it only on screens that actually contain amounts — a toggle on a
 * screen with nothing to reveal is a button you can only get wrong.
 */
export function MoneyToggle() {
  const { shown, toggle } = useMoney();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={shown}
      aria-label={shown ? "Hide the amounts" : "Show the amounts"}
      className={cn(
        "relative grid h-[44px] w-[44px] shrink-0 place-items-center rounded-full",
        shown
          ? "bg-acs text-acl shadow-[inset_0_0_0_1px_var(--ac)]"
          : "text-ink3 shadow-[inset_0_0_0_1px_var(--ln2)]",
      )}
    >
      <span className="tabular text-[14px] font-medium">Rp</span>
      {!shown && (
        <span
          aria-hidden
          className="bg-ink3 absolute h-[1.5px] w-[26px] rounded-full"
          style={{ transform: "rotate(-38deg)" }}
        />
      )}
    </button>
  );
}
