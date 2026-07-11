"""Fast, dependency-light regression checks for release-critical contracts."""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
sys.path.insert(0, str(BACKEND))


def test_migrations_are_ordered_and_contain_new_account_schema():
    migrations = sorted((BACKEND / "app/db/migrations").glob("*.sql"))
    assert [p.name for p in migrations] == [
        "0001_init.sql",
        "0002_auth_security.sql",
        "0003_profile_notifications.sql",
        "0004_migration_runner.sql",
    ]
    phase7 = migrations[2].read_text()
    assert "CREATE TABLE IF NOT EXISTS notifications" in phase7
    assert "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone" in phase7


def test_protected_notification_queries_are_user_scoped():
    source = (BACKEND / "app/routers/notifications.py").read_text()
    assert "Notification.user_id == user_id" in source
    assert "Notification.id == nid" in source


def test_admin_topup_rejects_non_positive_amounts():
    from app.routers.admin import UserTopup
    from pydantic import ValidationError

    try:
        UserTopup(user_id=1, amount_irr=0)
    except ValidationError:
        return
    raise AssertionError("zero top-up must be rejected")
