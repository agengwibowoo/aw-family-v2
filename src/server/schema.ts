import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* ---------------------------------------------------------------------------
   Conventions

   - Reference data lives in tables, not enums, so a growing catalog does not
     fight enum ALTERs. New age bands and categories are inserts.
   - Closed state sets are text + check for the same reason.
   - Money is IDR, which has no minor unit: numeric(12, 0).
   - Status words are stored as stable tokens. The English a person reads is
     chrome and lives in the UI — see CONTEXT.md.
   --------------------------------------------------------------------------- */

const money = (name: string) => numeric(name, { precision: 12, scale: 0 });

const audit = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdBy: uuid("created_by"),
  updatedBy: uuid("updated_by"),
};

/* ===========================================================================
   People
   =========================================================================== */

/** Signing in is not access. An account waits until someone approves it. */
export const appUsers = pgTable(
  "app_users",
  {
    id: uuid("id").primaryKey(),
    email: text("email").notNull().unique(),
    displayName: text("display_name"),
    status: text("status").notNull().default("pending"),
    isAdmin: boolean("is_admin").notNull().default(false),
    /**
     * Which of the two people this is. It chooses the landing tab and nothing
     * else — both accounts see the same four tabs and the same data. Null for
     * anyone else who is let in.
     */
    who: text("who"),
    requestedAt: timestamp("requested_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decidedBy: uuid("decided_by"),
  },
  (t) => [
    check(
      "app_users_status_check",
      sql`${t.status} in ('pending', 'approved', 'blocked')`,
    ),
    check("app_users_who_check", sql`${t.who} is null or ${t.who} in ('her', 'him')`),
  ],
);

export const children = pgTable("children", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  /** An estimate. Always spoken of as approximate. */
  dueDate: date("due_date").notNull(),
  /** Unknown until it happens. Once set it replaces dueDate as the origin of
      every age calculation. */
  birthDate: date("birth_date"),
  ...audit,
});

/* ===========================================================================
   Reference
   =========================================================================== */

