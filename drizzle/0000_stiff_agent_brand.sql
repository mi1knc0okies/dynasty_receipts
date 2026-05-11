CREATE TABLE "ktc_rankings" (
	"id" integer PRIMARY KEY NOT NULL,
	"player_name" text NOT NULL,
	"position" text NOT NULL,
	"team" text,
	"rank" integer NOT NULL,
	"value" integer NOT NULL,
	"tier" integer,
	"position_rank" integer,
	"sf_rank" integer,
	"superflex" integer,
	"scraped_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leagues" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"season" text,
	"status" text,
	"total_rosters" integer,
	"roster_positions" json,
	"settings" json,
	"scoring_settings" json,
	"metadata" json,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" text PRIMARY KEY NOT NULL,
	"first_name" text,
	"last_name" text,
	"full_name" text,
	"team" text,
	"position" text,
	"number" integer,
	"age" integer,
	"height" text,
	"weight" text,
	"college" text,
	"status" text,
	"fantasy_positions" json,
	"metadata" json,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "rosters" (
	"id" integer PRIMARY KEY NOT NULL,
	"roster_id" integer NOT NULL,
	"league_id" text NOT NULL,
	"owner_id" text,
	"players" json,
	"starters" json,
	"reserve" json,
	"settings" json,
	"metadata" json,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "trades" (
	"id" text PRIMARY KEY NOT NULL,
	"league_id" text NOT NULL,
	"season" text,
	"week" integer,
	"timestamp" timestamp,
	"roster_ids" json,
	"consenter_ids" json,
	"adds" json,
	"drops" json,
	"draft_picks" json,
	"status" text,
	"metadata" json,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"display_name" text,
	"avatar" text,
	"metadata" json
);
--> statement-breakpoint
ALTER TABLE "rosters" ADD CONSTRAINT "rosters_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rosters" ADD CONSTRAINT "rosters_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE no action ON UPDATE no action;