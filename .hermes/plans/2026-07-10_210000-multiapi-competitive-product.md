# MultiAPI Frontend: Competitive Product Plan

> **Status:** Analysis and planning only. No product code is changed by this document.
> **Audience:** Product, design, engineering, and decision-makers.

## 1. Product goal

Turn MultiAPI from a functional Persian AI chat dashboard into a trustworthy, visually distinctive, responsive AI workspace and API platform that can convert first-time visitors, retain active users, and clearly communicate its local advantages.

### Proposed positioning

**MultiAPI: دسترسی حرفه‌ای و شفاف به چندین مدل هوش مصنوعی، با پرداخت ریالی، کنترل هزینه، و تجربه فارسی‌محور.**

The competitive advantage should not be “we also have a chat box.” It should be:

- Native Persian RTL UX and Persian-first copy.
- IRR wallet, transparent usage, and predictable prepaid spending.
- One account and one API key across multiple models.
- Model comparison and routing without requiring users to manage several provider accounts.
- Safety controls: spend caps, balance holds, model brakes, and understandable billing.
- Developer-ready OpenAI-compatible API alongside a polished no-code chat product.

## 2. Current product assessment

### Existing strengths

- `frontend/app/page.tsx` already provides a working authenticated chat shell.
- `frontend/app/components/ChatStream.tsx` supports Markdown, GFM, code highlighting, copying, and streaming output.
- `frontend/app/components/ModelSidebar.tsx` gives model search, tiers, and active-state presentation.
- `frontend/app/components/WalletDisplay.tsx` exposes balance and daily usage.
- `frontend/app/components/SettingsPanel.tsx` exposes account, appearance, and memory controls.
- `frontend/app/admin/page.tsx` contains the beginnings of an operational admin console.
- `frontend/app/globals.css` has a coherent dark visual language, responsive sidebar behavior, RTL layout, and reusable design tokens.
- The production build currently succeeds with `npm run build`.

### Critical weaknesses before public launch

1. The root route is an app-only authenticated surface; there is no persuasive public landing page, pricing narrative, documentation, or conversion path.
2. Authentication stores a bearer token in `localStorage`; this is vulnerable to token theft through XSS and should be replaced or supplemented with secure cookies and rotation.
3. Streaming state is fragile: a stream error can leave an empty assistant message, and there is no AbortController/cancel action, retry, or structured error state.
4. The app currently advertises a “beta” footer and uses generic emoji branding; that weakens decision-maker confidence.
5. There is no product-wide design system with documented spacing, typography, semantic colors, focus states, and component variants.
6. Admin uses a large client component, inline styles, `alert`, and loosely typed API responses; it is operationally useful but not presentation-grade.
7. The UI does not yet provide model detail, pricing before send, token/cost estimates, usage history, billing history, or a developer/API onboarding journey.
8. Loading, empty, offline, expired-session, and permission states are inconsistent.
9. Accessibility is incomplete: interactive model rows are `div` elements, icon-only buttons need better labels, keyboard focus is not systematically styled, and reduced-motion behavior is absent.
10. No browser-level visual regression, accessibility, or mobile smoke tests exist.

## 3. Competitive benchmark

Benchmark against product patterns, not copied branding:

| Product pattern | What users expect | MultiAPI response |
|---|---|---|
| ChatGPT / Claude | Fast first-run, polished empty state, conversation history, reliable streaming, clear model selection | Add public onboarding, chat history, cancel/retry, model detail, and stable streaming UX |
| Perplexity | Strong task framing, source-oriented answers, clear value proposition | Add task presets and optional source/citation presentation where upstream supports it |
| OpenRouter | Developer trust, model catalog, pricing transparency, API documentation | Add model catalog, input/output price display, copyable API examples, compatibility docs |
| Poe | Simple multi-model discovery and accessible consumer UX | Add model cards, capability tags, recommended model flows, and easy switching |
| Vercel AI SDK-style products | Excellent responsive composition and developer ergonomics | Add responsive primitives, skeletons, error recovery, and streaming protocol tests |
| Linear / Raycast | High-quality visual hierarchy, command-driven workflows, keyboard-first behavior | Add command palette, shortcuts, consistent components, and restrained visual polish |
| Stripe Dashboard | Trustworthy finance UX and clear operational states | Apply to wallet, receipts, ledger, top-ups, spend limits, and audit history |

