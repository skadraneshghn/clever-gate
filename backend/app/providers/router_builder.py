"""Router builder — dynamically builds a ``litellm.Router`` from DB records.

The admin panel stores providers, deployments and routing rules in the
database. This service reads those records and constructs a
:class:`litellm.Router` with the appropriate model list, fallbacks, retry and
cooldown settings. When the configuration changes the router is rebuilt and
atomically swapped in, enabling **hot reload** without a server restart
(design principle D7).
"""

from __future__ import annotations

import asyncio
from typing import TYPE_CHECKING, Any

from sqlalchemy import select

from app.config import get_settings
from app.db.session import db_context
from app.observability.logging import get_logger

if TYPE_CHECKING:
    import litellm
    from app.db.models.provider import Deployment, Provider, ProviderKey, RoutingRule

logger = get_logger(__name__)


class RouterBuilder:
    """Builds and holds the current ``litellm.Router`` instance.

    The router is rebuilt whenever provider/deployment/key configuration
    changes. A rebuild lock prevents concurrent rebuilds and the swap is atomic
    so in-flight requests continue against the old router.
    """

    def __init__(self) -> None:
        self._router: Any = None
        self._lock = asyncio.Lock()
        self._version: int = 0

    @property
    def router(self) -> Any:
        """Return the current router (may be ``None`` before first build)."""
        return self._router

    @property
    def version(self) -> int:
        """Monotonically increasing build version."""
        return self._version

    async def build(self) -> Any:
        """Rebuild the router from the database and swap it in atomically."""
        async with self._lock:
            model_list = await self._load_model_list()
            router_settings = await self._load_router_settings()
            if not model_list:
                logger.warning("router_builder.empty_model_list")
                self._router = None
                return None

            import litellm

            self._router = litellm.Router(
                model_list=model_list,
                **router_settings,
            )
            self._version += 1
            logger.info(
                "router_builder.built",
                version=self._version,
                deployments=len(model_list),
            )
            return self._router

    async def get_or_build(self) -> Any:
        """Return the current router, building it lazily on first access."""
        if self._router is None:
            await self.build()
        return self._router

    # ------------------------------------------------------------------ #
    # Data loading
    # ------------------------------------------------------------------ #
    async def _load_model_list(self) -> list[dict[str, Any]]:
        """Load enabled deployments + their decrypted provider keys."""
        from app.db.models.provider import Deployment, Provider, ProviderKey
        from app.utils.crypto import decrypt

        async with db_context() as session:
            stmt = (
                select(Deployment, Provider, ProviderKey)
                .join(Provider, Deployment.provider_id == Provider.id)
                .outerjoin(
                    ProviderKey,
                    (ProviderKey.provider_id == Provider.id)
                    & (ProviderKey.is_enabled.is_(True)),
                )
                .where(Deployment.is_enabled.is_(True))
                .where(Provider.is_enabled.is_(True))
            )
            result = await session.execute(stmt)

            rows = result.all()
            if not rows:
                return []

            model_list: list[dict[str, Any]] = []
            seen_deployments: set[Any] = set()

            for deployment, provider, key in rows:
                if deployment.id in seen_deployments:
                    continue
                seen_deployments.add(deployment.id)

                litellm_params: dict[str, Any] = dict(
                    deployment.litellm_params or {}
                )
                litellm_params["model"] = deployment.litellm_model

                if key is not None:
                    try:
                        api_key = decrypt(key.encrypted_key)
                        litellm_params.setdefault("api_key", api_key)
                    except Exception:
                        logger.error(
                            "router_builder.decrypt_failed",
                            provider_key_id=str(key.id),
                        )

                if provider.base_url:
                    litellm_params.setdefault("api_base", provider.base_url)

                model_info: dict[str, Any] = {"id": str(deployment.id)}
                if deployment.tpm:
                    model_info["tpm"] = deployment.tpm
                if deployment.rpm:
                    model_info["rpm"] = deployment.rpm

                entry: dict[str, Any] = {
                    "model_name": deployment.model_name,
                    "litellm_params": litellm_params,
                    "model_info": model_info,
                }
                model_list.append(entry)

            return model_list

    async def _load_router_settings(self) -> dict[str, Any]:
        """Load routing rules and merge with config defaults."""
        from app.db.models.provider import RoutingRule

        settings = get_settings()
        base: dict[str, Any] = {
            "routing_strategy": settings.CG_ROUTING_STRATEGY,
            "num_retries": settings.CG_NUM_RETRIES,
            "timeout": settings.CG_TIMEOUT,
            "allowed_fails": settings.CG_ALLOWED_FAILS,
            "cooldown_time": settings.CG_COOLDOWN_TIME,
        }

        async with db_context() as session:
            result = await session.execute(
                select(RoutingRule).where(RoutingRule.is_enabled.is_(True))
            )
            rules: list[RoutingRule] = list(result.scalars().all())

        fallbacks: list[dict[str, list[str]]] = []
        context_window_fallbacks: list[dict[str, list[str]]] = []
        for rule in rules:
            if rule.fallbacks:
                fallbacks.append(rule.fallbacks)
            if rule.context_window_fallbacks:
                context_window_fallbacks.append(rule.context_window_fallbacks)

        if fallbacks:
            base["fallbacks"] = fallbacks
        if context_window_fallbacks:
            base["context_window_fallbacks"] = context_window_fallbacks

        redis_url = settings.REDIS_URL
        if redis_url:
            base.setdefault("redis_host", redis_url)

        return base


_builder: RouterBuilder | None = None


def get_router_builder() -> RouterBuilder:
    """Return the global :class:`RouterBuilder` singleton."""
    global _builder
    if _builder is None:
        _builder = RouterBuilder()
    return _builder


__all__ = ["RouterBuilder", "get_router_builder"]
