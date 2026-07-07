"""PHASE-3: financial safety brakes (monitors).

Three auto-brakes (per spec):
  1. per-user daily spend cap  -> enforced in plan_quota (PHASE-2)
  2. per-model margin brake     -> if realized margin < threshold over 24h, auto-disable alias
  3. global kill switch         -> if daily upstream cost > $X, restrict to subscribers + alert
Plus FX circuit breaker: if today's rate > last-pricing rate * 1.05 -> lock topups + alert.

These are checked on a schedule (PHASE-3 cron) and on each request (cheap checks).
"""
from __future__ import annotations

import json
from datetime import date, datetime, timedelta

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import GlobalSetting, Hold, Ledger, ModelAlias, PnlDaily


class BrakeService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def global_settings(self, key: str) -> dict:
        row = await self.db.scalar(select(GlobalSetting).where(GlobalSetting.key == key))
        return json.loads(row.value_json) if row else {}

    async def fx_circuit_breaker(self, current_rate: float, last_pricing_rate: float) -> bool:
        """Return True if breaker TRIPPED (rate spiked >5%)."""
        pct = (await self.global_settings("fx_circuit_breaker")).get("pct", 0.05)
        tripped = current_rate > last_pricing_rate * (1 + pct)
        if tripped:
            cfg = await self.global_settings("fx_circuit_breaker")
            cfg["tripped_at"] = datetime.utcnow().isoformat()
            await self._set("fx_circuit_breaker", cfg)
        return tripped

    async def per_model_margin_brake(self, threshold_pct: float = 5.0) -> list[str]:
        """Auto-disable aliases whose trailing-24h realized margin < threshold."""
        since = datetime.utcnow() - timedelta(hours=24)
        disabled = []
        rows = await self.db.execute(text("""
            SELECT ma.id, ma.alias,
                   CASE WHEN SUM(l.amount_irr) = 0 THEN 100
                        ELSE (SUM(l.amount_irr) - SUM(h.settled_amount_irr)) * 100.0
                             / NULLIF(SUM(l.amount_irr),0)
                   END AS margin_pct
            FROM ledger l
            JOIN holds h ON h.request_id = l.ref_id AND l.ref_type='hold'
            JOIN model_aliases ma ON ma.alias = h.model_alias
            WHERE l.created_at >= :since AND l.txn_type='settle'
            GROUP BY ma.id, ma.alias
        """), {"since": since})
        for ma_id, alias, margin in rows:
            if margin is not None and margin < threshold_pct:
                ma = await self.db.scalar(select(ModelAlias).where(ModelAlias.id == ma_id))
                if ma and not ma.auto_disabled:
                    ma.auto_disabled = True
                    ma.is_active = False
                    disabled.append(alias)
        if disabled:
            await self.db.commit()
        return disabled

    async def global_kill_switch(self) -> bool:
        cfg = await self.global_settings("global_daily_upstream_cap_usd")
        cap = float(cfg.get("cap_usd", 500.0))
        today = await self.db.scalar(
            select(PnlDaily).where(PnlDaily.day == date.today()))
        cost = float(today.upstream_cost_usd) if today else 0.0
        if cost > cap:
            ks = await self.global_settings("kill_switch")
            ks["enabled"] = True
            ks["restrict_to_subscribers"] = True
            ks["triggered_at"] = datetime.utcnow().isoformat()
            await self._set("kill_switch", ks)
            return True
        return False

    async def _set(self, key: str, value: dict):
        row = await self.db.scalar(select(GlobalSetting).where(GlobalSetting.key == key))
        if not row:
            row = GlobalSetting(key=key, value_json="{}")
            self.db.add(row)
        row.value_json = json.dumps(value)
        row.updated_at = datetime.utcnow()
        await self.db.commit()
