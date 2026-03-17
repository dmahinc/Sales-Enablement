# Digital Sales Room Improvements – MAP Phase

**Initiative:** DSR Customer Experience & UI (P0 + P1)  
**BMAD Phase:** MAP  
**Date:** 2026-03-15  
**Source:** [Brainstorming Session Cycle 2](../_bmad-output/brainstorming/brainstorming-session-2026-03-15-cycle2.md)

---

## BMAD Context

```
Brainstorm ✅ → MAP (this doc) → Architect → Deliver
```

This document translates the DSR brainstorm into user stories and acceptance criteria for P0 and P1. Ready for Architect (technical design) and Deliver (implementation).

---

## P0: Quick Wins

### US-DSR-1: In-browser content viewer

**As a** customer visiting a Digital Sales Room  
**I want to** view PDFs and presentations in the browser without downloading first  
**So that** I can quickly assess content relevance before deciding to download

**Acceptance criteria:**
- [ ] Customer can click a "View" or "Preview" action on any material in the room
- [ ] PDFs open in an in-browser viewer (e.g. full-page or modal viewer)
- [ ] PPTX files are viewable (via conversion to PDF for viewer, or native viewer if available)
- [ ] DOCX files are viewable (via conversion to PDF, or native viewer)
- [ ] Download button remains available alongside View
- [ ] Viewer works for anonymous users (token-based room access)
- [ ] Viewer is responsive (mobile-friendly)
- [ ] View action is tracked (MaterialUsage with action=view) for analytics

**Out of scope for P0:** Slide-level tracking, video playback in viewer (can link to download or external player for now)

---

### US-DSR-2: Stronger intro section

**As a** customer opening a Digital Sales Room  
**I want to** see a clear executive summary and optional welcome video at the top  
**So that** I understand the context and purpose of the room without digging through content

**Acceptance criteria:**
- [ ] Room supports an optional "Executive summary" field (in addition to existing `welcome_message`)
- [ ] Executive summary displays prominently below the header, before materials
- [ ] Executive summary can be a short paragraph (e.g. "What we heard from you" / "Why us")
- [ ] Room supports an optional "Welcome video URL" field (Loom, YouTube, Vimeo, or direct embed URL)
- [ ] When welcome video URL is set, an embedded video player appears above or beside the executive summary
- [ ] Video embed is responsive and works on mobile
- [ ] Sales/PMM can edit room and set both fields when creating or editing the room
- [ ] If neither field is set, the room behaves as today (welcome_message only)

**Backend:** Add `executive_summary` (Text) and `welcome_video_url` (String) to DealRoom model; migration; API updates

---

### US-DSR-3: Journey-based section structure

**As a** customer browsing a Digital Sales Room  
**I want to** see materials organized by buyer journey stage (Problem → Solution → Validation → Commercials)  
**So that** I can follow a logical narrative arc instead of a random file list

**Acceptance criteria:**
- [ ] Room creation/edit supports predefined section names (default journey stages)
- [ ] Default journey sections: "1. Problem & Business Case", "2. Solution Walkthrough", "3. Validation", "4. Commercials & Legal"
- [ ] Sales can add custom sections (e.g. "5. Implementation") – existing `section_name` flexibility preserved
- [ ] Materials are displayed in journey order: sections appear in the defined sequence
- [ ] Section order is configurable (display_order or explicit ordering)
- [ ] When assigning materials to a room, sales can pick from predefined sections or a custom section
- [ ] Room view displays sections in the correct order with clear section headers

**Implementation note:** Existing `section_name` on DealRoomMaterial can be used; add a "default sections" list in the UI/API for room creation. No schema change required if we use predefined strings.

---

## P1: High impact

### US-DSR-4: Persona-based content tracks

**As a** customer (e.g. IT, Finance, Legal) visiting a Digital Sales Room  
**I want to** see content organized by persona/role (e.g. "For IT", "For Finance")  
**So that** I can quickly find what matters to my role without scrolling through everything

**Acceptance criteria:**
- [ ] Room supports persona-based organization as an alternative or complement to journey-based sections
- [ ] Sales can assign materials to persona sections (e.g. "For IT", "For Finance", "For Legal") using existing Personas
- [ ] Room view can display materials grouped by persona (e.g. "For IT: Architecture, Security, Compliance")
- [ ] Persona sections can coexist with journey sections: e.g. "For IT" within "Solution Walkthrough"
- [ ] Sales can choose: journey-first, persona-first, or hybrid (personas within journey)
- [ ] Persona labels come from the Personas library (or a short list of common roles)
- [ ] If a material has no persona, it appears in "General" or the default section