export const categories = pgTable("categories", {
  id: smallint("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  sortOrder: smallint("sort_order").notNull().default(0),
  /** Whether to prompt for what things in this category are made of. Nobody
      will fill materials in for everything; ask only where it matters. */
  promptsMaterials: boolean("prompts_materials").notNull().default(false),
  defaultTracksCycle: boolean("default_tracks_cycle").notNull().default(false),
  defaultTracksConsumption: boolean("default_tracks_consumption")
    .notNull()
    .default(false),
  defaultTracksSize: boolean("default_tracks_size").notNull().default(false),
});

export const priorities = pgTable("priorities", {
  id: smallint("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  sortOrder: smallint("sort_order").notNull().default(0),
});

/**
 * A window of the child's life in months from birth, negative before it.
 * Ordered, non-overlapping, covering all of time. New bands are inserts.
 *
 * There is deliberately no timing label column: "Apr 2027 →" is derived from
 * the child's birth date, falling back to the due date. Storing it is how the
 * legacy table came to hold seven strings that were all wrong the day after
 * the birth.
 */
export const ageBands = pgTable(
  "age_bands",
  {
    id: smallint("id").primaryKey().generatedAlwaysAsIdentity(),
    name: text("name").notNull().unique(),
    sortOrder: smallint("sort_order").notNull().default(0),
    ageFromMonths: smallint("age_from_months").notNull(),
    ageToMonths: smallint("age_to_months"),
    focus: text("focus"),
  },
  (t) => [
    check(
      "age_bands_range_check",
      sql`${t.ageToMonths} is null or ${t.ageToMonths} > ${t.ageFromMonths}`,
    ),
  ],
);

/** The master list of papers hospitals ask for. */
export const documents = pgTable("documents", {
  id: smallint("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  issuedBy: text("issued_by"),
  universallyNeeded: boolean("universally_needed").notNull().default(false),
  sortOrder: smallint("sort_order").notNull().default(0),
});

export const materials = pgTable("materials", {
  id: smallint("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull().unique(),
  kind: text("kind"),
  /** Synonyms, so "cotton", "katun" and "100% cotton" resolve to one row. */
  aka: text("aka"),
  /** Pre-flags the usual suspects. Surfaced as information, never a warning,
      and never a recommendation — this app records, it does not conclude. */
  commonlyIrritant: boolean("commonly_irritant").notNull().default(false),
  notes: text("notes"),
});

/* ===========================================================================
   Buying
   =========================================================================== */

/**
 * A need the household has to meet. Not an object — the reason objects get
 * acquired.
 */
export const items = pgTable(
  "items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Which child prompted this need. Not ownership: the physical objects
        are household inventory and hang off item_units, not here. */
    childId: uuid("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    categoryId: smallint("category_id")
      .notNull()
      .references(() => categories.id),
    priorityId: smallint("priority_id")
      .notNull()
      .references(() => priorities.id),
    ageBandId: smallint("age_band_id")
      .notNull()
      .references(() => ageBands.id),
    name: text("name").notNull(),
    targetQty: integer("target_qty").notNull().default(1),
    /**
     * Maintained by syncOwnedQtyFromUnits inside the same transaction as any
     * unit write. It exists as a column only so `status` can be generated;
     * units are the source of truth. Never write it directly.
     */
    ownedQty: integer("owned_qty").notNull().default(0),
    giftable: boolean("giftable").notNull().default(false),
    brandSuggestions: text("brand_suggestions"),
    storeSuggestions: text("store_suggestions"),
    description: text("description"),
    notes: text("notes"),
    /** Photographs someone here took. They appear in search results, where she
        is identifying, and on the registry — but not in the list, where she is
        scanning. There is no product photography in this app. */
    imagePaths: text("image_paths").array(),

    /** Archiving is not deletion. History, prices and links survive; the
        thing leaves the counts and the default lists. */
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    archivedReason: text("archived_reason"),

    /** Defaulted from the category at creation, overridable by the operator.
        Never set by the person recording day-to-day. */
    tracksCycle: boolean("tracks_cycle").notNull().default(false),
    tracksConsumption: boolean("tracks_consumption").notNull().default(false),
    tracksSize: boolean("tracks_size").notNull().default(false),

    /**
     * Derived, never written.
     *
     * The legacy rule read `when owned_qty = 0 then 'Not bought' / when
     * owned_qty > target_qty then 'Over' / else 'Bought'`, which reported
     * 2-of-5 as bought. Fixed here.
     */
    status: text("status").generatedAlwaysAs(
      sql`case
            when owned_qty > target_qty then 'more_than_enough'
            when owned_qty >= target_qty then 'got_it'
            else 'still_need'
          end`,
    ),
    ...audit,
  },
  (t) => [
    index("items_child_idx").on(t.childId),
    index("items_category_idx").on(t.categoryId),
    index("items_age_band_idx").on(t.ageBandId),
    index("items_giftable_idx").on(t.giftable).where(sql`${t.giftable}`),
    index("items_active_idx")
      .on(t.ageBandId)
      .where(sql`${t.archivedAt} is null`),
    check("items_target_qty_check", sql`${t.targetQty} >= 0`),
    check("items_owned_qty_check", sql`${t.ownedQty} >= 0`),
    check(
      "items_archived_reason_check",
      sql`${t.archivedReason} is null or ${t.archivedReason} in ('outgrown', 'superseded', 'not_needed')`,
    ),
    check(
      "items_archived_pair_check",
      sql`(${t.archivedAt} is null) = (${t.archivedReason} is null)`,
    ),
  ],
);

/**
 * A specific product being considered to meet a thing. At most one can be
 * picked.
 *
 * There is no actual price here. The legacy table had both est_price_idr and
 * actual_price_idr, only one of which counted toward spend — two fields called
 * "actual price", one of them a decoy. What was actually paid lives on the
 * purchase.
 */
export const itemCandidates = pgTable(
  "item_candidates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    /** The product's own name — "Wide Neck PPSU 240ml". Kept separate from
        brand so "show me everything Pigeon" stays a query you can run. */
    name: text("name"),
    brand: text("brand"),
    whereToBuy: text("where_to_buy"),
    link: text("link"),
    estPriceIdr: money("est_price_idr"),
    decision: text("decision").notNull().default("considering"),
    decisionReason: text("decision_reason"),
    notes: text("notes"),
    /** Set by the import where brand was copied verbatim into name; cleared
        once a human has looked at the row. */
    needsReview: boolean("needs_review").notNull().default(false),
    ...audit,
  },
  (t) => [
    index("item_candidates_item_idx").on(t.itemId),
    uniqueIndex("one_picked_per_item")
      .on(t.itemId)
      .where(sql`${t.decision} = 'picked'`),
    check(
      "item_candidates_decision_check",
      sql`${t.decision} in ('considering', 'picked', 'ruled_out')`,
    ),
    check(
      "item_candidates_est_price_check",
      sql`${t.estPriceIdr} is null or ${t.estPriceIdr} >= 0`,
    ),
  ],
);

/**
 * A receipt. It records money spent; it does not make the count.
 * Deleting one retires its units rather than deleting them.
 */
export const purchases = pgTable(
  "purchases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    name: text("name"),
    brand: text("brand"),
    whereBought: text("where_bought"),
    qty: integer("qty").notNull().default(1),
    pricePerUnitIdr: money("price_per_unit_idr"),
    boughtOn: date("bought_on"),
    notes: text("notes"),
    imagePaths: text("image_paths").array(),
    needsReview: boolean("needs_review").notNull().default(false),
    ...audit,
  },
  (t) => [
    index("purchases_item_idx").on(t.itemId),
    check("purchases_qty_check", sql`${t.qty} > 0`),
    check(
      "purchases_price_check",
      sql`${t.pricePerUnitIdr} is null or ${t.pricePerUnitIdr} >= 0`,
    ),
  ],
);

/**
 * One physical object in the household.
 *
 * Units are household inventory that reference an item as their *kind*, which
 * is why item_id restricts rather than cascades and current_child_id neither
 * cascades nor is required: a bottle has to be able to outlive its association
 * with the child it was bought for, or hand-me-downs cannot be expressed.
 *
 * Nobody ever identifies a unit. The system assigns them; a person sees a
 * number.
 */
export const itemUnits = pgTable(
  "item_units",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "restrict" }),
    /** Null for gifts, hand-me-downs, and things already owned — a capability
        the count-from-purchases model could not express at all. */
    purchaseId: uuid("purchase_id").references(() => purchases.id, {
      onDelete: "set null",
    }),
    currentChildId: uuid("current_child_id").references(() => children.id, {
      onDelete: "set null",
    }),
    label: text("label"),
    state: text("state").notNull().default("ready"),
    /** Consumables only. Four buckets, not percentages — nobody measures. */
    level: text("level"),
    size: text("size"),
    acquiredOn: date("acquired_on")
      .notNull()
      .default(sql`current_date`),
    retiredOn: date("retired_on"),
    retiredReason: text("retired_reason"),
    /** Drives rotation order, so bulk transitions are deterministic and the
        app and an agent never disagree about which unit moved. */
    stateChangedAt: timestamp("state_changed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    notes: text("notes"),
    ...audit,
  },
  (t) => [
    index("item_units_item_idx").on(t.itemId),
    index("item_units_purchase_idx").on(t.purchaseId),
    index("item_units_live_idx")
      .on(t.itemId)
      .where(sql`${t.retiredOn} is null`),
    index("item_units_rotation_idx").on(t.itemId, t.state, t.stateChangedAt),
    check(
      "item_units_state_check",
      sql`${t.state} in ('ready', 'in_use', 'dirty', 'cleaning', 'stored', 'lost', 'broken', 'outgrown', 'given_away')`,
    ),
    check(
      "item_units_level_check",
      sql`${t.level} is null or ${t.level} in ('full', 'half', 'low', 'empty')`,
    ),
    check(
      "item_units_retired_pair_check",
      sql`(${t.retiredOn} is null) = (${t.retiredReason} is null)`,
    ),
  ],
);

