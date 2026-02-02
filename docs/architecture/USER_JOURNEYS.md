# User Journey Maps

**Document Version:** 1.0  
**Date:** February 2, 2026  
**Phase:** BMAD - MAP/ARCHITECT

---

## Overview

This document maps the key user journeys for the Sales Enablement Platform. Understanding these flows ensures we design the right experience for each user type.

---

## Journey 1: PMM Uploads New Sales Material

**Persona:** Sarah, Product Marketing Manager  
**Goal:** Upload a new sales deck for Public Cloud and make it available to Sales  
**Frequency:** 2-3 times per week

### Journey Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PMM UPLOADS NEW MATERIAL                                  │
└─────────────────────────────────────────────────────────────────────────────┘

     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
     │  LOGIN   │────▶│DASHBOARD │────▶│MATERIALS │────▶│  UPLOAD  │
     │          │     │          │     │          │     │  MODAL   │
     └──────────┘     └──────────┘     └──────────┘     └──────────┘
          │                │                │                │
          ▼                ▼                ▼                ▼
     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
     │Enter     │     │See quick │     │Click     │     │Drag file │
     │email &   │     │stats &   │     │"Upload   │     │or browse │
     │password  │     │recent    │     │File"     │     │to select │
     └──────────┘     │materials │     │button    │     └──────────┘
                      └──────────┘     └──────────┘          │
                                                             ▼
                                                        ┌──────────┐
                                                        │Fill form:│
                                                        │• Type    │
                                                        │• Audience│
                                                        │• Universe│
                                                        │• Product │
                                                        └──────────┘
                                                             │
     ┌──────────┐     ┌──────────┐     ┌──────────┐          │
     │  DONE!   │◀────│Material  │◀────│  Click   │◀─────────┘
     │Material  │     │appears   │     │ "Upload" │
     │available │     │in list   │     │  button  │
     └──────────┘     └──────────┘     └──────────┘
```

### Step-by-Step Details

| Step | Action | Screen | System Response | Pain Points to Avoid |
|------|--------|--------|-----------------|---------------------|
| 1 | Navigate to app | Login | Show login form | Fast load time |
| 2 | Enter credentials | Login | Validate, redirect to Dashboard | Clear error messages |
| 3 | View dashboard | Dashboard | Show stats, recent materials | Quick overview |
| 4 | Click "Materials" or "Upload" | Dashboard/Nav | Navigate to Materials | Obvious CTA |
| 5 | Click "Upload File" | Materials | Open upload modal | Easy to find button |
| 6 | Select/drag file | Upload Modal | Show file name, size | Support drag & drop |
| 7 | Fill metadata | Upload Modal | Pre-select defaults | Smart defaults |
| 8 | Click "Upload" | Upload Modal | Progress indicator | Show upload progress |
| 9 | Success | Materials | Close modal, show new material | Confirmation message |

### Emotions Throughout Journey

```
😐 Login      → 😊 Dashboard    → 🤔 Finding upload → 😌 Easy form → 🎉 Success!
(Neutral)      (Informed)        (Brief search)      (Quick fill)   (Accomplished)
```

### Success Metrics

- Time to complete: < 2 minutes
- Clicks to complete: ≤ 5 clicks
- Error rate: < 5%

---

## Journey 2: Sales Rep Finds Content for Customer Meeting

**Persona:** Marc, Sales Representative  
**Goal:** Find a customer-facing presentation about Public Cloud Compute for a CTO meeting  
**Frequency:** Daily  
**Time Pressure:** Often needs content within 30 minutes

### Journey Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                  SALES REP FINDS CONTENT                                     │
└─────────────────────────────────────────────────────────────────────────────┘

     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
     │  LOGIN   │────▶│DASHBOARD │────▶│DISCOVERY │────▶│  SEARCH  │
     │          │     │          │     │   or     │     │ "compute │
     └──────────┘     └──────────┘     │MATERIALS │     │  CTO"    │
                                       └──────────┘     └──────────┘
                                                             │
                                                             ▼
     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
     │  DONE!   │◀────│Download  │◀────│ Preview  │◀────│  Filter  │
     │Ready for │     │  file    │     │ material │     │• Universe│
     │meeting   │     │          │     │          │     │• Audience│
     └──────────┘     └──────────┘     └──────────┘     └──────────┘
```

### Alternative Path: Browse by Universe

```
     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
     │MATERIALS │────▶│  Click   │────▶│  Browse  │────▶│ Download │
     │          │     │ "Public  │     │ filtered │     │ selected │
     └──────────┘     │  Cloud"  │     │materials │     │ material │
                      └──────────┘     └──────────┘     └──────────┘
```

### Step-by-Step Details

| Step | Action | Screen | System Response | Pain Points to Avoid |
|------|--------|--------|-----------------|---------------------|
| 1 | Quick login | Login | Remember me option | Minimize friction |
| 2 | Go to Discovery | Dashboard/Nav | Show search box | Prominent search |
| 3 | Type search query | Discovery | Instant results | Fast search |
| 4 | Apply filters | Discovery | Filter results | Easy filter UI |
| 5 | Scan results | Discovery | Show relevant info | Clear cards |
| 6 | Click material | Results | Show details/preview | Quick preview |
| 7 | Download | Material | Start download | One-click download |

### Emotions Throughout Journey

```
😰 Need content! → 🔍 Searching → 😮 Found options → 📥 Downloading → 😊 Ready!
(Stressed)         (Hopeful)      (Relieved)         (Action)        (Confident)
```

### Success Metrics

- Time to find content: < 2 minutes
- Search success rate: > 85%
- Downloads per session: 1-3

