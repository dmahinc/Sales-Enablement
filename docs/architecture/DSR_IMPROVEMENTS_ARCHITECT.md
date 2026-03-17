# Digital Sales Room Improvements – ARCHITECT Phase

**Initiative:** DSR Customer Experience & UI (P0 + P1)  
**BMAD Phase:** ARCHITECT  
**Date:** 2026-03-15  
**Source:** [DSR_IMPROVEMENTS_MAP.md](../DSR_IMPROVEMENTS_MAP.md)

---

## 1. Overview

This document defines the technical design for implementing DSR P0 and P1 improvements. It covers data model changes, API design, frontend architecture, and implementation decisions.

---

## 2. Architecture Decision Records (ADRs)

### ADR-DSR-1: In-browser PDF viewing – react-pdf (pdf.js)

**Context:** Customers need to view PDFs in the browser before downloading.

**Decision:** Use `react-pdf` (React wrapper for Mozilla pdf.js) for PDF rendering.

**Rationale:**
- Mature, widely used, good React integration
- No server-side processing required
- Supports zoom, page navigation, responsive layout
- Works with blob URLs (fetch file, create blob URL, pass to viewer)

**Alternatives considered:**
- Raw `<iframe>` with `Content-Disposition: inline` – simpler but less control, no page nav
- `@react-pdf-viewer/core` – more features but heavier; react-pdf is sufficient for P0

---

### ADR-DSR-2: In-browser PPTX viewing – pptx-preview

**Context:** Customers need to view PPTX presentations in the browser.

**Decision:** Use `pptx-preview` for client-side PPTX rendering.

**Rationale:**
- Client-side only; no server conversion (LibreOffice) needed
- Parses PPTX, renders slides client-side
- MIT licensed, works with React
- Supports charts, tables, basic animations

**Alternatives considered:**
- Server-side PPTX→PDF conversion (LibreOffice headless) – adds dependency, latency
- Microsoft Office Online Viewer (external) – requires upload, privacy concerns
- DOCX in P0: Download only; add viewer in P1/P2 if needed

---

### ADR-DSR-3: View endpoint – stream file with tracking

**Context:** Need to serve file for viewing and track view events.

**Decision:** Add `GET /api/deal-rooms/token/{token}/materials/{material_id}/view` that:
1. Validates room + material (same logic as download)
2. Records MaterialUsage with `action=view`, `deal_room_id`, `user_id=room.created_by_user_id`
3. Streams file with `Content-Disposition: inline` for PDF (browser displays); for PPTX, streams raw bytes (frontend fetches as blob for pptx-preview)

**Rationale:** Single endpoint for both PDF (inline display) and PPTX (blob fetch). Tracking happens server-side; frontend does not need to call a separate "track view" API.

---

### ADR-DSR-4: Section ordering – constant + custom

**Context:** Journey-based sections need a defined display order.

**Decision:** Define a constant list of default journey sections. When building `materials_by_section`, iterate default sections first (in order), then append any custom section names. No schema change.

**Default sections (in order):**
1. `1. Problem & Business Case`
2. `2. Solution Walkthrough`
3. `3. Validation`
4. `4. Commercials & Legal`
5. `All Materials` (fallback for materials with no section)

Custom sections (e.g. `5. Implementation`) appear after defaults, sorted alphabetically or by first-use order.

---

### ADR-DSR-5: MAP status update – require auth

**Context:** Customers can mark action plan items complete.

**Decision:** Require authenticated user (customer or sales) to update MAP status. Anonymous (token-only) users see MAP as read-only.

**Rationale:** Prevents abuse (anyone with link could mark items complete). Customer persona already has login; we validate that the user is the room's customer (email match) or the room creator.

---

## 3. Data Model Changes

### 3.1 DealRoom – new columns

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `executive_summary` | Text | Yes | Short "What we heard from you" / "Why us" paragraph |
| `welcome_video_url` | String(500) | Yes | Loom, YouTube, Vimeo, or direct embed URL |

