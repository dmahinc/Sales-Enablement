# Digital Sales Room (DSR) Improvement Plan

Based on the Seismic/SilverTower marketing transcript and screenshots, this document outlines recommended improvements to align the Sales Enablement platform’s DSR with industry standards and a modern, streamlined experience.

---

## Executive Summary

| Area | Current State | Seismic Reference | Priority |
|------|---------------|-------------------|----------|
| **Share & Send Flow** | Copy URL only; no email compose | Full "Send email with link" modal | **High** |
| **Customer View Layout** | Flat bento grid; minimal personalization | Banner + greeting + "Shared by" avatar; People/Activity sidebars | **High** |
| **Room Builder** | Section-based, add material dropdown | Block-based (Image, Text, Documents); drag-drop; floating add bar; Recents sidebar | **Medium** |
| **Templates** | None – create from scratch only | "Select template" modal with search; Blank + marketing templates | **Medium** |
| **Session Analytics** | Room-level stats + material table | Per-session modal: user, location, device; X/Y content viewed; view time bars | **Medium** |
| **Engagements List** | DealRooms list with basic meta | Accounts table: Recent Activity, Engaged Contacts, Recent Engagements with avatars | **Low** |

---

## 1. Share & Send Flow (High Priority)

**Transcript:** *"I'll just add a subject line, format my message, and send it off... Since this DSR includes sensitive information, it will be password protected, keeping everything secure."*

### Current
- Copy URL button only
- No email composition or recipient selection

### Recommended

- **Share Link modal** (similar to Seismic’s “Send email with link”):
  - Recipients: multi-select chips (emails or contacts)
  - Optional: CRM/opportunity relation (future integration)
  - Send logic: “Send separate emails” vs “Send one email to group”
  - Subject line
  - Rich text body for personalized message
  - **Link settings:**
    - Notifications: toggle for “all viewing activity” / “session summaries”
    - Allow downloads: toggle
    - **Password protect:** toggle + password field
    - Expires on: date picker (already exists via `expires_at`)
  - Primary “Send” button

**Backend:** Extend deal room model/schema to support optional password; add an email send endpoint that creates share records and sends the link.

---

## 2. Customer-Facing DSR Layout (RoomView) (High Priority)

**Transcript:** *"Digital sales rooms keep information and communication centralized for all stakeholders in a way that's streamlined, modern, and personalized for every customer."*

### Current
- Compact header with logo
- Video + executive summary (if present)
- Bento materials grid
- Action plan
- Messages sidebar

### Recommended

- **Personalized hero banner:**
  - Brand image/banner (e.g. SilverTower-style layout)
  - Team photo or branded visual
  - **“Shared by [Name]”** avatar and label (use `created_by_user` or room owner)

- **Greeting block:**
  - Salutation: “Hello [Customer/Team Name],” (from `customer_name` or `company_name`)
  - Rich welcome text (welcome_message / executive_summary)
  - More visible typography

- **Right sidebar (collapsible):**
  - **People:** Stakeholders (customer contacts, internal owners) with initials/avatars and roles
  - **Activity:** Live feed of events (e.g. “Mark Lee viewed Landing page…”) with timestamps
  - Links like “See analytics” for deeper insights

- **Visual design:**
  - Warmer palette, fewer flat greys
  - Larger icons and clearer hierarchy
  - Soft shadows and borders instead of heavy grey lines

---

## 3. Room Builder (RoomEditView) (Medium Priority)

**Transcript:** *"The drag and drop widgets make it easy to organize this information for my customer... I can even record a video right within the dsr for a personalized introduction."*

### Current
- Sections with “Add material” dropdown
- No block-based editing or drag-and-drop

### Recommended

- **Block-based structure:**
  - **Image block:** Banner/logo (with optional “Read only” / locked for compliance)
  - **Text block:** Rich text greeting with formatting toolbar
  - **Documents block:** Materials list with thumbnails, captions, timestamps

- **Floating add bar:** Between blocks, quick add options:
  - Document
  - Folder/section
  - Image
  - Video
  - Text

- **Recents sidebar:**
  - Recently used files
  - Drag handle (6 dots)
  - Color-coded file-type icons (PDF, video, doc)
  - Drag-and-drop into blocks

- **Locked blocks:** “Read only” badge with lock icon for marketing-controlled content

---

## 4. Template Selection (Medium Priority)

**Transcript:** *"I can create a DSR from scratch or I can use a template created by my marketing team to save time and stay on brand."*

