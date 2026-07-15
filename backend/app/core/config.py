"""PHASE-0: settings via pydantic-settings.

Hard rule reminder: NINEROUTER_BASE_URL must ALWAYS be 127.0.0.1 / localhost.
If a deployed value ever resolves to a public interface, the config loader below
refuses to boot (see assert). 9Router is INTERNAL ONLY.
"""
from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    app_name: str = "multiai2"
    env: str = "dev"
    log_level: str = "INFO"

    database_url: str = Field(..., alias="DATABASE_URL")

    redis_url: str = Field(default="redis://127.0.0.1:6379/0", alias="REDIS_URL")

    # 9Router — INTERNAL ONLY.
    ninrouter_base_url: str = Field(default="http://127.0.0.1:4001", alias="NINEROUTER_BASE_URL")

    # 9Router — INTERNAL ONLY. Bind 127.0.0.1.
    ninrouter_api_key: str = Field(default="", alias="NINEROUTER_API_KEY")

    fx_buffer: float = Field(default=1.12, alias="FX_BUFFER")
    default_margin_in: float = Field(default=1.5, alias="DEFAULT_MARGIN_IN")
    default_margin_out: float = Field(default=1.8, alias="DEFAULT_MARGIN_OUT")

    global_daily_upstream_cap_usd: float = Field(
        default=500.0, alias="GLOBAL_DAILY_UPSTREAM_CAP_USD"
    )
    per_model_margin_brake_pct: float = Field(
        default=5.0, alias="PER_MODEL_MARGIN_BRAKE_PCT"
    )
    fx_circuit_breaker_pct: float = Field(default=0.05, alias="FX_CIRCUIT_BREAKER_PCT")
    hold_overprovision: float = Field(default=1.1, alias="HOLD_OVERPROVISION")

    payment_provider: str = Field(default="zarinpal", alias="PAYMENT_PROVIDER")
    zarinpal_merchant_id: str = Field(default="", alias="ZARINPAL_MERCHANT_ID")
    payment_callback_url: str = Field(default="", alias="PAYMENT_CALLBACK_URL")

    telegram_bot_token: str = Field(default="", alias="TELEGRAM_BOT_TOKEN")

    @property
    def is_prod(self) -> bool:
        """Check if running in production."""
        return self.env == "prod"

    @property
    def ninrouter_is_internal(self) -> bool:
        """Refuse to boot if 9Router is not bound to localhost."""
        return any(
            h in self.ninrouter_base_url
            for h in ("127.0.0.1", "localhost", "::1")
        )

    def validate_internal_only(self) -> None:
        assert self.ninrouter_is_internal, (
            "SECURITY: NINEROUTER_BASE_URL must bind to 127.0.0.1/localhost. "
            "9Router is INTERNAL ONLY and must never be exposed."
        )


settings = Settings()
settings.validate_internal_only()
