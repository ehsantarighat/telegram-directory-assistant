CREATE TYPE "public"."category_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."channel_status" AS ENUM('active', 'disabled', 'removed', 'pending');--> statement-breakpoint
CREATE TYPE "public"."channel_suggestion_status" AS ENUM('pending', 'approved', 'rejected', 'duplicate');--> statement-breakpoint
CREATE TYPE "public"."content_mode" AS ENUM('original', 'translated');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('active', 'hidden', 'removed', 'duplicate', 'incomplete');--> statement-breakpoint
CREATE TYPE "public"."listing_type" AS ENUM('rent', 'sale', 'daily_rent');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('email', 'telegram_bot', 'web_push', 'whatsapp');--> statement-breakpoint
CREATE TYPE "public"."property_type" AS ENUM('apartment', 'house', 'commercial', 'land', 'room', 'studio');--> statement-breakpoint
CREATE TYPE "public"."raw_post_processing_status" AS ENUM('pending', 'processed', 'failed', 'ignored');--> statement-breakpoint
CREATE TYPE "public"."removal_request_status" AS ENUM('pending', 'approved', 'rejected', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."removal_requester_type" AS ENUM('user', 'channel_owner', 'other');--> statement-breakpoint
CREATE TYPE "public"."translation_direction" AS ENUM('ltr', 'rtl');--> statement-breakpoint
CREATE TYPE "public"."user_plan" AS ENUM('free', 'paid');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text,
	"preferred_language" text DEFAULT 'en' NOT NULL,
	"preferred_content_mode" "content_mode" DEFAULT 'original' NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"plan" "user_plan" DEFAULT 'free' NOT NULL,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" "category_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "telegram_channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"username" text NOT NULL,
	"url" text NOT NULL,
	"category_id" uuid NOT NULL,
	"country" text,
	"city" text,
	"language" text,
	"status" "channel_status" DEFAULT 'active' NOT NULL,
	"added_by_admin_id" uuid,
	"last_synced_at" timestamp with time zone,
	"last_sync_status" text,
	"last_sync_error" text,
	"posts_imported_count" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "telegram_channels_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "channel_suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"channel_url" text NOT NULL,
	"channel_username" text,
	"suggested_category_id" uuid,
	"suggested_city" text,
	"note" text,
	"status" "channel_suggestion_status" DEFAULT 'pending' NOT NULL,
	"admin_note" text,
	"reviewed_by_admin_id" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "raw_telegram_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"telegram_channel_id" uuid NOT NULL,
	"telegram_message_id" bigint NOT NULL,
	"original_post_url" text NOT NULL,
	"original_text" text,
	"detected_language" text,
	"published_at" timestamp with time zone NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"has_media" boolean DEFAULT false NOT NULL,
	"media_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"raw_payload_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"processing_status" "raw_post_processing_status" DEFAULT 'pending' NOT NULL,
	"processing_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"primary_raw_post_id" uuid,
	"listing_type" "listing_type" NOT NULL,
	"property_type" "property_type",
	"title" text NOT NULL,
	"summary" text,
	"original_text" text,
	"detected_language" text,
	"country" text,
	"city" text,
	"district" text,
	"neighborhood" text,
	"price" numeric(14, 2),
	"currency" text,
	"rooms" integer,
	"area_sqm" numeric(10, 2),
	"floor" integer,
	"total_floors" integer,
	"furnished" boolean,
	"new_building" boolean,
	"renovation_status" text,
	"metro_nearby" boolean,
	"owner_or_agent" text,
	"commission" text,
	"parking" boolean,
	"balcony" boolean,
	"elevator" boolean,
	"pets_allowed" boolean,
	"heating_type" text,
	"building_material" text,
	"contact_phone" text,
	"contact_telegram" text,
	"has_photos" boolean DEFAULT false NOT NULL,
	"main_image_url" text,
	"media_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source_count" integer DEFAULT 1 NOT NULL,
	"saved_count" bigint DEFAULT 0 NOT NULL,
	"duplicate_group_id" uuid,
	"published_at" timestamp with time zone,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "listing_status" DEFAULT 'active' NOT NULL,
	"extraction_confidence_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listing_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"raw_telegram_post_id" uuid NOT NULL,
	"telegram_channel_id" uuid NOT NULL,
	"original_post_url" text NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listing_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"language" text NOT NULL,
	"translated_title" text,
	"translated_summary" text,
	"translated_text" text,
	"direction" "translation_direction" DEFAULT 'ltr' NOT NULL,
	"provider" text DEFAULT 'mock' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"listing_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_searches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category_id" uuid,
	"filters_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"alerts_enabled" boolean DEFAULT false NOT NULL,
	"notification_channel" "notification_channel",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "removal_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_name" text NOT NULL,
	"requester_email" text NOT NULL,
	"requester_type" "removal_requester_type" NOT NULL,
	"telegram_channel_id" uuid,
	"listing_id" uuid,
	"reason" text NOT NULL,
	"note" text,
	"status" "removal_request_status" DEFAULT 'pending' NOT NULL,
	"admin_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "telegram_channels" ADD CONSTRAINT "telegram_channels_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_channels" ADD CONSTRAINT "telegram_channels_added_by_admin_id_user_profiles_id_fk" FOREIGN KEY ("added_by_admin_id") REFERENCES "public"."user_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_suggestions" ADD CONSTRAINT "channel_suggestions_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_suggestions" ADD CONSTRAINT "channel_suggestions_suggested_category_id_categories_id_fk" FOREIGN KEY ("suggested_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_suggestions" ADD CONSTRAINT "channel_suggestions_reviewed_by_admin_id_user_profiles_id_fk" FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "public"."user_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_telegram_posts" ADD CONSTRAINT "raw_telegram_posts_telegram_channel_id_telegram_channels_id_fk" FOREIGN KEY ("telegram_channel_id") REFERENCES "public"."telegram_channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_primary_raw_post_id_raw_telegram_posts_id_fk" FOREIGN KEY ("primary_raw_post_id") REFERENCES "public"."raw_telegram_posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_sources" ADD CONSTRAINT "listing_sources_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_sources" ADD CONSTRAINT "listing_sources_raw_telegram_post_id_raw_telegram_posts_id_fk" FOREIGN KEY ("raw_telegram_post_id") REFERENCES "public"."raw_telegram_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_sources" ADD CONSTRAINT "listing_sources_telegram_channel_id_telegram_channels_id_fk" FOREIGN KEY ("telegram_channel_id") REFERENCES "public"."telegram_channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_translations" ADD CONSTRAINT "listing_translations_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_listings" ADD CONSTRAINT "saved_listings_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_listings" ADD CONSTRAINT "saved_listings_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "removal_requests" ADD CONSTRAINT "removal_requests_telegram_channel_id_telegram_channels_id_fk" FOREIGN KEY ("telegram_channel_id") REFERENCES "public"."telegram_channels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "removal_requests" ADD CONSTRAINT "removal_requests_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "telegram_channels_category_idx" ON "telegram_channels" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "telegram_channels_status_idx" ON "telegram_channels" USING btree ("status");--> statement-breakpoint
CREATE INDEX "telegram_channels_city_idx" ON "telegram_channels" USING btree ("city");--> statement-breakpoint
CREATE INDEX "channel_suggestions_status_idx" ON "channel_suggestions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "channel_suggestions_user_idx" ON "channel_suggestions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "raw_telegram_posts_channel_message_unique" ON "raw_telegram_posts" USING btree ("telegram_channel_id","telegram_message_id");--> statement-breakpoint
CREATE INDEX "raw_telegram_posts_published_idx" ON "raw_telegram_posts" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "raw_telegram_posts_processing_status_idx" ON "raw_telegram_posts" USING btree ("processing_status");--> statement-breakpoint
CREATE INDEX "listings_active_type_city_published_idx" ON "listings" USING btree ("status","listing_type","city","published_at");--> statement-breakpoint
CREATE INDEX "listings_active_type_published_idx" ON "listings" USING btree ("status","listing_type","published_at");--> statement-breakpoint
CREATE INDEX "listings_category_idx" ON "listings" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "listings_property_type_idx" ON "listings" USING btree ("property_type");--> statement-breakpoint
CREATE INDEX "listings_district_idx" ON "listings" USING btree ("district");--> statement-breakpoint
CREATE INDEX "listings_price_idx" ON "listings" USING btree ("price");--> statement-breakpoint
CREATE INDEX "listings_rooms_idx" ON "listings" USING btree ("rooms");--> statement-breakpoint
CREATE INDEX "listings_duplicate_group_idx" ON "listings" USING btree ("duplicate_group_id");--> statement-breakpoint
CREATE INDEX "listings_published_at_idx" ON "listings" USING btree ("published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "listing_sources_listing_raw_unique" ON "listing_sources" USING btree ("listing_id","raw_telegram_post_id");--> statement-breakpoint
CREATE INDEX "listing_sources_listing_idx" ON "listing_sources" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "listing_sources_channel_idx" ON "listing_sources" USING btree ("telegram_channel_id");--> statement-breakpoint
CREATE UNIQUE INDEX "listing_translations_listing_language_unique" ON "listing_translations" USING btree ("listing_id","language");--> statement-breakpoint
CREATE UNIQUE INDEX "saved_listings_user_listing_unique" ON "saved_listings" USING btree ("user_id","listing_id");--> statement-breakpoint
CREATE INDEX "saved_listings_user_created_idx" ON "saved_listings" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "saved_searches_user_idx" ON "saved_searches" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "removal_requests_status_idx" ON "removal_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "removal_requests_listing_idx" ON "removal_requests" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "removal_requests_channel_idx" ON "removal_requests" USING btree ("telegram_channel_id");