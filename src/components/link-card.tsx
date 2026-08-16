import { cn } from "@/lib/cn";

/**
 * Component 12 — link card.
 *
 * The app is not a place she browses reviews; it is a place reviews land.
 * Tapping opens the platform's own app, because on a phone what she actually
 * wants is TikTok, not a cramped iframe.
 *
 * No embeds and no inline players — they are heavy and they break often.
 */
export function LinkCard({
  url,
  title,
  thumbnail,
  creator,
  platform,
}: {
  url: string;
  title: string | null;
  thumbnail: string | null;
  creator: string | null;
  platform: string | null;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className="block w-[104px] shrink-0"
    >
      <div
        className={cn(
          "bg-sf2 h-[130px] w-full overflow-hidden rounded-[8px]",
          // A missing preview degrades to a solid-bordered card that still
          // opens. oEmbed failing is not a reason to lose the link.
          !thumbnail && "border-ln2 grid place-items-center border",
        )}
      >
        {thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnail}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-ink3 px-2 text-center text-[11px]">
            {platform ?? "no preview"}
          </span>
        )}
      </div>
      <p className="mt-[6px] line-clamp-2 text-[12px]">{title ?? url}</p>
      {creator && <p className="text-ink3 mt-[2px] text-[12px]">{creator}</p>}
    </a>
  );
}
