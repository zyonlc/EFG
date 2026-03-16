-- Create contract_attachments table
CREATE TABLE IF NOT EXISTS public.contract_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    size INTEGER,
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create contract_comments table
CREATE TABLE IF NOT EXISTS public.contract_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author TEXT NOT NULL,
    author_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_contract_attachments_contract_id 
ON public.contract_attachments(contract_id);

CREATE INDEX IF NOT EXISTS idx_contract_attachments_created_at 
ON public.contract_attachments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contract_comments_contract_id 
ON public.contract_comments(contract_id);

CREATE INDEX IF NOT EXISTS idx_contract_comments_created_at 
ON public.contract_comments(created_at DESC);

-- Enable RLS for new tables
ALTER TABLE public.contract_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_comments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for contract_attachments

-- Allow users to view attachments for their contracts
CREATE POLICY "Users can view attachments for their contracts" 
ON public.contract_attachments FOR SELECT
USING (
    contract_id IN (
        SELECT id FROM public.contracts 
        WHERE contractor_id IN (
            SELECT id FROM public.contractor_profiles 
            WHERE user_id = auth.uid()
        )
    )
);

-- Allow users to insert attachments to their contracts
CREATE POLICY "Users can insert attachments to their contracts" 
ON public.contract_attachments FOR INSERT
WITH CHECK (
    contract_id IN (
        SELECT id FROM public.contracts 
        WHERE contractor_id IN (
            SELECT id FROM public.contractor_profiles 
            WHERE user_id = auth.uid()
        )
    )
);

-- Allow users to delete their attachments
CREATE POLICY "Users can delete their attachments" 
ON public.contract_attachments FOR DELETE
USING (
    contract_id IN (
        SELECT id FROM public.contracts 
        WHERE contractor_id IN (
            SELECT id FROM public.contractor_profiles 
            WHERE user_id = auth.uid()
        )
    )
);

-- Create RLS policies for contract_comments

-- Allow users to view comments on their contracts
CREATE POLICY "Users can view comments on their contracts" 
ON public.contract_comments FOR SELECT
USING (
    contract_id IN (
        SELECT id FROM public.contracts 
        WHERE contractor_id IN (
            SELECT id FROM public.contractor_profiles 
            WHERE user_id = auth.uid()
        )
    )
);

-- Allow users to add comments to their contracts
CREATE POLICY "Users can add comments to their contracts" 
ON public.contract_comments FOR INSERT
WITH CHECK (
    contract_id IN (
        SELECT id FROM public.contracts 
        WHERE contractor_id IN (
            SELECT id FROM public.contractor_profiles 
            WHERE user_id = auth.uid()
        )
    )
);

-- Allow users to update their own comments
CREATE POLICY "Users can update their own comments" 
ON public.contract_comments FOR UPDATE
USING (
    author_id = auth.uid()
)
WITH CHECK (
    contract_id IN (
        SELECT id FROM public.contracts 
        WHERE contractor_id IN (
            SELECT id FROM public.contractor_profiles 
            WHERE user_id = auth.uid()
        )
    )
);

-- Allow users to delete their own comments
CREATE POLICY "Users can delete their own comments" 
ON public.contract_comments FOR DELETE
USING (
    author_id = auth.uid()
);

-- Grant permissions
GRANT ALL ON TABLE public.contract_attachments TO authenticated;
GRANT ALL ON TABLE public.contract_comments TO authenticated;

-- Update function to update the 'updated_at' column for contract_attachments
CREATE OR REPLACE FUNCTION public.update_contract_attachments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for contract_attachments
DROP TRIGGER IF EXISTS contract_attachments_updated_at_trigger ON public.contract_attachments;
CREATE TRIGGER contract_attachments_updated_at_trigger
BEFORE UPDATE ON public.contract_attachments
FOR EACH ROW
EXECUTE FUNCTION public.update_contract_attachments_updated_at();

-- Update function to update the 'updated_at' column for contract_comments
CREATE OR REPLACE FUNCTION public.update_contract_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for contract_comments
DROP TRIGGER IF EXISTS contract_comments_updated_at_trigger ON public.contract_comments;
CREATE TRIGGER contract_comments_updated_at_trigger
BEFORE UPDATE ON public.contract_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_contract_comments_updated_at();
