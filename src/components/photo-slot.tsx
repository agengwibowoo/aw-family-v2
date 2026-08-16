import { cn } from "@/lib/cn";

/**
 * Component 11 — photo slot.
 *
 * The only images in the app are ones she took herself: papers, scans,
 * receipts. There is no product photography and there are no assets to ship.
 */

const SIZES = {
  row: "h-[48px] w-[48px]",
  detail: "h-[104px] w-[104px]",
  scan: "h-[132px] w-[104px]",
} as const;

export function PhotoSlot({
  size = "detail",
  src,
  alt,
  onClick,
}: {
  size?: keyof typeof SIZES;
  src?: string | null;
  alt?: string;
  onClick?: () => void;
}) {
  const className = cn(
    "bg-sf2 shrink-0 overflow-hidden rounded-[8px]",
    SIZES[size],
    !src && "border-ln2 grid place-items-center border border-dashed",
  );

  if (src) {
    return (
      // Scans are served from the offline cache as blobs, so this is a plain
      // img rather than next/image — see ADR-0007.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt ?? ""} className={cn(className, "object-cover")} />
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      <span className="text-ink3 text-[11px]">Add</span>
    </button>
  );
}
