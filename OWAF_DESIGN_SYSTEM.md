# OWAF Design System

Complete design system used in the OWAF Admin UI. Use this as a reference for building consistent, modern React admin interfaces.

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS 3.4+
- **State Management**: TanStack Query + Zustand
- **Routing**: React Router v6
- **Charts**: Recharts
- **UI Primitives**: Radix UI
- **Icons**: Lucide React
- **Authentication**: Keycloak

## Color System

### OVHcloud Brand Colors

```javascript
ovh: {
  blue: {
    DEFAULT: '#000e9c',
    50: '#e6e8ff',
    100: '#c2c6ff',
    200: '#9aa1ff',
    300: '#717bff',
    400: '#525eff',
    500: '#3341ff',
    600: '#1a28e6',
    700: '#0011cc',
    800: '#000e9c',
    900: '#000a6b',
  },
  lightBlue: {
    DEFAULT: '#59c4ea',
    50: '#e8f7fc',
    100: '#c8ecf8',
    200: '#a5e0f4',
    300: '#82d4ef',
    400: '#6dcbec',
    500: '#59c4ea',
    600: '#4fb3d8',
    700: '#429fc1',
    800: '#368baa',
    900: '#236a84',
  },
  navy: '#000033',
  dark: '#1a1a2e',
}
```

### Semantic Colors (Dark Mode)

```css
:root {
  --background: 222 47% 6%;        /* Dark background */
  --foreground: 210 40% 98%;       /* Light text */
  --card: 222 47% 8%;              /* Card background */
  --card-foreground: 210 40% 98%;  /* Card text */
  --primary: 236 100% 31%;         /* OVH Blue (#000e9c) */
  --primary-foreground: 210 40% 98%;
  --secondary: 195 80% 63%;        /* OVH Light Blue (#59c4ea) */
  --secondary-foreground: 222 47% 6%;
  --muted: 217 33% 17%;            /* Muted gray */
  --muted-foreground: 215 20% 65%; /* Muted text */
  --border: 217 33% 17%;
  --input: 217 33% 17%;
  --ring: 236 100% 31%;            /* Focus ring */
  --radius: 0.5rem;                /* Border radius */
}
```

### Status Colors

```javascript
success: {
  DEFAULT: '#10b981',  // Green
  foreground: '#ffffff',
}
warning: {
  DEFAULT: '#f59e0b',  // Amber
  foreground: '#ffffff',
}
danger: {
  DEFAULT: '#ef4444',  // Red
  foreground: '#ffffff',
}
```

### Category-Specific Colors

```javascript
const categoryColors = {
  sqli: '#ef4444',      // Red
  xss: '#f97316',       // Orange
  rce: '#dc2626',       // Dark red
  lfi: '#eab308',       // Yellow
  rfi: '#a855f7',       // Purple
  protocol: '#3b82f6',  // Blue
  scanner: '#6366f1',   // Indigo
  dos: '#ec4899',       // Pink
}
```

## Typography

### Fonts

```javascript
fontFamily: {
  sans: ['Inter', 'system-ui', 'sans-serif'],
  mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
}
```

### Base Sizes

```css
html {
  font-size: 14px; /* Reduced from default 16px for compact UI */
}

body {
  @apply bg-background text-foreground text-sm;
}

h1 { @apply text-2xl font-bold; }
h2 { @apply text-xl font-semibold; }
h3 { @apply text-lg font-medium; }
```

## Core Components

### Card

Modern card component with optional hover effects:

```tsx
<Card hover className="...">
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

**Styles**:
- Base: `rounded-xl border border-border bg-card p-6`
- Hover: `transition-all duration-200 hover:shadow-lg hover:border-primary/30`

### Badge

Semantic status badges with color variants:

```tsx
<Badge variant="success">Online</Badge>
<Badge variant="warning">Degraded</Badge>
<Badge variant="danger">Blocked</Badge>
<Badge variant="primary">HAProxy</Badge>
<Badge variant="secondary">Direct</Badge>
<Badge variant="default">Info</Badge>
```

**Styles**:
- Base: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium`
- Success: `bg-success/20 text-success`
- Warning: `bg-warning/20 text-warning`
- Danger: `bg-danger/20 text-danger`

### Button

Multi-variant button with loading states:

```tsx
<Button variant="primary" size="lg" loading={isLoading} icon={<Icon />}>
  Submit
</Button>
```

**Variants**:
- `default`: Gray muted background
- `primary`: OVH blue with shadow
- `secondary`: OVH light blue
- `danger`: Red for destructive actions
- `ghost`: Transparent with hover
- `outline`: Border only

