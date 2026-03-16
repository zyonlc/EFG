# Contracts & Projects Enhancement Guide

## Overview

This guide documents the production-ready enhanced versions of the Contracts and Projects management pages, built to support comprehensive contract lifecycle management and project execution with real-time collaboration, evidence tracking, and financial oversight.

## Architecture

### Key Components

```
/pages
├── ContractsEnhanced.tsx      # New enhanced contracts page
├── ProjectsEnhanced.tsx        # New enhanced projects page
├── Contracts.tsx               # Original (fallback)
├── ProjectsManagement.tsx      # Original (fallback)

/components (existing, reused)
├── ContractCreationForm.tsx
├── MilestoneCreationForm.tsx
├── PhotoLockUploadForm.tsx      # GPS-verified field verification
├── MilestoneProofOfWorkModal.tsx # Video/photo/document uploads
├── ProjectTeamChat.tsx          # Real-time team communication
└── ProjectMilestoneVideoUpload.tsx # Mux video integration
```

### Database Tables Used

**Core Contract Tables:**
- `contracts` - Main contract records
- `contract_milestones` - Milestone breakdowns
- `field_verification` - GPS-locked photo evidence (Photo-Lock)
- `project_milestone_videos` - Video/document evidence uploads
- `invoices` - Invoice tracking

**Team Collaboration:**
- `project_team_chat` - Real-time team messages
- `contract_teams` - Team member assignments

**Financial & Compliance:**
- `contractor_profiles` - Contractor information
- `contractor_subscriptions` - Subscription tiers
- `compliance_config` - Regional compliance settings

---

## Contracts Page (Enhanced)

### Location
- **Route:** `/contracts`
- **Component:** `src/pages/ContractsEnhanced.tsx`
- **Access:** Contractor-protected route (requires active contractor profile)

### Key Features

#### 1. **Financial Dashboard**
Displays real-time financial metrics:

```
┌─────────────────────────────────────────────────────────┐
│  Total Value   │ Amount Paid  │ Outstanding │ Avg Value │
│   UGX 500M     │  UGX 200M    │ UGX 300M    │ UGX 125M  │
│ 4 active       │ 40% complete │ Due now     │ 4 contracts
└─────────────────────────────────────────────────────────┘
```

**Metrics Tracked:**
- Total contract value across all contracts
- Amount paid (milestones with 'paid' status)
- Outstanding amount (remaining to be paid)
- Average contract value
- Active contracts count
- Completed contracts count
- Contracts expiring within 30 days

#### 2. **Smart Alerts System**
Automatically surfaces critical issues:

```
⚠️ Critical Alerts
├─ Contract Expiry (≤7 days) - Red
├─ Contract Renewal Needed (≤30 days) - Amber
├─ Milestone Overdue - Red
└─ Payment Due Soon - Amber
```

**Alert Types:**
- `expiry` - Contract approaching end date
- `payment_due` - Milestone payment coming up
- `renewal` - Contract needs renewal
- `milestone_overdue` - Task past due date

**Severity Levels:**
- `critical` - Requires immediate action (red)
- `warning` - Should be addressed (amber)
- `info` - For awareness (blue)

#### 3. **Advanced Filtering & Search**

**Search:** By contract number or client name (real-time)

**Filters:**
- **Status:** All / Active / Completed / On Hold / Cancelled
- **Sort By:** Date / Amount / Client Name
- **Order:** Newest First / Oldest First

Example: Find all active contracts over UGX 10M created this year, sorted by amount descending.

#### 4. **Contract Cards**
Visual representation with key info:

```
┌──────────────────────────────┐
│ CONTRACT-001                 │
│ ABC Corporation              │
│                              │
│ UGX 50,000,000              │
│                              │
│ Progress: ████░░░░ 40%      │
│ 6 milestones · 2/6 paid     │
│                              │
│ Start: Jan 2024             │
│ Completion: ✓ 2/6           │
└──────────────────────────────┘
```

**Visual Indicators:**
- Left border color: Green (active) / Blue (completed) / Red (expiring soon)
- Progress bar showing milestone completion percentage
- Quick stats: milestones count, paid count
- Date range display

#### 5. **Contract Details View**

When a contract is selected, view:

**Header Section:**
- Contract number and client name
- Total contract amount (blue highlight)
- Amount paid (green highlight)
- Outstanding amount (amber highlight)
- Current status with color coding

**Progress Tracking:**
- Visual progress bar (0-100%)
- Percentage text
- Amount paid information

**Dates:**
- Start date
- End date
- Contract duration

**Action Buttons:**
- `Propose Amendment` - Initiate contract modification
- `Legal Support` - File legal case or request advice
- `Invoice History` - View all generated invoices

