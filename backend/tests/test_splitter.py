"""Tests for the recursive text splitter."""

from app.payload.splitter import split_text


def test_short_text_returns_single_chunk():
    chunks = split_text("hello world", max_chunk_size=100)
    assert len(chunks) == 1
    assert chunks[0].text == "hello world"


def test_long_text_is_split():
    text = "word " * 1000
    chunks = split_text(text, max_chunk_size=200, overlap=20)
    assert len(chunks) > 1
    for chunk in chunks:
        assert len(chunk.text) <= 220  # max_size + overlap


def test_chunks_have_offsets():
    text = "para1\n\npara2\n\npara3"
    chunks = split_text(text, max_chunk_size=10, overlap=0)
    assert len(chunks) >= 1
    for chunk in chunks:
        assert chunk.start <= chunk.end


def test_empty_text():
    chunks = split_text("", max_chunk_size=100)
    assert len(chunks) == 1
    assert chunks[0].text == ""
