# Component Library

**Document Version:** 1.0  
**Date:** February 2, 2026  
**Phase:** BMAD - ARCHITECT  
**Design System:** OVHcloud Design Tokens

---

## 1. Design System Foundation

### 1.1 Color Palette

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        OVHcloud Color System                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  PRIMARY                          ACCENT                                 │
│  ┌──────────┐ ┌──────────┐       ┌──────────┐                          │
│  │ #0050d7  │ │ #00185e  │       │ #bef1ff  │                          │
│  │ Primary  │ │ Dark     │       │ Cyan     │                          │
│  └──────────┘ └──────────┘       └──────────┘                          │
│                                                                          │
│  SECONDARY                        GRAYS                                  │
│  ┌──────────┐                    ┌──────────┐ ┌──────────┐             │
│  │ #4d5693  │                    │ #dcdcdc  │ │ #cccccc  │             │
│  │ Purple   │                    │ Border   │ │ Muted    │             │
│  └──────────┘                    └──────────┘ └──────────┘             │
│                                                                          │
│  SEMANTIC                                                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                  │
│  │ #10b981  │ │ #f59e0b  │ │ #ef4444  │ │ #6366f1  │                  │
│  │ Success  │ │ Warning  │ │ Error    │ │ Info     │                  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 CSS Variables

```css
:root {
  /* Primary Colors */
  --ovh-primary: #0050d7;
  --ovh-primary-dark: #00185e;
  --ovh-primary-light: #007bff;
  
  /* Secondary */
  --ovh-secondary: #4d5693;
  --ovh-accent: #bef1ff;
  
  /* Neutrals */
  --ovh-white: #ffffff;
  --ovh-black: #000000;
  --ovh-gray-100: #f8fafc;
  --ovh-gray-200: #e2e8f0;
  --ovh-gray-300: #dcdcdc;
  --ovh-gray-400: #cccccc;
  --ovh-gray-500: #4d5693;
  
  /* Borders & Shadows */
  --ovh-border: #dcdcdc;
  --ovh-shadow: 0 2px 8px rgba(0, 24, 94, 0.08);
  --ovh-radius: 8px;
}
```

### 1.3 Typography

| Style | Font | Size | Weight | Line Height | Usage |
|-------|------|------|--------|-------------|-------|
| **Heading 1** | Source Sans Pro | 2rem (32px) | 600 | 1.2 | Page titles |
| **Heading 2** | Source Sans Pro | 1.5rem (24px) | 600 | 1.3 | Section titles |
| **Heading 3** | Source Sans Pro | 1.25rem (20px) | 600 | 1.4 | Card titles |
| **Body** | Source Sans Pro | 1rem (16px) | 400 | 1.5 | Paragraphs |
| **Body Small** | Source Sans Pro | 0.875rem (14px) | 400 | 1.5 | Secondary text |
| **Caption** | Source Sans Pro | 0.75rem (12px) | 400 | 1.4 | Labels, hints |
| **Button** | Source Sans Pro | 0.875rem (14px) | 500 | 1 | Button labels |

### 1.4 Spacing Scale

```
┌─────────────────────────────────────────────────────────────┐
│  Spacing Scale (Tailwind units)                              │
├─────┬────────┬───────────────────────────────────────────────┤
│ 1   │ 4px    │ ▌                                             │
│ 2   │ 8px    │ █                                             │
│ 3   │ 12px   │ █▌                                            │
│ 4   │ 16px   │ ██                                            │
│ 5   │ 20px   │ ██▌                                           │
│ 6   │ 24px   │ ███                                           │
│ 8   │ 32px   │ ████                                          │
│ 10  │ 40px   │ █████                                         │
│ 12  │ 48px   │ ██████                                        │
│ 16  │ 64px   │ ████████                                      │
└─────┴────────┴───────────────────────────────────────────────┘
```

---

## 2. Core Components

### 2.1 Buttons

#### Primary Button

```tsx
// Usage
<button className="btn-ovh-primary">
  <Icon className="w-4 h-4 mr-2" />
  Button Text
</button>
```