export const unitEvents = pgTable(
  "unit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    unitId: uuid("unit_id")
      .notNull()
      .references(() => itemUnits.id, { onDelete: "cascade" }),
    fromState: text("from_state"),
    toState: text("to_state"),
    fromLevel: text("from_level"),
    toLevel: text("to_level"),
    actorId: uuid("actor_id"),
    source: text("source").notNull().default("web"),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    note: text("note"),
  },
  (t) => [
    index("unit_events_unit_idx").on(t.unitId, t.occurredAt),
    check(
      "unit_events_source_check",
      sql`${t.source} in ('web', 'mcp', 'import')`,
    ),
  ],
);

/**
 * A review, tutorial or product page that landed here. Attached to exactly one
 * of a thing, a candidate or a purchase — reviews of this kind of thing,
 * a review of this specific product, or how to clean the one we own.
 */
export const links = pgTable(
  "links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    itemId: uuid("item_id").references(() => items.id, { onDelete: "cascade" }),
    candidateId: uuid("candidate_id").references(() => itemCandidates.id, {
      onDelete: "cascade",
    }),
    purchaseId: uuid("purchase_id").references(() => purchases.id, {
      onDelete: "cascade",
    }),
    url: text("url").notNull(),
    platform: text("platform"),
    kind: text("kind"),
    title: text("title"),
    thumbnailPath: text("thumbnail_path"),
    creator: text("creator"),
    note: text("note"),
    addedBy: uuid("added_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("links_item_idx").on(t.itemId),
    index("links_candidate_idx").on(t.candidateId),
    index("links_purchase_idx").on(t.purchaseId),
    check(
      "links_one_parent_check",
      sql`num_nonnulls(${t.itemId}, ${t.candidateId}, ${t.purchaseId}) = 1`,
    ),
    /**
     * The same URL pasted twice onto the same target is one link, not two.
     * Held here rather than in the service because a paste arriving over MCP
     * has to obey the same rule as a paste arriving from a screen.
     */
    uniqueIndex("links_item_url_unique")
      .on(t.itemId, t.url)
      .where(sql`${t.itemId} is not null`),
    uniqueIndex("links_candidate_url_unique")
      .on(t.candidateId, t.url)
      .where(sql`${t.candidateId} is not null`),
    uniqueIndex("links_purchase_url_unique")
      .on(t.purchaseId, t.url)
      .where(sql`${t.purchaseId} is not null`),
  ],
);

