-- ============================================================================
-- EMPOWISE CONTRACTOR PLATFORM - DATABASE SCHEMA
-- Run this migration in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. COMPLIANCE CONFIG (Market-specific rules - for global extensibility)
-- ============================================================================

CREATE TABLE IF NOT EXISTS compliance_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_code VARCHAR(3) UNIQUE NOT NULL, -- 'UGX', 'KES', 'NGN', etc
  region_name VARCHAR(100) NOT NULL, -- 'Uganda', 'Kenya', 'Nigeria'
  currency_code VARCHAR(3) NOT NULL, -- 'UGX', 'KES', 'NGN'
  currency_symbol VARCHAR(5) NOT NULL, -- 'Sh', 'Ksh', '₦'
  
  -- Tax rules
  contractor_withholding_tax_rate DECIMAL(5, 2) NOT NULL, -- 6.0 for Uganda
  professional_withholding_tax_rate DECIMAL(5, 2) NOT NULL, -- 15.0 for Uganda
  
  -- Renewal/Expiry tracking
  tax_clearance_expires_months INT NOT NULL, -- 12
  nssf_renewal_day_of_month INT NOT NULL, -- last day = 31
  trading_license_expires_months INT NOT NULL, -- 12
  business_registration_expires_months INT NOT NULL, -- 36
  
  -- Payment terms
  advance_payment_guarantee_required BOOLEAN DEFAULT true,
  milestone_payment_terms VARCHAR(20) DEFAULT 'net_30', -- 30 days after delivery
  retention_percentage DECIMAL(5, 2) DEFAULT 5.0, -- 5% retention
  retention_release_days INT DEFAULT 90,
  
  -- Compliance document names (JSON for flexibility)
  required_documents JSONB DEFAULT '["tax_clearance_certificate", "nssf_clearance", "trading_license", "business_registration"]',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 2. TAX REMINDERS & COMPLIANCE TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS tax_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  market_code VARCHAR(3) NOT NULL REFERENCES compliance_config(market_code),
  
  reminder_type VARCHAR(50) NOT NULL, -- 'tax_clearance', 'nssf', 'trading_license', 'insurance'
  document_name VARCHAR(255) NOT NULL,
  expiry_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'ok', -- 'ok', 'warning' (30 days left), 'critical' (7 days left)
  
  document_url VARCHAR(500), -- URL to document in Supabase Storage
  last_reminder_sent_at TIMESTAMP,
  auto_reminder_enabled BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tax_reminders_contractor ON tax_reminders(contractor_id);
CREATE INDEX idx_tax_reminders_expiry ON tax_reminders(expiry_date);
CREATE INDEX idx_tax_reminders_status ON tax_reminders(status);

-- ============================================================================
-- 3. CONTRACTORS & COMPANY PROFILES
-- ============================================================================

CREATE TABLE IF NOT EXISTS contractor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  company_name VARCHAR(255) NOT NULL,
  registration_number VARCHAR(100) UNIQUE NOT NULL,
  market_code VARCHAR(3) NOT NULL REFERENCES compliance_config(market_code),
  
  company_type VARCHAR(50), -- 'works', 'services', 'supplies', 'mixed'
  industry_category VARCHAR(100), -- 'construction', 'it_services', 'logistics', etc
  
  contact_person VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(255),
  website VARCHAR(255),
  
  company_description TEXT,
  years_in_business INT,
  annual_turnover DECIMAL(15, 2), -- For qualification assessment
  
  address JSONB, -- { street, city, district, country }
  bank_details JSONB, -- { account_name, account_number, bank_name }
  
  profile_image_url VARCHAR(500),
  is_verified BOOLEAN DEFAULT false, -- Manual verification by admin
  verification_date TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_contractor_user ON contractor_profiles(user_id);
CREATE INDEX idx_contractor_market ON contractor_profiles(market_code);
CREATE INDEX idx_contractor_verified ON contractor_profiles(is_verified);

