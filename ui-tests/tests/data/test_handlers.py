import asyncio
import json

import pytest
from jsonschema import validate
from tornado.httpclient import HTTPClientError

from ..search_engine import SearchEngine


async def test_search_get(test_content, schema, jp_fetch):
    response = await jp_fetch("search", params={"query": "strange"}, method="GET")

    assert response.code == 200
    payload = json.loads(response.body)
    validate(instance=payload, schema=schema)
    sorted_payload = sorted(payload["matches"], key=lambda x: x["path"])
    assert len(sorted_payload) == 2
    assert len(sorted_payload[0]["matches"]) == 3
    assert len(sorted_payload[1]["matches"]) == 2
    assert sorted_payload == [
        {
            "path": "test_lab_search_replace/subfolder/text_sub.txt",
            "matches": [
                {
                    "line": "Unicode strange sub file, very strange\n",
                    "match": "strange",
                    "start": 8,
                    "start_utf8": 8,
                    "end": 15,
                    "end_utf8": 15,
                    "line_number": 1,
                    "absolute_offset": 0,
                    "replace": None,
                },
                {
                    "line": "Unicode strange sub file, very strange\n",
                    "match": "strange",
                    "start": 31,
                    "start_utf8": 31,
                    "end": 38,
                    "end_utf8": 38,
                    "line_number": 1,
                    "absolute_offset": 0,
                    "replace": None,
                },
                {
                    "line": "Is that λ strange enough?",
                    "match": "strange",
                    "start": 11,
                    "start_utf8": 10,
                    "end": 18,
                    "end_utf8": 17,
                    "line_number": 3,
                    "absolute_offset": 57,
                    "replace": None,
                },
            ],
        },
        {
            "path": "test_lab_search_replace/text_1.txt",
            "matches": [
                {
                    "line": "Unicode histrange file, very str.*ange\n",
                    "match": "strange",
                    "start": 10,
                    "start_utf8": 10,
                    "end": 17,
                    "end_utf8": 17,
                    "line_number": 1,
                    "absolute_offset": 0,
                    "replace": None,
                },
                {
                    "line": "Is that Strange enough?",
                    "match": "Strange",
                    "start": 8,
                    "start_utf8": 8,
                    "end": 15,
                    "end_utf8": 15,
                    "line_number": 3,
                    "absolute_offset": 59,
                    "replace": None,
                },
            ],
        },
    ]


async def test_search_no_match(test_content, schema, jp_fetch):
    response = await jp_fetch("search", params={"query": "hello"}, method="GET")
    assert response.code == 200
    payload = json.loads(response.body)
    validate(instance=payload, schema=schema)
    assert len(payload["matches"]) == 0


async def test_search_case_sensitive(test_content, schema, jp_fetch):
    response = await jp_fetch(
        "search", params={"query": "Strange", "case_sensitive": "true"}, method="GET"
    )
    assert response.code == 200
    payload = json.loads(response.body)
    validate(instance=payload, schema=schema)
    assert len(payload["matches"]) == 1
    assert len(payload["matches"][0]["matches"]) == 1
    assert sorted(payload["matches"], key=lambda x: x["path"]) == [
        {
            "path": "test_lab_search_replace/text_1.txt",
            "matches": [
                {
                    "line": "Is that Strange enough?",
                    "match": "Strange",
                    "start": 8,
                    "start_utf8": 8,
                    "end": 15,
                    "end_utf8": 15,
                    "line_number": 3,
                    "absolute_offset": 59,
                    "replace": None,
                },
            ],
        }
    ]


async def test_search_whole_word(test_content, schema, jp_fetch):
    response = await jp_fetch(
        "search", params={"query": "strange", "whole_word": "true"}, method="GET"
    )
    assert response.code == 200
    payload = json.loads(response.body)
    validate(instance=payload, schema=schema)
    sorted_payload = sorted(payload["matches"], key=lambda x: x["path"])
    assert len(sorted_payload) == 2
    assert len(sorted_payload[0]["matches"]) == 3
    assert len(sorted_payload[1]["matches"]) == 1
    assert sorted_payload == [
        {
            "path": "test_lab_search_replace/subfolder/text_sub.txt",
            "matches": [
                {
                    "line": "Unicode strange sub file, very strange\n",
                    "match": "strange",
                    "start": 8,
                    "start_utf8": 8,
                    "end": 15,
                    "end_utf8": 15,
                    "line_number": 1,
                    "absolute_offset": 0,
                    "replace": None,
                },
                {
                    "line": "Unicode strange sub file, very strange\n",
                    "match": "strange",
                    "start": 31,
                    "start_utf8": 31,
                    "end": 38,
                    "end_utf8": 38,
                    "line_number": 1,
                    "absolute_offset": 0,
                    "replace": None,
                },
                {
                    "line": "Is that λ strange enough?",
                    "match": "strange",
                    "start": 11,
                    "start_utf8": 10,
                    "end": 18,
                    "end_utf8": 17,
                    "line_number": 3,
                    "absolute_offset": 57,
                    "replace": None,
                },
            ],
        },
        {
            "path": "test_lab_search_replace/text_1.txt",
            "matches": [
                {
                    "line": "Is that Strange enough?",
                    "match": "Strange",
                    "start": 8,
                    "start_utf8": 8,
                    "end": 15,
                    "end_utf8": 15,
                    "line_number": 3,
                    "absolute_offset": 59,
                    "replace": None,
                },
            ],
        },
    ]


