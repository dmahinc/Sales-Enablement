# BMAD Design Phase – UI/UX Before Implementation

**Purpose:** Insert a Design phase between MAP and Architect to align UI/UX with user stories before coding.

---

## When to Use a Design Phase

- **Visual refresh** (e.g. US-DSR-5)
- **New customer-facing flows** (e.g. Digital Sales Rooms)
- **High-impact UI changes** where design decisions matter
- **Need for design review** before implementation

---

## BMAD with Design Phase

```
Brainstorm → MAP → DESIGN → Architect → Deliver
```

| Phase | Output |
|-------|--------|
| **Brainstorm** | Ideas, problems, quick wins |
| **MAP** | User stories, acceptance criteria |
| **Design** | Wireframes, mockups, design system notes |
| **Architect** | Technical design, API specs |
| **Deliver** | Implementation |

---

## Design Phase Deliverables

1. **Wireframes** – Layout and structure for main screens
2. **Mockups** – Visual design (colors, typography, spacing)
3. **Design system notes** – Components, tokens, patterns
4. **Responsive behavior** – Mobile/tablet/desktop
5. **Accessibility notes** – Contrast, focus, labels

---

## Working with a UI Designer

### Before Design
- Share MAP user stories and acceptance criteria
- Provide reference examples (e.g. Highspot, competitors)
- Clarify constraints (tech stack, existing components)

### During Design
- Review wireframes for flow and hierarchy
- Review mockups for branding and consistency
- Align on responsive and accessibility requirements

### After Design
- Use design as input to Architect (component breakdown)
- Implement against approved mockups
- Use design tokens in code (colors, spacing)

---

## Design Phase Checklist

- [ ] User stories from MAP shared with designer
- [ ] Reference examples and inspiration documented
- [ ] Wireframes reviewed and approved
- [ ] Mockups reviewed and approved
- [ ] Design tokens documented for implementation
- [ ] Responsive breakpoints defined
- [ ] Accessibility requirements captured

---

## Example: DSR Visual Refresh

**MAP output:** US-DSR-5 – “museum exhibit” feel, card-based layout, OVH branding

**Design phase output:**
- Wireframe: Header → Hero (video + summary) → Materials (sections + cards) → Action plan → Messages → Footer
- Mockup: Highspot-inspired palette (navy #003b6b, teal #21dadb, light blue #e4f1fb)
- Components: Material card, section header, action plan item
- Responsive: Stack on mobile, 2-column grid on desktop

**Architect input:** Component breakdown, Tailwind classes, design tokens

---

*Add this phase when UI quality and designer involvement are important.*
