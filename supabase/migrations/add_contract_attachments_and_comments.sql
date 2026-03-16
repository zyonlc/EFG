-- Create contract_attachments table
CREATE TABLE IF NOT EXISTS public.contract_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    size INTEGER,
    uploaded_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create contract_comments table
CREATE TABLE IF NOT EXISTS public.contract_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author TEXT NOT NULL,
    author_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_contract_attachments_contract_id 
ON public.contract_attachments(contract_id);

CREATE INDEX IF NOT EXISTS idx_contract_comments_contract_id 
ON public.contract_comments(contract_id);

-- Enable RLS for new tables
ALTER TABLE public.contract_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_comments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for contract_attachments
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

CREATE POLICY "Users can delete their own comments" 
ON public.contract_comments FOR DELETE
USING (
    author_id = auth.uid()
);

-- Grant permissions
GRANT ALL ON TABLE public.contract_attachments TO authenticated;
GRANT ALL ON TABLE public.contract_comments TO authenticated;