-- ============================================================================
-- 4. TENDERS MARKETPLACE
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_code VARCHAR(3) NOT NULL REFERENCES compliance_config(market_code),
  
  client_name VARCHAR(255) NOT NULL,
  client_type VARCHAR(50) NOT NULL, -- 'government', 'ngo', 'private_company', 'individual'
  client_logo_url VARCHAR(500),
  
  tender_title VARCHAR(255) NOT NULL,
  tender_description TEXT,
  
  category VARCHAR(100), -- 'construction', 'supplies', 'services', 'it'
  sub_category VARCHAR(100),
  
  budget_amount DECIMAL(15, 2) NOT NULL,
  currency_code VARCHAR(3) NOT NULL,
  
  tender_document_url VARCHAR(500), -- Link to tender document
  eligibility_criteria JSONB, -- Array of requirements
  
  start_date TIMESTAMP NOT NULL,
  deadline_date TIMESTAMP NOT NULL,
  
  status VARCHAR(20) DEFAULT 'open', -- 'open', 'closed', 'awarded', 'cancelled'
  awarded_to_contractor_id UUID REFERENCES contractor_profiles(id),
  
  source VARCHAR(50), -- 'ppda', 'ngo_portal', 'private', 'manual_entry'
  external_tender_id VARCHAR(255), -- For reference to original source
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tenders_market ON tenders(market_code);
CREATE INDEX idx_tenders_status ON tenders(status);
CREATE INDEX idx_tenders_deadline ON tenders(deadline_date);
CREATE INDEX idx_tenders_category ON tenders(category);

-- ============================================================================
-- 5. BIDS (Contractors bidding on tenders)
-- ============================================================================

CREATE TABLE IF NOT EXISTS bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES contractor_profiles(id) ON DELETE CASCADE,
  
  quoted_price DECIMAL(15, 2) NOT NULL,
  currency_code VARCHAR(3) NOT NULL,
  
  bid_document_url VARCHAR(500), -- Link to bid proposal
  submission_timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  
  status VARCHAR(20) DEFAULT 'submitted', -- 'draft', 'submitted', 'won', 'lost'
  
  compliance_check_passed BOOLEAN DEFAULT false, -- Auto-verified tax clearance, etc
  compliance_check_date TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_bids_tender ON bids(tender_id);
CREATE INDEX idx_bids_contractor ON bids(contractor_id);
CREATE INDEX idx_bids_status ON bids(status);

-- ============================================================================
-- 6. CONTRACTS (Won tenders become contracts)
-- ============================================================================

CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id UUID REFERENCES tenders(id),
  contractor_id UUID NOT NULL REFERENCES contractor_profiles(id) ON DELETE CASCADE,
  
  contract_number VARCHAR(100) UNIQUE NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  client_contact_person VARCHAR(255),
  client_email VARCHAR(255),
  
  contract_amount DECIMAL(15, 2) NOT NULL,
  currency_code VARCHAR(3) NOT NULL,
  
  contract_start_date DATE NOT NULL,
  contract_end_date DATE NOT NULL,
  
  advance_payment_guarantee_amount DECIMAL(15, 2),
  retention_amount DECIMAL(15, 2), -- 5% of contract for final release
  
  contract_document_url VARCHAR(500), -- Signed contract
  statement_of_work_url VARCHAR(500),
  
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed', 'on_hold', 'terminated'
  
  zoho_project_id VARCHAR(100), -- Link to Zoho Books project
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_contracts_contractor ON contracts(contractor_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_end_date ON contracts(contract_end_date);

-- ============================================================================
-- 7. MILESTONES (Contractor deliverables)
-- ============================================================================

CREATE TABLE IF NOT EXISTS contract_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  
  milestone_number INT NOT NULL,
  milestone_name VARCHAR(255) NOT NULL, -- 'Mobilization', 'Delivery', 'Installation', 'Final Inspection'
  
  percentage_of_contract DECIMAL(5, 2) NOT NULL, -- 20%, 40%, etc
  amount_ugx DECIMAL(15, 2) NOT NULL, -- Auto-calculated from contract total
  currency_code VARCHAR(3) NOT NULL,
  
  description TEXT,
  due_date DATE NOT NULL,
  
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_progress', 'photo_verified', 'invoiced', 'paid'
  
  zoho_invoice_id VARCHAR(100), -- Auto-created when verified
  zoho_invoice_url VARCHAR(500),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(contract_id, milestone_number)
);