### Differentiation matrix

| Capability | Generic chat competitor | Generic API gateway | MultiAPI target |
|---|---:|---:|---:|
| Persian-first RTL | Low | Low | **Core advantage** |
| IRR wallet and local payment | Low | Low | **Core advantage** |
| Multi-model access | Medium | High | High |
| Spend controls | Medium | Medium | **High and understandable** |
| OpenAI-compatible API | Low | High | High |
| Human-quality public website | High | Medium | **Must reach high** |
| Model price transparency | Medium | High | **Must reach high** |
| Admin financial safety | Low | Medium | High |

## 4. Target information architecture

### Public website

- `/` — value proposition, product demo, trust signals, CTA.
- `/models` — searchable model catalog, capabilities, pricing, availability.
- `/pricing` — plans, prepaid explanation, example costs, FAQ.
- `/developers` — API quickstart, compatibility, code samples, limits.
- `/docs` — authentication, chat completions, streaming, errors, billing.
- `/security` — data handling, token safety, retention, operational controls.
- `/about` — product/company credibility and contact path.
- `/login` and `/register` — dedicated auth routes.

### Authenticated app

- `/app` — chat workspace.
- `/app/history` — conversation history and search.
- `/app/usage` — usage, costs, token trends, export.
- `/app/billing` — balance, top-up, payment status, ledger, receipts.
- `/app/settings` — account, API keys, preferences, memory, privacy.
- `/admin` — separate protected operational console.

### Admin separation

The user-facing app and admin console must share primitives and API clients but not navigation, layout, permissions, or visual information architecture. Admin should feel like an operations system; the public app should feel like a product.

## 5. Multi-step implementation plan

### Phase 0 — Product contract and baseline

**Objective:** Freeze the product story and collect measurable baseline data before redesign.

- Define primary segments: consumer chat user, developer, team/decision-maker.
- Select primary CTA: “شروع رایگان” for users and “ساخت API Key” for developers.
- Define north-star metrics: registration completion, first successful response, D1 return, top-up conversion, API key creation, error rate, median time-to-first-token.
- Capture baseline screenshots at desktop/tablet/mobile and record current build/runtime status.
- Produce a content glossary for Persian terminology: model, token, هزینه، موجودی، اعتبار، کلید API، استریم.

**Acceptance:** Approved positioning, glossary, route map, and metrics document.

### Phase 1 — Design system and visual direction

**Files:**
- `frontend/app/globals.css`
- Create `frontend/app/design/tokens.ts`
- Create `frontend/app/components/ui/Button.tsx`
- Create `frontend/app/components/ui/Input.tsx`
- Create `frontend/app/components/ui/Card.tsx`
- Create `frontend/app/components/ui/Badge.tsx`
- Create `frontend/app/components/ui/Modal.tsx`
- Create `frontend/app/components/ui/Toast.tsx`
- Create `frontend/app/components/ui/Skeleton.tsx`

- Establish typography scale, spacing scale, radii, shadows, semantic colors, z-index layers, and focus ring.
- Define light/dark themes but ship dark as default only after contrast validation.
- Replace emoji-only identity with a proper MultiAPI mark, wordmark, and icon set.
- Add responsive breakpoints and `prefers-reduced-motion` rules.
- Add consistent button states: default, hover, active, loading, disabled, danger.
- Add accessible icon-button contracts with required `aria-label`.

**Acceptance:** Every shared component has keyboard focus, disabled/loading states, RTL-safe spacing, and Storybook-like local showcase page or documented usage.

### Phase 2 — Public conversion website

**Files:**
- Modify `frontend/app/page.tsx` or move authenticated app to `frontend/app/app/page.tsx`.
- Create `frontend/app/(marketing)/page.tsx`.
- Create `frontend/app/(marketing)/models/page.tsx`.
- Create `frontend/app/(marketing)/pricing/page.tsx`.
- Create `frontend/app/(marketing)/developers/page.tsx`.
- Create `frontend/app/(marketing)/security/page.tsx`.
- Create `frontend/app/components/marketing/Hero.tsx`.
- Create `frontend/app/components/marketing/ModelShowcase.tsx`.
- Create `frontend/app/components/marketing/CostCalculator.tsx`.
- Create `frontend/app/components/marketing/TrustBar.tsx`.
- Create `frontend/app/components/marketing/FAQ.tsx`.
- Create `frontend/app/components/marketing/SiteHeader.tsx`.
- Create `frontend/app/components/marketing/SiteFooter.tsx`.