**Milestones Section:**
- Milestone number and name
- Description
- Status with icon (paid ✓, invoiced ⏱, verified ✓, pending ○)
- Amount and percentage of contract
- Due date
- Field verification status (if submitted)
- Video evidence count (if any)
- Upload button for proof of work

### Status Workflow

```
MILESTONE LIFECYCLE:
pending
  ↓
  [Upload Photo/Video Evidence]
  ↓
photo_verified
  ↓
  [Client Review/Approval]
  ↓
invoiced
  ↓
  [Payment Received]
  ↓
paid ✓
```

### Evidence Types Supported

**Photo Evidence (Photo-Lock):**
- GPS coordinates and accuracy
- Timestamp
- Task name and description
- Status: pending / verified / rejected

**Video Evidence (Mux Integration):**
- Multiple videos per milestone
- Playback ID and URL
- Title and description
- Metadata preserved

### Amendment Workflow

The "Propose Amendment" button enables:
1. **Amendment Proposal** - Contractor initiates change
2. **Communication Trail** - Messages with client on platform
3. **Mutual Consent** - Both parties must accept
4. **Audit Trail** - All changes logged with timestamps
5. **No Effect Until Approved** - Changes only take effect after mutual consent

### Legal Case Filing

"Legal Support" button allows:
- File case for legal review
- Attach relevant contract details automatically
- Request legal advice or support
- Track legal status
- Maintain audit trail

### Invoice History

Access all invoices related to the contract:
- Invoice number and date
- Amount and currency
- Status (draft, issued, paid)
- Payment method (if paid)
- Download/print functionality

### Automatic Invoice Generation

**Flow:**
1. Milestone marked complete with verified proof of work
2. Client notified via in-app notification + email
3. "Invoice will be auto-generated in 24 hours" notification
4. Client 24-hour review window to dispute
5. If no dispute, invoice auto-generates
6. Invoice issued automatically

**Client Can:**
- Approve early
- Request changes
- Stop invoice generation (dispute)
- View work being invoiced

---

## Projects Page (Enhanced)

### Location
- **Route:** `/projects`
- **Component:** `src/pages/ProjectsEnhanced.tsx`
- **Access:** Contractor-protected route

### Key Features

#### 1. **Tab Navigation**
- **Ongoing:** Active projects (count badge)
- **Completed:** Finished projects (count badge)

#### 2. **Ongoing Projects View**

**Project Card Layout:**

```
┌─────────────────────────────────────┐
│  ABC Corporation                    │
│  Contract #CONTRACT-001             │
│                                     │
│  UGX 50,000,000  Contract Value    │
│                                     │
│  Overall Progress: ███░░░░ 40%     │
│  Start: Jan 2024  End: Dec 2024    │
│  6 milestones                      │
│                                     │
│  ┌───────┐ ┌───────┐ ┌───────┐   │
│  │ Mile  │ │ Mile  │ │ Mile  │   │
│  │ stone │ │ stone │ │ stone │   │
│  │   1   │ │   2   │ │   3   │   │
│  └───────┘ └───────┘ └───────┘   │
│                                     │
│  [Gallery] [Calendar] [Chat] [Reports]
└─────────────────────────────────────┘
```

