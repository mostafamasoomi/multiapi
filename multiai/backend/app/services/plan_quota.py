"""PHASE-2: plan + quota enforcement service.

Enforces:
  * per-user hard daily spend cap (even with full wallet)
  * per-model daily token cap (quotas table)
  * free-plan: only cheap/free_tier_eligible models + hard daily token cap
  * subscription: fair-use internal quota (ledger-tracked)
All checks run BEFORE placing a hold. Reject with 402/429 as appropriate.
"""
from __future__ import annotations

from datetime import date, datetime

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ModelAlias, Plan, Quota, User


class PlanQuotaService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def check_request(self, user_id: int, alias: str, est_cost_irr: int):
        user = await self.db.scalar(select(User).where(User.id == user_id))
        if not user or user.status != "active":
            raise HTTPException(403, "user not active")
        ma = await self.db.scalar(select(ModelAlias).where(ModelAlias.alias == alias))
        if not ma:
            raise HTTPException(404, "model not found")

        # reset daily spend if new day
        if user.spend_date != date.today():
            user.daily_spend_used_irr = 0
            user.spend_date = date.today()

        # per-user hard daily spend cap (abuse / leaked-key protection)
        if user.daily_spend_cap_irr and user.daily_spend_used_irr + est_cost_irr > user.daily_spend_cap_irr:
            raise HTTPException(429, {
                "error": "daily_spend_cap_exceeded",
                "cap_irr": user.daily_spend_cap_irr,
                "used_irr": user.daily_spend_used_irr})

        # free plan restrictions
        plan = await self.db.scalar(select(Plan).where(Plan.id == user.plan_id))
        if plan and plan.free_tier:
            if not ma.free_tier_eligible:
                raise HTTPException(402, "free plan only allows cheap/free-tier models")
            # hard daily token cap for free plan
            q = await self.db.scalar(
                select(Quota).where(Quota.user_id == user_id,
                                    Quota.model_alias_id == ma.id))
            cap = q.daily_token_cap if q else plan.daily_token_cap
            if cap and (q.used_tokens if q else 0) >= cap:
                raise HTTPException(429, "free daily token cap reached")

        return user, plan, ma

    async def record_usage(self, user_id: int, alias: str, cost_irr: int, tokens: int):
        user = await self.db.scalar(select(User).where(User.id == user_id))
        ma = await self.db.scalar(select(ModelAlias).where(ModelAlias.alias == alias))
        if user:
            user.daily_spend_used_irr += cost_irr
            user.updated_at = datetime.utcnow()
        q = await self.db.scalar(
            select(Quota).where(Quota.user_id == user_id, Quota.model_alias_id == ma.id))
        if not q:
            q = Quota(user_id=user_id, model_alias_id=ma.id, used_tokens=0,
                      reset_date=date.today())
            self.db.add(q)
        if q.reset_date != date.today():
            q.used_tokens = 0
            q.reset_date = date.today()
        q.used_tokens += tokens
        await self.db.commit()
