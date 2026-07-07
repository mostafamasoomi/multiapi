# multiai2 — Persian AI Gateway

Paid LLM API reseller for the Iranian market. Architecture:

```
User → Next.js (14) → FastAPI (backend) → 9Router (127.0.0.1) → Upstream (OpenAI/Anthropic/OpenRouter)
                     ↘ Telegram bot (aiogram) ──↗
```

## Hard rules (never violate)
1. **9Router is INTERNAL ONLY** (127.0.0.1). Backend is its sole client.
2. All user traffic: `User → Backend → 9Router → Provider`. No user key touches 9Router.
3. Metering, wallet accounting, quota enforcement → **Backend + PostgreSQL**.
4. User catalog == 9Router aliases (model_aliases table).
5. Token counting, cost, wallet deduction = backend's job.

## Financial safety (anti-bankruptcy)
- Prepaid only (wallet balance >= 0, CHECK enforced).
- Two-phase HOLD/SETTLE on every request.
- FX risk control via fx_rates + circuit breaker.
- Three auto-brakes: per-user daily cap, per-model margin brake, global kill switch.
- Pricing DERIVED from fx_rate (never hand-set).

## Phase status
- [x] PHASE-0: skeleton, env, DB schema, core tables, FastAPI bootstrap.
- [ ] PHASE-1: wallet/hold/settle services + 9Router client + chat completions router.
- [ ] PHASE-2: FX + pricing engine, plan/quota enforcement.
- [ ] PHASE-3: admin + brakes monitors + pnl_daily job.
- [ ] PHASE-4: Next.js frontend.
- [ ] PHASE-5: aiogram Telegram bot.
- [ ] PHASE-6: payment (Zarinpal) integration.

## Setup (dev)
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e .
cp .env.example .env   # fill values
createdb multiai2
psql multiai2 -f app/db/migrations/0001_init.sql
uvicorn app.main:app --reload
```
