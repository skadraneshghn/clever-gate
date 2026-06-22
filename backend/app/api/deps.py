"""Shared API utilities: error envelopes, pagination, and common dependencies."""

from __future__ import annotations

import math
from typing import Any, TypeVar

from fastapi import HTTPException, status
from app.schemas.admin import PaginationMeta
from app.schemas.openai import OpenAIError, OpenAIErrorDetail

T = TypeVar("T")


def openai_error(
    message: str,
    *,
    type_: str = "invalid_request_error",
    status_code: int = status.HTTP_400_BAD_REQUEST,
    param: str | None = None,
    code: str | None = None,
) -> HTTPException:
    """Build an HTTPException whose body matches OpenAI's error envelope."""
    detail = OpenAIErrorDetail(
        message=message, type=type_, param=param, code=code
    )
    return HTTPException(
        status_code=status_code,
        detail=OpenAIError(error=detail).model_dump(),
    )


def pagination_meta(total: int, page: int, page_size: int) -> PaginationMeta:
    """Build :class:`PaginationMeta` from a total count and page params."""
    total_pages = math.ceil(total / page_size) if page_size > 0 else 0
    return PaginationMeta(
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages,
    )


def paginated(items: list[T], total: int, page: int, page_size: int) -> dict[str, Any]:
    """Build a generic paginated response dict."""
    return {
        "items": items,
        "pagination": pagination_meta(total, page, page_size).model_dump(),
    }


__all__ = ["openai_error", "paginated", "pagination_meta"]
