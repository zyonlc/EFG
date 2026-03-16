-- Fix RLS policy for zoho_books_integrations table
-- The current policy allows everyone to SELECT all data, which is a security issue
-- This migration updates the policy to restrict access to the user's own data

-- Drop the existing insecure policy
DROP POLICY IF EXISTS "Allow authenticated users full access to their data" ON public.zoho_books_integrations;

-- Create new secure policies for each operation
-- SELECT: Only users can see their own data
CREATE POLICY "Users can view their own zoho books integration"
ON public.zoho_books_integrations FOR SELECT
USING (auth.uid() = user_id);

-- INSERT: Only authenticated users can insert their own records
CREATE POLICY "Users can create their own zoho books integration"
ON public.zoho_books_integrations FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Only users can update their own records
CREATE POLICY "Users can update their own zoho books integration"
ON public.zoho_books_integrations FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DELETE: Only users can delete their own records
CREATE POLICY "Users can delete their own zoho books integration"
ON public.zoho_books_integrations FOR DELETE
USING (auth.uid() = user_id);

-- Note: Edge Functions using SERVICE_ROLE_KEY will bypass RLS, so they can still access the data
-- This is the correct behavior since Edge Functions need to update the table on behalf of users
