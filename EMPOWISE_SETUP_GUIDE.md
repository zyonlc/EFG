# 🚀 EMPOWISE PLATFORM - SETUP & LAUNCH GUIDE

This guide will walk you through bringing the Empowise contractor platform to life, step-by-step.

## ✅ PROGRESS CHECKLIST

- [x] Database schema created in Supabase (15 tables)
- [ ] **Task 1:** Configure environment variables
- [ ] **Task 2:** Create sample data
- [ ] **Task 3:** Test pages with real data
- [ ] **Task 4:** Set up Supabase Storage
- [ ] **Task 5:** Create test contractor account
- [ ] **Task 6:** Launch and troubleshoot

---

## 📋 TASK 1: CONFIGURE ENVIRONMENT VARIABLES

### Step 1a: Get Your Supabase Credentials

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Click on your Empowise project
3. Go to **Settings > API** (left sidebar)
4. Copy these two values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **Anon Key** (a long string starting with `eyJ`)

### Step 1b: Create Your .env File

1. In your project root, create a new file called `.env` (NOT `.env.example`)
2. Copy this template and fill in your values:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_APP_NAME=Empowise
VITE_APP_URL=http://localhost:5173
```

3. Save the file
4. **IMPORTANT:** Add `.env` to your `.gitignore` so it's never committed

### Step 1c: Verify Connection

Run the dev server:
```bash
npm run dev
```

If you see `VITE v5.x.x ready in XXX ms` with no errors, your environment is configured correctly! ✅

---

## 📋 TASK 2: CREATE SAMPLE DATA

Sample data is essential to see the platform in action. Follow these steps:

### Step 2a: Prepare Your Test Contractor Account

When you sign up, you'll get a `user_id` in Supabase's `auth.users` table. We'll need this to create test data.

**To find your user ID:**
1. Go to Supabase dashboard
2. Go to **Authentication > Users**
3. Find your account
4. Copy the user ID (looks like a UUID: `12345678-1234-1234-1234-123456789012`)

### Step 2b: Run the Sample Data SQL

1. Go to Supabase SQL Editor: **https://app.supabase.com > SQL Editor**
2. Click **"New Query"**
3. Copy the SQL script below and replace `YOUR_USER_ID` with your actual user ID
4. Click **"Run"** to create sample data

---

## 🗄️ SAMPLE DATA SQL SCRIPT

```sql
-- ============================================================================
-- EMPOWISE SAMPLE DATA - RUN THIS IN SUPABASE SQL EDITOR
-- ============================================================================
-- Replace YOUR_USER_ID with your actual user ID from auth.users

-- Get your user ID from Supabase > Authentication > Users, then copy it below
DO $$
DECLARE
  user_id UUID := 'YOUR_USER_ID'::UUID;
  contractor_id UUID;
  tender_id_1 UUID;
  tender_id_2 UUID;
  contract_id UUID;
  milestone_id_1 UUID;
  milestone_id_2 UUID;
BEGIN

-- ============================================================================
-- 1. CREATE YOUR CONTRACTOR PROFILE
-- ============================================================================

INSERT INTO contractor_profiles (
  user_id, company_name, registration_number, market_code, 
  company_type, industry_category, contact_person, phone, email, 
  company_description, years_in_business, is_verified
) VALUES (
  user_id,
  'Pro Empo Consults Ltd',
  'REG-2024-001',
  'UGX',
  'services',
  'project_management',
  'John Mukasa',
  '+256 701 234567',
  'john@proempocon.ug',
  'Professional project management and operations consulting firm',
  5,
  true
) RETURNING id INTO contractor_id;

-- ============================================================================
-- 2. CREATE SAMPLE TENDERS (5 opportunities)
-- ============================================================================

-- Tender 1: Government Construction Project
INSERT INTO tenders (
  market_code, client_name, client_type, tender_title, 
  tender_description, category, budget_amount, currency_code,
  start_date, deadline_date, status
) VALUES (
  'UGX',
  'Ministry of Works & Transport',
  'government',
  'Road Rehabilitation - Kampala District',
  'Rehabilitation of 45km of rural roads in Kampala district with drainage systems',
  'construction',
  500000000, -- 500M UGX
  'UGX',
  NOW(),
  NOW() + INTERVAL '30 days',
  'open'
);

-- Tender 2: NGO Supplies
INSERT INTO tenders (
  market_code, client_name, client_type, tender_title,
  tender_description, category, budget_amount, currency_code,
  start_date, deadline_date, status
) VALUES (
  'UGX',
  'World Vision Uganda',
  'ngo',
  'Medical Supplies & Equipment Procurement',
  'Supply of medical equipment and consumables for 10 health centers in Northern Uganda',
  'supplies',
  150000000, -- 150M UGX
  'UGX',
  NOW(),
  NOW() + INTERVAL '21 days',
  'open'
);

