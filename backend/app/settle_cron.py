"""PHASE-1: settle_cron — auto-release expired holds.

Run continuously via:
  python -m app.settle_cron

Releases holds that have expired (expires_at < now) to prevent wallet freeze.
Runs every 60 seconds.
"""
from __future__ import annotations

import asyncio
import logging
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import async_session
from app.models import Hold
from app.services.wallet import WalletService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("settle_cron")

CHECK_INTERVAL = 60  # 1 minute


async def release_expired_holds():
    """Release holds that have expired."""
    try:
        async with async_session() as db:
            # Find expired active holds
            now = datetime.utcnow()
            expired = await db.execute(
                select(Hold).where(
                    Hold.status == "active",
                    Hold.expires_at < now
                ).with_for_update(skip_locked=True)
            )
            holds = list(expired.scalars().all())

            if not holds:
                return

            logger.info(f"Found {len(holds)} expired holds to release")
            ws = WalletService(db)

            for hold in holds:
                try:
                    await ws.release(hold.request_id)
                    logger.info(f"Released hold {hold.request_id} (user={hold.user_id}, "
                               f"amount={hold.hold_amount_irr}IRR)")
                except Exception as e:
                    logger.error(f"Failed to release hold {hold.request_id}: {e}")
                    # Continue with other holds

            await db.commit()
    except Exception as e:
        logger.error(f"Settle cron failed: {e}")


async def main():
    """Run settle cron in a loop."""
    logger.info("Settle cron started")
    while True:
        await release_expired_holds()
        await asyncio.sleep(CHECK_INTERVAL)


if __name__ == "__main__":
    asyncio.run(main())