**Sizes**: `sm`, `md`, `lg`

### Status Indicators

Animated status dots:

```tsx
<span className="status-dot healthy" />
<span className="status-dot warning" />
<span className="status-dot error" />
```

CSS classes:
- `.status-dot`: `w-2 h-2 rounded-full inline-block mr-2`
- `.status-dot.healthy`: `bg-success animate-pulse`
- `.status-dot.warning`: `bg-warning`
- `.status-dot.error`: `bg-danger animate-pulse`

### Data Tables

Responsive tables with hover effects:

```tsx
<table className="data-table">
  <thead>
    <tr>
      <th>Column 1</th>
      <th>Column 2</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Data 1</td>
      <td>Data 2</td>
    </tr>
  </tbody>
</table>
```

**Styles**:
- Table: `w-full text-sm`
- Headers: `text-left font-medium text-muted-foreground p-3 border-b border-border`
- Cells: `p-3 border-b border-border/50`
- Hover: `tr:hover td { @apply bg-muted/30; }`

## Animations

### Fade In

```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fadeIn 0.3s ease-out forwards;
}
```

### Staggered Animations

```css
.stagger-1 { animation-delay: 0.1s; }
.stagger-2 { animation-delay: 0.2s; }
.stagger-3 { animation-delay: 0.3s; }
.stagger-4 { animation-delay: 0.4s; }
```

### Pulse (Slow)

```javascript
keyframes: {
  "pulse-slow": {
    "0%, 100%": { opacity: 1 },
    "50%": { opacity: 0.5 },
  },
}
animation: {
  "pulse-slow": "pulse-slow 2s ease-in-out infinite",
}
```

### Glow Effects

```css
.glow-success {
  box-shadow: 0 0 20px rgba(16, 185, 129, 0.3);
}

.glow-danger {
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.3);
}

.glow-primary {
  box-shadow: 0 0 20px rgba(0, 14, 156, 0.3);
}
```

## Custom Scrollbar

```css
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  @apply bg-muted/30;
}

::-webkit-scrollbar-thumb {
  @apply bg-muted rounded-full;
}

::-webkit-scrollbar-thumb:hover {
  @apply bg-muted-foreground/50;
}
```

## Utility Functions

### Class Name Merger