```css
.btn-ovh-primary {
  @apply inline-flex items-center justify-center;
  @apply px-4 py-2;
  @apply text-sm font-medium text-white;
  @apply rounded-md;
  @apply transition-all duration-200;
  background-color: var(--ovh-primary);
  border: 2px solid var(--ovh-primary);
}

.btn-ovh-primary:hover {
  background-color: var(--ovh-primary-dark);
  border-color: var(--ovh-primary-dark);
}

.btn-ovh-primary:focus {
  @apply outline-none ring-2 ring-offset-2;
  ring-color: var(--ovh-primary);
}

.btn-ovh-primary:disabled {
  @apply opacity-50 cursor-not-allowed;
}
```

**Variants:**

| Variant | Class | Usage |
|---------|-------|-------|
| Primary | `btn-ovh-primary` | Main actions |
| Secondary | `btn-ovh-secondary` | Alternative actions |
| Danger | `btn-ovh-danger` | Destructive actions |
| Ghost | `btn-ovh-ghost` | Subtle actions |

#### Secondary Button

```tsx
<button className="btn-ovh-secondary">
  Cancel
</button>
```

```css
.btn-ovh-secondary {
  @apply inline-flex items-center justify-center;
  @apply px-4 py-2;
  @apply text-sm font-medium;
  @apply rounded-md;
  @apply transition-all duration-200;
  background-color: var(--ovh-white);
  color: var(--ovh-primary);
  border: 2px solid var(--ovh-primary);
}

.btn-ovh-secondary:hover {
  background-color: var(--ovh-accent);
}
```

#### Button Sizes

| Size | Padding | Font Size | Icon Size |
|------|---------|-----------|-----------|
| Small | `px-3 py-1.5` | 12px | 14px |
| Medium (default) | `px-4 py-2` | 14px | 16px |
| Large | `px-6 py-3` | 16px | 20px |

---

### 2.2 Cards

#### Standard Card

```tsx
<div className="card-ovh">
  <div className="p-6">
    <h3 className="text-lg font-semibold text-primary-700">Card Title</h3>
    <p className="mt-2 text-slate-500">Card content goes here.</p>
  </div>
</div>
```

```css
.card-ovh {
  @apply bg-white rounded-lg;
  box-shadow: var(--ovh-shadow);
  border: 1px solid var(--ovh-border);
}
```

#### Card with Header

```tsx
<div className="card-ovh">
  <div className="px-6 py-4 border-b border-slate-200">
    <h2 className="text-lg font-semibold text-primary-700">Section Title</h2>
  </div>
  <div className="p-6">
    {/* Content */}
  </div>
</div>
```

#### Card with Actions

```tsx
<div className="card-ovh overflow-hidden">
  {/* Card Content */}
  <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex justify-end space-x-2">
    <button className="btn-ovh-ghost">Edit</button>
    <button className="btn-ovh-danger">Delete</button>
  </div>
</div>
```

#### Stat Card

```tsx
<div className="card-ovh p-6">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-slate-500">Total Materials</p>
      <p className="mt-2 text-3xl font-semibold text-primary-700">42</p>
    </div>
    <div className="bg-primary-50 p-3 rounded-xl">
      <FileText className="h-6 w-6 text-primary-500" />
    </div>
  </div>
</div>
```

---

### 2.3 Form Inputs

#### Text Input

```tsx
<div>
  <label className="block text-sm font-medium text-slate-700 mb-2">
    Label
  </label>
  <input
    type="text"
    className="input-ovh"
    placeholder="Placeholder text"
  />
</div>
```

```css
.input-ovh {
  @apply w-full px-3 py-2;
  @apply text-sm;
  @apply rounded-md;
  @apply transition-all duration-200;
  border: 1px solid var(--ovh-border);
  color: var(--ovh-primary-dark);
}

.input-ovh:focus {
  @apply outline-none ring-2;
  border-color: var(--ovh-primary);
  ring-color: rgba(0, 80, 215, 0.2);
}

.input-ovh::placeholder {
  color: var(--ovh-gray-400);
}
```

#### Select

```tsx
<select className="input-ovh">
  <option value="">Select an option</option>
  <option value="1">Option 1</option>
  <option value="2">Option 2</option>
</select>
```

#### Textarea

```tsx
<textarea
  className="input-ovh"
  rows={4}
  placeholder="Enter description..."
/>
```

#### Input with Icon

