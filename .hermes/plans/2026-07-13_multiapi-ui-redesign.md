# MultiAPI UI Redesign Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Professional-quality UI redesign of MultiAPI frontend with consistent design system, missing pages, and production-ready polish.

**Architecture:** Keep Next.js App Router structure, add Tailwind CSS for consistent styling, create reusable component library, maintain RTL Persian layout.

**Tech Stack:** Next.js 14.2.35, React 18, Tailwind CSS 3, Vazirmatn font, SSE streaming

---

## Current State Analysis

### Pages that exist:
- `/` - Landing (marketing) ✅
- `/models` - Model catalog ✅ 
- `/pricing` - Pricing ✅
- `/docs` - Developer docs ✅
- `/app` - Chat interface ✅ (main app)
- `/app/payments` - Payment history ✅
- `/app/profile` - Profile ✅ (basic)
- `/app/notifications` - Notifications ✅
- `/app/referral` - Referral ✅
- `/usage` - Usage & billing ✅
- `/api-keys` - API key management ✅
- `/admin` - Admin overview ✅
- `/admin/models` - Model management ✅
- `/admin/users` - User management ✅
- `/admin/fx` - FX rates ✅
- `/admin/brakes` - Safety brakes ✅

### Issues found:
1. Duplicate navigation in DOM (layout renders twice)
2. Mixed styling: globals.css (2259 lines) + inline + style jsx
3. No responsive breakpoints
4. `user-scalable=no` accessibility issue
5. Next.js 14.2.5 has critical vulnerabilities
6. `axios` installed but unused
7. `recharts` installed but unused
8. No design system / component library
9. Missing Dashboard page
10. Empty alert element in DOM

### API endpoints (40 total):
- Auth: register, login, logout, me, profile, change-password
- Chat: POST /v1/chat/completions (SSE)
- Wallet: topup, balance, ledger
- Payment: create, callback, history
- Notifications: list, mark-read
- Referral: stats
- Admin: models, users, pnl, fx, brakes

---

## Phase 1: Foundation (Critical)

### Task 1.1: Upgrade Next.js to 14.2.35
- Update package.json
- Fix any breaking changes
- Run build to verify

### Task 1.2: Add Tailwind CSS
- Install tailwindcss, postcss, autoprefixer
- Create tailwind.config.js with design tokens
- Update globals.css to import Tailwind
- Keep existing CSS variables for backward compat

### Task 1.3: Remove unused dependencies
- Remove axios (unused)
- Keep recharts (will use in dashboard)

### Task 1.4: Create design tokens
- Define color palette in tailwind.config.js
- Define spacing, typography, shadows
- Dark theme by default

### Task 1.5: Fix viewport meta
- Remove user-scalable=no
- Add proper viewport meta

---

## Phase 2: Design System Components

### Task 2.1: Create base components
- `Button` - primary, secondary, ghost, danger variants
- `Card` - glass card with consistent styling
- `Input` - form input with label, error, helper
- `Badge` - status badges (pro, standard, mini)
- `Modal` - reusable modal dialog
- `Toast` - notification toast
- `Skeleton` - loading skeleton
- `DataTable` - sortable table with pagination

### Task 2.2: Create layout components
- `AppShell` - main app layout with sidebar
- `Sidebar` - navigation sidebar
- `TopBar` - app top bar
- `PageHeader` - consistent page headers
- `Container` - responsive container

### Task 2.3: Create chart components
- `BarChart` - for usage/analytics
- `LineChart` - for trends
- `MetricCard` - stat card with icon

---

## Phase 3: Fix Existing Issues

### Task 3.1: Fix duplicate navigation
- Investigate layout.tsx nesting
- Remove duplicate header/footer renders
- Verify single render per page

### Task 3.2: Fix CSS cleanup
- Remove unused CSS rules
- Consolidate inline styles to Tailwind
- Keep globals.css for custom animations only

### Task 3.3: Fix accessibility
- Remove user-scalable=no
- Add proper aria labels
- Ensure keyboard navigation
- Fix color contrast ratios

---

## Phase 4: New Pages

### Task 4.1: Dashboard page (`/dashboard`)
- Welcome message with user name
- Balance card with quick topup
- Usage chart (7-day)
- Recent conversations
- Quick actions (new chat, view models)
- API health status

### Task 4.2: Improve Chat interface (`/app`)
- Better model selector with search
- Conversation sidebar improvements
- Message actions (copy, regenerate, delete)
- Cost estimation display
- Streaming indicator
- Mobile-responsive layout

### Task 4.3: Improve Wallet page (`/usage` → `/wallet`)
- Balance card with animated counter
- Transaction history with filters
- Cost breakdown by model
- Quick topup button
- Export functionality

### Task 4.4: Improve Profile page (`/app/profile`)
- Avatar placeholder
- Account info cards
- Security settings
- API key management link
- Notification preferences

---

## Phase 5: Admin Panel Polish

### Task 5.1: Admin Dashboard improvements
- Better metric cards with trends
- Revenue chart
- User growth chart
- Model usage breakdown

### Task 5.2: Admin Models page
- Better table with inline editing
- Margin adjustment sliders
- Model health indicators

### Task 5.3: Admin Users page
- User detail modal
- Bulk actions
- Export functionality

---

## Phase 6: Polish & Optimization

### Task 6.1: Responsive design
- Mobile-first approach
- Breakpoints: sm(640), md(768), lg(1024), xl(1280)
- Sidebar collapse on mobile
- Touch-friendly interactions

### Task 6.2: Performance
- Image optimization
- Code splitting
- Lazy loading for heavy components
- Font optimization

### Task 6.3: Dark theme consistency
- Verify all colors use design tokens
- Ensure contrast ratios
- Test with different screen sizes

---

## Review Checkpoints

### Review 1 (After Phase 1-2):
- Design system completeness
- Component reusability
- RTL support
- Dark theme consistency
- Accessibility basics

### Review 2 (After Phase 3-4):
- All pages functional
- Navigation working
- API integration correct
- Responsive behavior
- Performance acceptable

### Review 3 (After Phase 5-6):
- Admin panel complete
- All features working
- No console errors
- Build successful
- Ready for production

---

## Definition of Done

The redesign is complete when:
1. All existing pages work correctly
2. New Dashboard page exists
3. Design system is consistent
4. Responsive on mobile/tablet/desktop
5. No console errors
6. Build successful
7. All API endpoints connected
8. RTL layout correct
9. Accessibility basics met
10. Performance acceptable
