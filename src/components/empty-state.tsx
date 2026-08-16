import Link from "next/link";

/**
 * Component 14 — empty states.
 *
 * Three distinct kinds with distinct copy. Never one generic empty component:
 * "nothing here yet", "nothing matches" and "all done" are three different
 * situations and collapsing them is how an app tells someone the wrong thing.
 *
 * No illustration and no celebration. She sees the "nothing needs doing" state
 * most days, and a party every morning stops meaning anything.
 */

export function EmptyState({
  headline,
  /** Must be derived from real counts. A "done" sentence over a 38% bar is the
      one thing these screens cannot do. */
  sub,
  action,
}: {
  headline: string;
  sub?: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="py-[26px]">
      <p className="text-[22px] leading-[1.2] font-semibold tracking-[-0.02em]">
        {headline}
      </p>
      {sub && <p className="text-ink2 mt-[8px] text-[13px]">{sub}</p>}
      {action && (
        <Link
          href={action.href}
          className="text-acl mt-[14px] inline-block text-[14.5px] font-medium"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}

/** "Nothing on this list yet. Add the first thing." */
export function NothingYet({ what, href }: { what: string; href: string }) {
  return (
    <EmptyState
      headline={`Nothing on this ${what} yet.`}
      sub="Add the first thing."
      action={{ label: "Add a thing", href }}
    />
  );
}

/** "Nothing matches 'botol'. Add it as a new thing?" — always offers the way on. */
export function NothingMatches({
  query,
  href,
}: {
  query: string;
  href: string;
}) {
  return (
    <EmptyState
      headline={`Nothing matches “${query}”.`}
      sub="It might be worth adding."
      action={{ label: `Add “${query}” as a new thing`, href }}
    />
  );
}

/** "All 11 done. Next lot due 15 Sep." */
export function AllDone({ count, next }: { count: number; next?: string }) {
  return (
    <EmptyState
      headline={`All ${count} done.`}
      sub={next ? `Next lot due ${next}.` : undefined}
    />
  );
}