```tsx
<div className="relative">
  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
  <input
    type="text"
    className="input-ovh pl-10"
    placeholder="Search..."
  />
</div>
```

#### Input States

| State | Border Color | Background | Ring |
|-------|--------------|------------|------|
| Default | `#dcdcdc` | `#ffffff` | None |
| Focus | `#0050d7` | `#ffffff` | `rgba(0,80,215,0.2)` |
| Error | `#ef4444` | `#fef2f2` | `rgba(239,68,68,0.2)` |
| Disabled | `#e2e8f0` | `#f8fafc` | None |

---

### 2.4 Badges

```tsx
// Variants
<span className="badge-ovh badge-ovh-primary">Primary</span>
<span className="badge-ovh badge-ovh-success">Published</span>
<span className="badge-ovh badge-ovh-warning">Review</span>
<span className="badge-ovh badge-ovh-gray">Draft</span>
```

```css
.badge-ovh {
  @apply inline-flex items-center;
  @apply px-2 py-0.5;
  @apply text-xs font-medium;
  @apply rounded-full;
}

.badge-ovh-primary {
  background-color: var(--ovh-accent);
  color: var(--ovh-primary);
}

.badge-ovh-success {
  @apply bg-green-100 text-green-800;
}

.badge-ovh-warning {
  @apply bg-yellow-100 text-yellow-800;
}

.badge-ovh-gray {
  @apply bg-gray-100 text-gray-600;
}
```

| Badge | Background | Text | Usage |
|-------|------------|------|-------|
| Primary | `#bef1ff` | `#0050d7` | Default, tags |
| Success | `#dcfce7` | `#166534` | Published status |
| Warning | `#fef3c7` | `#92400e` | Review status |
| Gray | `#f3f4f6` | `#4b5563` | Draft status |

---

### 2.5 Modal

```tsx
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Modal Title"
  size="lg"
>
  {/* Modal content */}
</Modal>
```

#### Modal Sizes

| Size | Max Width | Usage |
|------|-----------|-------|
| `sm` | 24rem (384px) | Confirmations |
| `md` | 28rem (448px) | Simple forms |
| `lg` | 42rem (672px) | Complex forms |
| `xl` | 56rem (896px) | Data tables |

#### Modal Structure

```
┌─────────────────────────────────────────────────┐
│  ┌───────────────────────────────────────────┐  │
│  │  Modal Title                          [X] │  │ ← Header
│  ├───────────────────────────────────────────┤  │
│  │                                           │  │
│  │  Modal content goes here                  │  │ ← Content
│  │                                           │  │
│  │                                           │  │
│  ├───────────────────────────────────────────┤  │
│  │                     [Cancel] [Confirm]    │  │ ← Footer (optional)
│  └───────────────────────────────────────────┘  │
│                     Backdrop                     │
└─────────────────────────────────────────────────┘
```

---

### 2.6 Navigation

#### Top Navigation

```tsx
<nav className="nav-ovh sticky top-0 z-50">
  <div className="max-w-7xl mx-auto px-4">
    <div className="flex justify-between h-16">
      {/* Logo */}
      {/* Nav Items */}
      {/* User Menu */}
    </div>
  </div>
</nav>
```

```css
.nav-ovh {
  @apply bg-white;
  box-shadow: var(--ovh-shadow);
  border-bottom: 1px solid var(--ovh-border);
}

.nav-link-ovh {
  @apply px-3 py-2 text-sm font-medium;
  @apply transition-colors duration-200;
  color: var(--ovh-secondary);
}

.nav-link-ovh:hover {
  color: var(--ovh-primary);
}

.nav-link-ovh.active {
  color: var(--ovh-primary);
  border-bottom: 2px solid var(--ovh-primary);
}
```

#### Sidebar Navigation

```tsx
<div className="w-64 sidebar-ovh">
  <nav className="p-4 space-y-1">
    <button className="sidebar-item-ovh active">
      <FolderIcon className="mr-3" />
      All Materials
      <span className="badge">42</span>
    </button>
    <button className="sidebar-item-ovh">
      <CloudIcon className="mr-3" />
      Public Cloud
      <span className="badge">15</span>
    </button>
  </nav>
</div>
```

