ALTER TABLE "schedule_events" DROP CONSTRAINT "schedule_events_status_check";--> statement-breakpoint
ALTER TABLE "schedule_events" ADD COLUMN "taken_off_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "schedule_events" ADD COLUMN "taken_off_by" uuid;--> statement-breakpoint
-- Hand-written, not generated. Dates taken off before this migration carried
-- status = 'cancelled'; they move to the new column, and the status they
-- overwrote is gone, so 'planned' is the only honest thing left to say. Both
-- statements must run before the check constraint comes back, or it fails on
-- every such row.
UPDATE "schedule_events" SET "taken_off_at" = "updated_at" WHERE "status" = 'cancelled';--> statement-breakpoint
UPDATE "schedule_events" SET "status" = 'planned' WHERE "status" = 'cancelled';--> statement-breakpoint
ALTER TABLE "schedule_events" ADD CONSTRAINT "schedule_events_status_check" CHECK ("schedule_events"."status" in ('planned', 'confirmed', 'done', 'missed'));