export const itemMaterials = pgTable(
  "item_materials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    itemId: uuid("item_id").references(() => items.id, { onDelete: "cascade" }),
    candidateId: uuid("candidate_id").references(() => itemCandidates.id, {
      onDelete: "cascade",
    }),
    purchaseId: uuid("purchase_id").references(() => purchases.id, {
      onDelete: "cascade",
    }),
    materialId: smallint("material_id")
      .notNull()
      .references(() => materials.id),
    role: text("role"),
    percentage: numeric("percentage", { precision: 5, scale: 2 }),
  },
  (t) => [
    index("item_materials_item_idx").on(t.itemId),
    index("item_materials_candidate_idx").on(t.candidateId),
    index("item_materials_purchase_idx").on(t.purchaseId),
    check(
      "item_materials_one_parent_check",
      sql`num_nonnulls(${t.itemId}, ${t.candidateId}, ${t.purchaseId}) = 1`,
    ),
  ],
);

/* ===========================================================================
   Where the birth happens
   =========================================================================== */

/** Every field is nullable, and null must stay distinguishable from "no"
    everywhere it is shown. A blank that could be misread as "no" is a bug. */
export const hospitals = pgTable(
  "hospitals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    type: text("type"),
    address: text("address"),
    mapsUrl: text("maps_url"),
    phone: text("phone"),
    whatsapp: text("whatsapp"),
    website: text("website"),
    instagram: text("instagram"),

    distanceKm: numeric("distance_km", { precision: 6, scale: 1 }),
    driveMinutesNormal: integer("drive_minutes_normal"),
    /** The number that actually matters. Jakarta traffic makes a 20-minute
        hospital a 70-minute hospital. */
    driveMinutesPeak: integer("drive_minutes_peak"),
    hasIgd24h: boolean("has_igd_24h"),

    /** If the baby needs intensive care and there is no NICU, the baby is
        transferred and you are separated. The most consequential field here. */
    hasNicu: boolean("has_nicu"),
    nicuLevel: text("nicu_level"),
    supportsImd: boolean("supports_imd"),
    roomingIn: boolean("rooming_in"),
    hasLactationConsultant: boolean("has_lactation_consultant"),

    allowsHusbandInRoom: boolean("allows_husband_in_room"),
    allowsPhotographer: boolean("allows_photographer"),

    depositIdr: money("deposit_idr"),

    decision: text("decision").notNull().default("shortlisted"),
    decisionReason: text("decision_reason"),

    /** Removed is not ruled out. Ruling a place out is a decision we keep and
        show; removing one says it should never have been on the list — a
        duplicate, a typo. Its quotes, insurers and papers survive underneath,
        and it can be put back. */
    removedAt: timestamp("removed_at", { withTimezone: true }),
    removedBy: uuid("removed_by"),

    notes: text("notes"),
    ...audit,
  },
  (t) => [
    uniqueIndex("one_picked_hospital")
      .on(t.decision)
      .where(sql`${t.decision} = 'picked'`),
    check(
      "hospitals_decision_check",
      sql`${t.decision} in ('shortlisted', 'picked', 'ruled_out')`,
    ),
    /** Ruled out keeps its reason. It is never deleted. */
    check(
      "hospitals_ruled_out_needs_reason",
      sql`${t.decision} <> 'ruled_out' or ${t.decisionReason} is not null`,
    ),
    /** The papers pack follows the picked place, and remembers which place it
        was last scored against so the screen can name what changed. Removing
        that place would erase the record and re-score the pack in silence, so
        Postgres refuses it — even to a hand-written statement. */
    check(
      "hospitals_removed_not_picked",
      sql`${t.removedAt} is null or ${t.decision} <> 'picked'`,
    ),
    index("hospitals_live_idx")
      .on(t.decision)
      .where(sql`${t.removedAt} is null`),
  ],
);