---

## Journey 3: PMM Reviews Content Health

**Persona:** Sarah, Product Marketing Manager  
**Goal:** Identify outdated content that needs updating  
**Frequency:** Weekly

### Journey Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PMM REVIEWS CONTENT HEALTH                                │
└─────────────────────────────────────────────────────────────────────────────┘

     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
     │  LOGIN   │────▶│DASHBOARD │────▶│  HEALTH  │────▶│  Review  │
     │          │     │Check     │     │DASHBOARD │     │  metrics │
     └──────────┘     │health    │     │          │     │          │
                      │score     │     └──────────┘     └──────────┘
                      └──────────┘                           │
                                                             ▼
     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
     │ Repeat   │◀────│ Update   │◀────│  Edit    │◀────│ Identify │
     │ for all  │     │ status/  │     │material  │     │  stale   │
     │ stale    │     │ content  │     │          │     │ content  │
     └──────────┘     └──────────┘     └──────────┘     └──────────┘
```

### Key Health Indicators

| Indicator | Good | Warning | Critical |
|-----------|------|---------|----------|
| Published ratio | > 70% | 40-70% | < 40% |
| Content age | < 3 months | 3-6 months | > 6 months |
| Universe coverage | All 4 | 2-3 | < 2 |
| Draft backlog | < 10 | 10-20 | > 20 |

### Success Metrics

- Time to review: < 5 minutes
- Issues identified per session: 2-5
- Action taken rate: > 80%

---

## Journey 4: PMM Creates New Persona

**Persona:** Sarah, Product Marketing Manager  
**Goal:** Define a new buyer persona for targeting DevOps engineers  
**Frequency:** Monthly

### Journey Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PMM CREATES PERSONA                                       │
└─────────────────────────────────────────────────────────────────────────────┘

     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
     │ PERSONAS │────▶│  Click   │────▶│   Fill   │────▶│  SAVE    │
     │   page   │     │ "Create  │     │  persona │     │          │
     └──────────┘     │ Persona" │     │   form   │     └──────────┘
                      └──────────┘     └──────────┘          │
                                            │                │
                                            ▼                ▼
                                       ┌──────────┐     ┌──────────┐
                                       │• Name    │     │ Persona  │
                                       │• Role    │     │ card     │
                                       │• Goals   │     │ visible  │
                                       │• Pain    │     │ in list  │
                                       │  points  │     └──────────┘
                                       └──────────┘
```

### Form Fields Guide

| Field | Required | Purpose | Example |
|-------|----------|---------|---------|
| Name | Yes | Identify persona | "DevOps Engineer" |
| Role | No | Job title context | "Platform Engineer, SRE" |
| Description | No | Background | "Technical professional focused on..." |
| Goals | No | What they want | "Automate infrastructure, reduce downtime" |
| Challenges | No | Pain points | "Complex deployments, security concerns" |
| Preferred Content | No | Content mapping | "Technical docs, API references" |

---

## Journey 5: New User Onboarding

**Persona:** New PMM or Sales Rep  
**Goal:** Get started with the platform  
**Frequency:** One-time

### Journey Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    NEW USER ONBOARDING                                       │
└─────────────────────────────────────────────────────────────────────────────┘

     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
     │ Receive  │────▶│  Login   │────▶│ Welcome  │────▶│ Explore  │
     │ account  │     │ first    │     │ message  │     │dashboard │
     │ invite   │     │  time    │     │ + tips   │     │          │
     └──────────┘     └──────────┘     └──────────┘     └──────────┘
                                                             │
                                                             ▼
     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
     │  Active  │◀────│ Complete │◀────│  Try     │◀────│  View    │
     │  user!   │     │ first    │     │ search/  │     │ sample   │
     │          │     │ action   │     │ filter   │     │materials │
     └──────────┘     └──────────┘     └──────────┘     └──────────┘
```

### Onboarding Checklist (Future Feature)

- [ ] View Dashboard
- [ ] Browse Materials by Universe
- [ ] Use Discovery search
- [ ] Download first material
- [ ] (PMM only) Upload first material
- [ ] (PMM only) Create first persona

---

## Cross-Journey Insights

### Common Entry Points

```
                    ┌──────────────┐
                    │    LOGIN     │
                    └──────────────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │DASHBOARD │    │MATERIALS │    │DISCOVERY │
    │  (Most)  │    │ (Direct) │    │ (Quick)  │
    └──────────┘    └──────────┘    └──────────┘
```

### Navigation Patterns

| User Type | Primary Path | Secondary Path |
|-----------|--------------|----------------|
| PMM - Upload | Dashboard → Materials → Upload | Materials → Upload |
| PMM - Review | Dashboard → Health | Health (direct) |
| Sales - Find | Discovery → Search → Download | Materials → Filter → Download |
| Sales - Browse | Materials → Universe → Browse | Dashboard → Quick Action |

### Key UX Principles Derived

1. **Search is King** - Sales reps need fast, effective search
2. **Smart Defaults** - Pre-fill forms with likely values
3. **Visual Hierarchy** - Universe-based organization is intuitive
4. **Quick Actions** - Minimize clicks for common tasks
5. **Status Visibility** - Always show content health/status
6. **Feedback Loops** - Confirm actions, show progress

---

## Appendix: Journey Map Legend

```
┌──────────┐
│  Screen  │  = User interface screen
└──────────┘

────────▶     = User flow direction

     │
     ▼        = Decision or action point

😊 😰 🎉      = User emotion indicators
```

---

*These journey maps should be validated with real users during usability testing.*