-- Tender 3: Private Sector IT Services
INSERT INTO tenders (
  market_code, client_name, client_type, tender_title,
  tender_description, category, budget_amount, currency_code,
  start_date, deadline_date, status
) VALUES (
  'UGX',
  'Uganda Commercial Bank',
  'private_company',
  'Digital Transformation Consulting Services',
  'System analysis, design, and implementation of modern banking platform',
  'services',
  200000000, -- 200M UGX
  'UGX',
  NOW(),
  NOW() + INTERVAL '45 days',
  'open'
);

-- Tender 4: Logistics Services
INSERT INTO tenders (
  market_code, client_name, client_type, tender_title,
  tender_description, category, budget_amount, currency_code,
  start_date, deadline_date, status
) VALUES (
  'UGX',
  'Kampala City Council Authority',
  'government',
  'Waste Management & Logistics Services',
  'Collection, transportation and disposal of solid waste in Kampala city',
  'services',
  300000000, -- 300M UGX
  'UGX',
  NOW(),
  NOW() + INTERVAL '14 days', -- URGENT!
  'open'
);

-- Tender 5: Construction Supplies
INSERT INTO tenders (
  market_code, client_name, client_type, tender_title,
  tender_description, category, budget_amount, currency_code,
  start_date, deadline_date, status
) VALUES (
  'UGX',
  'Buildwell Construction',
  'private_company',
  'Cement, Steel & Building Materials Supply',
  'Supply of cement, reinforcement steel, and building materials for residential project',
  'supplies',
  80000000, -- 80M UGX
  'UGX',
  NOW(),
  NOW() + INTERVAL '7 days', -- VERY URGENT!
  'open'
);

-- ============================================================================
-- 3. CREATE A SAMPLE CONTRACT (Won tender)
-- ============================================================================

INSERT INTO contracts (
  tender_id,
  contractor_id,
  contract_number,
  client_name,
  client_contact_person,
  client_email,
  contract_amount,
  currency_code,
  contract_start_date,
  contract_end_date,
  retention_amount,
  status,
  zoho_project_id
) VALUES (
  tender_id_1,
  contractor_id,
  'CTR-2024-001',
  'KCCA - Waste Management Division',
  'Ms. Sarah Nakayaga',
  'sarah.nakayaga@kcca.go.ug',
  100000000, -- 100M UGX
  'UGX',
  NOW()::DATE,
  (NOW() + INTERVAL '6 months')::DATE,
  5000000, -- 5% retention
  'active',
  'ZOHO-PROJECT-001'
) RETURNING id INTO contract_id;

-- ============================================================================
-- 4. CREATE MILESTONES FOR THE CONTRACT
-- ============================================================================

-- Milestone 1: Mobilization & Setup (20%)
INSERT INTO contract_milestones (
  contract_id,
  milestone_number,
  milestone_name,
  percentage_of_contract,
  amount_ugx,
  currency_code,
  description,
  due_date,
  status
) VALUES (
  contract_id,
  1,
  'Mobilization & Site Setup',
  20.0,
  20000000, -- 20M UGX
  'UGX',
  'Establish waste collection centers, procure equipment, train staff',
  (NOW() + INTERVAL '14 days')::DATE,
  'pending'
) RETURNING id INTO milestone_id_1;

-- Milestone 2: Phase 1 Collection & Disposal (50%)
INSERT INTO contract_milestones (
  contract_id,
  milestone_number,
  milestone_name,
  percentage_of_contract,
  amount_ugx,
  currency_code,
  description,
  due_date,
  status
) VALUES (
  contract_id,
  2,
  'Phase 1 - Waste Collection & Disposal',
  50.0,
  50000000, -- 50M UGX
  'UGX',
  'Collect and dispose of waste from assigned zones for 3 months',
  (NOW() + INTERVAL '90 days')::DATE,
  'pending'
) RETURNING id INTO milestone_id_2;

-- Milestone 3: Final Inspection (20%)
INSERT INTO contract_milestones (
  contract_id,
  milestone_number,
  milestone_name,
  percentage_of_contract,
  amount_ugx,
  currency_code,
  description,
  due_date,
  status
) VALUES (
  contract_id,
  3,
  'Final Inspection & Handover',
  20.0,
  20000000, -- 20M UGX
  'UGX',
  'Final inspection of all equipment and facilities, sign-off by client',
  (NOW() + INTERVAL '120 days')::DATE,
  'pending'
);

-- ============================================================================
-- 5. CREATE SAMPLE COMPLIANCE DOCUMENTS
-- ============================================================================