async def test_search_include_files(test_content, schema, jp_fetch):
    response = await jp_fetch(
        "search", params={"query": "strange", "include": "*_1.txt"}, method="GET"
    )
    assert response.code == 200
    payload = json.loads(response.body)
    validate(instance=payload, schema=schema)
    sorted_payload = sorted(payload["matches"], key=lambda x: x["path"])
    assert len(sorted_payload) == 1
    assert len(sorted_payload[0]["matches"]) == 2
    assert sorted_payload == [
        {
            "path": "test_lab_search_replace/text_1.txt",
            "matches": [
                {
                    "line": "Unicode histrange file, very str.*ange\n",
                    "match": "strange",
                    "start": 10,
                    "start_utf8": 10,
                    "end": 17,
                    "end_utf8": 17,
                    "line_number": 1,
                    "absolute_offset": 0,
                    "replace": None,
                },
                {
                    "line": "Is that Strange enough?",
                    "match": "Strange",
                    "start": 8,
                    "start_utf8": 8,
                    "end": 15,
                    "end_utf8": 15,
                    "line_number": 3,
                    "absolute_offset": 59,
                    "replace": None,
                },
            ],
        },
    ]


async def test_search_exclude_files(test_content, schema, jp_fetch):
    response = await jp_fetch(
        "search", params={"query": "strange", "exclude": "*_1.txt"}, method="GET"
    )
    assert response.code == 200
    payload = json.loads(response.body)
    validate(instance=payload, schema=schema)
    sorted_payload = sorted(payload["matches"], key=lambda x: x["path"])
    assert len(sorted_payload) == 1
    assert len(sorted_payload[0]["matches"]) == 3
    assert sorted_payload == [
        {
            "path": "test_lab_search_replace/subfolder/text_sub.txt",
            "matches": [
                {
                    "line": "Unicode strange sub file, very strange\n",
                    "match": "strange",
                    "start": 8,
                    "start_utf8": 8,
                    "end": 15,
                    "end_utf8": 15,
                    "line_number": 1,
                    "absolute_offset": 0,
                    "replace": None,
                },
                {
                    "line": "Unicode strange sub file, very strange\n",
                    "match": "strange",
                    "start": 31,
                    "start_utf8": 31,
                    "end": 38,
                    "end_utf8": 38,
                    "line_number": 1,
                    "absolute_offset": 0,
                    "replace": None,
                },
                {
                    "line": "Is that λ strange enough?",
                    "match": "strange",
                    "start": 11,
                    "start_utf8": 10,
                    "end": 18,
                    "end_utf8": 17,
                    "line_number": 3,
                    "absolute_offset": 57,
                    "replace": None,
                },
            ],
        },
    ]


async def test_search_include_and_exclude_files(test_content, schema, jp_fetch):
    with pytest.raises(HTTPClientError) as excinfo:
        response = await jp_fetch(
            "search",
            params={"query": "strange", "exclude": "*_1.txt", "include": "*_sub.txt"},
            method="GET",
        )
    assert str(excinfo.value) == "HTTP 500: Internal Server Error"


async def test_search_literal(test_content, schema, jp_fetch):
    response = await jp_fetch("search", params={"query": "str.*"}, method="GET")
    assert response.code == 200
    payload = json.loads(response.body)
    validate(instance=payload, schema=schema)
    sorted_payload = sorted(payload["matches"], key=lambda x: x["path"])
    assert len(sorted_payload) == 1
    assert len(sorted_payload[0]["matches"]) == 1
    assert sorted_payload == [
        {
            "path": "test_lab_search_replace/text_1.txt",
            "matches": [
                {
                    "line": "Unicode histrange file, very str.*ange\n",
                    "match": "str.*",
                    "start": 29,
                    "start_utf8": 29,
                    "end": 34,
                    "end_utf8": 34,
                    "line_number": 1,
                    "absolute_offset": 0,
                    "replace": None,
                },
            ],
        },
    ]


