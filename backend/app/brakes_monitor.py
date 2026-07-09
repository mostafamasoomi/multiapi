"""PHASE-3: Brakes monitors cron job.

Run continuously via:
  python -m app.brakes_monitor

Checks every 15 minutes:
1. Per-model margin brake (auto-disable low-margin models)
2. Global kill switch (if daily cost > cap)
3. FX circuit breaker status
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import async_session
from app.services.brakes import BrakeService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("brakes_monitor")

CHECK_INTERVAL = 900  # 15 minutes


async def check_brakes():
    """Run all brake checks."""
    try:
        async with async_session() as db:
            bs = BrakeService(db)

            # 1. Per-model margin brake
            disabled = await bs.per_model_margin_brake()
            if disabled:
                logger.warning(f"[ALERT] Margin brake triggered. Disabled: {disabled}")

            # 2. Global kill switch
            triggered = await bs.global_kill_switch()
            if triggered:
                logger.warning("[ALERT] Global kill switch triggered!")

            # 3. FX circuit breaker status
            fx_breaker = await bs.global_settings("fx_circuit_breaker")
            if fx_breaker.get("tripped_at"):
                logger.warning(f"[WARN] FX circuit breaker tripped at {fx_breaker['tripped_at']}")

            # 4. Log status
            ks = await bs.global_settings("kill_switch")
            status = {
                "timestamp": datetime.utcnow().isoformat(),
                "kill_switch_enabled": ks.get("enabled", False),
                "fx_breaker_tripped": bool(fx_breaker.get("tripped_at")),
                "models_disabled_this_run": disabled,
            }
            logger.info(json.dumps(status))
    except Exception as e:
        logger.error(f"Brake check failed: {e}")


async def main():
    """Run brake checks in a loop."""
    logger.info("Brakes monitor started")
    while True:
        await check_brakes()
        await asyncio.sleep(CHECK_INTERVAL)


if __name__ == "__main__":
    asyncio.run(main())
