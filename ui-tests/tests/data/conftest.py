import json
import shutil

import pytest
from pathlib import Path

SCHEMA_FILE = Path(__file__).parent / "schema.json"
TEST_PATH = "test_lab_search_replace"


@pytest.fixture
def schema():
    return json.load(open(SCHEMA_FILE, "r"))


@pytest.fixture
def test_content(jp_root_dir):
    full_test_path = jp_root_dir / TEST_PATH
    test_file = full_test_path / "text_1.txt"
    test_file.parent.mkdir(parents=True, exist_ok=True)
    test_file.write_text(
        "\n".join(
            [
                "Unicode histrange file, very str.*ange",
                "ü notebook with λ",
                "Is that Strange enough?",
            ]
        )
    )

    test_sub_file = full_test_path / "subfolder" / "text_sub.txt"
    test_sub_file.parent.mkdir(parents=True, exist_ok=True)
    test_sub_file.write_text(
        "\n".join(
            [
                "Unicode strange sub file, very strange",
                "ü notebook with ",
                "Is that λ strange enough?",
            ]
        )
    )

    yield full_test_path

    shutil.rmtree(str(full_test_path))
