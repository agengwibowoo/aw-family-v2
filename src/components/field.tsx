import { cn } from "@/lib/cn";

/**
 * Form fields.
 *
 * Every label is a question in plain words, never a schema name. Nothing is
 * required beyond a name — a place can exist with a name and be filled in over
 * the following week.
 */

const CONTROL =
  "bg-sf border-ln2 text-ink min-h-[52px] w-full rounded-[11px] border px-[12px] text-[15.5px] placeholder:text-ink3";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block py-[10px]">
      <span className="text-ink2 block text-[14.5px]">{label}</span>
      {hint && <span className="text-ink3 block text-[13px]">{hint}</span>}
      <span className="mt-[6px] block">{children}</span>
    </label>
  );
}

export function TextInput({
  name,
  defaultValue,
  placeholder,
  type = "text",
  mono,
}: {
  name: string;
  defaultValue?: string | number | null;
  placeholder?: string;
  type?: "text" | "url" | "tel" | "number" | "date";
  mono?: boolean;
}) {
  return (
    <input
      name={name}
      type={type}
      inputMode={type === "number" ? "numeric" : undefined}
      defaultValue={defaultValue ?? ""}
      placeholder={placeholder}
      className={cn(CONTROL, mono && "tabular")}
    />
  );
}

export function TextArea({
  name,
  defaultValue,
  placeholder,
}: {
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
}) {
  return (
    <textarea
      name={name}
      rows={4}
      defaultValue={defaultValue ?? ""}
      placeholder={placeholder}
      className={cn(CONTROL, "py-[12px] leading-[1.45]")}
    />
  );
}

/**
 * Yes, no, or nobody has said. The third option is not a default to be
 * silently treated as no — it is the honest state of most of these fields for
 * most of the time.
 */
export function TriState({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue: boolean | null;
}) {
  const current = defaultValue === null ? "" : defaultValue ? "yes" : "no";
  return (
    <select name={name} defaultValue={current} className={cn(CONTROL, "pr-[8px]")}>
      <option value="">Nobody has checked</option>
      <option value="yes">Yes</option>
      <option value="no">No</option>
    </select>
  );
}
