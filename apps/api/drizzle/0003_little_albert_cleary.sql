CREATE INDEX IF NOT EXISTS "places_latitude_idx" ON "places" USING btree ("latitude");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "places_longitude_idx" ON "places" USING btree ("longitude");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "reviews_user_place_unique" ON "reviews" USING btree ("user_id","place_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reviews_place_id_idx" ON "reviews" USING btree ("place_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reviews_user_id_idx" ON "reviews" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "saves_user_place_unique" ON "saves" USING btree ("user_id","place_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "saves_user_id_idx" ON "saves" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "saves_place_id_idx" ON "saves" USING btree ("place_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "visits_user_place_unique" ON "visits" USING btree ("user_id","place_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "visits_user_id_idx" ON "visits" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "visits_place_id_idx" ON "visits" USING btree ("place_id");