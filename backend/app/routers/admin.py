1|"""PHASE-3: admin router.
2|
3|Admin can:
4|  * list/update model pricing (margin factors) -> backend recomputes sell price from fx
5|  * view per-user token usage + wallet balance (monitoring)
6|  * view P&L daily + trigger brakes manually
7|  * toggle model active/disabled
8|  * manage FX rates (set daily rate, view history)
9|  * manage users (view, update plan, topup)
10|"""
11|from __future__ import annotations
12|
13|from datetime import date, datetime
14|from fastapi import APIRouter, Depends, HTTPException
15|from pydantic import BaseModel
16|from sqlalchemy import func, select
17|from sqlalchemy.ext.asyncio import AsyncSession
18|
19|from app.auth import require_admin
20|from app.db.session import get_session
21|from app.models import FxRate, GlobalSetting, Ledger, ModelAlias, PnlDaily, Pricing, Quota, User, Wallet
22|from app.services.brakes import BrakeService
23|from app.services.wallet import WalletService
24|
25|admin = APIRouter(prefix="/admin", tags=["admin"])
26|router = admin  # alias so main.py include_router(admin.router) works
27|
28|# Admin dependency
29|RequireAdmin = Depends(require_admin)
30|
31|
32|class MarginUpdate(BaseModel):
33|    alias: str
34|    input_margin_factor: float
35|    output_margin_factor: float
36|
37|
38|class FxRateSet(BaseModel):
39|    usd_to_irr: float
40|    fx_buffer: float = 1.12
41|    source: str | None = None
42|
43|
44|class UserTopup(BaseModel):
45|    user_id: int
46|    amount_irr: int
47|    note: str | None = None
48|
49|
50|class UserUpdatePlan(BaseModel):
51|    user_id: int
52|    plan_id: int | None = None
53|    daily_spend_cap_irr: int | None = None
54|    status: str | None = None
55|
56|
57|@admin.get("/models")
58|async def list_models(RequireAdmin, db: AsyncSession = Depends(get_session)):
59|    rows = await db.execute(select(ModelAlias, Pricing).join(
60|        Pricing, Pricing.model_alias_id == ModelAlias.id))
61|    out = []
62|    for ma, pr in rows:
63|        out.append({
64|            "alias": ma.alias, "tier": ma.tier, "active": ma.is_active,
65|            "auto_disabled": ma.auto_disabled, "free_tier_eligible": ma.free_tier_eligible,
66|            "up_in": float(ma.upstream_cost_input_usd_per_1m),
67|            "up_out": float(ma.upstream_cost_output_usd_per_1m),
68|            "in_margin": float(pr.input_margin_factor),
69|            "out_margin": float(pr.output_margin_factor),
70|            "max_tokens_cap": ma.max_tokens_cap,
71|        })
72|    return out
73|
74|
75|@admin.post("/models/margin")
76|async def update_margin(u: MarginUpdate, RequireAdmin, db: AsyncSession = Depends(get_session)):
77|    ma = await db.scalar(select(ModelAlias).where(ModelAlias.alias == u.alias))
78|    if not ma:
79|        raise HTTPException(404, "model not found")
80|    pr = await db.scalar(select(Pricing).where(Pricing.model_alias_id == ma.id))
81|    pr.input_margin_factor = u.input_margin_factor
82|    pr.output_margin_factor = u.output_margin_factor
83|    pr.updated_at = func.now()
84|    await db.commit()
85|    return {"ok": True, "alias": u.alias,
86|            "sell_price_derived_from_fx": True}
87|
88|
89|@admin.post("/models/{alias}/toggle")
90|async def toggle_model(alias: str, RequireAdmin, db: AsyncSession = Depends(get_session)):
91|    ma = await db.scalar(select(ModelAlias).where(ModelAlias.alias == alias))
92|    if not ma:
93|        raise HTTPException(404, "model not found")
94|    ma.is_active = not ma.is_active
95|    ma.auto_disabled = False
96|    await db.commit()
97|    return {"alias": alias, "active": ma.is_active}
98|
99|
100|@admin.get("/users/{user_id}/usage")
101|async def user_usage(user_id: int, RequireAdmin, db: AsyncSession = Depends(get_session)):
102|    w = await db.scalar(select(Wallet).where(Wallet.user_id == user_id))
103|    rows = await db.execute(
104|        select(Quota.model_alias_id, func.sum(Quota.used_tokens))
105|        .where(Quota.user_id == user_id).group_by(Quota.model_alias_id))
106|    usage = [{"model_alias_id": m, "used_tokens": t} for m, t in rows]
107|    return {
108|        "user_id": user_id,
109|        "balance_irr": w.balance_irr if w else 0,
110|        "token_usage_by_model": usage,
111|    }
112|
113|
114|@admin.get("/pnl")
115|async def pnl(RequireAdmin, db: AsyncSession = Depends(get_session)):
116|    rows = await db.execute(select(PnlDaily).order_by(PnlDaily.day.desc()).limit(30))
117|    return [
118|        {"day": r.day.isoformat(), "revenue_irr": r.revenue_irr,
119|         "upstream_cost_usd": float(r.upstream_cost_usd),
120|         "gross_margin_pct": float(r.gross_margin_pct) if r.gross_margin_pct else None}
121|        for r in rows
122|    ]
123|
124|
125|# ── PHASE-2: FX Rates Management ─────────────────────────────────────────────
126|
127|@admin.get("/fx")
128|async def get_current_fx(RequireAdmin, db: AsyncSession = Depends(get_session)):
129|    """Get current FX rate."""
130|    row = await db.scalar(select(FxRate).order_by(FxRate.rate_date.desc()).limit(1))
131|    if not row:
132|        raise HTTPException(404, "no FX rate set")
133|    return {
134|        "rate_date": row.rate_date.isoformat(),
135|        "usd_to_irr": float(row.usd_to_irr),
136|        "fx_buffer": float(row.fx_buffer),
137|        "effective_rate": float(row.usd_to_irr) * float(row.fx_buffer),
138|        "source": row.source,
139|    }
140|
141|
142|@admin.get("/fx/history")
143|async def fx_history(days: int = 30, RequireAdmin, db: AsyncSession = Depends(get_session)):
144|    """Get FX rate history."""
145|    rows = await db.execute(
146|        select(FxRate).order_by(FxRate.rate_date.desc()).limit(days))
147|    return [
148|        {"rate_date": r.rate_date.isoformat(), "usd_to_irr": float(r.usd_to_irr),
149|         "fx_buffer": float(r.fx_buffer), "source": r.source}
150|        for r in rows
151|    ]
152|
153|
154|@admin.post("/fx")
155|async def set_fx_rate(fx: FxRateSet, RequireAdmin, db: AsyncSession = Depends(get_session)):
156|    """Set today's FX rate. Checks circuit breaker first."""
157|    # Check if rate spiked > 5% from last pricing rate
158|    last = await db.scalar(select(FxRate).order_by(FxRate.rate_date.desc()).limit(1))
159|    if last:
160|        bs = BrakeService(db)
161|        tripped = await bs.fx_circuit_breaker(fx.usd_to_irr, float(last.usd_to_irr))
162|        if tripped:
163|            raise HTTPException(429, {
164|                "error": "fx_circuit_breaker_tripped",
165|                "message": "FX rate spiked >5% from last pricing rate. Topups locked.",
166|                "last_rate": float(last.usd_to_irr),
167|                "new_rate": fx.usd_to_irr,
168|            })
169|
170|    # Upsert today's rate
171|    today = date.today()
172|    existing = await db.scalar(select(FxRate).where(FxRate.rate_date == today))
173|    if existing:
174|        existing.usd_to_irr = fx.usd_to_irr
175|        existing.fx_buffer = fx.fx_buffer
176|        existing.source = fx.source
177|    else:
178|        db.add(FxRate(rate_date=today, usd_to_irr=fx.usd_to_irr,
179|                      fx_buffer=fx.fx_buffer, source=fx.source))
180|    await db.commit()
181|    return {"ok": True, "rate_date": today.isoformat(),
182|            "effective_rate": fx.usd_to_irr * fx.fx_buffer}
183|
184|
185|# ── PHASE-3: User Management ──────────────────────────────────────────────────
186|@admin.get("/users")
187|async def list_users(limit: int = 50, RequireAdmin, db: AsyncSession = Depends(get_session),
188|                     _auth: str = Depends(require_admin)):
189|    """List users with wallet balances."""
190|    rows = await db.execute(select(User, Wallet).join(
191|        Wallet, Wallet.user_id == User.id, isouter=True).limit(limit))
192|    out = []
193|    for u, w in rows:
194|        out.append({
195|            "id": u.id, "email": u.email, "username": u.username,
196|            "telegram_id": u.telegram_id, "status": u.status,
197|            "plan_id": u.plan_id, "balance_irr": w.balance_irr if w else 0,
198|            "daily_spend_used_irr": u.daily_spend_used_irr,
199|            "daily_spend_cap_irr": u.daily_spend_cap_irr,
200|            "created_at": u.created_at.isoformat() if u.created_at else None,
201|        })
202|    return out
203|
204|
205|@admin.post("/users/topup")
206|async def user_topup(t: UserTopup, RequireAdmin, db: AsyncSession = Depends(get_session)):
207|    """Admin topup for a user."""
208|    ws = WalletService(db)
209|    try:
210|        new_balance = await ws.topup(t.user_id, t.amount_irr,
211|                                     note=t.note or f"admin topup by admin")
212|    except Exception as e:
213|        raise HTTPException(400, str(e))
214|    return {"ok": True, "user_id": t.user_id, "new_balance_irr": new_balance}
215|
216|
217|@admin.post("/users/update")
218|async def user_update(u: UserUpdatePlan, RequireAdmin, db: AsyncSession = Depends(get_session)):
219|    """Update user plan, spend cap, or status."""
220|    user = await db.scalar(select(User).where(User.id == u.user_id))
221|    if not user:
222|        raise HTTPException(404, "user not found")
223|    if u.plan_id is not None:
224|        user.plan_id = u.plan_id
225|    if u.daily_spend_cap_irr is not None:
226|        user.daily_spend_cap_irr = u.daily_spend_cap_irr
227|    if u.status is not None:
228|        user.status = u.status
229|    user.updated_at = datetime.utcnow()
230|    await db.commit()
231|    return {"ok": True, "user_id": u.user_id}
232|
233|
234|@admin.get("/users/{user_id}/ledger")
235|async def user_ledger(user_id: int, limit: int = 50,
236|                      db: AsyncSession = Depends(get_session)):
237|    """Get user's ledger (transaction history)."""
238|    rows = await db.execute(
239|        select(Ledger).where(Ledger.user_id == user_id)
240|        .order_by(Ledger.created_at.desc()).limit(limit))
241|    return [
242|        {"id": r.id, "txn_type": r.txn_type, "amount_irr": r.amount_irr,
243|         "balance_after_irr": r.balance_after_irr, "note": r.note,
244|         "ref_type": r.ref_type, "ref_id": r.ref_id,
245|         "created_at": r.created_at.isoformat() if r.created_at else None}
246|        for r in rows
247|    ]
248|
249|
250|# ── PHASE-3: Brakes & System ─────────────────────────────────────────────────
251|
252|@admin.get("/brakes/status")
253|async def brakes_status(RequireAdmin, db: AsyncSession = Depends(get_session)):
254|    """Check all brake statuses."""
255|    bs = BrakeService(db)
256|    # Get global settings
257|    kill_switch = await bs.global_settings("kill_switch")
258|    fx_breaker = await bs.global_settings("fx_circuit_breaker")
259|    # Get today's PnL
260|    pnl_today = await db.scalar(select(PnlDaily).where(PnlDaily.day == date.today()))
261|    return {
262|        "kill_switch": kill_switch,
263|        "fx_circuit_breaker": fx_breaker,
264|        "today_cost_usd": float(pnl_today.upstream_cost_usd) if pnl_today else 0,
265|        "today_revenue_irr": pnl_today.revenue_irr if pnl_today else 0,
266|    }
267|
268|
269|@admin.post("/brakes/kill-switch")
270|async def toggle_kill_switch(enable: bool = True,
271|                             db: AsyncSession = Depends(get_session)):
272|    """Toggle global kill switch."""
273|    bs = BrakeService(db)
274|    cfg = await bs.global_settings("kill_switch")
275|    cfg["enabled"] = enable
276|    cfg["restrict_to_subscribers"] = enable
277|    cfg["toggled_at"] = datetime.utcnow().isoformat()
278|    await bs._set("kill_switch", cfg)
279|    return {"ok": True, "kill_switch_enabled": enable}
280|
281|
282|@admin.post("/brakes/margin-check")
283|async def run_margin_brake(RequireAdmin, db: AsyncSession = Depends(get_session)):
284|    """Manually run per-model margin brake check."""
285|    bs = BrakeService(db)
286|    disabled = await bs.per_model_margin_brake()
287|    return {"ok": True, "disabled_models": disabled}
288|
289|
290|# ── Telegram Registration ──────────────────────────────────────────────────────
291|
292|class TelegramRegister(BaseModel):
293|    telegram_id: str
294|    username: str | None = None
295|
296|
297|@admin.post("/users/register-telegram")
298|async def register_telegram_user(t: TelegramRegister,
299|                                  db: AsyncSession = Depends(get_session)):
300|    """Register or get existing Telegram user. Returns user info + balance."""
301|    ws = WalletService(db)
302|    # Find existing user by telegram_id
303|    user = await db.scalar(
304|        select(User).where(User.telegram_id == t.telegram_id))
305|    if user:
306|        balance = await ws.balance(user.id)
307|        return {
308|            "user_id": user.id,
309|            "balance_irr": balance,
310|            "status": user.status,
311|            "plan_id": user.plan_id,
312|        }
313|
314|    # Create new user
315|    from datetime import date as _date
316|    user = User(
317|        telegram_id=t.telegram_id,
318|        username=t.username,
319|        status="active",
320|        plan_id=None,
321|    )
322|    db.add(user)
323|    await db.flush()
324|
325|    # Create wallet with test credit
326|    wallet = Wallet(user_id=user.id, balance_irr=100_000)  # 100K IRR test credit
327|    db.add(wallet)
328|    await db.commit()
329|    await db.refresh(user)
330|
331|    return {
332|        "user_id": user.id,
333|        "balance_irr": 100_000,
334|        "status": "active",
335|        "plan_id": None,
336|    }
337|
338|
339|# ── Public Models API (for bot) ────────────────────────────────────────────────
340|
341|@admin.get("/models/list")
342|async def list_models_public(RequireAdmin, db: AsyncSession = Depends(get_session)):
343|    """Public models list (no auth needed for bot)."""
344|    rows = await db.execute(select(ModelAlias).where(
345|        ModelAlias.is_active == True, ModelAlias.auto_disabled == False))
346|    return [
347|        {"alias": m.alias, "tier": m.tier, "active": m.is_active,
348|         "auto_disabled": m.auto_disabled, "free_tier_eligible": m.free_tier_eligible}
349|        for m in rows
350|    ]
351|