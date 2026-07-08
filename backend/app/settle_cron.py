#!/usr/bin/env python3
"""Release stale holds (older than TTL) so wallets never freeze.

Run inside the api container (has DB + asyncpg). Called by a cron job
every minute: `python3 /app/settle_cron.py`
"""
import asyncio
import os
import asyncpg

RAW = os.getenv("DATABASE_URL", "postgresql://multiai2:multiai2_dev_pass@127.0.0.1:5432/multiai2")
DB = RAW.replace("postgresql+asyncpg://", "postgresql://")
TTL_HOURS = float(os.getenv("HOLD_TTL_HOURS", "1"))


async def main():
    conn = await asyncpg.connect(DB)
    rows = await conn.fetch(
        "SELECT id, user_id, hold_amount_irr, request_id FROM holds "
        "WHERE status='active' AND expires_at < now()"
    )
    released = 0
    for r in rows:
        await conn.execute(
            "UPDATE holds SET status='settled', settled_amount_irr=0, "
            "settled_at=now() WHERE id=$1",
            r["id"],
        )
        released += 1
    await conn.close()
    print(f"released {released} stale holds")


if __name__ == "__main__":
    asyncio.run(main())
