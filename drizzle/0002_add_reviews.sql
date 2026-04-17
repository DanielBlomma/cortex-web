CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"api_key_id" uuid,
	"repo" text,
	"policy_id" text NOT NULL,
	"pass" boolean NOT NULL,
	"severity" text DEFAULT 'info' NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"detail" text,
	"reviewed_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_reviews_org_time" ON "reviews" USING btree ("org_id","reviewed_at");--> statement-breakpoint
CREATE INDEX "idx_reviews_org_policy" ON "reviews" USING btree ("org_id","policy_id");