**Migration:** `020_add_deal_room_intro_fields.py`

```python
def upgrade():
    op.add_column("deal_rooms", sa.Column("executive_summary", sa.Text(), nullable=True))
    op.add_column("deal_rooms", sa.Column("welcome_video_url", sa.String(500), nullable=True))
```

### 3.2 No changes to

- `deal_room_materials` – `section_name` and `persona_id` already exist
- `action_plan_items` – `assignee` and `status` already exist
- `material_usage` – `VIEW` action and `deal_room_id` already supported

---

## 4. API Design

### 4.1 New endpoint: View material (public)

```
GET /api/deal-rooms/token/{token}/materials/{material_id}/view
```

**Behavior:**
- Validates room (token, is_valid)
- Validates material is in room
- Records MaterialUsage: `action=view`, `deal_room_id`, `user_id=room.created_by_user_id`
- Streams file via `FileResponse` with:
  - **PDF:** `Content-Disposition: inline` (browser may display)
  - **PPTX, DOCX:** `Content-Disposition: inline` (frontend will fetch as blob for viewer or download)
- Same auth as download: none (token in URL)

**Response:** Raw file bytes (application/pdf, etc.)

### 4.2 Updated endpoints

**GET /api/deal-rooms/token/{token}** (public room)

Add to `DealRoomPublicResponse`:
- `executive_summary: Optional[str]`
- `welcome_video_url: Optional[str]`

**POST /api/deal-rooms** (create), **PUT /api/deal-rooms/{id}** (update)

Add to request body:
- `executive_summary: Optional[str]`
- `welcome_video_url: Optional[str]`

### 4.3 New endpoint: Update action plan item status (authenticated)

```
PATCH /api/deal-rooms/{room_id}/action-plan/{item_id}
```

**Body:** `{ "status": "completed" }` (or `in_progress`, `pending`)

**Authorization:**
- Sales: must be room creator
- Customer: must match `room.customer_email`
- PMM/Director/Admin: full access

**Validation:** Only allow status update if `assignee` is `customer` or `both` when caller is customer.

### 4.4 Section ordering in public response

Current: `materials_by_section` is a dict (unordered in JSON).

**Change:** Return `sections` as an ordered structure:

```json
{
  "sections": [
    { "name": "1. Problem & Business Case", "materials": [...] },
    { "name": "2. Solution Walkthrough", "materials": [...] },
    ...
  ]
}
```

Or keep `materials_by_section` but document that keys should be iterated in journey order (frontend uses constant order). **Simpler:** Keep current structure; frontend applies ordering using the constant list. Sections not in the list appear at the end.

---

## 5. Frontend Architecture

### 5.1 New dependencies

```json
{
  "react-pdf": "^7.7.0",
  "pptx-preview": "^1.x"
}
```

**Note:** Alternatives: `pptxviewjs`, `pptx-viewer`. `pptx-preview` has good adoption and ES module support.

### 5.2 Component structure

```
RoomView.tsx (page)
├── RoomHeader (intro section)
│   ├── WelcomeVideo (optional embed)
│   ├── ExecutiveSummary (optional)
│   └── WelcomeMessage (existing)
├── MaterialsSection
│   ├── SectionGroup (per section, journey-ordered)
│   │   └── MaterialCard (P1: card layout)
│   │       ├── MaterialThumbnail (icon by file type)
│   │       ├── MaterialTitle
│   │       ├── ViewButton → opens ContentViewerModal
│   │       └── DownloadButton
│   └── ContentViewerModal (new)
│       ├── PdfViewer (react-pdf)
│       ├── PptxViewer (pptx-preview)
│       └── FallbackMessage (DOCX: "Download to view")
├── ActionPlanSection (P1: card layout)
│   └── ActionPlanItem (with Mark complete for customer)
└── MessagesSection (existing)
```

### 5.3 ContentViewerModal – design

**Props:** `materialId`, `materialName`, `fileFormat`, `token`, `onClose`

