/**
 * The shapes a hospital's price comes in.
 *
 * A caesar in a VIP room can be three or four times a normal delivery in kelas
 * 2, and nobody gets to choose which one they will need. So a quote is always
 * one delivery type and one room class, never a single number for "the birth" —
 * and these lists are what makes two places comparable at all.
 *
 * The values are stored; the labels are read. Room classes keep their
 * Indonesian names because that is what the hospitals call them.
 */

export const DELIVERY_TYPES = [
  { value: "Normal", label: "Normal birth" },
  { value: "Caesar", label: "Caesar" },
  { value: "ERACS", label: "ERACS" },
  { value: "Water birth", label: "Water birth" },
] as const;

export type DeliveryType = (typeof DELIVERY_TYPES)[number]["value"];

export const DELIVERY_TYPE_VALUES = DELIVERY_TYPES.map(
  (d) => d.value,
) as readonly DeliveryType[];

export const ROOM_CLASSES = [
  { value: "Kelas 3", label: "Kelas 3" },
  { value: "Kelas 2", label: "Kelas 2" },
  { value: "Kelas 1", label: "Kelas 1" },
  { value: "VIP", label: "VIP" },
  { value: "Suite", label: "Suite" },
] as const;

export type RoomClass = (typeof ROOM_CLASSES)[number]["value"];

/** How we came to know a price, which is also how much to trust it. */
export const QUOTE_SOURCES = [
  { value: "phone", label: "Rang them" },
  { value: "website", label: "Their website" },
  { value: "visit", label: "Went there" },
] as const;

/** Who settles with whom. Stated as what happens, not as a term of art. */
export const SETTLEMENTS = [
  { value: "cashless", label: "They settle with the insurer" },
  { value: "reimbursement", label: "We pay first and claim it back" },
] as const;
