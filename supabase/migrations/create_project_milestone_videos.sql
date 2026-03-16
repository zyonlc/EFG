-- Create project_milestone_videos table for storing milestone proof of work uploads
CREATE TABLE IF NOT EXISTS "public"."project_milestone_videos" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "milestone_id" uuid NOT NULL,
    "title" text NOT NULL,
    "description" text NOT NULL,
    "url" text NOT NULL,
    "thumbnail_url" text,
    "playback_id" text,
    "timestamp" bigint DEFAULT (EXTRACT(epoch FROM now()) * 1000)::bigint,
    "uploaded_by" uuid NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "fk_milestone_id" FOREIGN KEY ("milestone_id") REFERENCES "public"."contract_milestones"("id") ON DELETE CASCADE,
    CONSTRAINT "fk_uploaded_by" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_project_milestone_videos_milestone_id" ON "public"."project_milestone_videos"("milestone_id");
CREATE INDEX IF NOT EXISTS "idx_project_milestone_videos_uploaded_by" ON "public"."project_milestone_videos"("uploaded_by");

-- Enable RLS
ALTER TABLE "public"."project_milestone_videos" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view milestone videos for their projects" ON "public"."project_milestone_videos"
FOR SELECT TO authenticated
USING (
  uploaded_by = auth.uid() OR
  milestone_id IN (
    SELECT id FROM contract_milestones WHERE contract_id IN (
      SELECT id FROM contracts WHERE contractor_id IN (
        SELECT id FROM contractor_profiles WHERE user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can insert milestone videos for their milestones" ON "public"."project_milestone_videos"
FOR INSERT TO authenticated
WITH CHECK (
  uploaded_by = auth.uid() AND
  milestone_id IN (
    SELECT id FROM contract_milestones WHERE contract_id IN (
      SELECT id FROM contracts WHERE contractor_id IN (
        SELECT id FROM contractor_profiles WHERE user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can update their own milestone videos" ON "public"."project_milestone_videos"
FOR UPDATE TO authenticated
USING (uploaded_by = auth.uid())
WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Users can delete their own milestone videos" ON "public"."project_milestone_videos"
FOR DELETE TO authenticated
USING (uploaded_by = auth.uid());

-- Grant permissions
GRANT ALL ON "public"."project_milestone_videos" TO authenticated;
GRANT ALL ON "public"."project_milestone_videos" TO service_role;
