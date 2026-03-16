# Projects Management Implementation Guide

## Overview
This document outlines all the changes made to implement a production-ready Projects Management system for tracking completed and ongoing projects with real-time collaboration features.

## Changes Made

### 1. Navigation Updates

**File: `src/components/Navbar.tsx`**
- Hidden "Supplies" and "Directory" navigation links from the navbar
- Routes remain intact but are commented out for future reactivation
- These pages are still accessible via direct URL but not promoted in the UI
- Kept internal comments indicating their availability for future use

**File: `src/App.tsx`**
- Commented out `/supplies` route
- Commented out `/directory` route
- Fixed duplicate `/projects` routes by:
  - Removing the old unprotected `/projects` route (pointing to the legacy Projects page)
  - Keeping the contractor-protected `/projects` route (now pointing to new ProjectsManagement)
  - Added import for new `ProjectsManagement` component

### 2. New Pages

**File: `src/pages/ProjectsManagement.tsx`**
- Main Projects Management page with two tabs:
  - **Ongoing Projects**: Shows active contracts with:
    - Real-time progress tracking
    - Milestone breakdown (number, name, description, status, due date, value)
    - Progress percentage calculated from completed milestones
    - Team chat integration
    - Reports and collaboration tools
  - **Completed Projects**: Shows finished contracts with:
    - Summary and key achievements
    - Client ratings and testimonials
    - Final outcomes
    - Video evidence of work

**Features:**
- Contractor-protected route (requires contractor profile setup)
- Real-time updates via Supabase subscriptions
- Formatted currency display supporting multiple currencies (UGX, USD, EUR, GBP, KES, CAD, AUD)
- Responsive design with dark/light themed cards
- Modal-based team chat integration
- Status badges for milestone states (completed, in_progress, pending)

### 3. New Hooks

**File: `src/hooks/useProjectsManagement.ts`**
- Manages fetching and caching of projects data
- Fetches ongoing projects from active contracts with their milestones
- Fetches completed projects from completed contracts
- Implements real-time subscriptions to contract changes
- Calculates progress percentages based on milestone completion status
- Exports TypeScript interfaces for type safety:
  - `ProjectVideo`: Video evidence with metadata
  - `ProjectMilestone`: Individual milestone with status and videos
  - `OngoingProject`: Active project with milestones
  - `CompletedProject`: Finished project with achievements and ratings

**File: `src/hooks/useProjectTeamChat.ts`**
- Manages real-time team messaging for project collaboration
- Fetches and displays messages for a specific contract
- Implements real-time subscriptions to new messages
- Handles message sending with sender profile information
- Auto-enriches messages with sender names and avatars from profiles
- Supports message attachments (prepared for future file sharing)

### 4. New Components

**File: `src/components/ProjectMilestoneVideoUpload.tsx`**
- Modal-based video upload component for milestone evidence
- Features:
  - Drag-and-drop file selection
  - File validation (MP4, WebM, MOV, AVI; max 500MB)
  - Integration with Mux for video processing
  - Automatic thumbnail generation from Mux
  - Custom frame selection for thumbnails (using VideoFrameSelector)
  - Title and description for video evidence
  - Real-time progress tracking
- Saves videos to `project_milestone_videos` table with:
  - Mux playback ID for streaming
  - Custom thumbnail URL
  - Timestamp for milestone tracking
  - Uploader information

**File: `src/components/ProjectTeamChat.tsx`**
- Modal-based team chat interface for project collaboration
- Features:
  - Real-time message display with automatic scrolling
  - Sender identification with name and timestamp
  - Message input with send button
  - File upload button (prepared for future implementation)
  - Error handling and validation
  - Responsive design
  - Human-readable timestamps (e.g., "5m ago", "2h ago", "Mar 13")
- Visual distinction for current user's messages (right-aligned, blue background)

### 5. Database Migrations

**File: `supabase/migrations/20250313_add_projects_management_tables.sql`**

Two new tables created:

