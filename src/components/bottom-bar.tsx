import Link from "next/link";

import { cn } from "@/lib/cn";

/**
 * Component 8 — bottom action bar.
 *
 * One or two actions, one line of copy each. Buttons must never wrap to two
 * lines, so secondaries get a fixed width wide enough for a two-word label.
 *
 * The two actions never disappear, on any state.
 */
export function BottomBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-ln bg-bg sticky bottom-0 flex gap-[12px] border-t px-[16px] pt-[12px] pb-[26px]">
      {children}
    </div>
  );
}

const BASE =
  "flex min-h-[52px] items-center justify-center rounded-[11px] px-4 text-[14.5px] font-medium whitespace-nowrap";

export function BarPrimary({
  children,
  href,
  onClick,
  type = "button",
}: {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  const className = cn(BASE, "bg-ac flex-1 text-white");
  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} className={className}>
      {children}
    </button>
  );
}

export function BarSecondary({
  children,
  href,
  onClick,
  type = "button",
  /** 126–140px for a two-word label. */
  width = 134,
}: {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  width?: number;
}) {
  const className = cn(BASE, "border-ln2 text-ink shrink-0 border");
  const style = { flexBasis: width };
  if (href) {
    return (
      <Link href={href} className={className} style={style}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} className={className} style={style}>
      {children}
    </button>
  );
}
