"""PHASE-3: Daily P&L aggregation cron job.

Run once daily (e.g., 00:05 UTC) via:
  python -m app.pnl_daily

Aggregates ledger + holds into pnl_daily table for reporting + brake checks.
"""
from __future__ import annotations

import asyncio
import os
import sys
from datetime import date, datetime, timedelta

# Add parent dir to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal
from app.models import FxRate, Hold, Ledger, ModelAlias, PnlDaily


async def aggregate_pnl(day: date | None = None):
    """Aggregate one day's P&L into pnl_daily table."""
    if day is None:
        day = date.today() - timedelta(days=1)  # yesterday

    async with AsyncSessionLocal() as db:
        # Check if already aggregated
        existing = await db.scalar(select(PnlDaily).where(PnlDaily.day == day))
        if existing:
            print(f"[SKIP] P&L for {day} already exists")
            return

        # Get FX rate for the day
        fx_row = await db.scalar(
            select(FxRate).where(FxRate.rate_date <= day)
            .order_by(FxRate.rate_date.desc()).limit(1))
        fx_rate = float(fx_row.usd_to_irr) if fx_row else 58000.0
        fx_buffer = float(fx_row.fx_buffer) if fx_row else 1.12

        # Revenue: sum of settle transactions (user payments)
        revenue_result = await db.execute(
            select(func.coalesce(func.sum(Ledger.amount_irr), 0))
            .where(Ledger.txn_type == "settle",
                   func.date(Ledger.created_at) == day))
        revenue_irr = int(revenue_result.scalar())

        # Upstream cost: sum of settled holds (actual cost to platform)
        cost_result = await db.execute(
            select(func.coalesce(func.sum(Hold.settled_amount_irr), 0))
            .where(Hold.status == "settled",
                   func.date(Hold.settled_at) == day))
        cost_irr = int(cost_result.scalar())

        # Convert cost to USD
        upstream_cost_usd = cost_irr / (fx_rate * fx_buffer) if fx_rate else 0

        # Gateway fees: sum of fee transactions
        fee_result = await db.execute(
            select(func.coalesce(func.sum(Ledger.amount_irr), 0))
            .where(Ledger.txn_type == "fee",
                   func.date(Ledger.created_at) == day))
        gateway_fees_irr = int(fee_result.scalar())

        # Gross margin %
        if revenue_irr > 0:
            gross_margin_pct = ((revenue_irr - cost_irr) / revenue_irr) * 100
        else:
            gross_margin_pct = None

        # Free tier cost (models with free_tier_eligible=True)
        free_cost_result = await db.execute(
            select(func.coalesce(func.sum(Hold.settled_amount_irr), 0))
            .join(ModelAlias, ModelAlias.alias == Hold.model_alias)
            .where(Hold.status == "settled",
                   func.date(Hold.settled_at) == day,
                   ModelAlias.free_tier_eligible == True))
        free_tier_cost_usd = int(free_cost_result.scalar()) / (fx_rate * fx_buffer) if fx_rate else 0

        # Insert P&L record
        pnl = PnlDaily(
            day=day,
            revenue_irr=revenue_irr,
            upstream_cost_usd=round(upstream_cost_usd, 4),
            fx_rate_used=fx_rate,
            gateway_fees_irr=gateway_fees_irr,
            free_tier_cost_usd=round(free_tier_cost_usd, 4),
            gross_margin_pct=round(gross_margin_pct, 2) if gross_margin_pct is not None else None,
        )
        db.add(pnl)
        await db.commit()
        print(f"[OK] P&L for {day}: revenue={revenue_irr}IRR, "
              f"cost=${upstream_cost_usd:.2f}, margin={gross_margin_pct}%")


async def main():
    """Aggregate last 7 days to fill any gaps."""
    for i in range(7):
        day = date.today() - timedelta(days=i)
        await aggregate_pnl(day)


if __name__ == "__main__":
    asyncio.run(main())