**Implementation note:** DealRoomMaterial already has `persona_id`. We need to surface persona-based grouping in the room view and room creation UI. API may return `materials_by_section` and `materials_by_persona` or a combined structure.

---

### US-DSR-5: Visual refresh

**As a** customer visiting a Digital Sales Room  
**I want to** experience a polished, branded layout that feels curated rather than a file dump  
**So that** I trust the professionalism of the seller and stay engaged longer

**Acceptance criteria:**
- [ ] Materials displayed as cards (not plain list rows) with visual hierarchy
- [ ] Each material card shows: title, optional short description, optional thumbnail (or placeholder icon by file type)
- [ ] Typography: clear hierarchy (section titles, material titles, metadata), OVH design system fonts
- [ ] Spacing and layout: consistent padding, gaps, max-width for readability
- [ ] OVH branding: logo, colors (primary-600, etc.), consistent with platform
- [ ] File type icons or thumbnails: PDF, PPTX, DOCX have distinct visual treatment
- [ ] Mobile-responsive: cards stack properly, touch-friendly targets
- [ ] Action Plan: card-based layout (not plain list), better visual hierarchy
- [ ] Overall: "museum exhibit" feel – curated, not cluttered

**Out of scope for P1:** Actual PDF thumbnails (can use placeholder icons); complex animations

---

### US-DSR-6: Interactive Mutual Action Plan

**As a** customer in a Digital Sales Room  
**I want to** see a shared action plan where I can mark my assigned items complete  
**So that** both sides stay aligned and progress is visible without extra emails

**Acceptance criteria:**
- [ ] Action plan items can be assigned to "sales", "customer", or "both"
- [ ] When assigned to "customer", the customer view shows a "Mark complete" or checkbox for that item
- [ ] Customer can mark an item complete (authenticated only, or token-based for anonymous?)
- [ ] Completed items show a clear visual state (e.g. checkmark, strikethrough)
- [ ] Sales sees updated status in real time (or on refresh) when customer marks complete
- [ ] Optional: customer receives a reminder/notification for items assigned to them (P1.5 or P2)
- [ ] Backend: ActionPlanItem status update API; customer can PATCH status to "completed" for items assigned to them

**Implementation note:** Need to decide: can anonymous (token-only) users mark items complete? Or require login? Recommendation: require login for MAP updates to avoid abuse; show MAP as read-only for anonymous.

---

## Scope Summary

| ID | User Story | Priority | Effort (est.) |
|----|------------|----------|---------------|
| US-DSR-1 | In-browser content viewer | P0 | Medium |
| US-DSR-2 | Stronger intro section | P0 | Low |
| US-DSR-3 | Journey-based section structure | P0 | Low |
| US-DSR-4 | Persona-based content tracks | P1 | Medium |
| US-DSR-5 | Visual refresh | P1 | Medium |
| US-DSR-6 | Interactive MAP | P1 | Medium |

---

## Dependencies

| Story | Depends on |
|-------|------------|
| US-DSR-1 | None (can start immediately) |
| US-DSR-2 | Backend migration for new fields |
| US-DSR-3 | None (UI/API changes only) |
| US-DSR-4 | Personas API (exists) |
| US-DSR-5 | None |
| US-DSR-6 | Auth for customer (exists); API for status update |

---

## Implementation Order (Suggested)

1. **US-DSR-2** (Stronger intro) – Small schema change, quick win
2. **US-DSR-3** (Journey-based sections) – UI/API only, no schema
3. **US-DSR-1** (In-browser viewer) – Highest impact, more work
4. **US-DSR-5** (Visual refresh) – Can parallel frontend work
5. **US-DSR-4** (Persona tracks) – Builds on persona
6. **US-DSR-6** (Interactive MAP) – Requires backend + frontend

---

## Next Step: ARCHITECT

- Technical design for in-browser viewer (PDF/PPTX rendering approach)
- API changes for new DealRoom fields
- Component breakdown for RoomView
- Data model updates (if any)

---

*This MAP document is ready for Architect phase.*