/**
 * A hospital's price for one delivery type and one room class, as told to us
 * on a given day. Quotes go stale; past sixty days the app says so in words.
 */
export const hospitalQuotes = pgTable(
  "hospital_quotes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    hospitalId: uuid("hospital_id")
      .notNull()
      .references(() => hospitals.id, { onDelete: "cascade" }),
    deliveryType: text("delivery_type").notNull(),
    roomClass: text("room_class").notNull(),
    priceIdr: money("price_idr"),
    nightsIncluded: integer("nights_included"),
    includes: text("includes"),
    excludes: text("excludes"),
    source: text("source"),
    quotedOn: date("quoted_on"),
  },
  (t) => [
    index("hospital_quotes_hospital_idx").on(t.hospitalId),
    uniqueIndex("hospital_quotes_unique").on(
      t.hospitalId,
      t.deliveryType,
      t.roomClass,
    ),
    check(
      "hospital_quotes_source_check",
      sql`${t.source} is null or ${t.source} in ('website', 'phone', 'visit')`,
    ),
  ],
);

export const hospitalInsurers = pgTable(
  "hospital_insurers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    hospitalId: uuid("hospital_id")
      .notNull()
      .references(() => hospitals.id, { onDelete: "cascade" }),
    insurerName: text("insurer_name").notNull(),
    accepted: boolean("accepted"),
    /** Cashless or reimbursement. The difference shows up at admission. */
    settlement: text("settlement"),
    requiresPreauth: boolean("requires_preauth"),
    preauthLeadDays: integer("preauth_lead_days"),
    networkTier: text("network_tier"),
    notes: text("notes"),
  },
  (t) => [
    index("hospital_insurers_hospital_idx").on(t.hospitalId),
    check(
      "hospital_insurers_settlement_check",
      sql`${t.settlement} is null or ${t.settlement} in ('cashless', 'reimbursement')`,
    ),
  ],
);

