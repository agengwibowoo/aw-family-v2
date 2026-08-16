CREATE TABLE "age_bands" (
	"id" smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "age_bands_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 32767 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"age_from_months" smallint NOT NULL,
	"age_to_months" smallint,
	"focus" text,
	CONSTRAINT "age_bands_name_unique" UNIQUE("name"),
	CONSTRAINT "age_bands_range_check" CHECK ("age_bands"."age_to_months" is null or "age_bands"."age_to_months" > "age_bands"."age_from_months")
);
--> statement-breakpoint
CREATE TABLE "app_users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone,
	"decided_by" uuid,
	CONSTRAINT "app_users_email_unique" UNIQUE("email"),
	CONSTRAINT "app_users_status_check" CHECK ("app_users"."status" in ('pending', 'approved', 'blocked'))
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "categories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 32767 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"prompts_materials" boolean DEFAULT false NOT NULL,
	"default_tracks_cycle" boolean DEFAULT false NOT NULL,
	"default_tracks_consumption" boolean DEFAULT false NOT NULL,
	"default_tracks_size" boolean DEFAULT false NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "children" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"due_date" date NOT NULL,
	"birth_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "document_status" (
	"document_id" smallint PRIMARY KEY NOT NULL,
	"have_original" boolean DEFAULT false NOT NULL,
	"copies_made" integer DEFAULT 0 NOT NULL,
	"image_paths" text[],
	"expires_on" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "documents_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 32767 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"issued_by" text,
	"universally_needed" boolean DEFAULT false NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "documents_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "hospital_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hospital_id" uuid NOT NULL,
	"document_id" smallint NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"copies_required" integer DEFAULT 0 NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "hospital_insurers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hospital_id" uuid NOT NULL,
	"insurer_name" text NOT NULL,
	"accepted" boolean,
	"settlement" text,
	"requires_preauth" boolean,
	"preauth_lead_days" integer,
	"network_tier" text,
	"notes" text,
	CONSTRAINT "hospital_insurers_settlement_check" CHECK ("hospital_insurers"."settlement" is null or "hospital_insurers"."settlement" in ('cashless', 'reimbursement'))
);
--> statement-breakpoint
CREATE TABLE "hospital_quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hospital_id" uuid NOT NULL,
	"delivery_type" text NOT NULL,
	"room_class" text NOT NULL,
	"price_idr" numeric(12, 0),
	"nights_included" integer,
	"includes" text,
	"excludes" text,
	"source" text,
	"quoted_on" date,
	CONSTRAINT "hospital_quotes_source_check" CHECK ("hospital_quotes"."source" is null or "hospital_quotes"."source" in ('website', 'phone', 'visit'))
);
--> statement-breakpoint
CREATE TABLE "hospitals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text,
	"address" text,
	"maps_url" text,
	"phone" text,
	"whatsapp" text,
	"website" text,
	"instagram" text,
	"distance_km" numeric(6, 1),
	"drive_minutes_normal" integer,
	"drive_minutes_peak" integer,
	"has_igd_24h" boolean,
	"has_nicu" boolean,
	"nicu_level" text,
	"supports_imd" boolean,
	"rooming_in" boolean,
	"has_lactation_consultant" boolean,
	"allows_husband_in_room" boolean,
	"allows_photographer" boolean,
	"deposit_idr" numeric(12, 0),
	"decision" text DEFAULT 'shortlisted' NOT NULL,
	"decision_reason" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "hospitals_decision_check" CHECK ("hospitals"."decision" in ('shortlisted', 'picked', 'ruled_out')),
	CONSTRAINT "hospitals_ruled_out_needs_reason" CHECK ("hospitals"."decision" <> 'ruled_out' or "hospitals"."decision_reason" is not null)
);
--> statement-breakpoint
CREATE TABLE "insurance_policy" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"insurer_name" text,
	"policy_number" text,
	"policy_started_on" date,
	"maternity_waiting_period_months" integer,
	"maternity_limit_normal_idr" numeric(12, 0),
	"maternity_limit_caesar_idr" numeric(12, 0),
	"room_entitlement" text,
	"covers_newborn_from_day" integer,
	"excluded_conditions" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "item_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"name" text,
	"brand" text,
	"where_to_buy" text,
	"link" text,
	"est_price_idr" numeric(12, 0),
	"decision" text DEFAULT 'considering' NOT NULL,
	"decision_reason" text,
	"notes" text,
	"needs_review" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "item_candidates_decision_check" CHECK ("item_candidates"."decision" in ('considering', 'picked', 'ruled_out')),
	CONSTRAINT "item_candidates_est_price_check" CHECK ("item_candidates"."est_price_idr" is null or "item_candidates"."est_price_idr" >= 0)
);
--> statement-breakpoint
CREATE TABLE "item_materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid,
	"candidate_id" uuid,
	"purchase_id" uuid,
	"material_id" smallint NOT NULL,
	"role" text,
	"percentage" numeric(5, 2),
	CONSTRAINT "item_materials_one_parent_check" CHECK (num_nonnulls("item_materials"."item_id", "item_materials"."candidate_id", "item_materials"."purchase_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "item_units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"purchase_id" uuid,
	"current_child_id" uuid,
	"label" text,
	"state" text DEFAULT 'ready' NOT NULL,
	"level" text,
	"size" text,
	"acquired_on" date DEFAULT current_date NOT NULL,
	"retired_on" date,
	"retired_reason" text,
	"state_changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "item_units_state_check" CHECK ("item_units"."state" in ('ready', 'in_use', 'dirty', 'cleaning', 'stored', 'lost', 'broken', 'outgrown', 'given_away')),
	CONSTRAINT "item_units_level_check" CHECK ("item_units"."level" is null or "item_units"."level" in ('full', 'half', 'low', 'empty')),
	CONSTRAINT "item_units_retired_pair_check" CHECK (("item_units"."retired_on" is null) = ("item_units"."retired_reason" is null))
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" uuid NOT NULL,
	"category_id" smallint NOT NULL,
	"priority_id" smallint NOT NULL,
	"age_band_id" smallint NOT NULL,
	"name" text NOT NULL,
	"target_qty" integer DEFAULT 1 NOT NULL,
	"owned_qty" integer DEFAULT 0 NOT NULL,
	"giftable" boolean DEFAULT false NOT NULL,
	"brand_suggestions" text,
	"store_suggestions" text,
	"description" text,
	"notes" text,
	"archived_at" timestamp with time zone,
	"archived_reason" text,
	"tracks_cycle" boolean DEFAULT false NOT NULL,
	"tracks_consumption" boolean DEFAULT false NOT NULL,
	"tracks_size" boolean DEFAULT false NOT NULL,
	"status" text GENERATED ALWAYS AS (case
            when owned_qty > target_qty then 'more_than_enough'
            when owned_qty >= target_qty then 'got_it'
            else 'still_need'
          end) STORED,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "items_target_qty_check" CHECK ("items"."target_qty" >= 0),
	CONSTRAINT "items_owned_qty_check" CHECK ("items"."owned_qty" >= 0),
	CONSTRAINT "items_archived_reason_check" CHECK ("items"."archived_reason" is null or "items"."archived_reason" in ('outgrown', 'superseded', 'not_needed')),
	CONSTRAINT "items_archived_pair_check" CHECK (("items"."archived_at" is null) = ("items"."archived_reason" is null))
);
--> statement-breakpoint
CREATE TABLE "links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid,
	"candidate_id" uuid,
	"purchase_id" uuid,
	"url" text NOT NULL,
	"platform" text,
	"kind" text,
	"title" text,
	"thumbnail_path" text,
	"creator" text,
	"note" text,
	"added_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "links_one_parent_check" CHECK (num_nonnulls("links"."item_id", "links"."candidate_id", "links"."purchase_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "materials" (
	"id" smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "materials_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 32767 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"kind" text,
	"aka" text,
	"commonly_irritant" boolean DEFAULT false NOT NULL,
	"notes" text,
	CONSTRAINT "materials_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "pack_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pack_id" uuid NOT NULL,
	"item_id" uuid,
	"document_id" smallint,
	"qty_needed" integer DEFAULT 1 NOT NULL,
	"essential" boolean DEFAULT false NOT NULL,
	"packed_at" timestamp with time zone,
	"note" text,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "pack_items_one_target_check" CHECK (num_nonnulls("pack_items"."item_id", "pack_items"."document_id") = 1),
	CONSTRAINT "pack_items_qty_check" CHECK ("pack_items"."qty_needed" > 0)
);
--> statement-breakpoint
CREATE TABLE "packs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"purpose" text,
	"for_date" date,
	"destination" text,
	"hospital_id" uuid,
	"status" text DEFAULT 'draft' NOT NULL,
	"is_template" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "packs_status_check" CHECK ("packs"."status" in ('draft', 'packing', 'packed', 'returned'))
);
--> statement-breakpoint
CREATE TABLE "priorities" (
	"id" smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "priorities_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 32767 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "priorities_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"name" text,
	"brand" text,
	"where_bought" text,
	"qty" integer DEFAULT 1 NOT NULL,
	"price_per_unit_idr" numeric(12, 0),
	"bought_on" date,
	"notes" text,
	"image_paths" text[],
	"needs_review" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "purchases_qty_check" CHECK ("purchases"."qty" > 0),
	CONSTRAINT "purchases_price_check" CHECK ("purchases"."price_per_unit_idr" is null or "purchases"."price_per_unit_idr" >= 0)
);
--> statement-breakpoint
CREATE TABLE "schedule_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" uuid,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"starts_at" timestamp with time zone,
	"window_start" date,
	"window_end" date,
	"duration_minutes" integer,
	"hospital_id" uuid,
	"location_text" text,
	"practitioner" text,
	"attendees" text[],
	"prep_notes" text,
	"cost_idr" numeric(12, 0),
	"status" text DEFAULT 'planned' NOT NULL,
	"outcome_notes" text,
	"image_paths" text[],
	"recurrence_id" uuid,
	"source" text DEFAULT 'manual' NOT NULL,
	"source_version" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	CONSTRAINT "schedule_events_type_check" CHECK ("schedule_events"."type" in ('antenatal', 'lab', 'class', 'hospital', 'immunisation', 'paediatric', 'postpartum', 'other')),
	CONSTRAINT "schedule_events_status_check" CHECK ("schedule_events"."status" in ('planned', 'confirmed', 'done', 'missed', 'cancelled')),
	CONSTRAINT "schedule_events_source_check" CHECK ("schedule_events"."source" in ('manual', 'antenatal_pattern', 'idai_schedule', 'import')),
	CONSTRAINT "schedule_events_when_check" CHECK (("schedule_events"."starts_at" is not null and "schedule_events"."window_start" is null and "schedule_events"."window_end" is null)
          or ("schedule_events"."starts_at" is null and "schedule_events"."window_start" is not null and "schedule_events"."window_end" is not null)),
	CONSTRAINT "schedule_events_window_order_check" CHECK ("schedule_events"."window_end" is null or "schedule_events"."window_start" is null or "schedule_events"."window_end" >= "schedule_events"."window_start")
);
--> statement-breakpoint
CREATE TABLE "unit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_id" uuid NOT NULL,
	"from_state" text,
	"to_state" text,
	"from_level" text,
	"to_level" text,
	"actor_id" uuid,
	"source" text DEFAULT 'web' NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"note" text,
	CONSTRAINT "unit_events_source_check" CHECK ("unit_events"."source" in ('web', 'mcp', 'import'))
);
--> statement-breakpoint
ALTER TABLE "document_status" ADD CONSTRAINT "document_status_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital_documents" ADD CONSTRAINT "hospital_documents_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital_documents" ADD CONSTRAINT "hospital_documents_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital_insurers" ADD CONSTRAINT "hospital_insurers_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hospital_quotes" ADD CONSTRAINT "hospital_quotes_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_candidates" ADD CONSTRAINT "item_candidates_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_materials" ADD CONSTRAINT "item_materials_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_materials" ADD CONSTRAINT "item_materials_candidate_id_item_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."item_candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_materials" ADD CONSTRAINT "item_materials_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_materials" ADD CONSTRAINT "item_materials_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_units" ADD CONSTRAINT "item_units_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_units" ADD CONSTRAINT "item_units_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_units" ADD CONSTRAINT "item_units_current_child_id_children_id_fk" FOREIGN KEY ("current_child_id") REFERENCES "public"."children"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_priority_id_priorities_id_fk" FOREIGN KEY ("priority_id") REFERENCES "public"."priorities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_age_band_id_age_bands_id_fk" FOREIGN KEY ("age_band_id") REFERENCES "public"."age_bands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_candidate_id_item_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."item_candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pack_items" ADD CONSTRAINT "pack_items_pack_id_packs_id_fk" FOREIGN KEY ("pack_id") REFERENCES "public"."packs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pack_items" ADD CONSTRAINT "pack_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pack_items" ADD CONSTRAINT "pack_items_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packs" ADD CONSTRAINT "packs_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_events" ADD CONSTRAINT "schedule_events_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_events" ADD CONSTRAINT "schedule_events_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_events" ADD CONSTRAINT "unit_events_unit_id_item_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."item_units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "hospital_documents_unique" ON "hospital_documents" USING btree ("hospital_id","document_id");--> statement-breakpoint
CREATE INDEX "hospital_insurers_hospital_idx" ON "hospital_insurers" USING btree ("hospital_id");--> statement-breakpoint
CREATE INDEX "hospital_quotes_hospital_idx" ON "hospital_quotes" USING btree ("hospital_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hospital_quotes_unique" ON "hospital_quotes" USING btree ("hospital_id","delivery_type","room_class");--> statement-breakpoint
CREATE UNIQUE INDEX "one_picked_hospital" ON "hospitals" USING btree ("decision") WHERE "hospitals"."decision" = 'picked';--> statement-breakpoint
CREATE INDEX "item_candidates_item_idx" ON "item_candidates" USING btree ("item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "one_picked_per_item" ON "item_candidates" USING btree ("item_id") WHERE "item_candidates"."decision" = 'picked';--> statement-breakpoint
CREATE INDEX "item_units_item_idx" ON "item_units" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "item_units_purchase_idx" ON "item_units" USING btree ("purchase_id");--> statement-breakpoint
CREATE INDEX "item_units_live_idx" ON "item_units" USING btree ("item_id") WHERE "item_units"."retired_on" is null;--> statement-breakpoint
CREATE INDEX "item_units_rotation_idx" ON "item_units" USING btree ("item_id","state","state_changed_at");--> statement-breakpoint
CREATE INDEX "items_child_idx" ON "items" USING btree ("child_id");--> statement-breakpoint
CREATE INDEX "items_category_idx" ON "items" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "items_age_band_idx" ON "items" USING btree ("age_band_id");--> statement-breakpoint
CREATE INDEX "items_giftable_idx" ON "items" USING btree ("giftable") WHERE "items"."giftable";--> statement-breakpoint
CREATE INDEX "items_active_idx" ON "items" USING btree ("age_band_id") WHERE "items"."archived_at" is null;--> statement-breakpoint
CREATE INDEX "pack_items_pack_idx" ON "pack_items" USING btree ("pack_id");--> statement-breakpoint
CREATE INDEX "purchases_item_idx" ON "purchases" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "schedule_events_starts_idx" ON "schedule_events" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "schedule_events_window_idx" ON "schedule_events" USING btree ("window_start");--> statement-breakpoint
CREATE INDEX "unit_events_unit_idx" ON "unit_events" USING btree ("unit_id","occurred_at");