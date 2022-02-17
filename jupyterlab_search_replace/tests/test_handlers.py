import json


async def test_search_get(test_content, jp_fetch):
    # When
    response = await jp_fetch("search", params={"query": "strange"}, method="GET")

    # Then
    assert response.code == 200
    payload = json.loads(response.body)
    print(payload)
    assert len(payload["matches"]) == 2
    assert len(payload["matches"][0]["matches"]) == 3
    assert len(payload["matches"][1]["matches"]) == 3
    assert payload["matches"] == [
        {
            "path": "test_lab_search_replace/subfolder/text_sub.txt",
            "matches": [
                {
                    "line": "Unicode strange sub file, very strange\n",
                    "match": "strange",
                    "start": 8,
                    "end": 15,
                    "line_number": 1,
                    "absolute_offset": 0,
                },
                {
                    "line": "Unicode strange sub file, very strange\n",
                    "match": "strange",
                    "start": 31,
                    "end": 38,
                    "line_number": 1,
                    "absolute_offset": 0,
                },
                {
                    "line": "Is that λ strange enough?",
                    "match": "strange",
                    "start": 11,
                    "end": 18,
                    "line_number": 3,
                    "absolute_offset": 57,
                },
            ],
        },
        {
            "path": "test_lab_search_replace/text_1.txt",
            "matches": [
                {
                    "line": "Unicode strange file, very strange\n",
                    "match": "strange",
                    "start": 8,
                    "end": 15,
                    "line_number": 1,
                    "absolute_offset": 0,
                },
                {
                    "line": "Unicode strange file, very strange\n",
                    "match": "strange",
                    "start": 27,
                    "end": 34,
                    "line_number": 1,
                    "absolute_offset": 0,
                },
                {
                    "line": "Is that strange enough?",
                    "match": "strange",
                    "start": 8,
                    "end": 15,
                    "line_number": 3,
                    "absolute_offset": 55,
                },
            ],
        },
    ]