/** What this hospital asks for, pointing at the household's master list.
    Copy counts are not a detail: "fotokopi KTP 3 lembar" is a real, common,
    easily-forgotten requirement. */
export const hospitalDocuments = pgTable(
  "hospital_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    hospitalId: uuid("hospital_id")
      .notNull()
      .references(() => hospitals.id, { onDelete: "cascade" }),
    documentId: smallint("document_id")
      .notNull()
      .references(() => documents.id),
    required: boolean("required").notNull().default(true),
    copiesRequired: integer("copies_required").notNull().default(0),
    notes: text("notes"),
  },
  (t) => [
    uniqueIndex("hospital_documents_unique").on(t.hospitalId, t.documentId),
  ],
);

/** Household-level: you either have your Kartu Keluarga or you don't. Tracked
    once, with a scan, and each hospital's requirement points at it. */
export const documentStatus = pgTable("document_status", {
  documentId: smallint("document_id")
    .primaryKey()
    .references(() => documents.id),
  haveOriginal: boolean("have_original").notNull().default(false),
  copiesMade: integer("copies_made").notNull().default(0),
  imagePaths: text("image_paths").array(),
  expiresOn: date("expires_on"),
  notes: text("notes"),
  /** Which drawer, folder or bag the original actually lives in. "We have it"
      is half an answer at 3am; this is the other half. Free text, and data — it
      stays in whatever language it was typed in. */
  whereKept: text("where_kept"),
  ...audit,
});

/**
 * Tracked once for the household, not per hospital. The waiting period is the
 * field that ruins people: many Indonesian private policies impose nine to
 * twelve months, and a policy started after conception may not cover the
 * delivery at all.
 *
 * Whether this delivery is covered is computed and shown as a sentence. It is
 * never left as two dates and a subtraction for the reader to perform.
 */
export const insurancePolicy = pgTable("insurance_policy", {
  id: uuid("id").primaryKey().defaultRandom(),
  insurerName: text("insurer_name"),
  policyNumber: text("policy_number"),
  policyStartedOn: date("policy_started_on"),
  maternityWaitingPeriodMonths: integer("maternity_waiting_period_months"),
  maternityLimitNormalIdr: money("maternity_limit_normal_idr"),
  maternityLimitCaesarIdr: money("maternity_limit_caesar_idr"),
  roomEntitlement: text("room_entitlement"),
  coversNewbornFromDay: integer("covers_newborn_from_day"),
  excludedConditions: text("excluded_conditions"),
  notes: text("notes"),
  ...audit,
});

/* ===========================================================================
   Dates
   =========================================================================== */

/**
 * An appointment has starts_at. A window has window_start and window_end and
 * no single right day inside it. They are the same row shape with an optional
 * range, and they must never be given the same visual shape.
 */
