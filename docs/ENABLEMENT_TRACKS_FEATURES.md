# Enablement Tracks – Highspot-Inspired Feature Ideas

This document outlines features that could enhance the Enablement Tracks experience, inspired by Highspot's learning path UI and capabilities.

## Already Implemented (Highspot-Inspired UI)

- **Breadcrumbs** – Back, Home, use case, tags (GTM Training, Learning Path, Updated X ago)
- **Manage Learning Path** – Link for directors/PMMs to edit the track (navigates to Tracks with edit modal)
- **Overview** – Material count, certificate upon completion
- **Progress bar** – Prominent completion percentage at top
- **Certification section** – Earned / Not Yet Earned with certificate card
- **Course cards** – Thumbnails, Passed / Mark complete, lesson count
- **Learning Path Contact** – Shows track creator

---

## Suggested Features to Implement

### 1. Quizzes & Assessments

- **Per-material quizzes** – Short knowledge checks after each material (e.g., 3–5 questions)
- **Final assessment** – End-of-track exam that must be passed to earn the certificate
- **Score tracking** – Store quiz scores and show pass/fail (e.g., 80% threshold)
- **Retake policy** – Allow retakes with optional cooldown

### 2. Lesson Structure

- **Lesson count** – Treat each material as a “lesson” or support multi-lesson materials
- **Lesson duration** – Optional estimated time (e.g., “15 min”) for videos or long docs
- **Sequential unlock** – Require completing material N before unlocking N+1 (optional)

### 3. Video Practice & Role Play

- **Video practice** – Record pitch or demo, submit for review
- **Role-play scenarios** – Structured practice with feedback
- **Peer review** – Optional peer scoring or comments

### 4. Sales Methodology Integration

- **Methodology tags** – Link materials to methodologies (e.g., Challenger, MEDDIC)
- **Methodology views** – Filter tracks by methodology
- **Methodology progress** – Track completion across methodology-specific content

### 5. Dynamic Content & Personalization

- **Role-based paths** – Different tracks for AE, SDR, SE, CSM
- **Use-case paths** – Paths by use case (e.g., Cloud PBX, Security)
- **Dynamic course assembly** – Build paths from tagged materials based on role/use case

### 6. Analytics & Reporting

- **Completion rates** – Per track and per material
- **Time to complete** – Average time to finish a track
- **Leaderboards** – Optional gamification (e.g., top completers)
- **Manager dashboards** – Team completion and certification status

### 7. Certificate Enhancements

- **Certificate PDF** – Generate and download a certificate on completion
- **Certificate expiry** – Optional recertification (e.g., annual)
- **Badges** – Visual badges for completed tracks or certifications

### 8. Content Types

- **Video lessons** – Inline video with progress tracking
- **Interactive slides** – Click-through decks with checkpoints
- **SCORM/xAPI** – Import external e-learning content
- **Links to external LMS** – Deep links to Highspot, Lessonly, etc.

### 9. Notifications & Reminders

- **Due dates** – Optional deadlines for track completion
- **Reminder emails** – Nudge for incomplete tracks
- **Completion notifications** – Notify manager when rep earns certificate

### 10. Search & Discovery

- **Search within tracks** – Find materials by keyword
- **Recommended tracks** – Suggest tracks based on role, gaps, or history
- **Related content** – “People who completed this also completed…”

---

## Implementation Priority (Suggested)

| Priority | Feature | Effort | Impact |
|----------|---------|--------|--------|
| 1 | Quizzes & Assessments | Medium | High |
| 2 | Certificate PDF | Low | Medium |
| 3 | Lesson duration | Low | Low |
| 4 | Sequential unlock | Low | Medium |
| 5 | Analytics & Reporting | Medium | High |
| 6 | Video practice | High | High |
| 7 | Role-based paths | Medium | Medium |
| 8 | Notifications | Medium | Medium |

---

## Technical Considerations

- **Storage** – Quiz results, assessments, and certificates need new tables or extensions
- **Auth** – Ensure completion and scoring are tied to authenticated users
- **APIs** – Consider REST endpoints for quiz submission, scoring, and certificate generation
- **Frontend** – Quiz UI, assessment flow, and certificate viewer components