**Behavior:**
1. On open: `fetch(/api/deal-rooms/token/{token}/materials/{materialId}/view)` – triggers server-side view tracking
2. Get blob from response
3. Create object URL: `URL.createObjectURL(blob)`
4. Switch on `fileFormat`:
   - `pdf`: Render `<Document file={blobUrl}>` from react-pdf
   - `pptx`: Render pptx-preview viewer with blob
   - `docx`, other: Show message "Download to view" + Download button
5. On close: `URL.revokeObjectURL(blobUrl)`

**Error handling:** If fetch fails, show error message + Download button.

### 5.4 Video embed – URL parsing

Support:
- **Loom:** `https://www.loom.com/share/{id}` → iframe `https://www.loom.com/embed/{id}`
- **YouTube:** `https://www.youtube.com/watch?v={id}` → iframe `https://www.youtube.com/embed/{id}`
- **Vimeo:** `https://vimeo.com/{id}` → iframe `https://player.vimeo.com/video/{id}`
- **Direct:** If URL ends with .mp4 or common video extensions, use `<video src={url}>`

Create utility `parseVideoEmbedUrl(url: string): { type: 'youtube'|'vimeo'|'loom'|'direct', embedUrl: string }`.

### 5.5 Journey sections – frontend constant

```ts
export const JOURNEY_SECTIONS = [
  '1. Problem & Business Case',
  '2. Solution Walkthrough',
  '3. Validation',
  '4. Commercials & Legal',
  'All Materials',
] as const
```

When rendering `materials_by_section`, iterate `JOURNEY_SECTIONS` first, then remaining keys.

### 5.6 Persona-based grouping (P1)

API can return `materials_by_section` (current) and optionally `materials_by_persona`. For P1, we can:
- **Option A:** Group by section, then within section by persona (sub-headers "For IT", "For Finance")
- **Option B:** Add a toggle "View by journey" / "View by role" – switch grouping

**Recommendation:** Option A for P1 – persona as sub-group within section. Simpler. API already has `persona_name` on each material; frontend groups materials by `persona_name` within each section.

---

## 6. Implementation Order

| Step | Task | Deliverable |
|------|------|-------------|
| 1 | Migration 020 | `executive_summary`, `welcome_video_url` on deal_rooms |
| 2 | API: DealRoom schemas + CRUD | New fields in create/update/response |
| 3 | API: View endpoint | `GET .../materials/{id}/view` |
| 4 | API: Section ordering | Apply journey order in `get_room_by_token` |
| 5 | API: PATCH action plan | Status update for customer/sales |
| 6 | Frontend: Intro section | Executive summary + video embed |
| 7 | Frontend: Journey sections | Order sections in RoomView |
| 8 | Frontend: ContentViewerModal | PDF + PPTX viewer |
| 9 | Frontend: MaterialCard + View | Card layout, View button |
| 10 | Frontend: ActionPlan cards | Card layout, Mark complete |
| 11 | Frontend: Persona sub-groups | Optional persona grouping in sections |

---

## 7. Security Considerations

- **View endpoint:** Same as download – token in URL, no auth. Token is unguessable (32 bytes).
- **PATCH action plan:** Requires auth; customer must match `room.customer_email`.
- **Video URL:** Sanitize before embed; allow only known domains (youtube.com, vimeo.com, loom.com) or restrict to https.

---

## 8. Testing Checklist

- [ ] View endpoint returns PDF with correct Content-Type
- [ ] View endpoint records MaterialUsage with action=view
- [ ] View endpoint rejects invalid token / material not in room
- [ ] PATCH action plan: customer can update only when assignee=customer|both
- [ ] PATCH action plan: sales can update any item
- [ ] Executive summary and video display when set
- [ ] Section order follows journey constant
- [ ] ContentViewerModal opens PDF in browser
- [ ] ContentViewerModal opens PPTX (or shows download for unsupported)
- [ ] Mark complete updates status and reflects in UI

---

*This Architect document is ready for Deliver phase.*