export const scheduleEvents = pgTable(
  "schedule_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    childId: uuid("child_id").references(() => children.id, {
      onDelete: "set null",
    }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    windowStart: date("window_start"),
    windowEnd: date("window_end"),
    durationMinutes: integer("duration_minutes"),
    hospitalId: uuid("hospital_id").references(() => hospitals.id, {
      onDelete: "set null",
    }),
    locationText: text("location_text"),
    practitioner: text("practitioner"),
    attendees: text("attendees").array(),
    /** Plain sentences: "Nothing to eat for 8 hours. Water is fine." Never
        "fasting required (8h)". */
    prepNotes: text("prep_notes"),
    costIdr: money("cost_idr"),
    status: text("status").notNull().default("planned"),
    /** Off the list, and orthogonal to status: a date that has been and gone
        can come off too, and must still read as done when it is put back. */
    takenOffAt: timestamp("taken_off_at", { withTimezone: true }),
    takenOffBy: uuid("taken_off_by"),
    outcomeNotes: text("outcome_notes"),
    imagePaths: text("image_paths").array(),
    recurrenceId: uuid("recurrence_id"),
    /** A seeded immunisation names its source in the row and defers to the
        paediatrician. A scaffold, never medical instruction. */
    source: text("source").notNull().default("manual"),
    sourceVersion: text("source_version"),
    ...audit,
  },
  (t) => [
    index("schedule_events_starts_idx").on(t.startsAt),
    index("schedule_events_window_idx").on(t.windowStart),
    check(
      "schedule_events_type_check",
      sql`${t.type} in ('antenatal', 'lab', 'class', 'hospital', 'immunisation', 'paediatric', 'postpartum', 'other')`,
    ),
    check(
      "schedule_events_status_check",
      sql`${t.status} in ('planned', 'confirmed', 'done', 'missed')`,
    ),
    check(
      "schedule_events_source_check",
      sql`${t.source} in ('manual', 'antenatal_pattern', 'idai_schedule', 'import')`,
    ),
    /** Either a fixed time or a window, never both, never neither. */
    check(
      "schedule_events_when_check",
      sql`(${t.startsAt} is not null and ${t.windowStart} is null and ${t.windowEnd} is null)
          or (${t.startsAt} is null and ${t.windowStart} is not null and ${t.windowEnd} is not null)`,
    ),
    check(
      "schedule_events_window_order_check",
      sql`${t.windowEnd} is null or ${t.windowStart} is null or ${t.windowEnd} >= ${t.windowStart}`,
    ),
  ],
);

/* ===========================================================================
   Packs
   =========================================================================== */

/** A named list of things and papers assembled for one trip. What makes it
    worth code rather than a note in a phone is that it knows whether the
    things on it are actually available. */
export const packs = pgTable(
  "packs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    purpose: text("purpose"),
    forDate: date("for_date"),
    destination: text("destination"),
    /** When set, the pack pulls in this hospital's required papers, so week 36
        is one list rather than two. */
    hospitalId: uuid("hospital_id").references(() => hospitals.id, {
      onDelete: "set null",
    }),
    status: text("status").notNull().default("draft"),
    isTemplate: boolean("is_template").notNull().default(false),
    ...audit,
  },
  (t) => [
    check(
      "packs_status_check",
      sql`${t.status} in ('draft', 'packing', 'packed', 'returned')`,
    ),
  ],
);

export const packItems = pgTable(
  "pack_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    packId: uuid("pack_id")
      .notNull()
      .references(() => packs.id, { onDelete: "cascade" }),
    itemId: uuid("item_id").references(() => items.id, { onDelete: "cascade" }),
    /** A pack line is either a thing or a paper. */
    documentId: smallint("document_id").references(() => documents.id),
    qtyNeeded: integer("qty_needed").notNull().default(1),
    essential: boolean("essential").notNull().default(false),
    packedAt: timestamp("packed_at", { withTimezone: true }),
    note: text("note"),
    sortOrder: smallint("sort_order").notNull().default(0),
  },
  (t) => [
    index("pack_items_pack_idx").on(t.packId),
    check(
      "pack_items_one_target_check",
      sql`num_nonnulls(${t.itemId}, ${t.documentId}) = 1`,
    ),
    check("pack_items_qty_check", sql`${t.qtyNeeded} > 0`),
  ],
);
