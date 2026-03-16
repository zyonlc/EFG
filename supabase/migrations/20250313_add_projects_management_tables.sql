-- Create project_milestone_videos table for storing video evidence of completed milestone work
CREATE TABLE IF NOT EXISTS "public"."project_milestone_videos" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "milestone_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "url" "text" NOT NULL,
    "thumbnail_url" "text" NOT NULL,
    "playback_id" "text" NOT NULL,
    "timestamp" bigint NOT NULL,
    "uploaded_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    PRIMARY KEY ("id"),
    CONSTRAINT fk_milestone FOREIGN KEY ("milestone_id") REFERENCES "public"."contract_milestones"("id") ON DELETE CASCADE,
    CONSTRAINT fk_uploader FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL
);

-- Create project_team_chat table for team collaboration and messaging
CREATE TABLE IF NOT EXISTS "public"."project_team_chat" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "contract_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "sender_name" "text" NOT NULL,
    "sender_avatar" "text",
    "message" "text" NOT NULL,
    "attachment_url" "text",
    "attachment_type" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    PRIMARY KEY ("id"),
    CONSTRAINT fk_contract FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE CASCADE,
    CONSTRAINT fk_sender FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_project_milestone_videos_milestone_id" ON "public"."project_milestone_videos"("milestone_id");
CREATE INDEX IF NOT EXISTS "idx_project_milestone_videos_uploaded_by" ON "public"."project_milestone_videos"("uploaded_by");
CREATE INDEX IF NOT EXISTS "idx_project_milestone_videos_created_at" ON "public"."project_milestone_videos"("created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_project_team_chat_contract_id" ON "public"."project_team_chat"("contract_id");
CREATE INDEX IF NOT EXISTS "idx_project_team_chat_created_at" ON "public"."project_team_chat"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_project_team_chat_sender_id" ON "public"."project_team_chat"("sender_id");

-- Enable RLS for both tables
ALTER TABLE "public"."project_milestone_videos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."project_team_chat" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_milestone_videos
CREATE POLICY "Users can view milestone videos" ON "public"."project_milestone_videos" 
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM "public"."contracts" 
            WHERE "contracts"."id" = "project_milestone_videos"."milestone_id"
        )
    );

CREATE POLICY "Users can upload milestone videos for their contracts" ON "public"."project_milestone_videos" 
    FOR INSERT 
    WITH CHECK ("auth"."uid"() = "uploaded_by");

CREATE POLICY "Users can update their own milestone videos" ON "public"."project_milestone_videos" 
    FOR UPDATE 
    USING ("auth"."uid"() = "uploaded_by")
    WITH CHECK ("auth"."uid"() = "uploaded_by");

CREATE POLICY "Users can delete their own milestone videos" ON "public"."project_milestone_videos" 
    FOR DELETE 
    USING ("auth"."uid"() = "uploaded_by");

-- RLS Policies for project_team_chat
CREATE POLICY "Users can view project team chat" ON "public"."project_team_chat" 
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM "public"."contracts" 
            WHERE "contracts"."id" = "project_team_chat"."contract_id"
        )
    );

CREATE POLICY "Users can send project team chat messages" ON "public"."project_team_chat" 
    FOR INSERT 
    WITH CHECK ("auth"."uid"() = "sender_id");

CREATE POLICY "Users can update their own team chat messages" ON "public"."project_team_chat" 
    FOR UPDATE 
    USING ("auth"."uid"() = "sender_id")
    WITH CHECK ("auth"."uid"() = "sender_id");

CREATE POLICY "Users can delete their own team chat messages" ON "public"."project_team_chat" 
    FOR DELETE 
    USING ("auth"."uid"() = "sender_id");

-- Grant permissions
GRANT ALL ON TABLE "public"."project_milestone_videos" TO "anon";
GRANT ALL ON TABLE "public"."project_milestone_videos" TO "authenticated";
GRANT ALL ON TABLE "public"."project_milestone_videos" TO "service_role";

GRANT ALL ON TABLE "public"."project_team_chat" TO "anon";
GRANT ALL ON TABLE "public"."project_team_chat" TO "authenticated";
GRANT ALL ON TABLE "public"."project_team_chat" TO "service_role";

-- Add realtime subscriptions
ALTER PUBLICATION "supabase_realtime" ADD TABLE "public"."project_milestone_videos";
ALTER PUBLICATION "supabase_realtime" ADD TABLE "public"."project_team_chat";