- Hero must answer: what it is, who it is for, why it is different, and what to do next.
- Show real model categories and transparent sample pricing without making unsupported claims.
- Add a small interactive cost calculator using backend catalog data or a clearly marked illustrative mode.
- Add product screenshots or a guided live demo with no authentication requirement.
- Add developer CTA and API code snippet.
- Add trust copy around prepaid billing, spend caps, and data handling.
- Add metadata, Open Graph, canonical URLs, sitemap, and robots policy.

**Acceptance:** A first-time visitor can understand the product in 10 seconds, compare value in 30 seconds, and reach registration/API docs in one click.

### Phase 3 — Auth and account security

**Files:**
- `backend/app/routers/auth.py`
- `backend/app/auth.py`
- `frontend/app/components/AuthPanel.tsx`
- Create `frontend/app/(auth)/login/page.tsx`
- Create `frontend/app/(auth)/register/page.tsx`
- Create `frontend/lib/auth.ts`

- Move session handling from raw `localStorage` bearer tokens to secure, HttpOnly, SameSite cookies where architecture permits.
- Keep API keys separate from browser sessions; show them once, hash at rest, allow rotation/revocation.
- Add password policy and clear Persian validation messages.
- Add expired-session handling, logout-all-sessions, and unauthorized redirect.
- Add rate-limit messaging and avoid leaking whether an email exists.

**Acceptance:** XSS cannot directly read the primary browser session; token rotation/revocation is tested; auth flows work on mobile and keyboard-only navigation.

### Phase 4 — Chat workspace redesign

**Files:**
- `frontend/app/page.tsx` or new `frontend/app/app/page.tsx`
- `frontend/app/components/ChatStream.tsx`
- `frontend/app/components/ModelSidebar.tsx`
- `frontend/app/components/SettingsPanel.tsx`
- Create `frontend/app/components/ChatComposer.tsx`
- Create `frontend/app/components/ConversationList.tsx`
- Create `frontend/app/components/ModelCard.tsx`
- Create `frontend/app/components/UsagePill.tsx`
- Create `frontend/lib/sse.ts`

- Add conversation persistence and history search.
- Add cancel generation using `AbortController`.
- Add retry failed response and regenerate response.
- Add model capability tags: سرعت، استدلال، کدنویسی، چندرسانه‌ای، context window.
- Display estimated price before send and actual cost after completion.
- Make model selection keyboard accessible with real buttons/listbox semantics.
- Add optimistic user message, robust assistant placeholder, partial-stream error state, and reconnect policy.
- Add copy/share/export actions with privacy warning.
- Add empty state presets: “خلاصه‌سازی”، “کدنویسی”، “ترجمه”، “تحلیل فایل”.

**Acceptance:** Stream can be started, cancelled, retried, and completed without duplicated messages, stuck loading indicators, or lost billing feedback.

### Phase 5 — Billing, usage, and developer experience

**Frontend:**
- Create `frontend/app/(app)/usage/page.tsx`.
- Create `frontend/app/(app)/billing/page.tsx`.
- Create `frontend/app/(app)/api-keys/page.tsx`.
- Create `frontend/app/(marketing)/docs/page.tsx`.
- Create `frontend/app/components/UsageChart.tsx`.
- Create `frontend/app/components/LedgerTable.tsx`.
- Create `frontend/app/components/ApiCodeBlock.tsx`.

**Backend/API contract:**
- Add typed endpoints for usage summaries, ledger, payment status, model pricing, and API key lifecycle.
- Add pagination and stable response schemas.
- Add request IDs and structured error codes.

- Show cost in IRR with optional USD reference.
- Show daily limit, current balance, projected messages remaining, and top-up CTA.
- Provide copyable cURL, Python, JavaScript examples.
- Explain streaming and common errors in Persian and English.

**Acceptance:** A developer can register, create an API key, copy a working request, understand billing, and diagnose a failed request without contacting support.

### Phase 6 — Admin console hardening and separation

**Files:**
- `frontend/app/admin/page.tsx`
- Create `frontend/app/admin/layout.tsx`
- Create `frontend/app/admin/components/AdminSidebar.tsx`
- Create `frontend/app/admin/components/DataTable.tsx`
- Create `frontend/app/admin/components/MetricCard.tsx`
- Create `frontend/app/admin/components/ConfirmDialog.tsx`
- Create `frontend/lib/admin-api.ts`

