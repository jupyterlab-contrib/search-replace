import asyncio
import json

import tornado
from jupyter_server.base.handlers import APIHandler, path_regex
from jupyter_server.utils import url_path_join

from .search_engine import SearchEngine


class RouteHandler(APIHandler):
    def initialize(self) -> None:
        self._engine = SearchEngine(self.contents_manager)

    @tornado.web.authenticated
    async def get(self, path: str = ""):
        """GET request handler to perform a search."""
        query = self.get_query_argument("query")
        case_sensitive = self.get_query_argument("case_sensitive", "false") == "true"
        whole_word = self.get_query_argument("whole_word", "false") == "true"
        include = self.get_query_arguments("include")
        exclude = self.get_query_arguments("exclude")
        use_regex = self.get_query_argument("use_regex", "false") == "true"
        max_count = int(self.get_query_argument("max_count", "100"))
        try:
            r = await self._engine.search(
                query,
                path,
                case_sensitive,
                whole_word,
                include,
                exclude,
                use_regex,
                max_count,
            )
        except asyncio.exceptions.CancelledError:
            r = {"code": 1, "message": "Task was cancelled."}
        except FileNotFoundError as e:
            if "'rg'" in str(e):
                r = {"code": 2, "message": "ripgrep command not found."}
            else:
                raise e

        if r.get("code") is not None:
            self.set_status(500)
        else:
            self.set_status(200)

        self.finish(json.dumps(r))

    @tornado.web.authenticated
    async def post(self, path: str = ""):
        """POST request handler to perform a replace action."""
        json_body = self.get_json_body()
        matches = json_body["matches"]

        await self._engine.replace(matches, path)

        self.set_status(201)


def setup_handlers(web_app):
    host_pattern = ".*$"

    base_url = web_app.settings["base_url"]
    route_pattern = url_path_join(base_url, "search" + path_regex)
    handlers = [(route_pattern, RouteHandler)]
    web_app.add_handlers(host_pattern, handlers)
