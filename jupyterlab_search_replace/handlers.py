import json

import tornado
from jupyter_server.base.handlers import APIHandler, path_regex
from jupyter_server.utils import url_path_join

from .search_engine import SearchEngine


class RouteHandler(APIHandler):
    def initialize(self) -> None:
        self._engine = SearchEngine(self.contents_manager.root_dir)

    @tornado.web.authenticated
    async def get(self, path: str = ""):
        regex = self.get_query_argument("regex")
        max_count = self.get_query_argument("max_count", 100)
        r = await self._engine.search(regex, path, max_count)

        if r.get("code") is not None:
            self.set_status(500)
        else:
            self.set_status(200)

        self.finish(json.dumps(r))


def setup_handlers(web_app):
    host_pattern = ".*$"

    base_url = web_app.settings["base_url"]
    route_pattern = url_path_join(base_url, "search-regex" + path_regex)
    handlers = [(route_pattern, RouteHandler)]
    web_app.add_handlers(host_pattern, handlers)
