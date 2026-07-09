"""PHASE-3: Daily P&L aggregation cron job.

Run continuously via:
  python -m app.pnl_daily

Aggregates ledger + holds into pnl_daily table for reporting + brake checks.
Runs once daily at 00:05 UTC, then sleeps until next day.
"""
from __future__ import annotations

import asyncio
import logging
import os
import sys
from datetime import date, datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import async_session
from app.models import FxRate, Hold, Ledger, ModelAlias, PnlDaily

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("pnl_daily")


async def aggregate_pnl(day: date | None = None):
    """Aggregate one day's P&L into pnl_daily table."""
    if day is None:
        day = date.today() - timedelta(days=1)

    async with async_session() as db:
        # Idempotent: skip if already aggregated (use INSERT ... ON CONFLICT)
        existing = await db.scalar(select(PnlDaily).where(PnlDaily.day == day))
        if existing:
            logger.info(f"[SKIP] P&L for {day} already exists")
            return

        # Get FX rate for the day
        fx_row = await db.scalar(
            select(FxRate).where(FxRate.rate_date <= day)
            .order_by(FxRate.rate_date.desc()).limit(1))
        fx_rate = float(fx_row.usd_to_irr) if fx_row else 58000.0
        fx_buffer = float(fx_row.fx_buffer) if fx_row else 1.12

        # Revenue: sum of settle transactions (user payments)
        # USE RANGE QUERY instead of func.date() for index usage
        day_start = datetime.combine(day, datetime.min.time())
        day_end = datetime.combine(day + timedelta(days=1), datetime.min.time())

        revenue_result = await db.execute(
            select(func.coalesce(func.sum(Ledger.amount_irr), 0))
            .where(Ledger.txn_type == "settle",
                   Ledger.created_at >= day_start,
                   Ledger.created_at < day_end))
        revenue_irr = int(revenue_result.scalar())

        # Upstream cost: sum of settled holds
        cost_result = await db.execute(
            select(func.coalesce(func.sum(Hold.settled_amount_irr), 0))
            .where(Hold.status == "settled",
                   Hold.settled_at >= day_start,
                   Hold.settled_at < day_end))
        cost_irr = int(cost_result.scalar())

        # Convert cost to USD
        upstream_cost_usd = cost_irr / (fx_rate * fx_buffer) if fx_rate else 0

        # Gateway fees
        fee_result = await db.execute(
            select(func.coalesce(func.sum(Ledger.amount_irr), 0))
            .where(Ledger.txn_type == "fee",
                   Ledger.created_at >= day_start,
                   Ledger.created_at < day_end))
        gateway_fees_irr = int(fee_result.scalar())

        # Gross margin %
        if revenue_irr > 0:
            gross_margin_pct = ((revenue_irr - cost_irr) / revenue_irr) * 100
        else:
            gross_margin_pct = None

        # Free tier cost
        free_cost_result = await db.execute(
            select(func.coalesce(func.sum(Hold.settled_amount_irr), 0))
            .join(ModelAlias, ModelAlias.alias == Hold.model_alias)
            .where(Hold.status == "settled",
                   Hold.settled_at >= day_start,
                   Hold.settled_at < day_end,
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
        logger.info(f"[OK] P&L for {day}: revenue={revenue_irr}IRR, "
                    f"cost=${upstream_cost_usd:.2f}, margin={gross_margin_pct}%")


async def main():
    """Run P&L aggregation in a loop (once daily)."""
    logger.info("P&L cron started")
    while True:
        try:
            # Aggregate yesterday
            await aggregate_pnl(date.today() - timedelta(days=1))
            # Also fill any gaps (last 7 days)
            for i in range(2, 8):
                await aggregate_pnl(date.today() - timedelta(days=i))
        except Exception as e:
            logger.error(f"P&L aggregation failed: {e}")

        # Sleep until next run (check every hour, but only aggregate once daily)
        await asyncio.sleep(3600)


if __name__ == "__main__":
    asyncio.run(main())