```css
.sidebar-ovh {
  @apply bg-white;
  border-right: 1px solid var(--ovh-border);
}

.sidebar-item-ovh {
  @apply w-full flex items-center justify-between;
  @apply px-4 py-3;
  @apply text-sm font-medium;
  @apply rounded-lg;
  @apply transition-all duration-200;
  color: var(--ovh-secondary);
}

.sidebar-item-ovh:hover {
  background-color: var(--ovh-accent);
  color: var(--ovh-primary);
}

.sidebar-item-ovh.active {
  background-color: var(--ovh-accent);
  color: var(--ovh-primary);
  border-left: 3px solid var(--ovh-primary);
}
```

---

### 2.7 Tables

```tsx
<table className="table-ovh">
  <thead>
    <tr>
      <th>Name</th>
      <th>Type</th>
      <th>Status</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Material Name</td>
      <td>Sales Deck</td>
      <td><span className="badge-ovh-success">Published</span></td>
      <td>{/* Actions */}</td>
    </tr>
  </tbody>
</table>
```

```css
.table-ovh {
  @apply w-full;
}

.table-ovh th {
  @apply px-4 py-3;
  @apply text-left text-xs font-semibold uppercase tracking-wider;
  background-color: var(--ovh-gray-100);
  color: var(--ovh-secondary);
  border-bottom: 1px solid var(--ovh-border);
}

.table-ovh td {
  @apply px-4 py-4;
  border-bottom: 1px solid var(--ovh-border);
  color: var(--ovh-primary-dark);
}

.table-ovh tr:hover td {
  background-color: var(--ovh-gray-100);
}
```

---

## 3. Composite Components

### 3.1 Material Card

```tsx
<div className="card-ovh p-4 hover:shadow-md transition-all">
  <div className="flex items-center justify-between">
    <div className="flex items-center flex-1 min-w-0">
      <div className="bg-primary-50 p-2 rounded-lg mr-4">
        <FileText className="h-5 w-5 text-primary-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">
          {material.name}
        </p>
        <p className="text-xs text-slate-500 mt-1">
          {material.material_type} • {material.universe_name}
        </p>
      </div>
    </div>
    <div className="flex items-center space-x-4 ml-4">
      <span className="badge-ovh badge-ovh-success">{material.status}</span>
      <div className="flex items-center space-x-1">
        <button className="icon-button">
          <Download className="h-4 w-4" />
        </button>
        <button className="icon-button">
          <Edit className="h-4 w-4" />
        </button>
        <button className="icon-button danger">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
</div>
```

### 3.2 Persona Card

```tsx
<div className="card-ovh overflow-hidden">
  {/* Gradient Header */}
  <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-4">
    <div className="flex items-center space-x-3">
      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
        <Users className="h-6 w-6 text-white" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-white">{persona.name}</h3>
        <p className="text-sm text-primary-100">{persona.role}</p>
      </div>
    </div>
  </div>
  
  {/* Content */}
  <div className="p-4">
    <p className="text-sm text-slate-600">{persona.description}</p>
  </div>
  
  {/* Actions */}
  <div className="px-4 py-3 bg-slate-50 border-t flex justify-end space-x-2">
    <button className="icon-button"><Edit /></button>
    <button className="icon-button danger"><Trash2 /></button>
  </div>
</div>
```

### 3.3 File Upload Zone

```tsx
<div
  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
    dragActive 
      ? 'border-primary-500 bg-primary-50' 
      : 'border-slate-200 hover:border-primary-300'
  }`}
  onDragEnter={handleDrag}
  onDragLeave={handleDrag}
  onDragOver={handleDrag}
  onDrop={handleDrop}
>
  <Upload className="mx-auto h-12 w-12 text-slate-400" />
  <p className="mt-2 text-sm text-slate-600">
    <span className="text-primary-500 font-medium">Click to upload</span>
    {' '}or drag and drop
  </p>
  <p className="text-xs text-slate-400">PDF, PPTX, DOCX up to 50MB</p>
</div>
```

### 3.4 Search Box

```tsx
<div className="relative">
  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
  <input
    type="text"
    placeholder="Search materials, personas, segments..."
    className="w-full pl-12 pr-4 py-4 text-lg border border-slate-200 rounded-xl
               focus:outline-none focus:ring-2 focus:ring-primary-500"
  />
  {searchQuery && (
    <button className="absolute right-4 top-1/2 transform -translate-y-1/2">
      <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
    </button>
  )}
