ALTER TABLE "places" ADD COLUMN "cuisine" text;--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN "price_level" integer;--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" text DEFAULT 'user' NOT NULL;