# Brainstorming Session – BMAD Cycle 2

**Facilitator:** AI Assistant  
**Date:** 2026-03-15  
**Context:** New BMAD cycle – evolution of Product Enablement & Customer Engagement Platform

---

## Session Overview

**Topic:** Next evolution of the Product Enablement & Customer Engagement Platform  
**Cycle:** BMAD Cycle 2 (post-MVP, post-Deal Rooms, post-semantic search)  
**Goals:**
- **A. Current State Assessment** – What’s working, what’s not, what’s missing
- **B. Problem Identification** – New and unresolved pain points
- **C. Opportunity Mapping** – Gaps, Phase 2/3 items, quick wins
- **D. Direction Setting** – Priorities for the next evolution

---

## Phase 1: Current State Snapshot

### What Exists Today (as of March 2026)

| Area | Status | Notes |
|------|--------|-------|
| **Materials** | ✅ Complete | CRUD, batch upload, product hierarchy, universe/category/product |
| **Discovery** | ✅ Implemented | Keyword + semantic search (vector embeddings), filters |
| **Sharing** | ✅ Complete | Shareable links, customer tracking, engagement analytics |
| **Deal Rooms** | ✅ Implemented | Digital Sales Rooms, materials, action plans, room messaging |
| **Personas & Segments** | ✅ Complete | Personas, market segments |
| **Tracks** | ✅ Complete | Sales enablement learning paths |
| **Customer Engagement** | ✅ Complete | My Customers, Conversations, favorites, notifications |
| **AI Agent** | ⚠️ Partial | Natural language interface – known reliability issues |
| **Dashboards** | ✅ Complete | Role-based, Health, Completeness Matrix, Usage Analytics |
| **Product Hierarchy** | ✅ Complete | Universes, categories, products, icons |
| **Other** | ✅ Complete | Product Releases, Marketing Updates, Material Requests, dark mode |

### Known Issues (from docs)

1. **AI Agent** – Prompt overload, tool choice confusion, multi-turn drift, ID vs email mix-ups (see `AGENT_REVIEW_AND_RECOMMENDATIONS.md`)
2. **Product Brief drift** – Deal Rooms, semantic search, recommendations not documented
3. **Discovery** – Page exists but may not be prominently surfaced in nav
4. **Phase 2 backlog** – Content blocks, bulk ops, version history, completeness export, customer engagement analytics – mostly not done

---

## Phase 2: Problem Identification

*Capture problems, pain points, and friction. Add your own below.*

### A. User Experience / Adoption

| # | Problem | Severity | Who's affected |
|---|---------|----------|----------------|
| 1 | AI Agent unreliable for message-sending ("Dis à X que Y") | High | Sales |
| 2 | *[Add your problems here]* | | |

### B. Feature Gaps

| # | Gap | Impact |
|---|-----|--------|
| 1 | Content blocks / reusable components | PMM efficiency |
| 2 | Bulk operations (upload, edit, delete) | PMM efficiency |
| 3 | Version history for materials | Traceability |
| 4 | Completeness matrix export (CSV/Excel) | Director reporting |
| 5 | Customer engagement analytics dashboard | Sales/Director insights |
| 6 | *[Add your gaps here]* | |

### C. Technical / Operational

| # | Issue |
|---|-------|
| 1 | Embeddings regeneration when materials change |
| 2 | *[Add your issues here]* |

---

## Phase 3: Opportunity Brainstorm

*Ideas for the next evolution. No filtering yet.*

### Category: AI & Intelligence

- [ ] Fix AI Agent reliability (expand rule-based intents, simplify prompt, conversation memory)
- [ ] Stronger model for agent (Mistral-Large, Llama 70B)
- [ ] Intent routing before full AI (classify → route to dedicated flow)
- [ ] Two-phase tool selection (interpret → confirm → execute)
- [ ] Content recommendations (AI-suggested materials by context)
- [ ] Auto-tagging suggestions for materials
- [ ] *[Add ideas]* 

### Category: Deal Rooms & Sales

- [ ] Deal Room templates
- [ ] Deal Room analytics (engagement, time spent, materials viewed)
- [ ] Integration with CRM (Salesforce) for opportunity sync
- [ ] *[Add ideas]*

### Category: Materials & Content

- [ ] Content blocks (reusable slide/section components)
- [ ] Bulk operations
- [ ] Version history
- [ ] Content expiration alerts
- [ ] *[Add ideas]*

### Category: Discovery & Search

- [ ] Surface Discovery more prominently in nav
- [ ] Hybrid search (keyword + semantic) tuning
- [ ] Search by customer/opportunity context
- [ ] *[Add ideas]*

### Category: Analytics & Reporting