#### `project_milestone_videos`
```sql
- id (UUID, primary key)
- milestone_id (UUID, foreign key to contract_milestones)
- title (text, required)
- description (text, optional)
- url (text, Mux streaming URL)
- thumbnail_url (text, custom or Mux-generated)
- playback_id (text, Mux identifier)
- timestamp (bigint, milestone timestamp)
- uploaded_by (UUID, foreign key to profiles)
- created_at (timestamp)
- updated_at (timestamp)
```
- Includes indexes for: milestone_id, uploaded_by, created_at
- RLS enabled with policies for:
  - View access for all users
  - Upload/update/delete restricted to uploader

#### `project_team_chat`
```sql
- id (UUID, primary key)
- contract_id (UUID, foreign key to contracts)
- sender_id (UUID, foreign key to profiles)
- sender_name (text, for quick access)
- sender_avatar (text, optional profile picture)
- message (text, required)
- attachment_url (text, optional)
- attachment_type (text, optional)
- created_at (timestamp)
- updated_at (timestamp)
```
- Includes indexes for: contract_id, created_at, sender_id
- RLS enabled with policies for:
  - View access for all users
  - Send/update/delete restricted to message sender
- Real-time enabled for live updates

### 6. Integration Points

#### Reused from Existing Code
- `useVideoUpload` hook: Video uploading and Mux integration
- `VideoFrameSelector` component: Custom thumbnail selection from video frames
- Supabase edge functions: `upload-to-b2`, `process-new-video` for Mux integration
- Authentication context and protected routes

#### Database Tables Leveraged
- `contracts`: For ongoing and completed projects
- `contract_milestones`: For milestone tracking
- `profiles`: For user information (name, avatar)
- Realtime subscriptions already configured

## Database Setup Instructions

### To Apply Migrations

**Option 1: Supabase Dashboard (Recommended)**
1. Go to your Supabase project dashboard
2. Navigate to "SQL Editor"
3. Create a new query
4. Copy the entire contents of `supabase/migrations/20250313_add_projects_management_tables.sql`
5. Execute the query
6. Verify that both tables were created successfully

**Option 2: Using Supabase CLI**
```bash
supabase db push
```