- Keep admin route and layout separate from user navigation.
- Replace inline styles with shared but admin-appropriate primitives.
- Replace browser `alert` with typed toast and confirmation dialogs for money/model/kill-switch actions.
- Add pagination, search, empty states, error states, and audit references.
- Make destructive actions explicit and require confirmation.
- Add role/permission model before exposing admin to more than one operator.

**Acceptance:** Admin cannot be reached through user navigation, all sensitive actions have confirmation and auditability, and admin remains usable at 1024px and mobile widths.

### Phase 7 — Quality, accessibility, performance, and SEO

**Dependencies:** Playwright, axe-core integration, Lighthouse CI or equivalent.

- Add unit tests for formatting, auth state, model filtering, cost calculator, and SSE parsing.
- Add Playwright flows: public landing, registration, login, model selection, streaming mock, logout, admin auth.
- Add mobile viewport flows at 375px, 768px, and 1440px.
- Add accessibility checks: headings, contrast, focus order, labels, dialogs, listbox semantics.
- Add visual snapshots for landing, login, chat empty, chat streaming, usage, and admin.
- Measure bundle size and split large client components.
- Use `next/image`, local or controlled fonts, caching, and skeleton loading.
- Add CSP, security headers, and safe external-link handling.

**Acceptance gates:**

- `npm run build` passes.
- No critical axe violations.
- No P0/P1 Playwright failures.
- Lighthouse targets: Performance ≥ 85, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90 for marketing pages.
- Mobile chat usable without horizontal scroll.

### Phase 8 — Release candidate and presentation package

- Create a seeded demo tenant with non-sensitive data.
- Add a “demo mode” that cannot perform real billing or expose secrets.
- Prepare a 5-minute decision-maker demo script:
  1. Landing page value proposition.
  2. Register and select a model.
  3. Send Persian prompt and stream response.
  4. Show cost and balance transparency.
  5. Show developer API example.
  6. Show admin safety controls.
- Produce architecture diagram, security overview, competitive matrix, pricing assumptions, and roadmap.
- Freeze release candidate and tag it only after all gates pass.

## 6. Suggested component and API conventions

### Frontend

- Use typed API functions in `frontend/lib/api.ts`; components must not duplicate fetch/error parsing.
- Keep server/marketing pages server-rendered where possible; isolate client interactivity.
- Use semantic HTML first: `button`, `nav`, `main`, `dialog`, `ul`, `table`.
- Never use index as a React key for persistent conversations.
- Never expose internal/admin tokens in client bundles.

### API response shape

```ts
export type ApiError = {
  error: string;
  code?: string;
  request_id?: string;
  details?: Record<string, unknown>;
};

export type ModelCatalogItem = {
  alias: string;
  display_name: string;
  tier: 'mini' | 'standard' | 'pro';
  capabilities: string[];
  context_window: number;
  input_price_irr_per_1m: number;
  output_price_irr_per_1m: number;
  active: boolean;
};
```

## 7. Risks and trade-offs

- **Scope risk:** A full marketing site plus chat redesign plus API docs is a multi-sprint product effort. Use the phase gates; do not mix visual polish with unresolved billing/auth defects.
- **Token security:** Moving from localStorage to cookies may require backend and proxy changes but is worth doing before public users.
- **Pricing credibility:** Never show invented “cheapest” or “fastest” claims; derive claims from measured data and model catalog metadata.
- **RTL complexity:** Test mixed Persian/English/model names, code blocks, tables, and numeric IRR formatting explicitly.
- **Performance:** Syntax highlighting and a large admin client bundle should be lazy-loaded.
- **Operational trust:** Public presentation must not expose internal hostnames, tokens, debug traces, or unsupported provider claims.

## 8. Definition of the best possible release

MultiAPI is presentation-ready when:

- A visitor immediately understands the product and its local differentiation.
- The site looks intentional and credible on phone, tablet, and desktop.
- Chat, billing, model selection, and API onboarding are all coherent flows.
- Costs are transparent before and after usage.
- Sessions and API keys are secure and revocable.
- Admin is clearly separate and safe for operational use.
- Tests prove the core flows rather than relying on a successful build alone.
- A decision-maker can see a working demo, business advantage, technical architecture, and controlled path to scale.
