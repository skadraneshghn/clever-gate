"""Provider adapter registry — maps adapter types to adapter instances."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.providers.base import ProviderAdapter


class ProviderRegistry:
    """Registry of available provider adapters keyed by ``adapter_type``.

    The registry is populated at startup with the built-in adapters (phase 1:
    only ``litellm``). Custom adapters can be registered at runtime.
    """

    def __init__(self) -> None:
        self._adapters: dict[str, ProviderAdapter] = {}

    def register(self, adapter: ProviderAdapter) -> None:
        """Register an adapter under its ``name``."""
        self._adapters[adapter.name] = adapter

    def get(self, adapter_type: str) -> ProviderAdapter | None:
        """Return the adapter for ``adapter_type`` or ``None`` if unknown."""
        return self._adapters.get(adapter_type)

    def get_required(self, adapter_type: str) -> ProviderAdapter:
        """Return the adapter or raise if the type is not registered."""
        adapter = self._adapters.get(adapter_type)
        if adapter is None:
            raise KeyError(f"No provider adapter registered for type {adapter_type!r}")
        return adapter

    @property
    def registered_types(self) -> list[str]:
        return list(self._adapters)


_registry: ProviderRegistry | None = None


def get_registry() -> ProviderRegistry:
    """Return the global :class:`ProviderRegistry`, creating it on first call."""
    global _registry
    if _registry is None:
        _registry = ProviderRegistry()
    return _registry


def register_default_adapters() -> None:
    """Register the built-in adapters shipped with the gateway."""
    from app.providers.litellm_adapter import LiteLLMAdapter

    registry = get_registry()
    registry.register(LiteLLMAdapter())


__all__ = ["ProviderRegistry", "get_registry", "register_default_adapters"]
