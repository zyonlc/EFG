-- Create a function to handle field verification submission
-- This function updates the related contract_milestone when a field_verification is created

CREATE OR REPLACE FUNCTION "public"."on_field_verification_created"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- When a field verification is created, update the milestone status to 'photo_verified'
  -- This indicates that proof of work has been submitted and is pending review
  UPDATE public.contract_milestones
  SET status = 'photo_verified'
  WHERE id = NEW.milestone_id;

  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."on_field_verification_created"() OWNER TO "postgres";

-- Drop the trigger if it exists (for idempotency)
DROP TRIGGER IF EXISTS "on_field_verification_created_trigger" ON "public"."field_verification";

-- Create the trigger
CREATE TRIGGER "on_field_verification_created_trigger"
AFTER INSERT ON "public"."field_verification"
FOR EACH ROW
EXECUTE FUNCTION "public"."on_field_verification_created"();

-- Grant permissions
GRANT ALL ON FUNCTION "public"."on_field_verification_created"() TO "anon";
GRANT ALL ON FUNCTION "public"."on_field_verification_created"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."on_field_verification_created"() TO "service_role";
