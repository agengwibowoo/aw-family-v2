ALTER TABLE "app_users" ADD COLUMN "who" text;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "image_paths" text[];--> statement-breakpoint
CREATE INDEX "item_materials_item_idx" ON "item_materials" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "item_materials_candidate_idx" ON "item_materials" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "item_materials_purchase_idx" ON "item_materials" USING btree ("purchase_id");--> statement-breakpoint
CREATE INDEX "links_item_idx" ON "links" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "links_candidate_idx" ON "links" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "links_purchase_idx" ON "links" USING btree ("purchase_id");--> statement-breakpoint
CREATE UNIQUE INDEX "links_item_url_unique" ON "links" USING btree ("item_id","url") WHERE "links"."item_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "links_candidate_url_unique" ON "links" USING btree ("candidate_id","url") WHERE "links"."candidate_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "links_purchase_url_unique" ON "links" USING btree ("purchase_id","url") WHERE "links"."purchase_id" is not null;--> statement-breakpoint
ALTER TABLE "app_users" ADD CONSTRAINT "app_users_who_check" CHECK ("app_users"."who" is null or "app_users"."who" in ('her', 'him'));