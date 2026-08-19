ALTER TABLE "hospitals" ADD COLUMN "removed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "hospitals" ADD COLUMN "removed_by" uuid;--> statement-breakpoint
CREATE INDEX "hospitals_live_idx" ON "hospitals" USING btree ("decision") WHERE "hospitals"."removed_at" is null;--> statement-breakpoint
ALTER TABLE "hospitals" ADD CONSTRAINT "hospitals_removed_not_picked" CHECK ("hospitals"."removed_at" is null or "hospitals"."decision" <> 'picked');