INSERT INTO tax_reminders (
  contractor_id,
  market_code,
  reminder_type,
  document_name,
  expiry_date,
  status,
  auto_reminder_enabled
) VALUES
  (contractor_id, 'UGX', 'tax_clearance', 'Tax Clearance Certificate', (NOW() + INTERVAL '60 days')::DATE, 'ok', true),
  (contractor_id, 'UGX', 'nssf', 'NSSF Clearance', (NOW() + INTERVAL '15 days')::DATE, 'warning', true),
  (contractor_id, 'UGX', 'trading_license', 'Trading License', (NOW() + INTERVAL '200 days')::DATE, 'ok', true);

-- ============================================================================
-- 6. CREATE SAMPLE VENDORS/SUBCONTRACTORS
-- ============================================================================

INSERT INTO vendors (
  contractor_id,
  market_code,
  company_name,
  vendor_type,
  contact_person,
  phone,
  email,
  tax_pin,
  insurance_expiry_date,
  status,
  rating,
  review_count
) VALUES
  (contractor_id, 'UGX', 'SafeWaste Solutions Ltd', 'subcontractor', 'Peter Okello', '+256 702 987654', 'peter@safewaste.ug', 'PIN-001', (NOW() + INTERVAL '180 days')::DATE, 'active', 4.8, 12),
  (contractor_id, 'UGX', 'Green Energy Supplies', 'supplier', 'Alice Namukwaya', '+256 703 456789', 'alice@greenenergy.ug', 'PIN-002', (NOW() + INTERVAL '90 days')::DATE, 'active', 4.5, 8);

-- ============================================================================
-- 7. CREATE SAMPLE SUBSCRIPTION
-- ============================================================================

INSERT INTO contractor_subscriptions (
  contractor_id,
  market_code,
  tier,
  amount_per_month,
  currency_code,
  status,
  features_enabled
) VALUES (
  contractor_id,
  'UGX',
  'pro',
  300000, -- 300K UGX/month
  'UGX',
  'active',
  '{"compliance_vault": true, "tenders_marketplace": true, "milestone_tracking": true, "team_management": true}'::JSONB
);

-- ============================================================================
-- DONE!
-- ============================================================================

RAISE NOTICE 'Sample data created successfully!';
RAISE NOTICE 'Contractor ID: %', contractor_id;
RAISE NOTICE 'Contract ID: %', contract_id;
RAISE NOTICE 'You can now see tenders and contracts in the platform!';

END $$;
```

### Step 2c: Verify Sample Data Was Created

1. Go to Supabase > Table Editor
2. Click on each table and verify data was created:
   - `tenders` - should have 5 records
   - `contracts` - should have 1 record
   - `contract_milestones` - should have 3 records
   - `tax_reminders` - should have 3 records
   - `vendors` - should have 2 records

---

## 📋 TASK 3: TEST PAGES WITH REAL DATA

Now let's verify the pages work with actual data from your Supabase database.

### Step 3a: Test the Tenders Page

1. Make sure your dev server is running: `npm run dev`
2. Navigate to: `http://localhost:5173` (your app)
3. Click **"Sign In"** and log in with your account
4. Click **"Tenders"** in the navbar
5. **Expected result:** You should see 5 tenders displayed with:
   - Client names (Ministry of Works, World Vision, etc.)
   - Budget amounts in UGX
   - Countdown timers (days until deadline)
   - Client type badges (Government, NGO, Private)
   - "Submit Bid" buttons

**If Tenders page is blank or shows error:**
- Check browser console for errors (F12 > Console tab)
- Verify environment variables are set (see Task 1)
- Check Supabase SQL was run successfully

### Step 3b: Test the Contracts Page

1. Click **"Contracts"** in the navbar
2. **Expected result:** Left sidebar should show:
   - Your contract "KCCA - Waste Management Division" 
   - Contract amount: 100M UGX
   - Status: "Active"

3. **In the right panel, you should see:**
   - Contract details
   - 3 Milestones with progress tracking:
     - Mobilization & Site Setup (20%, 20M UGX) - Pending
     - Phase 1 Collection (50%, 50M UGX) - Pending
     - Final Inspection (20%, 20M UGX) - Pending
   - Progress bar showing overall completion
   - "Upload Proof of Work" button

**If Contracts page is blank or shows error:**
- Check that sample data SQL ran successfully
- Verify your user ID was used in the SQL script
- Check Supabase > Table Editor > contracts table has 1 record

### Step 3c: Test the Compliance Vault Page

1. Click **"Compliance"** in the navbar
2. **Expected result:** You should see:
   - Tax Clearance Certificate - 60 days left (OK)
   - NSSF Clearance - 15 days left (WARNING - yellow badge)
   - Trading License - 200 days left (OK)