### Current
- Create from scratch only

### Recommended

- **“Create Room” flow:**
  1. Modal: “Create from scratch” vs “Use template”
  2. **Template selector modal:**
     - Search bar (“Search templates…”)
     - Grid of template cards with:
       - Title
       - Thumbnail (or icon)
       - Last modified
     - Options: Blank, AI Webinar Invite, First Call Follow-Up, Campaign, Product Release, etc.

- **Template data model:** Store templates (room structure + default blocks) in the backend; “Create from template” clones that structure.

---

## 5. Session Analytics (RoomAnalytics) (Medium Priority)

**Transcript:** *"All this engagement activity is being tracked in real time. I get alerts to my inbox and can access detailed insights about what my customer is engaging with right down to the page level."*

### Current
- Total views, unique visitors, downloads, last viewed
- Material engagement table (views, downloads)

### Recommended

- **Session-level analytics:**
  - **Session Analytics modal** (per visitor or per session):
    - User: name, time, location, device
    - Summary: “X/Y content viewed”, “Total session time”
    - Content list: each asset with:
      - View status: “Viewed” / “Not viewed”
      - Pages viewed (e.g. “1/1” or “3/5”)
      - View time
    - **Progress bars** per asset for view time (like Seismic)

- **Activity feed:** Real-time “Mark viewed Landing page”, “Sandra downloaded…”, etc.

- **Alerts:** Configurable email alerts for views, downloads, or session summaries (backend + preference UI)

---

## 6. Deal Rooms List → Engagements View (Low Priority)

**Transcript:** *"I get alerts to my inbox and can access detailed insights."*

### Current
- Simple list: name, company, materials count, views, last viewed, actions

### Recommended

- **Engagements-style table:**
  - **Name:** Account/company with icon
  - **Recent Activity:** “Sent today at 6:33 AM from Web (Email)” or “Last viewed May 13, 2024 by Joe Black”
  - **Engaged Contacts:** Count
  - **Recent Engagements:** DSR titles with small avatars/icons
  - **Owner:** Internal owner

- Use badges, status colors, and avatars instead of plain text for quicker scanning.

---

## 7. Visual & UX Consistency

**Transcript:** *"Streamlined, modern, and personalized"*

### Recommendations

- **Color palette:** More primary/teal/violet accents; reduce heavy grey backgrounds
- **Icons:** Consistent 20px (w-5 h-5) minimum; slightly larger for navigation
- **Cards:** Soft shadows and subtle borders instead of thick grey outlines
- **Banners:** Gradient or brand backgrounds for hero areas
- **Progress:** Colored progress bars in analytics instead of plain numbers

---

## Implementation Phases

| Phase | Scope | Effort |
|-------|-------|--------|
| **Phase 1** | Share modal (recipients, subject, body, password protect, expiry) | 2–3 days |
| **Phase 2** | RoomView layout (hero banner, “Shared by”, People/Activity sidebars) | 2 days |
| **Phase 3** | RoomEditView block-based builder + drag-drop + Recents | 4–5 days |
| **Phase 4** | Template system (model + selector + create from template) | 3 days |
| **Phase 5** | Session analytics (per-session modal, progress bars) | 2–3 days |
| **Phase 6** | Engagements table redesign | 1–2 days |

---

## Quick Wins (Can Ship Early)

1. **“Shared by” avatar** in RoomView header (use `created_by_user` avatar/initials)
2. **Personalized greeting** – “Hello [Customer Name],” from `customer_name` or `company_name`
3. **Share button** on DealRooms list and RoomEditView – opens modal to copy link + optional email send
4. **Password protect** for DSR links (backend flag + password gate on `/room/:token`)
5. **Visual refresh** – apply existing warm palette and icon sizing to DSR pages

---

## Files to Modify (Reference)

| Component | Path | Changes |
|-----------|------|---------|
| RoomView | `frontend/src/pages/RoomView.tsx` | Hero banner, People/Activity sidebars, “Shared by” |
| RoomEditView | `frontend/src/pages/RoomEditView.tsx` | Block-based UI, floating add bar, Recents |
| DealRooms | `frontend/src/pages/DealRooms.tsx` | Share modal trigger, template selector entry |
| RoomAnalytics | `frontend/src/pages/RoomAnalytics.tsx` | Session-level analytics, progress bars |
| Backend | `backend/app/api/deal_rooms.py` | Password, share/send email endpoint |
| Backend | `backend/app/models/deal_room.py` | Optional password field, template model (if needed) |
