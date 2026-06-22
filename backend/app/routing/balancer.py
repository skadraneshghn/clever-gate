"""Load balancer integrating with LiteLLM Router with circuit breaker tracking."""
from __future__ import annotations

from typing import TYPE_CHECKING, Any

from tenacity import (
    AsyncRetrying,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.observability.logging import get_logger
from app.routing.breaker import is_available, record_failure, record_success
from app.routing.cooldown import is_in_cooldown

if TYPE_CHECKING:
    import litellm

    from app.schemas.openai import ChatCompletionRequest

logger = get_logger(__name__)


def _deployment_id(deployment: dict[str, Any]) -> str:
    """Extract a stable identifier from a litellm deployment dict."""
    info = deployment.get("model_info") or {}
    return str(info.get("id") or deployment.get("model_name") or "")


class LoadBalancer:
    """Thin wrapper around a litellm.Router adding cooldown and breaker tracking.

    The litellm router performs the actual load balancing and provider-level
    retries internally. This class layers on top of it:

    * cooldown awareness when selecting a deployment, and
    * circuit breaker success/failure accounting around each dispatched call,
      with a tenacity exponential-backoff fallback for transient errors.
    """

    def __init__(
        self,
        max_retries: int = 3,
        cooldown_time: int = 60,
        max_fails: int = 3,
    ) -> None:
        self.max_retries = max_retries
        self.cooldown_time = cooldown_time
        self.max_fails = max_fails

    async def select_deployment(
        self,
        model_name: str,
        router: litellm.Router,
    ) -> str:
        """Select an available deployment for a model, skipping cooldowns.

        Delegates candidate enumeration to the litellm router, then filters out
        any deployment currently in cooldown. Returns the deployment identifier,
        falling back to the router's own pick (or the model name) if every
        deployment is cooling down.
        """
        candidates = router.get_model_list(model_name=model_name) or []
        for deployment in candidates:
            deployment_id = _deployment_id(deployment)
            if deployment_id and not await is_in_cooldown(deployment_id):
                return deployment_id
        if candidates:
            return _deployment_id(candidates[0])
        return model_name

    async def dispatch_chat(
        self,
        router: litellm.Router,
        model: str,
        request: ChatCompletionRequest,
        **kwargs: Any,
    ) -> Any:
        """Dispatch a non-streaming chat completion through the router."""
        payload = self._build_payload(request, **kwargs)
        return await self._dispatch(router, model, payload, stream=False)

    async def dispatch_stream(
        self,
        router: litellm.Router,
        model: str,
        request: ChatCompletionRequest,
        **kwargs: Any,
    ) -> Any:
        """Dispatch a streaming chat completion through the router."""
        payload = self._build_payload(request, **kwargs)
        return await self._dispatch(router, model, payload, stream=True)

    async def _dispatch(
        self,
        router: litellm.Router,
        model: str,
        payload: dict[str, Any],
        stream: bool,
    ) -> Any:
        deployment_id = await self.select_deployment(model, router)
        if not await is_available(deployment_id, max_fails=self.max_fails):
            raise RuntimeError(f"Deployment {deployment_id!r} is unavailable")

        retrying = AsyncRetrying(
            stop=stop_after_attempt(self.max_retries),
            wait=wait_exponential(multiplier=1, min=1, max=10),
            retry=retry_if_exception_type(Exception),
            reraise=True,
        )

        result: Any = None
        try:
            async for attempt in retrying:
                with attempt:
                    result = await router.acompletion(
                        model=model,
                        messages=payload["messages"],
                        stream=stream,
                        **payload["extra"],
                    )
        except Exception:
            await record_failure(
                deployment_id,
                max_fails=self.max_fails,
                cooldown_time=self.cooldown_time,
            )
            logger.warning(
                "dispatch.failed",
                deployment_id=deployment_id,
                model=model,
                stream=stream,
            )
            raise

        await record_success(deployment_id)
        return result

    @staticmethod
    def _build_payload(
        request: ChatCompletionRequest,
        **kwargs: Any,
    ) -> dict[str, Any]:
        data = request.model_dump(exclude_none=True, exclude={"model", "messages", "stream"})
        data.update(kwargs)
        return {"messages": request.messages, "extra": data}
