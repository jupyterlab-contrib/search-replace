import pytest

from ..search_engine import get_utf8_positions


@pytest.mark.parametrize(
    "string, position, expected",
    (
        ("hello the world", 0, ""),
        ("hello the world", 15, "hello the world"),
        ("hello €urope λ £ngland", 9, "hello €"),
        ("hello €urope λ £ngland", 17, "hello €urope λ"),
    ),
)
def test_get_utf8_positions(string, position, expected):
    pos = get_utf8_positions(string, [position])
    assert string[: pos[0]] == expected
