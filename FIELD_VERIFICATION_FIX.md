# Field Verification Fix - Proof of Work Upload

## Overview
This fix addresses the issues where uploading proof of work (photo-locked) on the Contracts page didn't:
- Reset the form after submission
- Update milestone status
- Show success feedback
- Refresh the contract view
- Display verification details

## What Changed

### 1. **Database Layer - Trigger Added**
**File**: `database_migrations/add_field_verification_trigger.sql`

A PostgreSQL trigger was created that automatically updates the `contract_milestones` table when a `field_verification` record is inserted:

```sql
CREATE OR REPLACE FUNCTION "public"."on_field_verification_created"() RETURNS "trigger"
```

**What it does:**
- When proof of work is uploaded → a `field_verification` record is created
- The trigger automatically updates the related milestone's `status` to `'photo_verified'`
- This indicates the proof has been submitted and is pending review

**How to apply:**
1. Go to your Supabase project
2. Click "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy the entire contents of `database_migrations/add_field_verification_trigger.sql`
5. Paste it into the SQL editor
6. Click "Run"

### 2. **Frontend - PhotoLockUploadForm Component**
**File**: `src/components/PhotoLockUploadForm.tsx`

**Changes:**
- Added `resetForm()` function to clear all form data after successful submission
- Form now resets immediately after file is uploaded to the database
- Enhanced success message shows what happened and what's next
- Proper callback handling to trigger parent component refresh

**Key improvements:**
```
Before: Form filled with data → Success message → Form still filled
After:  Form filled with data → Upload succeeds → Form reset → Success message → Auto-refresh parent
```

### 3. **Frontend - Contracts Page**
**File**: `src/pages/Contracts.tsx`

**Changes:**

#### a. Enhanced Data Fetching
- Milestones now fetch related `field_verification` records
- Displays the most recent verification for each milestone
- Shows verification status, task name, and uploaded photo link

#### b. Improved onSuccess Callback
- When proof of work is uploaded successfully:
  1. All contracts and milestones are refreshed
  2. Field verification data is fetched from the database
  3. The upload form automatically closes
  4. You're returned to the contract detail view with updated information

#### c. Updated Milestone Display
- Shows verification details if proof has been submitted:
  - Task name
  - Verification status (pending, approved, rejected)
  - Submission timestamp
  - Link to view the uploaded photo
- "Upload Proof of Work" button only shows if:
  - No verification exists yet, OR
  - Previous verification was rejected
- Changed to "Resubmit Proof of Work" if previous submission was rejected

## User Experience Flow

### Before
1. User fills out photo upload form
2. User clicks "Lock Photo & Submit"
3. Form shows success message
4. **Form remains filled with data**
5. **No indication of what happened to the milestone**
6. **Progress bar doesn't update**

### After
1. User fills out photo upload form
2. User clicks "Lock Photo & Submit"
3. Loading spinner appears while uploading
4. **Form automatically resets and clears**
5. **Success message shows what happened**
6. **Page auto-refreshes to show updated milestone status**
7. **Progress bar updates to show milestone as "photo_verified"**
8. **Verification details appear in the milestone card**

## Milestone Status Progression

The new workflow updates the milestone status through these stages:

```
pending 
  ↓ [User uploads proof of work]
photo_verified 
  ↓ [Administrator approves verification]
approved/invoiced
  ↓ [Payment received]
paid
```

## Data Visible After Upload

Once proof of work is uploaded, the following appears on the milestone card:

```
✓ Proof of Work Submitted

Task: [Task name entered by user]
Status: pending
Submitted: [Timestamp]
📸 View uploaded photo [Link]
```

## Technical Details

### Database Trigger
- **Trigger Type**: AFTER INSERT
- **Table**: `field_verification`
- **Action**: Updates `contract_milestones.status = 'photo_verified'`
- **When**: Automatically when a field verification record is created

### Form Reset
The `resetForm()` function clears:
- Uploaded file and preview image
- Task name and description
- GPS coordinates
- GPS accuracy values

### Data Refresh
The parent `Contracts.tsx` component:
1. Re-fetches all contracts for the user
2. Re-fetches all milestones for each contract
3. Re-fetches the most recent field verification for each milestone
4. Updates the UI with fresh data
5. Closes the upload form

## Important Notes

1. **GPS Location Validation**: The form requires GPS coordinates (either auto-detected or manually entered). The database schema shows these coordinates are stored for fraud prevention.

2. **Photo Storage**: Photos are uploaded to Backblaze B2 storage and the URL is saved in the database.

3. **Verification Status**: Initial status is always 'pending'. An administrator or system function must later update it to 'approved' or 'rejected'.

4. **Milestone Progress**: The progress bar calculation remains based on milestones with status = 'paid'. The 'photo_verified' status is an intermediate step.

5. **Multiple Submissions**: If a user needs to resubmit proof of work (because the first was rejected), they can click "Resubmit Proof of Work" to upload a new verification.

## Testing the Fix

1. **Create a contract** with at least one milestone
2. **Go to the contract details**
3. **Click "Upload Proof of Work"** on a pending milestone
4. **Fill out the form**:
   - Enter a task name (required)
   - Take/upload a photo (required)
   - Click "Get Current Location" or manually enter GPS coordinates (required)
5. **Click "Lock Photo & Submit"**
6. **Verify the following happens**:
   - ✓ Form resets and clears
   - ✓ Success message appears
   - ✓ Page refreshes automatically
   - ✓ Milestone status changes to "photo_verified"
   - ✓ Verification details appear in the milestone card
   - ✓ Form closes and you return to contract view

## Related Database Tables

- `contract_milestones`: Stores milestone data (status, amount, due date)
- `field_verification`: Stores proof of work submissions (photo, GPS, timestamp)
- `contracts`: Stores contract information

## Troubleshooting

### Form doesn't reset after upload
- Check browser console for JavaScript errors
- Verify the database write was successful (check Supabase dashboard)
- Clear browser cache and reload

### Milestone status not updating
- Verify the database trigger was applied correctly
- Check Supabase database > SQL Editor > Triggers
- Look for `on_field_verification_created_trigger`

### Photo upload fails
- Check file size (should be under 10MB)
- Verify Backblaze B2 credentials are configured
- Check network connectivity

### Form doesn't close automatically
- Verify the `onSuccess` callback is being called
- Check browser console for errors in the refresh function
- Manually reload the page to see updated data

## Files Modified

1. ✅ `database_migrations/add_field_verification_trigger.sql` - NEW (Database trigger)
2. ✅ `src/components/PhotoLockUploadForm.tsx` - MODIFIED (Form reset & callback)
3. ✅ `src/pages/Contracts.tsx` - MODIFIED (Data fetching & display)

## Next Steps

1. **Apply the database migration**:
   - Copy SQL from `database_migrations/add_field_verification_trigger.sql`
   - Execute in Supabase SQL Editor
   - Verify trigger exists in Database > Triggers

2. **Test the complete workflow**:
   - Create a test contract
   - Upload proof of work
   - Verify form resets
   - Verify data refreshes
   - Verify milestone status updates

3. **Monitor for issues**:
   - Check browser console for errors
   - Verify database records are being created
   - Test with different file types and sizes

## Future Enhancements

Consider implementing:
- Approval/rejection workflow in admin panel
- Email notifications when proof is approved/rejected
- Zoho Books invoice automation when milestone is approved
- Document download for verification records
- Batch approval for multiple verifications
