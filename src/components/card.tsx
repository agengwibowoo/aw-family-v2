import { cn } from "@/lib/cn";

/**
 * The surface everything else sits on.
 *
 * Shadows: none. Elevation is expressed by surface (--sf on --bg) and by
 * hairline borders — the design is flat by decision.
 */
export function Card({
  children,
  className,
  as: As = "div",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "li";
  /** So a card can be linked to directly. */
  id?: string;
}) {
  return (
    <As
      id={id}
      className={cn(
        "bg-sf border-ln rounded-[14px] border px-[16px] py-[15px]",
        className,
      )}
    >
      {children}
    </As>
  );
}

/** Cards stack with a 13px gap and an 18px screen gutter. */
export function Stack({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-[13px]", className)}>{children}</div>
  );
}

/** 10.5px, 600, +10% tracking, uppercase, --ink3. */
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-ink3 text-[10.5px] font-semibold tracking-[0.1em] uppercase">
      {children}
    </h2>
  );
}