- [ ] Completeness matrix export (CSV/Excel)
- [ ] Customer engagement analytics dashboard
- [ ] Historical completeness tracking
- [ ] Win/loss integration (from original brainstorm)
- [ ] *[Add ideas]*

### Category: Integrations

- [ ] Slack/Teams integration
- [ ] CRM integration (Salesforce)
- [ ] *[Add ideas]*

### Category: Other

- [ ] *[Add ideas]*

---

## Phase 4: Quick Win Identification

*Low-effort, high-impact items for immediate action.*

| # | Quick Win | Effort | Impact |
|---|-----------|--------|--------|
| 1 | Expand AI Agent rule-based intents (message-sending patterns) | Low | High |
| 2 | Simplify AI Agent system prompt (5–7 core rules) | Low | Medium |
| 3 | Add Discovery to main nav (if not already) | Low | Medium |
| 4 | Replace "Done" fallback with contextual message | Low | Medium |
| 5 | *[Add quick wins]* | | |

---

## Phase 5: Theme Clustering (Draft)

*Themes to prioritize for MAP phase.*

1. **AI Agent Reliability** – Fix message-sending, tool selection, multi-turn context
2. **Documentation Sync** – Update Product Brief with Deal Rooms, semantic search, etc.
3. **Phase 2 Backlog** – Content blocks, bulk ops, version history, exports
4. **Deal Room Maturity** – Templates, analytics, CRM link
5. **Analytics & Reporting** – Completeness export, engagement dashboard

---

## Next Steps

- [ ] Review and add problems, gaps, ideas
- [ ] Prioritize themes for Cycle 2 scope
- [ ] Select quick wins for immediate implementation
- [ ] Proceed to MAP phase (update Product Brief, user stories)

---

## Focus Area: Digital Sales Room – Customer Experience & UI

**Reference:** Highspot (state-of-the-art) + industry best practices (Flowla, Bigtincan)

### Current RoomView (Customer-Facing) – What Exists

| Element | Current State |
|---------|---------------|
| **Layout** | Simple gradient background, max-w-4xl centered content |
| **Header** | OVH logo block, room name, company name, welcome message (text only) |
| **Materials** | Collapsible sections by `section_name`, FileText icon, material name, persona, Download button |
| **Action Plan** | List of items with status dot, title, description, due date, assignee |
| **Messaging** | Basic chat (requires login), scrollable message list, text input |
| **Content access** | Download-only (no in-browser viewing) |
| **Auth** | Anonymous can view room; must sign in to message |

### Highspot / Industry Best Practices – Target State

| Capability | Highspot / Best Practice | Our Gap |
|------------|-------------------------|---------|
| **Intro / Welcome** | 30–60 sec welcome video, executive summary ("What we heard from you"), humanized context | Text-only welcome; no video; no executive summary |
| **Content organization** | By buyer journey (Problem → Solution → Validation → Commercials), not by file type | By arbitrary section name; no journey structure |
| **Persona tracks** | Clear "For IT", "For Finance", "For Legal" lanes so stakeholders find relevant content | Persona shown per material but no persona-based sections |
| **In-browser viewing** | View PDFs, decks, videos in browser; no download required for first engagement | Download-only; no preview/viewer |
| **Slide Cast / presentation** | Lightweight in-browser presentation mode | N/A |
| **Interactive MAP** | Live Mutual Action Plan; assign actions to buyers; notifications; real-time updates | Static list; no buyer assignment; no notifications |
| **In-context collaboration** | Comments, annotations on documents; chat tied to content | Generic chat; no document-level comments |
| **Engagement signals** | Views, time spent, shares; real-time analytics for sellers | Access count; downloads tracked; no time-on-page, no share tracking |
| **Content security** | Email auth, allow lists for sensitive content | Token-based; no gating by stakeholder |
| **Visual design** | Polished, branded, "museum exhibit" feel; not a file dump | Functional but basic; feels like a document list |
| **Progressive content** | Curated, drip-fed; avoid overwhelming | All materials shown at once |
| **Post-sale continuity** | "What to expect in first 30 days"; CS intro video | N/A |

### Recommended Improvement Priorities (DSR Customer UX)

**P0 – Quick wins**
1. **In-browser content viewer** – View PDFs/decks in browser before download (major UX leap)
2. **Stronger intro section** – Executive summary block, optional video placeholder/embed
3. **Journey-based section structure** – Default sections: Problem & Business Case → Solution → Validation → Commercials

**P1 – High impact**
4. **Persona-based content tracks** – "For IT", "For Finance" etc. as primary organization
5. **Visual refresh** – Card-based layout, thumbnails, cleaner typography, OVH branding
6. **Interactive MAP** – Assign actions to buyer; mark complete; optional notifications

**P2 – Differentiators**
7. **Welcome video** – Loom/embed support for 30–60 sec intro
8. **In-document comments** – Annotations on specific materials (complex)
9. **Engagement analytics** – Time spent, slide-level views (backend + UI)