CREATE INDEX idx_milestones_contract ON contract_milestones(contract_id);
CREATE INDEX idx_milestones_status ON contract_milestones(status);
CREATE INDEX idx_milestones_due_date ON contract_milestones(due_date);

-- ============================================================================
-- 8. FIELD VERIFICATION (Photo-Lock system - THE WEALTH ENGINE)
-- ============================================================================

CREATE TABLE IF NOT EXISTS field_verification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id UUID NOT NULL REFERENCES contract_milestones(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES contractor_profiles(id) ON DELETE CASCADE,
  
  task_name VARCHAR(255) NOT NULL, -- What was completed
  task_description TEXT,
  
  -- Photo evidence
  photo_url VARCHAR(500) NOT NULL, -- Supabase Storage URL
  photo_upload_timestamp TIMESTAMP NOT NULL, -- Server-side timestamp (can't be faked)
  photo_metadata JSONB, -- EXIF data, file size, hash for fraud detection
  
  -- GPS verification (critical for remote work proof)
  gps_latitude DECIMAL(10, 8),
  gps_longitude DECIMAL(11, 8),
  gps_accuracy_meters INT, -- Must be <100m of contract site
  
  contract_site_latitude DECIMAL(10, 8), -- From contract for validation
  contract_site_longitude DECIMAL(11, 8),
  contract_site_radius_meters INT DEFAULT 100, -- Tolerance
  
  -- Verification status
  verification_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'needs_clarification'
  verified_by UUID REFERENCES auth.users(id), -- Who verified it (contractor manager or AI)
  verification_timestamp TIMESTAMP,
  
  rejection_reason TEXT, -- If rejected
  rejection_notes JSONB, -- Detailed feedback
  
  -- Integration with Zoho
  zoho_invoice_trigger BOOLEAN DEFAULT false, -- Should this trigger invoice?
  triggered_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_field_verification_milestone ON field_verification(milestone_id);
CREATE INDEX idx_field_verification_status ON field_verification(verification_status);
CREATE INDEX idx_field_verification_timestamp ON field_verification(photo_upload_timestamp);

-- ============================================================================
-- 9. VENDORS (Subcontractors, suppliers, partners)
-- ============================================================================

CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractor_profiles(id) ON DELETE CASCADE,
  market_code VARCHAR(3) NOT NULL REFERENCES compliance_config(market_code),
  
  company_name VARCHAR(255) NOT NULL,
  vendor_type VARCHAR(50), -- 'subcontractor', 'supplier', 'service_provider'
  
  contact_person VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(255),
  
  tax_pin VARCHAR(50),
  business_registration_number VARCHAR(100),
  
  insurance_policy_number VARCHAR(100),
  insurance_expiry_date DATE,
  insurance_provider VARCHAR(255),
  
  certification_type VARCHAR(100), -- 'ISO_9001', 'HSE', 'ASTM', etc
  certification_expiry_date DATE,
  
  past_projects JSONB, -- Array of previous work references
  rating DECIMAL(3, 2), -- Out of 5.0
  review_count INT DEFAULT 0,
  
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive', 'blacklisted'
  
  bank_details JSONB, -- { account_name, account_number, bank_name } for automated payments
  payment_terms VARCHAR(50), -- 'net_15', 'net_30', 'net_60'
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_vendors_contractor ON vendors(contractor_id);
CREATE INDEX idx_vendors_status ON vendors(status);
CREATE INDEX idx_vendors_insurance_expiry ON vendors(insurance_expiry_date);

-- ============================================================================
-- 10. TEAMS (People assigned to contracts)
-- ============================================================================

CREATE TABLE IF NOT EXISTS contract_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  
  assigned_person_name VARCHAR(255) NOT NULL,
  assigned_person_email VARCHAR(255),
  assigned_person_phone VARCHAR(20),
  
  role VARCHAR(50) NOT NULL, -- 'project_manager', 'site_engineer', 'technician', 'driver', 'supervisor'
  
  assigned_from_vendor_id UUID REFERENCES vendors(id), -- If from external vendor
  
  start_date DATE NOT NULL,
  end_date DATE,
  
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive', 'completed'
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_contract_teams_contract ON contract_teams(contract_id);

-- ============================================================================
-- 11. PROFESSIONAL DIRECTORY (For networking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS professional_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id UUID NOT NULL REFERENCES contractor_profiles(id) ON DELETE CASCADE,
  connected_to_id UUID NOT NULL REFERENCES contractor_profiles(id) ON DELETE CASCADE,
  
  connection_type VARCHAR(50) NOT NULL, -- 'interested_in_bid', 'supplier_inquiry', 'partnership', 'general'
  
  message_subject VARCHAR(255),
  message_body TEXT,
  
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'active'
  
  created_at TIMESTAMP DEFAULT NOW(),
  accepted_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_professional_connections_connector ON professional_connections(connector_id);
CREATE INDEX idx_professional_connections_connected_to ON professional_connections(connected_to_id);

-- ============================================================================
-- 12. DIRECT MESSAGES (Professional communication)
-- ============================================================================

CREATE TABLE IF NOT EXISTS direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_contractor_id UUID NOT NULL REFERENCES contractor_profiles(id) ON DELETE CASCADE,
  to_contractor_id UUID NOT NULL REFERENCES contractor_profiles(id) ON DELETE CASCADE,
  
  subject VARCHAR(255),
  message_body TEXT NOT NULL,
  
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  
  related_contract_id UUID REFERENCES contracts(id), -- Can be null; links to contract if discussing specific project
  related_tender_id UUID REFERENCES tenders(id), -- Can be null; links to tender if discussing opportunity
  
  -- Audit trail for disputes
  message_hash VARCHAR(255), -- SHA256 of message for integrity verification
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_direct_messages_from ON direct_messages(from_contractor_id);
CREATE INDEX idx_direct_messages_to ON direct_messages(to_contractor_id);
CREATE INDEX idx_direct_messages_read ON direct_messages(is_read);

-- ============================================================================
-- 13. SUBSCRIPTION TIERS & BILLING
-- ============================================================================

CREATE TABLE IF NOT EXISTS contractor_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL UNIQUE REFERENCES contractor_profiles(id) ON DELETE CASCADE,
  market_code VARCHAR(3) NOT NULL REFERENCES compliance_config(market_code),
  
  tier VARCHAR(20) NOT NULL, -- 'starter', 'pro', 'elite'
  amount_per_month DECIMAL(10, 2) NOT NULL,
  currency_code VARCHAR(3) NOT NULL,
  
  billing_day_of_month INT DEFAULT 1,
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'paused', 'cancelled'
  
  -- Features included (as JSON for flexibility)
  features_enabled JSONB DEFAULT '{"compliance_vault": true, "basic_tenders": true}',
  
  auto_renewal BOOLEAN DEFAULT true,
  cancellation_date TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_contractor_subscriptions_status ON contractor_subscriptions(status);

-- ============================================================================
-- 14. INVOICES (Integration with Zoho Books)
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractor_profiles(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES contract_milestones(id),
  
  zoho_invoice_id VARCHAR(100), -- Zoho Books invoice ID
  invoice_number VARCHAR(50) NOT NULL,
  
  amount_ugx DECIMAL(15, 2) NOT NULL,
  currency_code VARCHAR(3) NOT NULL,
  
  withholding_tax_amount DECIMAL(15, 2), -- Auto-calculated based on contractor type
  tax_rate DECIMAL(5, 2), -- 6% or 15%
  
  net_amount_payable DECIMAL(15, 2), -- Amount after tax
  
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'sent', 'viewed', 'partially_paid', 'paid', 'overdue'
  
  payment_received_date TIMESTAMP,
  payment_method VARCHAR(50), -- 'flutterwave', 'bank_transfer', 'mobile_money'
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_invoices_contractor ON invoices(contractor_id);
CREATE INDEX idx_invoices_status ON invoices(status);

-- ============================================================================
-- 15. AUDIT LOG (For compliance & dispute resolution)
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractor_profiles(id) ON DELETE CASCADE,
  
  action_type VARCHAR(100) NOT NULL, -- 'contract_created', 'milestone_verified', 'invoice_issued', etc
  resource_type VARCHAR(50), -- 'contract', 'milestone', 'vendor', 'invoice'
  resource_id UUID,
  
  old_value JSONB, -- Previous state
  new_value JSONB, -- New state
  
  performed_by UUID REFERENCES auth.users(id),
  
  ip_address INET,
  user_agent VARCHAR(500),
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_log_contractor ON audit_log(contractor_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);

-- ============================================================================
-- ENABLE ROW-LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE contractor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES (Contractors can only see their own data)
-- ============================================================================

-- Contractor profiles: Can see all verified profiles, but can only edit own
CREATE POLICY "Users can view all verified contractor profiles" ON contractor_profiles
  FOR SELECT USING (is_verified OR auth.uid() = user_id);

CREATE POLICY "Users can update own contractor profile" ON contractor_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Tax reminders: Only see own
CREATE POLICY "Users can only see their own tax reminders" ON tax_reminders
  FOR SELECT USING (contractor_id = auth.uid());

-- Tax reminders: Can insert own
CREATE POLICY "Users can insert their own tax reminders" ON tax_reminders
  FOR INSERT WITH CHECK (contractor_id = auth.uid());

-- Tax reminders: Can update own
CREATE POLICY "Users can update their own tax reminders" ON tax_reminders
  FOR UPDATE USING (contractor_id = auth.uid());

-- Tax reminders: Can delete own
CREATE POLICY "Users can delete their own tax reminders" ON tax_reminders
  FOR DELETE USING (contractor_id = auth.uid());

-- Contracts: Only see own
CREATE POLICY "Users can only see their own contracts" ON contracts
  FOR SELECT USING (
    contractor_id IN (SELECT id FROM contractor_profiles WHERE user_id = auth.uid())
  );

-- Milestones: Only see own
CREATE POLICY "Users can only see their own contract milestones" ON contract_milestones
  FOR SELECT USING (
    contract_id IN (SELECT id FROM contracts WHERE contractor_id IN (SELECT id FROM contractor_profiles WHERE user_id = auth.uid()))
  );

-- Direct messages: Can only see messages sent to them or from them
CREATE POLICY "Users can only see their own messages" ON direct_messages
  FOR SELECT USING (
    from_contractor_id IN (SELECT id FROM contractor_profiles WHERE user_id = auth.uid())
    OR to_contractor_id IN (SELECT id FROM contractor_profiles WHERE user_id = auth.uid())
  );

-- ============================================================================
-- INSERT DEFAULT COMPLIANCE CONFIG (Uganda)
-- ============================================================================

INSERT INTO compliance_config (
  market_code, region_name, currency_code, currency_symbol,
  contractor_withholding_tax_rate, professional_withholding_tax_rate,
  tax_clearance_expires_months, nssf_renewal_day_of_month,
  trading_license_expires_months, business_registration_expires_months,
  advance_payment_guarantee_required, milestone_payment_terms,
  retention_percentage, retention_release_days
) VALUES (
  'UGX', 'Uganda', 'UGX', 'Sh',
  6.0, 15.0,
  12, 31,
  12, 36,
  true, 'net_30',
  5.0, 90
) ON CONFLICT (market_code) DO NOTHING;

-- ============================================================================
-- DONE!
-- ============================================================================
-- Summary of tables created:
-- 1. compliance_config - Market rules (for global scaling)
-- 2. tax_reminders - Document expiry tracking
-- 3. contractor_profiles - Company info
-- 4. tenders - Opportunities marketplace
-- 5. bids - Contractor bids
-- 6. contracts - Won tenders
-- 7. contract_milestones - Deliverables
-- 8. field_verification - Photo-lock proof (THE WEALTH ENGINE)
-- 9. vendors - Subcontractors/suppliers
-- 10. contract_teams - Team members on projects
-- 11. professional_connections - Networking
-- 12. direct_messages - Professional communication
-- 13. contractor_subscriptions - Billing tiers
-- 14. invoices - Payment records
-- 15. audit_log - Compliance trail
-- ============================================================================