**Per Milestone:**
- Milestone number (#1, #2, etc.)
- Name and description
- Status with icon (✓ completed / ⏱ in-progress)
- Percentage of contract and amount
- Progress bar
- Due date
- Video evidence count
- Upload Evidence button

#### 3. **SOP Compliance & Accountability Gallery**

**Features:**

**Grid View:**
- Visual grid of all uploaded evidence
- Photos, videos, documents as thumbnails
- Hover effects with view/download actions
- Type indicators (photo/video/document)

**Timeline View:**
- Chronological order (newest first)
- Thumbnail + details
- Evidence type, upload date
- Expandable descriptions
- Quick view/download actions

**Evidence Types Categorized:**
- **Safety:** PPE, safety procedures, compliance photos
- **Process:** Step-by-step documentation
- **Measurement:** Technical measurements, drawings
- **Specification:** Project specs, technical references
- **Verification:** GPS-locked field verification photos
- **Documentation:** General project documentation

**Evidence Metadata:**
- Title and description
- Upload timestamp
- Uploaded by (user name)
- Type and category
- Evidence category tag

#### 4. **Quick Action Buttons**

Per project:
- **Gallery:** Open SOP Compliance & Accountability Gallery
- **Calendar:** View project calendar and milestones
- **Chat:** Open team chat for this project
- **Reports:** View project reports and analytics

#### 5. **Team Chat Integration**

Per project:
- Real-time team messaging
- Attachment uploads (documents, images)
- Threaded conversations
- Member presence indicators
- Message search

**Features:**
- Team members can collaborate in real-time
- Bookmark messages to tasks/milestones
- Reference previous conversations
- File sharing directly in chat
- Notification when mentioned

#### 6. **Milestone Evidence Upload Modal**

Per milestone, upload:
- **Video** (processed through Mux)
- **Photo** (with metadata)
- **Document** (drawings, specs, etc.)

**Flow:**
1. Click "Upload Evidence" on milestone
2. Select file type (video/photo/document)
3. Add title and description
4. Upload and process
5. Automatic milestone status update to "completed" when all deliverables done

#### 7. **Completed Projects View**

Shows finished projects with:
- Trophy icon indicating completion
- Client name and contract number
- Contract value
- Start and completion dates
- 100% completion indicator

**Project Summary:**
- Overall project description
- Key achievements listed
- Client rating (1-5 stars)
- Client testimonial

#### 8. **Progress Tracking**

Visual indicators:
- Overall progress bar (0-100%)
- Per-milestone progress indicators
- Status badges (pending/in_progress/completed)
- Completion percentage

---

## Database Integration

### Key Queries

**Fetch Contracts with Full Data:**
```sql
SELECT c.*,
  array_agg(cm.* ORDER BY cm.milestone_number) as milestones
FROM contracts c
LEFT JOIN contract_milestones cm ON c.id = cm.contract_id
WHERE c.contractor_id = $1
GROUP BY c.id
ORDER BY c.contract_start_date DESC
```

**Fetch Milestone Evidence:**
```sql
SELECT 
  fv.* as field_verification,
  pmv.* as videos
FROM contract_milestones cm
LEFT JOIN field_verification fv ON cm.id = fv.milestone_id
LEFT JOIN project_milestone_videos pmv ON cm.id = pmv.milestone_id
WHERE cm.contract_id = $1
```

**Calculate Financial Summary:**
```sql
SELECT
  SUM(c.contract_amount) as total_amount,
  SUM(CASE WHEN cm.status = 'paid' THEN cm.amount_ugx ELSE 0 END) as total_paid,
  COUNT(DISTINCT c.id) as contract_count,
  COUNT(DISTINCT CASE WHEN c.status = 'active' THEN c.id END) as active_count
FROM contracts c
LEFT JOIN contract_milestones cm ON c.id = cm.contract_id
WHERE c.contractor_id = $1
```

### Real-time Updates

Uses Supabase Realtime subscriptions:
- `contract_milestones` - Status changes trigger UI updates
- `project_team_chat` - New messages appear instantly
- `project_milestone_videos` - New evidence uploaded
- `field_verification` - Photo verification updates

---

## User Workflows

### Contractor Workflow

1. **Create Contract**
   - New Contract button → ContractCreationForm
   - Enter client info, amount, dates
   - Submit → Contract created in 'active' status

2. **Add Milestones**
   - Select contract → Add Milestone button
   - Define name, amount, percentage, due date
   - Submit → Milestone appears in contract

3. **Upload Evidence**
   - Click milestone → Upload Proof of Work
   - Photo option: PhotoLockUploadForm (GPS-locked)
   - Video option: MilestoneProofOfWorkModal (Mux integration)
   - Milestone status → photo_verified

4. **Track Progress**
   - View overall progress bar
   - See individual milestone status
   - Monitor financial metrics in dashboard

5. **Communication**
   - Click Chat → ProjectTeamChat
   - Discuss with client/team
   - Share updates and attachments
   - Bookmark messages to milestones

6. **Evidence Gallery**
   - Click Gallery → Accountability Gallery
   - View all uploaded photos/videos
   - Toggle between grid and timeline views
   - Download evidence for records

7. **Handle Amendments**
   - Click Propose Amendment
   - Submit proposed changes
   - Track communication and approval status
   - Amendment takes effect after mutual consent

8. **Invoice Review**
   - Click Invoice History
   - Review all invoices
   - See payment status
   - Track outstanding amounts

### Client Workflow (External)

1. **Receive Notification**
   - Email + in-app notification when milestone completed
   - "Work completed, invoice will auto-generate in 24 hours"
   - Link to view work details

2. **Review Evidence**
   - View photos/videos of completed work
   - Verify meets requirements

3. **Action Options**
   - **Approve** - Work is acceptable, invoice generates
   - **Request Changes** - Flag issues for contractor to fix
   - **Dispute** - Stop invoice generation if major issue
   - **Approve Early** - Generate invoice before 24 hours

4. **Track Progress**
   - Dashboard shows contract milestones
   - Overall completion percentage
   - Financial summary (paid vs. outstanding)

---

## Design System

### Color Scheme (Tailwind)
- **Primary:** Blue (600) - Actions, highlights
- **Success:** Green (600) - Completed, approved
- **Warning:** Amber (600) - In progress, attention
- **Danger:** Red (600) - Critical, errors
- **Neutral:** Gray/Slate (600) - Backgrounds, text

### Typography
- **Headings:** Font-bold, sizes 3xl, 2xl, xl
- **Body:** Regular, sizes sm to base
- **Labels:** Font-semibold, size sm

### Spacing & Layout
- Consistent 4px grid (Tailwind spacing)
- Max widths: 6xl for main content (1152px)
- Card-based layout with shadows on hover
- Responsive grid: 1 column (mobile) → 2-3 columns (tablet) → 3-4 columns (desktop)

### Components
- **Cards:** Rounded corners (lg), subtle shadows, hover effects
- **Buttons:** Consistent padding, hover states, active states
- **Progress Bars:** Gradient backgrounds (blue to green)
- **Status Badges:** Inline, colored, bold text
- **Icons:** Lucide React (5-6 sizes), semantic colors

---

## Performance Considerations

### Data Loading
- Contracts loaded once on page mount
- Milestones fetched per contract
- Evidence fetched on demand (gallery modal)
- Pagination possible for large lists (future enhancement)

### Real-time Subscriptions
- Team chat uses Realtime for instant messages
- Milestone status updates trigger re-render
- Evidence uploads update immediately

### Optimization Tips
1. **Batch Fetches:** Combined queries when possible
2. **Lazy Loading:** Gallery loads thumbnails first
3. **Caching:** Contractor profile cached in context
4. **Debouncing:** Search input debounced (future)
5. **Pagination:** Consider for 100+ contracts/milestones

---

## API Endpoints & Integration

### Supabase Functions Used

1. **Fetch User Contractor Profile**
   ```javascript
   supabase
     .from('contractor_profiles')
     .select('id')
     .eq('user_id', user.id)
     .single()
   ```

2. **Fetch All Contracts**
   ```javascript
   supabase
     .from('contracts')
     .select('*')
     .eq('contractor_id', contractorId)
     .order('contract_start_date', { ascending: false })
   ```

3. **Fetch Milestones**
   ```javascript
   supabase
     .from('contract_milestones')
     .select('*')
     .eq('contract_id', contractId)
     .order('milestone_number')
   ```

4. **Fetch Evidence**
   ```javascript
   supabase.from('field_verification').select('*').eq('milestone_id', milestoneId)
   supabase.from('project_milestone_videos').select('*').eq('milestone_id', milestoneId)
   ```

---

## Troubleshooting

### Common Issues

**Issue:** Contracts not loading
- Check contractor profile exists
- Verify contractor_id is correct
- Check network tab for API errors

**Issue:** Photos not uploading
- Verify GPS permissions granted
- Check file size < 5MB
- Ensure Backblaze B2 credentials configured

**Issue:** Chat not appearing
- Verify user is authenticated
- Check contract_id is correct
- Ensure project_team_chat table accessible

**Issue:** Progress bar not updating
- Refresh page to see latest data
- Check milestone status was saved
- Verify Realtime subscription active

### Debugging

Enable console logging:
```javascript
// In component
console.log('Contracts loaded:', contracts);
console.log('Financial summary:', financialSummary);
console.log('Alerts:', contractAlerts);
```

---

## Future Enhancements

1. **Amendments Workflow**
   - Create amendments table
   - Implement digital signatures
   - Amendment communication UI

2. **Legal Case Management**
   - Dedicated legal cases table
   - Case status tracking
   - Legal document management

3. **Final Report Generation**
   - Auto-generate PDF report
   - Include all milestones, evidence, communications
   - Sign-off workflow

4. **Automated Reminders**
   - Email nudges for contract renewal
   - Slack notifications
   - SMS alerts for critical events

5. **Calendar Integration**
   - Milestone due dates in calendar
   - Meeting scheduling
   - Appointment tracking

6. **Advanced Analytics**
   - Profitability analysis per contract
   - Contractor performance metrics
   - Project completion time trends

7. **Mobile App**
   - React Native version
   - Offline evidence upload
   - Push notifications

8. **Bulk Operations**
   - Export contracts as PDF/Excel
   - Batch milestone creation
   - Mass communication

---

## Support & Maintenance

### Database Backups
- Supabase auto-backups (check backup settings)
- Manual exports recommended before major changes

### Updates
- Test changes in staging environment
- Back up data before migrations
- Document all schema changes

### Monitoring
- Check error logs in Supabase dashboard
- Monitor API usage and performance
- Review security/RLS policies regularly

---

**Last Updated:** 2024
**Version:** 1.0 (Enhanced)
**Status:** Production Ready