3. Each document should show:
   - Expiry date
   - Status color (green for OK, yellow for warning, red for critical)
   - "Renew" button (for Elite tier)

---

## 📋 TASK 4: SET UP SUPABASE STORAGE (For Document Uploads)

To enable photo uploads and document management, you need to create Supabase Storage buckets.

### Step 4a: Create Storage Buckets

1. Go to Supabase Dashboard > **Storage**
2. Click **"Create a new bucket"** for each:

**Bucket 1: `compliance-documents`**
- Make it **Public** (for easy sharing)
- Click Create

**Bucket 2: `field-verification`**
- Make it **Public** (contractors need to share photos with clients)
- Click Create

**Bucket 3: `contract-documents`**
- Make it **Private** (only contractor can access)
- Click Create

### Step 4b: Verify Buckets Exist

Go to Supabase > Storage, you should see 3 buckets listed.

---

## 📋 TASK 5: CREATE ADDITIONAL TEST CONTRACTOR ACCOUNT (Optional)

To test networking features, create a second contractor account:

1. Sign out of your current account
2. Click **"Sign Up"** with a different email
3. After signing up, run this SQL to create a profile for the new user:

```sql
-- Get the new user's ID from Supabase > Authentication > Users
INSERT INTO contractor_profiles (
  user_id, company_name, registration_number, market_code, 
  company_type, industry_category, contact_person, phone, email
) VALUES (
  'NEW_USER_ID_HERE'::UUID,
  'BuildRight Construction Ltd',
  'REG-2024-002',
  'UGX',
  'works',
  'construction',
  'James Kato',
  '+256 704 111222',
  'james@buildright.ug'
);
```

---

## 🐛 TROUBLESHOOTING

### Issue: Pages show "Loading..." forever

**Cause:** Environment variables not configured or Supabase connection failed

**Solution:**
1. Check your `.env` file has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
2. Restart dev server: `npm run dev`
3. Check browser console (F12) for errors

### Issue: "No tenders found"

**Cause:** Sample data SQL didn't run or ran on wrong project

**Solution:**
1. Go to Supabase > Table Editor > tenders
2. Check if you see 5 records
3. If empty, run the sample data SQL again

### Issue: Contracts page shows "Select a contract to view details"

**Cause:** Contract not linked to your user account

**Solution:**
1. Check the user ID in the sample data SQL matches your actual user ID
2. Go to Supabase > contracts table
3. Verify `contractor_id` is filled in
4. Verify contractor_profiles has a record with your user_id

### Issue: "Identifier 'X' has already been declared" error

**Cause:** You ran the SQL multiple times (it creates duplicates)

**Solution:**
1. Go to Supabase > SQL Editor
2. Run this to delete test data:
   ```sql
   DELETE FROM contract_milestones WHERE contract_id IN (SELECT id FROM contracts WHERE client_name = 'KCCA - Waste Management Division');
   DELETE FROM contracts WHERE client_name = 'KCCA - Waste Management Division';
   DELETE FROM tenders WHERE client_name IN ('Ministry of Works & Transport', 'World Vision Uganda', 'Uganda Commercial Bank', 'Kampala City Council Authority', 'Buildwell Construction');
   DELETE FROM tax_reminders WHERE document_name IN ('Tax Clearance Certificate', 'NSSF Clearance', 'Trading License');
   DELETE FROM vendors WHERE company_name IN ('SafeWaste Solutions Ltd', 'Green Energy Supplies');
   ```
3. Then run the sample data SQL again

---

## 🎉 NEXT STEPS - WHAT TO DO NOW

1. **Complete Task 1:** Add your Supabase credentials to `.env` file
2. **Complete Task 2:** Run the sample data SQL script
3. **Complete Task 3:** Test all pages and verify they load data
4. **Complete Task 4:** Create Storage buckets (optional but recommended)
5. **Test the platform** - navigate around, explore each page
6. **Report any issues** - if pages don't work, collect error messages and share them

---

## 📞 SUPPORT

If you encounter issues:
1. Check the **TROUBLESHOOTING** section above
2. Open browser developer console (F12 > Console tab) and copy error messages
3. Check Supabase logs (Supabase Dashboard > Logs > Postgres)

---

## ✅ COMPLETION CHECKLIST

- [ ] Environment variables configured (.env file created)
- [ ] Sample data SQL script run successfully
- [ ] Tenders page loads with 5 opportunities
- [ ] Contracts page loads with 1 active contract
- [ ] Compliance Vault shows 3 documents with expiry alerts
- [ ] No console errors when navigating pages
- [ ] Storage buckets created (3 buckets)
- [ ] Platform is LIVE and usable! 🚀

---

**Once you complete all these tasks, your Empowise platform will be fully functional and ready to demo or deploy!**
