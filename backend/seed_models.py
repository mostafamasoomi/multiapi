#!/usr/bin/env python3
"""Seed model_aliases from 9Router (internal-only). Run inside backend container."""
import os, json, httpx
from sqlalchemy import create_engine, text

NR = os.getenv("NINEROUTER_BASE_URL", "http://127.0.0.1:20128")
DB = os.getenv("DATABASE_URL", "postgresql+asyncpg://multiai2:multiai2_dev_pass@127.0.0.1:5432/multiai2")

def main():
    # sync engine for seeding
    sync_url = DB.replace("postgresql+asyncpg", "postgresql+psycopg2")
    eng = create_engine(sync_url)
    r = httpx.get(f"{NR}/v1/models", timeout=10)
    models = r.json().get("data", [])
    rows = []
    for m in models:
        mid = m["id"]            # e.g. kr/claude-sonnet-4.5
        alias = mid.split("/", 1)[-1]  # claude-sonnet-4.5
        # compliance: kr/gc prefixes are free-tier OAuth upstreams -> NOT paid
        prefix = mid.split("/", 1)[0]
        paid_ok = prefix not in ("kr", "gc", "qd")  # adjust per real upstream keys
        rows.append((alias, mid, "available" if paid_ok else "free_only", paid_ok))
    with eng.begin() as con:
        con.execute(text("DELETE FROM model_aliases"))
        for alias, nr_id, status, paid in rows:
            con.execute(text(
                "INSERT INTO model_aliases (alias, ninrouter_id, status, paid_ok) "
                "VALUES (:a, :n, :s, :p)"),
                {"a": alias, "n": nr_id, "s": status, "p": paid})
    print(f"Seeded {len(rows)} models")

if __name__ == "__main__":
    main()