---

## Focus Area: Sales Plays & AI-Powered Content Creation

**Reference:** Highspot (sales plays, AutoDocs, AI agents, always-on coaching)

**Vision:** Equip reps with knowledge, training, and content to proactively drive the sales process forward—powered by best-in-class AI including automation, co-creation, and always-on coaching.

### Material Evolution (Tomorrow)

| Material Type | Description | Platform Role |
|---------------|-------------|---------------|
| **Off-the-shelf** | Hand-made presentations (PDF, PPTX) uploaded by PMMs | Store, organize, recommend |
| **Platform-generated** | Presentations created from markdown content by the platform | Create, personalize, regenerate |

### Sales Plays Concept (Highspot-Style)

**Sales plays** = repeatable, contextual packages of content, guidance, and training that surface at the right moment (deal stage, persona, industry) so reps know what to **know**, **say**, and **show**.

| Capability | Highspot Reference | Our Target |
|------------|---------------------|------------|
| **Know** | Methodology, objection handling, talk tracks | Structured knowledge per play |
| **Say** | Scripts, messaging, best practices from top performers | AI-assisted scripts, call recordings |
| **Show** | Right content at right time | Content recommendations by context |
| **Training** | Embedded learning in plays | Tracks, role play, readiness |
| **Scorecards** | Play adoption, content effectiveness, revenue impact | Visibility into execution |

### AI Pillars

| Pillar | Description | Examples |
|--------|-------------|----------|
| **AI-assisted automation** | Templates, form-fill, data integration; generate docs from structured input | Markdown → presentation; CRM data → personalized deck |
| **Co-creation** | AI drafts, reps refine; collaborative content building | AI suggests slides; rep edits; platform regenerates |
| **Always-on coaching** | AI analyzes calls, training, performance; delivers feedback; role play | Skill assessments; next-best-action; practice scenarios |

### Content Creation Pipeline (Markdown → Presentation)

```
Markdown source (PMM-authored or AI-generated)
    → Template engine (OVH design system, slide layouts)
    → Data binding (CRM, product hierarchy, customer context)
    → Generated presentation (PDF/PPTX)
    → Regenerate on demand when data/messaging updates
```

**Key requirements:**
- Marketing-approved templates (brand governance)
- Personalization by persona, industry, product, deal stage
- Regeneration when source data or messaging changes
- No manual formatting—platform enforces consistency

### AI Agents (Deal & Content)

| Agent Type | Role |
|------------|------|
| **Deal Agent** | Flags stalled deals; recommends next-best plays; suggests content; guides next steps |
| **Content Specialist** | Retires outdated versions; flags gaps; recommends creation |
| **Learning Specialist** | Connects play adoption to skill growth; surfaces training |
| **Custom Agents** | Product launches, regional campaigns, initiative-specific automation |

### Always-On Coaching

| Feature | Description |
|---------|-------------|
| **Skill assessments** | 360° from managers, reps, buyer feedback, performance data |
| **AI Role Play** | Practice scenarios (industry, persona, objections); instant feedback |
| **Real-world signals** | Connect meeting/call signals to skill framework; surface coaching opportunities |
| **Deal guidance** | Next steps, content recommendations, risk flags in flow of work |

### Current Platform Gaps

| Gap | Current State | Target |
|-----|---------------|--------|
| **Content creation** | Upload only; no platform generation | Markdown → presentation; templates; regeneration |
| **Sales plays** | Tracks exist but no play structure (know/say/show) | Structured plays with context-aware surfacing |
| **AI automation** | Agent does search/share; no content generation | AutoDocs-style generation; co-creation |
| **Coaching** | None | Role play; skill feedback; deal guidance |
| **CRM integration** | None | Deal stage, persona, industry → play/content recommendations |
| **Scorecards** | Usage analytics; no play-level execution visibility | Play adoption; content effectiveness; revenue correlation |

### Recommended Priorities (Sales Plays & AI)

**P0 – Foundation**
1. **Markdown → presentation pipeline** – Define schema, templates, generation flow
2. **Sales play structure** – Know/Say/Show model; link to materials and tracks
3. **Template library** – Marketing-approved slide layouts; OVH design system

**P1 – AI & Automation**
4. **AI co-creation** – Draft slides from markdown; suggest content; rep refinement loop
5. **Context-aware recommendations** – Persona, product, deal stage → play + content
6. **Deal Agent (light)** – Next-best-action; content suggestions in agent

**P2 – Coaching & Scale**
7. **AI Role Play** – Practice scenarios with feedback (complex)
8. **Play scorecards** – Adoption, effectiveness, execution visibility
9. **CRM integration** – Salesforce/Dynamics for deal context

---

*Session in progress. Add your input in the sections above.*
