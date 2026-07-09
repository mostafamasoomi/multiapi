#!/usr/bin/env python3
"""Release stale holds (older than TTL) so wallets never freeze.

Run inside the api container (has DB + asyncpg). Called by a cron job
every minute: `python3 /app/settle_cron.py`
"""
import asyncio
import os
import asyncpg

RAW = os.getenv("DATABASE_URL", "postgresql://multiai2:***@127.0.0.1:5432/multiai2")
DB = RAW.replace("postgresql+asyncpg://", "postgresql://")


async def main():
    conn = await asyncpg.connect(DB)
    async with conn.transaction():
        rows = await conn.fetch(
            "SELECT id, user_id, hold_amount_irr, request_id FROM holds "
            "WHERE status='active' AND expires_at < now() FOR UPDATE"
        )
        released = 0
        for r in rows:
            # 1) Mark hold as released
            await conn.execute(
                "UPDATE holds SET status='released', settled_amount_irr=0, "
                "settled_at=now() WHERE id=$1",
                r["id"],
            )
            # 2) Refund wallet (credit back the held amount)
            await conn.execute(
                "UPDATE wallets SET balance_irr = balance_irr + $1, "
                "updated_at = now() WHERE user_id = $2",
                r["hold_amount_irr"], r["user_id"],
            )
            # 3) Record in ledger for audit trail
            balance = await conn.fetchval(
                "SELECT balance_irr FROM wallets WHERE user_id = $1",
                r["user_id"],
            )
            await conn.execute(
                "INSERT INTO ledger (user_id, txn_type, amount_irr, "
                "balance_after_irr, ref_type, ref_id, note, created_at) "
                "VALUES ($1, 'release', $2, $3, 'hold', $4, $5, now())",
                r["user_id"], r["hold_amount_irr"], balance,
                r["request_id"], f"auto-release expired hold {r['request_id']}",
            )
            released += 1
    await conn.close()
    print(f"released {released} stale holds (wallets refunded)")


if __name__ == "__main__":
    asyncio.run(main())
