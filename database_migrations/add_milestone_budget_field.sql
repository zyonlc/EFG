-- Add milestone_budget column to contract_milestones table
-- This tracks the actual budget allocated for executing each milestone (different from amount_ugx which is the contract value)
ALTER TABLE public.contract_milestones
ADD COLUMN IF NOT EXISTS milestone_budget numeric(15,2),
ADD COLUMN IF NOT EXISTS milestone_budget_currency varchar(3) DEFAULT 'UGX',
ADD COLUMN IF NOT EXISTS is_editable boolean DEFAULT true;

-- Create an index for better query performance on milestones
CREATE INDEX IF NOT EXISTS idx_contract_milestones_contract_id_status 
ON public.contract_milestones(contract_id, status);

-- Add comment for clarity
COMMENT ON COLUMN public.contract_milestones.milestone_budget IS 
'Actual budget allocated for executing this milestone (different from amount_ugx which is the contract billing amount)';

COMMENT ON COLUMN public.contract_milestones.is_editable IS 
'Whether this milestone can still be edited (set to false once invoiced)';
