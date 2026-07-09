"""PHASE-3: Brakes monitors cron job.

Run periodically (e.g., every 15 min) via:
  python -m app.brakes_monitor

Checks:
1. Per-model margin brake (auto-disable low-margin models)
2. Global kill switch (if daily cost > cap)
3. FX circuit breaker status
"""
from __future__ import annotations

import asyncio
import json
import os
import sys
from datetime import datetime

# Add parent dir to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal
from app.models import GlobalSetting
from app.services.brakes import BrakeService


async def check_brakes():
    """Run all brake checks."""
    async with AsyncSessionLocal() as db:
        bs = BrakeService(db)

        # 1. Per-model margin brake
        disabled = await bs.per_model_margin_brake()
        if disabled:
            print(f"[ALERT] Margin brake triggered. Disabled models: {disabled}")

        # 2. Global kill switch
        triggered = await bs.global_kill_switch()
        if triggered:
            print("[ALERT] Global kill switch triggered! Daily upstream cost exceeded cap.")

        # 3. Check FX circuit breaker status
        fx_breaker = await bs.global_settings("fx_circuit_breaker")
        if fx_breaker.get("tripped_at"):
            print(f"[WARN] FX circuit breaker tripped at {fx_breaker['tripped_at']}")

        # 4. Log brake status
        ks = await bs.global_settings("kill_switch")
        status = {
            "timestamp": datetime.utcnow().isoformat(),
            "kill_switch_enabled": ks.get("enabled", False),
            "fx_breaker_tripped": bool(fx_breaker.get("tripped_at")),
            "models_disabled_this_run": disabled,
        }
        print(json.dumps(status))


async def main():
    await check_brakes()


if __name__ == "__main__":
    asyncio.run(main())
