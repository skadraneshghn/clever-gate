"""Recursive text splitter for large payloads (design principle D4).

Splits text hierarchically by natural boundaries — Markdown headings,
paragraphs, sentences, then words — with a sliding-window overlap to avoid
losing context at boundaries. The splitter is designed to run in the
ProcessPool so the event loop stays unblocked.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

_MARKDOWN_HEADING = re.compile(r"(?<=\n)(#{1,6}\s)", re.MULTILINE)
_PARAGRAPH_SEP = re.compile(r"\n\s*\n")
_SENTENCE_END = re.compile(r"(?<=[.!?])\s+")
_WORD_SEP = re.compile(r"\s+")

_SEPARATORS = [_MARKDOWN_HEADING, _PARAGRAPH_SEP, _SENTENCE_END, _WORD_SEP]


@dataclass(frozen=True)
class TextChunk:
    """A single split chunk with its character offset in the original text."""

    text: str
    start: int
    end: int


def split_text(
    text: str,
    max_chunk_size: int = 2000,
    overlap: int = 200,
) -> list[TextChunk]:
    """Split ``text`` into chunks of at most ``max_chunk_size`` characters.

    Uses recursive splitting: heading → paragraph → sentence → word → char.
    Each chunk overlaps the previous one by ``overlap`` characters to preserve
    context across boundaries.
    """
    if len(text) <= max_chunk_size:
        return [TextChunk(text=text, start=0, end=len(text))]

    return _recursive_split(text, max_chunk_size, overlap, 0, 0)


def _recursive_split(
    text: str,
    max_size: int,
    overlap: int,
    base_offset: int,
    depth: int,
) -> list[TextChunk]:
    """Recursively split text using progressively finer separators."""
    if len(text) <= max_size:
        return [TextChunk(text=text, start=base_offset, end=base_offset + len(text))]

    if depth >= len(_SEPARATORS):
        return _force_split(text, max_size, overlap, base_offset)

    separator = _SEPARATORS[depth]
    pieces = _split_with_separator(text, separator)

    if len(pieces) <= 1:
        return _recursive_split(text, max_size, overlap, base_offset, depth + 1)

    chunks = _merge_pieces(pieces, text, max_size, overlap, base_offset)

    result: list[TextChunk] = []
    for chunk in chunks:
        if len(chunk.text) > max_size:
            result.extend(
                _recursive_split(chunk.text, max_size, overlap, chunk.start, depth + 1)
            )
        else:
            result.append(chunk)
    return result


def _merge_pieces(
    pieces: list[str],
    original_text: str,
    max_size: int,
    overlap: int,
    base_offset: int,
) -> list[TextChunk]:
    """Greedily merge separator-split pieces into chunks <= max_size."""
    chunks: list[TextChunk] = []
    current = ""
    current_start = 0

    for piece in pieces:
        candidate = current + piece
        if current and len(candidate) > max_size:
            end = current_start + len(current)
            chunks.append(
                TextChunk(text=current, start=base_offset + current_start, end=base_offset + end)
            )
            if overlap > 0 and overlap < len(current):
                current = current[-overlap:] + piece
                current_start = end - overlap
            else:
                current = piece
                current_start = end
        else:
            if not current:
                current_start = original_text.find(piece)
                if current_start < 0:
                    current_start = 0
            current = candidate

    if current:
        end = current_start + len(current)
        chunks.append(
            TextChunk(text=current, start=base_offset + current_start, end=base_offset + end)
        )

    return chunks


def _split_with_separator(text: str, separator: re.Pattern[str]) -> list[str]:
    """Split text by separator, keeping the delimiters attached to pieces."""
    parts = separator.split(text)
    delimiters = separator.findall(text)
    result: list[str] = []
    for i, part in enumerate(parts):
        if i > 0 and i - 1 < len(delimiters):
            result.append(delimiters[i - 1])
        if part:
            result.append(part)
    return result


def _force_split(
    text: str,
    max_size: int,
    overlap: int,
    base_offset: int,
) -> list[TextChunk]:
    """Last-resort character-level split with overlap."""
    chunks: list[TextChunk] = []
    step = max(max_size - overlap, 1)
    pos = 0
    while pos < len(text):
        end = min(pos + max_size, len(text))
        chunks.append(
            TextChunk(text=text[pos:end], start=base_offset + pos, end=base_offset + end)
        )
        if end >= len(text):
            break
        pos += step
    return chunks


__all__ = ["TextChunk", "split_text"]