</div>
```

---

## 4. Utility Classes

### 4.1 Icon Button

```css
.icon-button {
  @apply p-2 rounded-lg;
  @apply text-slate-400;
  @apply transition-all;
}

.icon-button:hover {
  @apply text-primary-500 bg-primary-50;
}

.icon-button.danger:hover {
  @apply text-red-500 bg-red-50;
}
```

### 4.2 Loading Spinner

```tsx
<div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent" />
```

### 4.3 Empty State

```tsx
<div className="text-center py-12">
  <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
    <FileText className="h-8 w-8 text-slate-400" />
  </div>
  <h3 className="text-lg font-medium text-slate-900">No materials found</h3>
  <p className="mt-2 text-sm text-slate-500">Get started by uploading your first material.</p>
  <button className="btn-ovh-primary mt-6">
    <Plus className="w-4 h-4 mr-2" />
    Add Material
  </button>
</div>
```

---

## 5. Animation Guidelines

### 5.1 Transitions

| Property | Duration | Easing | Usage |
|----------|----------|--------|-------|
| Color | 200ms | ease | Hover states |
| Transform | 200ms | ease-out | Hover transforms |
| Opacity | 150ms | ease | Fade in/out |
| Box-shadow | 200ms | ease | Card elevation |

### 5.2 Hover Effects

```css
/* Card hover elevation */
.card-ovh:hover {
  @apply shadow-md;
  transform: translateY(-2px);
}

/* Button hover */
.btn-ovh-primary:hover {
  transform: translateY(-1px);
}

/* Icon slide */
.group:hover .icon-slide {
  transform: translateX(4px);
}
```

### 5.3 Loading States

```tsx
// Button loading
<button className="btn-ovh-primary" disabled>
  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
  Loading...
</button>

// Skeleton loading
<div className="animate-pulse">
  <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
  <div className="h-4 bg-slate-200 rounded w-1/2" />
</div>
```

---

## 6. Responsive Breakpoints

| Breakpoint | Width | Usage |
|------------|-------|-------|
| `sm` | 640px | Mobile landscape |
| `md` | 768px | Tablet |
| `lg` | 1024px | Desktop |
| `xl` | 1280px | Large desktop |
| `2xl` | 1536px | Extra large |

### Responsive Patterns

```tsx
// Stack to row
<div className="flex flex-col sm:flex-row">
  {/* Items stack on mobile, row on desktop */}
</div>

// Hide/show
<div className="hidden md:block">
  {/* Hidden on mobile */}
</div>

// Grid columns
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* 1 col mobile, 2 tablet, 3 desktop */}
</div>
```

---

## 7. Accessibility Guidelines

### 7.1 Color Contrast

| Element | Foreground | Background | Ratio |
|---------|------------|------------|-------|
| Body text | `#00185e` | `#ffffff` | 12.6:1 ✓ |
| Primary button | `#ffffff` | `#0050d7` | 6.8:1 ✓ |
| Secondary text | `#4d5693` | `#ffffff` | 7.2:1 ✓ |
| Links | `#0050d7` | `#ffffff` | 6.8:1 ✓ |

### 7.2 Focus States

All interactive elements must have visible focus indicators:

```css
*:focus-visible {
  @apply outline-none ring-2 ring-offset-2 ring-primary-500;
}
```

### 7.3 ARIA Labels

```tsx
// Icon buttons need labels
<button aria-label="Edit material" className="icon-button">
  <Edit className="h-4 w-4" />
</button>

// Screen reader only text
<span className="sr-only">Close modal</span>
```

---

## 8. Component Checklist

Use this checklist when creating new components:

- [ ] Follows OVHcloud color palette
- [ ] Uses Source Sans Pro font
- [ ] Has proper hover/focus states
- [ ] Includes loading state
- [ ] Has empty state
- [ ] Is responsive
- [ ] Has proper ARIA labels
- [ ] Follows spacing scale
- [ ] Uses design tokens (CSS variables)
- [ ] Documented with examples

---

*This Component Library should be kept in sync with the actual implementation.*
