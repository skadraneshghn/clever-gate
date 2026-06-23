"""WebSocket endpoint for real-time log streaming.

Connects to the Redis Pub/Sub log channel and streams events to the admin
client with frame batching (50 ms windows) to prevent browser overload.
Implements heartbeat ping/pong and graceful connection teardown.
"""

from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect, status
from jose import JWTError, jwt

from app.config import get_settings
from app.core.pooling import get_redis
from app.db.models.user import User
from app.db.session import db_context
from app.observability.logging import get_logger
from sqlalchemy import select

logger = get_logger(__name__)
router = APIRouter()

_PUBSUB_CHANNEL = "cg:logs:pubsub"
_BATCH_WINDOW = 0.05  # 50 ms
_HEARTBEAT_INTERVAL = 30  # seconds
_MAX_RECONNECT_RETRIES = 3


@router.websocket("/ws/logs")
async def stream_logs(
    websocket: WebSocket,
    token: str = Query(...),
    level: str | None = Query(None),
):
    """Real-time log stream over WebSocket.

    Authentication is via a JWT ``token`` query parameter (browsers can't
    set custom headers on WebSocket connections).

    Optional ``level`` query param pre-filters events server-side.
    """
    admin = await _authenticate(token)
    if admin is None:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await websocket.accept()

    try:
        await _stream_loop(websocket, level)
    except WebSocketDisconnect:
        logger.info("ws.logs.disconnected", user=admin.username)
    except Exception as exc:
        logger.warning("ws.logs.error", error=str(exc))
    finally:
        try:
            await websocket.close()
        except Exception:
            pass


async def _authenticate(token: str) -> User | None:
    """Validate the JWT token and return the admin user."""
    settings = get_settings()
    try:
        payload = jwt.decode(
            token,
            settings.CG_JWT_SECRET,
            algorithms=[settings.CG_JWT_ALGORITHM],
        )
        if payload.get("type") != "access":
            return None

        import uuid

        user_id = uuid.UUID(str(payload["sub"]))
    except (JWTError, KeyError, ValueError):
        return None

    async with db_context() as session:
        result = await session.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user is None or not user.is_active or not user.is_admin:
            return None
        return user


async def _stream_loop(websocket: WebSocket, level_filter: str | None) -> None:
    """Subscribe to Redis Pub/Sub and stream batched log events.

    Handles Redis connection failures gracefully — if Redis is temporarily
    unavailable the WebSocket stays alive (sending heartbeats) and retries
    the subscription instead of crashing.
    """
    batch: list[str] = []
    loop = asyncio.get_running_loop()
    last_flush = loop.time()
    last_activity = loop.time()

    pubsub = None

    try:
        while True:
            # (Re)connect to Redis Pub/Sub if needed
            if pubsub is None:
                try:
                    redis = await get_redis()
                    pubsub = redis.pubsub()
                    await pubsub.subscribe(_PUBSUB_CHANNEL)
                except Exception:
                    pubsub = None

            # Try to get a message (only if pubsub is connected)
            msg = None
            if pubsub is not None:
                try:
                    msg = await asyncio.wait_for(
                        pubsub.get_message(
                            ignore_subscribe_messages=True, timeout=1
                        ),
                        timeout=2,
                    )
                except asyncio.TimeoutError:
                    msg = None
                except Exception:
                    try:
                        await pubsub.aclose()
                    except Exception:
                        pass
                    pubsub = None

            # Process message
            if msg and msg.get("type") == "message":
                raw = msg.get("data")
                if isinstance(raw, bytes):
                    raw = raw.decode("utf-8")
                if raw:
                    should_append = True
                    if level_filter:
                        try:
                            event = json.loads(raw)
                            if event.get("level", "").upper() != level_filter.upper():
                                should_append = False
                        except json.JSONDecodeError:
                            pass
                    if should_append:
                        batch.append(raw)
                        last_activity = loop.time()

            now = loop.time()
            if batch and (len(batch) >= 50 or now - last_flush >= _BATCH_WINDOW):
                await websocket.send_text(json.dumps(batch))
                batch.clear()
                last_flush = now
                last_activity = now

            # Heartbeat — keeps the WebSocket alive when idle
            if now - last_activity >= _HEARTBEAT_INTERVAL:
                await websocket.send_text(json.dumps({"type": "heartbeat"}))
                last_activity = now

            # If Redis is down, sleep before retrying to avoid a tight loop
            if pubsub is None:
                await asyncio.sleep(1)
    finally:
        if pubsub is not None:
            try:
                await pubsub.unsubscribe(_PUBSUB_CHANNEL)
                await pubsub.aclose()
            except Exception:
                pass


__all__ = ["router"]
