// ============================================================================
// EMPOWISE CONTRACTOR PLATFORM - TYPE DEFINITIONS
// ============================================================================

// ============================================================================
// COMPLIANCE CONFIG
// ============================================================================

export interface ComplianceConfig {
  id: string;
  market_code: string; // 'UGX', 'KES', 'NGN'
  region_name: string; // 'Uganda', 'Kenya', 'Nigeria'
  currency_code: string; // 'UGX', 'KES', 'NGN'
  currency_symbol: string; // 'Sh', 'Ksh', '₦'
  
  contractor_withholding_tax_rate: number; // 6.0
  professional_withholding_tax_rate: number; // 15.0
  
  tax_clearance_expires_months: number;
  nssf_renewal_day_of_month: number;
  trading_license_expires_months: number;
  business_registration_expires_months: number;
  
  advance_payment_guarantee_required: boolean;
  milestone_payment_terms: string; // 'net_30', 'net_60'
  retention_percentage: number;
  retention_release_days: number;
  
  required_documents: string[];
  
  created_at: string;
  updated_at: string;
}

// ============================================================================
// TAX REMINDERS
// ============================================================================

export interface TaxReminder {
  id: string;
  contractor_id: string;
  market_code: string;
  
  reminder_type: 'tax_clearance' | 'nssf' | 'trading_license' | 'insurance';
  document_name: string;
  expiry_date: string; // ISO date
  status: 'ok' | 'warning' | 'critical';
  
  document_url?: string;
  last_reminder_sent_at?: string;
  auto_reminder_enabled: boolean;
  
  created_at: string;
  updated_at: string;
}

// ============================================================================
// CONTRACTOR PROFILES
// ============================================================================

export interface ContractorProfile {
  id: string;
  user_id: string;
  
  company_name: string;
  registration_number: string;
  market_code: string;
  
  company_type: 'works' | 'services' | 'supplies' | 'mixed';
  industry_category?: string;
  
  contact_person?: string;
  phone?: string;
  email?: string;
  website?: string;
  
  company_description?: string;
  years_in_business?: number;
  annual_turnover?: number;
  
  address?: {
    street?: string;
    city?: string;
    district?: string;
    country?: string;
  };
  
  bank_details?: {
    account_name?: string;
    account_number?: string;
    bank_name?: string;
  };
  
  profile_image_url?: string;
  is_verified: boolean;
  verification_date?: string;
  
  created_at: string;
  updated_at: string;
}

// ============================================================================
// TENDERS
// ============================================================================

export interface Tender {
  id: string;
  market_code: string;
  
  client_name: string;
  client_type: 'government' | 'ngo' | 'private_company' | 'individual';
  client_logo_url?: string;
  
  tender_title: string;
  tender_description?: string;
  
  category: string; // 'construction', 'supplies', 'services', 'it'
  sub_category?: string;
  
  budget_amount: number;
  currency_code: string;
  
  tender_document_url?: string;
  eligibility_criteria?: any[];
  
  start_date: string;
  deadline_date: string;
  
  status: 'open' | 'closed' | 'awarded' | 'cancelled';
  awarded_to_contractor_id?: string;
  
  source: 'ppda' | 'ngo_portal' | 'private' | 'manual_entry';
  external_tender_id?: string;
  
  created_at: string;
  updated_at: string;
}

// ============================================================================
// BIDS
// ============================================================================

export interface Bid {
  id: string;
  tender_id: string;
  contractor_id: string;
  
  quoted_price: number;
  currency_code: string;
  
  bid_document_url?: string;
  submission_timestamp: string;
  
  status: 'draft' | 'submitted' | 'won' | 'lost';
  
  compliance_check_passed: boolean;
  compliance_check_date?: string;
  
  created_at: string;
  updated_at: string;
}

// ============================================================================
// CONTRACTS
// ============================================================================

export interface Contract {
  id: string;
  tender_id?: string;
  contractor_id: string;
  
  contract_number: string;
  client_name: string;
  client_contact_person?: string;
  client_email?: string;
  
  contract_amount: number;
  currency_code: string;
  
  contract_start_date: string;
  contract_end_date: string;
  
  advance_payment_guarantee_amount?: number;
  retention_amount?: number;
  
  contract_document_url?: string;
  statement_of_work_url?: string;
  
  status: 'active' | 'completed' | 'on_hold' | 'terminated';
  
  zoho_project_id?: string;
  
  created_at: string;
  updated_at: string;
}

// ============================================================================
// MILESTONES
// ============================================================================

export interface ContractMilestone {
  id: string;
  contract_id: string;
  
  milestone_number: number;
  milestone_name: string;
  
  percentage_of_contract: number;
  amount_ugx: number;
  currency_code: string;
  
  description?: string;
  due_date: string;
  
  status: 'pending' | 'in_progress' | 'photo_verified' | 'invoiced' | 'paid';
  
  zoho_invoice_id?: string;
  zoho_invoice_url?: string;
  
  created_at: string;
  updated_at: string;
}

// ============================================================================
// FIELD VERIFICATION (THE PHOTO-LOCK ENGINE)
// ============================================================================

export interface FieldVerification {
  id: string;
  milestone_id: string;
  contractor_id: string;
  
  task_name: string;
  task_description?: string;
  
  // Photo evidence
  photo_url: string;
  photo_upload_timestamp: string;
  photo_metadata?: {
    file_size?: number;
    mime_type?: string;
    hash?: string;
  };
  
  // GPS verification
  gps_latitude?: number;
  gps_longitude?: number;
  gps_accuracy_meters?: number;
  
  contract_site_latitude?: number;
  contract_site_longitude?: number;
  contract_site_radius_meters?: number;
  