async def test_search_regex(test_content, schema, jp_fetch):
    response = await jp_fetch(
        "search", params={"query": "str.*", "use_regex": "true"}, method="GET"
    )
    assert response.code == 200
    payload = json.loads(response.body)
    validate(instance=payload, schema=schema)
    sorted_payload = sorted(payload["matches"], key=lambda x: x["path"])
    assert len(sorted_payload) == 2
    assert len(sorted_payload[0]["matches"]) == 2
    assert len(sorted_payload[1]["matches"]) == 2
    assert sorted_payload == [
        {
            "path": "test_lab_search_replace/subfolder/text_sub.txt",
            "matches": [
                {
                    "line": "Unicode strange sub file, very strange\n",
                    "match": "strange sub file, very strange",
                    "start": 8,
                    "start_utf8": 8,
                    "end": 38,
                    "end_utf8": 38,
                    "line_number": 1,
                    "absolute_offset": 0,
                    "replace": None,
                },
                {
                    "line": "Is that λ strange enough?",
                    "match": "strange enough?",
                    "start": 11,
                    "start_utf8": 10,
                    "end": 26,
                    "end_utf8": 25,
                    "line_number": 3,
                    "absolute_offset": 57,
                    "replace": None,
                },
            ],
        },
        {
            "path": "test_lab_search_replace/text_1.txt",
            "matches": [
                {
                    "line": "Unicode histrange file, very str.*ange\n",
                    "match": "strange file, very str.*ange",
                    "start": 10,
                    "start_utf8": 10,
                    "end": 38,
                    "end_utf8": 38,
                    "line_number": 1,
                    "absolute_offset": 0,
                    "replace": None,
                },
                {
                    "line": "Is that Strange enough?",
                    "match": "Strange enough?",
                    "start": 8,
                    "start_utf8": 8,
                    "end": 23,
                    "end_utf8": 23,
                    "line_number": 3,
                    "absolute_offset": 59,
                    "replace": None,
                },
            ],
        },
    ]


@pytest.mark.asyncio
async def test_two_search_operations(test_content, schema, jp_root_dir):
    engine = SearchEngine(jp_root_dir)
    task_1 = asyncio.create_task(engine.search(query="s"))
    payload = await asyncio.create_task(engine.search(query="str.*"))
    assert task_1.cancelled() == True
    validate(instance=payload, schema=schema)
    sorted_payload = sorted(payload["matches"], key=lambda x: x["path"])
    assert len(sorted_payload) == 1
    assert len(sorted_payload[0]["matches"]) == 1
    assert sorted_payload == [
        {
            "path": "test_lab_search_replace/text_1.txt",
            "matches": [
                {
                    "line": "Unicode histrange file, very str.*ange\n",
                    "match": "str.*",
                    "start": 29,
                    "start_utf8": 29,
                    "end": 34,
                    "end_utf8": 34,
                    "line_number": 1,
                    "absolute_offset": 0,
                    "replace": None,
                },
            ],
        },
    ]


async def test_replace_operation(test_content, schema, jp_fetch):
    response = await jp_fetch(
        "search", params={"query": "strange", "exclude": "*_1.txt"}, method="GET"
    )
    assert response.code == 200
    payload = json.loads(response.body)
    validate(instance=payload, schema=schema)
    matches = payload["matches"]
    for fidx, file in enumerate(matches):
        for midx, match in enumerate(file["matches"]):
            match["replace"] = "hello"
            file["matches"][midx] = match
        matches[fidx] = file
    response = await jp_fetch(
        "search",
        body=json.dumps({"matches": matches}),
        method="POST",
    )
    response = await jp_fetch(
        "search", params={"query": "hello", "exclude": "*_1.txt"}, method="GET"
    )
    assert response.code == 200
    payload = json.loads(response.body)
    assert len(payload["matches"]) == 1
    sorted_payload = sorted(payload["matches"], key=lambda x: x["path"])
    assert len(sorted_payload[0]["matches"]) == 3
    assert sorted_payload == [
        {
            "path": "test_lab_search_replace/subfolder/text_sub.txt",
            "matches": [
                {
                    "line": "Unicode hello sub file, very hello\n",
                    "match": "hello",
                    "start": 8,
                    "start_utf8": 8,
                    "end": 13,
                    "end_utf8": 13,
                    "line_number": 1,
                    "absolute_offset": 0,
                    "replace": None,
                },
                {
                    "line": "Unicode hello sub file, very hello\n",
                    "match": "hello",
                    "start": 29,
                    "start_utf8": 29,
                    "end": 34,
                    "end_utf8": 34,
                    "line_number": 1,
                    "absolute_offset": 0,
                    "replace": None,
                },
                {
                    "line": "Is that λ hello enough?",
                    "match": "hello",
                    "start": 11,
                    "start_utf8": 10,
                    "end": 16,
                    "end_utf8": 15,
                    "line_number": 3,
                    "absolute_offset": 53,
                    "replace": None,
                },
            ],
        },
    ]
