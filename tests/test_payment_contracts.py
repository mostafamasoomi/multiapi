"""Regression checks for payment ownership and idempotency contracts."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_payment_history_uses_fastapi_query_validation():
    source = (ROOT / "backend/app/routers/payment.py").read_text()
    assert "from fastapi import" in source and "Query" in source
    assert "limit: int = Query(20, ge=1, le=100)" in source
    assert "limit: int = Field(20" not in source
def test_payment_create_does_not_accept_client_user_id():
    source = (ROOT / "backend/app/routers/payment.py").read_text()
    assert "user_id: int = Depends(_get_user_id)" in source
    assert "req.user_id" not in source


def test_payment_history_is_user_scoped():
    source = (ROOT / "backend/app/routers/payment.py").read_text()
    assert '@pay.get("/history")' in source
    assert '@pay.get("/history/{user_id}")' not in source


def test_settle_locks_hold_and_is_idempotent():
    source = (ROOT / "backend/app/services/wallet.py").read_text()
    assert "with_for_update()" in source
    assert "hold.status != \"active\"" in source


def test_payment_uniqueness_migration_exists():
    source = (ROOT / "backend/app/db/migrations/0005_payment_safety.sql").read_text()
    assert "uq_payment_orders_authority" in source
    assert "uq_payment_orders_ref_id" in source