```typescript
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### Number Formatting

```typescript
export function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}
```

### Bytes Formatting

```typescript
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
```

### Latency Formatting

```typescript
export function formatLatency(ms: number): string {
  if (ms < 1) return (ms * 1000).toFixed(0) + 'μs'
  return ms.toFixed(1) + 'ms'
}
```

### Status Color Mapping

```typescript
export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'healthy':
    case 'allowed':
    case 'pass':
    case 'active':
      return 'success'
    case 'warning':
    case 'degraded':
      return 'warning'
    case 'blocked':
    case 'error':
    case 'critical':
    case 'inactive':
      return 'danger'
    default:
      return 'muted'
  }
}
```

## Layout Patterns

### Dashboard Grid

```tsx
<div className="space-y-6">
  {/* Stats Cards Row */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <StatsCard />
    <StatsCard />
    <StatsCard />
    <StatsCard />
  </div>

  {/* Charts Row */}
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <Card>Chart 1</Card>
    <Card>Chart 2</Card>
  </div>

  {/* Full Width Section */}
  <Card>
    <DataTable />
  </Card>
</div>
```

### Sidebar Layout

```tsx
<div className="flex h-screen bg-background">
  {/* Sidebar */}
  <aside className="w-64 border-r border-border bg-card">
    <Sidebar />
  </aside>

  {/* Main Content */}
  <main className="flex-1 overflow-auto">
    <Header />
    <div className="p-6">
      {children}
    </div>
  </main>
</div>
```

## Design Principles

### 1. **Dark-First Design**
- Primary theme is dark mode
- Light text on dark backgrounds
- Muted colors with accent highlights

### 2. **OVHcloud Branding**
- Primary color: OVH Blue (#000e9c)
- Secondary color: OVH Light Blue (#59c4ea)
- Professional, enterprise-grade aesthetic

### 3. **Information Density**
- Compact base font size (14px)
- Dense data tables
- Efficient use of space
- Real-time metrics emphasized

### 4. **Visual Hierarchy**
- Card-based layout
- Clear section separation
- Progressive disclosure (expandable rows)
- Status indicators with color coding

### 5. **Performance Indicators**
- Real-time metrics with 2-5s polling
- Progress bars for resource usage
- Animated status indicators (pulse)
- Visual thresholds (green/yellow/red)

### 6. **Responsive Design**
- Mobile-first approach
- Grid layouts with breakpoints: `sm`, `md`, `lg`, `xl`
- Collapsible sidebars
- Adaptive table overflow

### 7. **Accessibility**
- Semantic HTML elements
- ARIA labels where needed
- Keyboard navigation support
- Focus rings with `ring` color

## UI Patterns

### Progress Bars

```tsx
function ProgressBar({ value, max, color }: Props) {
  const percent = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
      <div
        className={`h-full transition-all duration-300 ${color}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}

// Usage with dynamic colors
const color = cpu > 80 ? 'bg-danger' : cpu > 50 ? 'bg-warning' : 'bg-success'
```

### Stat Cards with Change Indicators

```tsx
<Card>
  <div className="flex items-center justify-between">
    <div>
      <p className="text-muted-foreground text-xs">Total Requests</p>
      <p className="text-2xl font-bold">{formatNumber(value)}</p>
    </div>
    <Icon className="w-8 h-8 text-primary" />
  </div>
  {change !== undefined && (
    <div className="mt-2 flex items-center gap-1 text-xs">
      {change > 0 ? (
        <><TrendingUp className="w-3 h-3 text-success" />
        <span className="text-success">+{change.toFixed(1)}%</span></>
      ) : (
        <><TrendingDown className="w-3 h-3 text-danger" />
        <span className="text-danger">{change.toFixed(1)}%</span></>
      )}
    </div>
  )}
</Card>
```

### Empty States

```tsx
<EmptyState
  icon={ShieldAlert}
  title="No Security Events"
  description="Recent security events will appear here once instances start blocking requests."
/>
```

### Loading States

```tsx
<div className="flex items-center justify-center py-8">
  <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
</div>
```

### Modal Dialogs

```tsx
{showModal && (
  <Modal
    isOpen={showModal}
    onClose={() => setShowModal(false)}
    title="Modal Title"
  >
    {/* Modal content */}
  </Modal>
)}
```

## Best Practices

### Component Structure

```tsx
import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { api } from '@/lib/api'
import { Icon } from 'lucide-react'

interface ComponentProps {
  /** Description of prop */
  propName: string
  /** Optional prop with default */
  optional?: boolean
}

export function Component({ propName, optional = false }: ComponentProps) {
  const [data, setData] = useState<DataType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="w-5 h-5" />
          Component Title
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Content */}
      </CardContent>
    </Card>
  )
}
```

### Real-Time Data with Polling

```tsx
const [pollingInterval, setPollingInterval] = useState(5000)
const [isPaused, setIsPaused] = useState(false)
const intervalRef = useRef<NodeJS.Timeout | null>(null)

const fetchData = useCallback(async () => {
  try {
    const data = await api.getData()
    setData(data)
    setError(null)
  } catch (err) {
    setError(err.message)
  } finally {
    setIsLoading(false)
  }
}, [])

useEffect(() => {
  fetchData() // Initial fetch
}, [fetchData])

useEffect(() => {
  if (isPaused) {
    if (intervalRef.current) clearInterval(intervalRef.current)
    return
  }
  intervalRef.current = setInterval(fetchData, pollingInterval)
  return () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
  }
}, [fetchData, pollingInterval, isPaused])
```

### Error Handling

```tsx
{error && (
  <div className="text-sm text-danger bg-danger/10 rounded p-2 mb-4">
    {error}
  </div>
)}
```

### Expandable Table Rows

```tsx
const [expandedId, setExpandedId] = useState<string | null>(null)

<tbody>
  {items.map((item) => (
    <>
      <tr
        key={item.id}
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
      >
        <td>Basic info</td>
      </tr>
      {expandedId === item.id && (
        <tr key={`${item.id}-expanded`}>
          <td colSpan={9} className="bg-muted/30 p-4">
            {/* Expanded details */}
          </td>
        </tr>
      )}
    </>
  ))}
</tbody>
```

## Icons

Use Lucide React for consistent iconography:

```typescript
import {
  Activity,      // Activity/metrics
  Shield,        // Security
  ShieldAlert,   // Security events
  Server,        // Instances
  Users,         // Tenants
  Zap,           // Performance
  Cpu,           // CPU metrics
  MemoryStick,   // Memory metrics
  Clock,         // Time/latency
  TrendingUp,    // Positive change
  TrendingDown,  // Negative change
  RefreshCw,     // Refresh/reload
  Settings,      // Settings
  AlertTriangle, // Warnings
  CheckCircle,   // Success
  XCircle,       // Error
  Wifi,          // Online
  WifiOff,       // Offline
} from 'lucide-react'
```

**Icon Sizing**:
- Small: `w-3 h-3` (table icons)
- Medium: `w-4 h-4` or `w-5 h-5` (buttons, headers)
- Large: `w-6 h-6` to `w-8 h-8` (stat cards)
- XLarge: `w-12 h-12` (empty states)

## Responsive Breakpoints

```javascript
sm: '640px',   // Small tablets
md: '768px',   // Tablets
lg: '1024px',  // Desktops
xl: '1280px',  // Large desktops
```

## CSS Utilities

### Spacing

Standard Tailwind spacing scale (4px base):
- `p-3`: 12px padding
- `p-4`: 16px padding
- `p-6`: 24px padding
- `gap-2`: 8px gap
- `gap-4`: 16px gap
- `gap-6`: 24px gap

### Borders

- Border radius: `rounded-lg` (8px), `rounded-xl` (12px), `rounded-full`
- Border width: `border` (1px)
- Border colors: `border-border` (default), `border-primary`, `border-danger`

### Shadows

- Small: `shadow` (default)
- Medium: `shadow-md`
- Large: `shadow-lg`
- XLarge: `shadow-xl`
- Custom: `shadow-primary/20` (colored shadows)

## Usage Example: Complete Dashboard Component

```tsx
import { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { api } from '@/lib/api'
import { Activity, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react'
import { formatNumber } from '@/lib/utils'

export function Dashboard() {
  const [stats, setStats] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    try {
      const data = await api.getDashboardStats()
      setStats(data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 5000)
    return () => clearInterval(interval)
  }, [fetchStats])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs">Total Requests</p>
              <p className="text-2xl font-bold">{formatNumber(stats.total)}</p>
            </div>
            <Activity className="w-8 h-8 text-primary" />
          </div>
          {stats.change > 0 && (
            <div className="mt-2 flex items-center gap-1 text-xs">
              <TrendingUp className="w-3 h-3 text-success" />
              <span className="text-success">+{stats.change.toFixed(1)}%</span>
            </div>
          )}
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Events</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Status</th>
                <th>Category</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id}>
                  <td>{formatDate(row.timestamp)}</td>
                  <td>
                    <Badge variant={getStatusColor(row.status)}>
                      {row.status}
                    </Badge>
                  </td>
                  <td className="font-mono">{row.category}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
```

## Quick Setup for New Project

### 1. Install Dependencies

```bash
npm install react react-dom react-router-dom
npm install @tanstack/react-query zustand
npm install tailwindcss postcss autoprefixer
npm install tailwind-merge clsx class-variance-authority
npm install lucide-react recharts
npm install -D @types/react @types/react-dom typescript
npx tailwindcss init -p
```

### 2. Copy Configuration Files

- `tailwind.config.js` (colors, fonts, animations)
- `src/index.css` (global styles, scrollbar, animations)
- `src/lib/utils.ts` (utility functions)

### 3. Copy UI Components

- `src/components/ui/Card.tsx`
- `src/components/ui/Badge.tsx`
- `src/components/ui/Button.tsx`
- `src/components/ui/Modal.tsx`

### 4. Apply Design Patterns

- Use semantic color variables (`--primary`, `--success`, etc.)
- Follow spacing consistency (multiples of 4px)
- Apply hover states with `transition-all duration-200`
- Use `cn()` utility for conditional classes
- Implement real-time updates with polling
- Add loading and error states to all data fetches

## Performance Optimizations

### 1. Conditional Polling

```tsx
// Pause polling when tab is not visible
useEffect(() => {
  const handleVisibilityChange = () => {
    setIsPaused(document.hidden)
  }
  document.addEventListener('visibilitychange', handleVisibilityChange)
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
}, [])
```

### 2. Memoized Components

```tsx
const MemoizedChart = memo(ChartComponent)
```

### 3. Debounced Inputs

```tsx
const debouncedSearch = useMemo(
  () => debounce((value: string) => setSearchTerm(value), 300),
  []
)
```

## Summary

This design system prioritizes:
- **Professional aesthetics** with OVHcloud branding
- **Information density** for operations/monitoring UIs
- **Real-time updates** with configurable polling
- **Visual feedback** (colors, animations, progress bars)
- **Consistency** through reusable components and utilities
- **Developer experience** with TypeScript and composable patterns

Perfect for building enterprise-grade admin dashboards, monitoring tools, and control planes.