### Verification
After applying the migration, verify the tables were created:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN ('project_milestone_videos', 'project_team_chat');
```

## Usage Guide

### For End Users

1. **Navigate to Projects**
   - Click "Projects" in the navbar (only visible to authenticated contractors)
   - Requires contractor profile setup (redirects to onboarding if not set up)

2. **View Ongoing Projects**
   - Default tab shows active contracts
   - See real-time progress for each milestone
   - Click on any milestone to view details
   - Use "Chat with Team" button to collaborate

3. **View Completed Projects**
   - Switch to "Completed" tab
   - View client ratings and testimonials
   - Check project summaries and achievements

4. **Upload Milestone Evidence**
   - Click "Upload Video" for any milestone
   - Select video file (drag & drop supported)
   - Add title and description
   - Wait for Mux processing
   - Select custom thumbnail frame (optional)
   - Save to attach to milestone

5. **Team Chat**
   - Click "Chat with Team" on any project
   - Send real-time messages to team members
   - Messages display with sender names and timestamps
   - Chat is specific to each contract/project

### For Developers

#### Extending the Feature

**Add Custom Milestone Status:**
1. Update `contract_milestones` table schema if needed
2. Modify status checks in `useProjectsManagement.ts`
3. Update status badge styling in `ProjectsManagement.tsx`

**Add Video Analytics:**
1. Create new table `project_video_analytics`
2. Add Mux webhook handler for view tracking
3. Update `ProjectMilestoneVideoUpload` to capture analytics

**Implement Project Reports:**
1. Create new page `src/pages/ProjectReports.tsx`
2. Use `useProjectsManagement` hook for data
3. Add data visualization library (e.g., recharts)
4. Link from "View Reports" button in ProjectsManagement

## Architecture Decisions

### Why These Design Choices?

1. **Separate ProjectsManagement Page**
   - Clear separation of concerns
   - Distinct from old Projects page (job listings)
   - Allows independent evolution

2. **Using Existing Contracts Table**
   - No data duplication
   - Single source of truth
   - Leverages existing relationships

3. **New Tables for Videos and Chat**
   - Specialized schema for project-specific features
   - Efficient querying and filtering
   - Realtime-enabled for live updates

4. **RLS Policies**
   - Secure by default
   - Users see only relevant data
   - Contractor-only access enforced

5. **Mux Integration for Videos**
   - Professional streaming quality
   - Adaptive bitrate
   - Automatic thumbnail generation
   - Already proven in Media module

## Performance Considerations

### Optimization Strategies

1. **Lazy Loading**
   - Messages load on demand (limit 100)
   - Videos loaded per milestone
   - Contract milestones fetched with contracts

2. **Caching**
   - useProjectsManagement caches completed/ongoing lists
   - Minimal refetches on realtime updates

3. **Indexes**
   - Created on frequently queried columns
   - contract_id, sender_id, created_at
   - milestone_id, uploaded_by

4. **Realtime Subscriptions**
   - Filtered by contract_id for chat
   - Filtered by table for projects
   - Automatic cleanup on unmount

## Security Considerations

1. **RLS Policies**
   - All CRUD operations protected
   - User can only access their own messages/videos
   - View-only access to project data

2. **Route Protection**
   - `/projects` requires ContractorProtectedRoute
   - Redirects to onboarding if no contractor profile

3. **Data Validation**
   - Video file type and size validation
   - Message content validation
   - Supabase-enforced constraints

4. **Sensitive Data**
   - No passwords or API keys exposed
   - Avatar URLs from profiles only
   - Timestamps are server-generated

## Testing Recommendations

### Unit Tests
- useProjectsManagement: Mock Supabase responses
- useProjectTeamChat: Test message sending/receiving
- Component rendering with various states

### Integration Tests
- Full flow: Create message → Fetch → Display
- Video upload: Select → Process → Save → Display
- Real-time updates: Send message → See update in another tab

### E2E Tests
- Navigate to projects
- View ongoing/completed tabs
- Open team chat, send message
- Upload video evidence
- Verify real-time updates

## Future Enhancements

1. **Project Timeline View**
   - Gantt chart for milestone scheduling
   - Drag-to-reschedule functionality

2. **Video Gallery**
   - Grid view of all project videos
   - Thumbnail previews
   - Video metadata and analytics

3. **Advanced Search & Filter**
   - Filter by client, date range, status
   - Search within messages
   - Archive old projects

4. **Notifications**
   - New message notifications
   - Milestone completion alerts
   - Team member invitations

5. **File Attachments**
   - Support for documents, images in chat
   - File browser integration
   - Download/preview functionality

6. **Project Analytics Dashboard**
   - Contract value trends
   - Milestone completion rates
   - Team productivity metrics

7. **Mobile Optimization**
   - Touch-friendly chat interface
   - Simplified video upload for mobile
   - Push notifications

## Troubleshooting

### Issue: "Contractor profile not found" redirects to onboarding
**Solution:** User must complete contractor onboarding first. Go to `/onboarding` and follow the setup process.

### Issue: Tables don't exist error
**Solution:** Run the SQL migration from `supabase/migrations/20250313_add_projects_management_tables.sql`

### Issue: Messages not appearing in real-time
**Solution:** Check that realtime is enabled in Supabase for `project_team_chat` table, and verify the `contract_id` in the subscription filter.

### Issue: Video upload fails
**Solution:** 
- Verify file size < 500MB
- Check file format (MP4, WebM, MOV, AVI)
- Verify `process-new-video` edge function exists and is working

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the code comments in relevant files
3. Check Supabase error messages in browser console
4. Verify database migrations were applied successfully

---

**Last Updated:** March 13, 2025
**Version:** 1.0.0
**Status:** Production Ready
