import json

import tornado
import asyncio
from jupyter_server.base.handlers import APIHandler, path_regex
from jupyter_server.utils import url_path_join

from .search_engine import SearchEngine


class RouteHandler(APIHandler):
    def initialize(self) -> None:
        self._engine = SearchEngine(self.contents_manager.root_dir)

    @tornado.web.authenticated
    async def get(self, path: str = ""):
        query = self.get_query_argument("query")
        max_count = self.get_query_argument("max_count", 100)
        case_sensitive = self.get_query_argument("case_sensitive", False)
        whole_word = self.get_query_argument("whole_word", False)
        include = self.get_query_argument("include", None)
        exclude = self.get_query_argument("exclude", None)
        use_regex = self.get_query_argument("use_regex", False)
        try:
            r = await self._engine.search(
                query,
                path,
                max_count,
                case_sensitive,
                whole_word,
                include,
                exclude,
                use_regex,
            )
        except asyncio.exceptions.CancelledError:
+            r = {"code": 1, "message": "task was cancelled"}

        if r.get("code") is not None:
            self.set_status(500)
        else:
            self.set_status(200)

        self.finish(json.dumps(r))


def setup_handlers(web_app):
    host_pattern = ".*$"

    base_url = web_app.settings["base_url"]
    route_pattern = url_path_join(base_url, "search" + path_regex)
    handlers = [(route_pattern, RouteHandler)]
    web_app.add_handlers(host_pattern, handlers)
