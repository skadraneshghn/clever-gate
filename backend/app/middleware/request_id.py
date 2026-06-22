"""Request ID middleware: propagates X-Request-ID via contextvars."""
from __future__ import annotations

import contextvars
import uuid
from typing import TYPE_CHECKING

import structlog
from starlette.middleware.base import BaseHTTPMiddleware

if TYPE_CHECKING:
    from starlette.requests import Request
    from starlette.responses import Response

REQUEST_ID_HEADER = "X-Request-ID"

#: Contextvar holding the current request id for structured logging and tracing.
request_id_var: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "request_id", default=None
)


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Ensure every request carries an X-Request-ID and bind it for logging.

    If the inbound request already provides the header it is reused; otherwise a
    fresh UUID4 is generated. The id is stored in :data:`request_id_var` and
    bound to structlog's contextvars for the duration of the request, then the
    header is echoed on the response.
    """

    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get(REQUEST_ID_HEADER) or str(uuid.uuid4())
        token = request_id_var.set(request_id)
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=request_id)
        try:
            response: Response = await call_next(request)
        finally:
            request_id_var.reset(token)
            structlog.contextvars.clear_contextvars()
        response.headers[REQUEST_ID_HEADER] = request_id
        return response