  // Verification
  verification_status: 'pending' | 'approved' | 'rejected' | 'needs_clarification';
  verified_by?: string;
  verification_timestamp?: string;
  
  rejection_reason?: string;
  rejection_notes?: any;
  
  // Zoho integration
  zoho_invoice_trigger: boolean;
  triggered_at?: string;
  
  created_at: string;
  updated_at: string;
}

// ============================================================================
// VENDORS
// ============================================================================

export interface Vendor {
  id: string;
  contractor_id: string;
  market_code: string;
  
  company_name: string;
  vendor_type: 'subcontractor' | 'supplier' | 'service_provider';
  
  contact_person?: string;
  phone?: string;
  email?: string;
  
  tax_pin?: string;
  business_registration_number?: string;
  
  insurance_policy_number?: string;
  insurance_expiry_date?: string;
  insurance_provider?: string;
  
  certification_type?: string;
  certification_expiry_date?: string;
  
  past_projects?: any[];
  rating?: number;
  review_count?: number;
  
  status: 'active' | 'inactive' | 'blacklisted';
  
  bank_details?: {
    account_name?: string;
    account_number?: string;
    bank_name?: string;
  };
  
  payment_terms?: string;
  
  created_at: string;
  updated_at: string;
}

// ============================================================================
// TEAMS
// ============================================================================

export interface ContractTeam {
  id: string;
  contract_id: string;
  
  assigned_person_name: string;
  assigned_person_email?: string;
  assigned_person_phone?: string;
  
  role: 'project_manager' | 'site_engineer' | 'technician' | 'driver' | 'supervisor';
  
  assigned_from_vendor_id?: string;
  
  start_date: string;
  end_date?: string;
  
  status: 'active' | 'inactive' | 'completed';
  
  created_at: string;
  updated_at: string;
}

// ============================================================================
// PROFESSIONAL CONNECTIONS (NETWORKING)
// ============================================================================

export interface ProfessionalConnection {
  id: string;
  connector_id: string;
  connected_to_id: string;
  
  connection_type: 'interested_in_bid' | 'supplier_inquiry' | 'partnership' | 'general';
  
  message_subject?: string;
  message_body?: string;
  
  status: 'pending' | 'accepted' | 'rejected' | 'active';
  
  created_at: string;
  accepted_at?: string;
  updated_at: string;
}

// ============================================================================
// DIRECT MESSAGES
// ============================================================================

export interface DirectMessage {
  id: string;
  from_contractor_id: string;
  to_contractor_id: string;
  
  subject?: string;
  message_body: string;
  
  is_read: boolean;
  read_at?: string;
  
  related_contract_id?: string;
  related_tender_id?: string;
  
  message_hash?: string;
  
  created_at: string;
  updated_at: string;
}

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

export interface ContractorSubscription {
  id: string;
  contractor_id: string;
  market_code: string;
  
  tier: 'starter' | 'pro' | 'elite';
  amount_per_month: number;
  currency_code: string;
  
  billing_day_of_month: number;
  status: 'active' | 'paused' | 'cancelled';
  
  features_enabled: {
    compliance_vault: boolean;
    basic_tenders: boolean;
    photo_lock: boolean;
    zoho_integration: boolean;
    professional_directory: boolean;
    renewal_service: boolean;
    materials_marketplace: boolean;
  };
  
  auto_renewal: boolean;
  cancellation_date?: string;
  
  created_at: string;
  updated_at: string;
}

// ============================================================================
// INVOICES
// ============================================================================

export interface Invoice {
  id: string;
  contractor_id: string;
  milestone_id?: string;
  
  zoho_invoice_id?: string;
  invoice_number: string;
  
  amount_ugx: number;
  currency_code: string;
  
  withholding_tax_amount: number;
  tax_rate: number; // 6 or 15
  
  net_amount_payable: number;
  
  invoice_date: string;
  due_date: string;
  
  status: 'draft' | 'sent' | 'viewed' | 'partially_paid' | 'paid' | 'overdue';
  
  payment_received_date?: string;
  payment_method?: 'flutterwave' | 'bank_transfer' | 'mobile_money';
  
  created_at: string;
  updated_at: string;
}

// ============================================================================
// AUDIT LOG
// ============================================================================

export interface AuditLog {
  id: string;
  contractor_id: string;
  
  action_type: string;
  resource_type: 'contract' | 'milestone' | 'vendor' | 'invoice';
  resource_id?: string;
  
  old_value?: any;
  new_value?: any;
  
  performed_by?: string;
  
  ip_address?: string;
  user_agent?: string;
  
  created_at: string;
}

// ============================================================================
// DASHBOARD WIDGETS (UI Models)
// ============================================================================

export interface ComplianceStatus {
  reminder_type: string;
  document_name: string;
  expiry_date: string;
  status: 'ok' | 'warning' | 'critical';
  days_until_expiry: number;
}

export interface ContractStatus {
  contract_id: string;
  contract_number: string;
  client_name: string;
  total_amount: number;
  progress_percentage: number;
  active_milestones_count: number;
}

export interface PaymentStatus {
  period: string; // 'This Month', 'This Quarter'
  total_invoiced: number;
  total_paid: number;
  outstanding: number;
  overdue: number;
}

export interface FinancialSummary {
  current_month_income: number;
  current_month_expenses: number;
  net_profit: number;
  tax_owed: number;
  net_payable: number;
  tax_filing_ready: boolean;
}

export interface DashboardData {
  compliance_status: ComplianceStatus[];
  active_contracts: ContractStatus[];
  payment_status: PaymentStatus;
  financial_summary: FinancialSummary;
  subscription_tier: string;
}
