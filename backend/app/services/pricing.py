"""PHASE-2 (needed by PHASE-1): pricing engine.

Sell price DERIVED from fx_rate, never hand-set.
  sell_per_1M_in  = upstream_in_usd  * fx * buffer * input_margin_factor
  sell_per_1M_out = upstream_out_usd * fx * buffer * output_margin_factor
Also estimates request cost from tiktoken-counted input tokens + capped max_tokens.
"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import FxRate, ModelAlias, Pricing


class PricingService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def current_fx(self) -> float:
        row = await self.db.scalar(select(FxRate).order_by(FxRate.rate_date.desc()).limit(1))
        if not row:
            raise RuntimeError("No fx_rate row — seed fx_rates first")
        return float(row.usd_to_irr) * float(row.fx_buffer)

    async def sell_price_per_1m(self, alias: str) -> tuple[float, float, ModelAlias, Pricing]:
        ma = await self.db.scalar(select(ModelAlias).where(ModelAlias.alias == alias))
        if not ma:
            raise ValueError(f"unknown alias {alias}")
        pr = await self.db.scalar(select(Pricing).where(Pricing.model_alias_id == ma.id))
        if not pr:
            raise ValueError(f"no pricing for {alias}")
        fx = await self.current_fx()
        in_price = float(ma.upstream_cost_input_usd_per_1m) * fx * float(pr.input_margin_factor)
        out_price = float(ma.upstream_cost_output_usd_per_1m) * fx * float(pr.output_margin_factor)
        return in_price, out_price, ma, pr

    async def estimate_cost_irr(self, alias: str, input_tokens: int,
                                max_tokens: int) -> tuple[int, ModelAlias]:
        in_price, out_price, ma, _ = await self.sell_price_per_1m(alias)
        est = int((input_tokens / 1_000_000) * in_price +
                  (max_tokens / 1_000_000) * out_price)
        return max(est, 1), ma
