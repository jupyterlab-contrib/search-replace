import json
from re import search

from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join
import tornado

class RouteHandler(APIHandler):
    @tornado.web.authenticated
    def get(self):
        self.finish(json.dumps({
            "data": "This is /search-replace/get_search_string endpoint!"
        }))

    @tornado.web.authenticated
    def post(self):
        data = self.get_json_body()
        search = data.get('search', 'mariana')
        self.finish(json.dumps({
            "files": [
                {
                    "path": "file/path/dummy.tx",
                    "found": [
                        {
                            "string": f"foo {search}",
                            "line": 23,
                            "column": 4
                        }
                    ]
                }
            ]
        }))

def setup_handlers(web_app):
    host_pattern = ".*$"

    base_url = web_app.settings["base_url"]
    route_pattern = url_path_join(base_url, "search-replace", "get_search_string")
    handlers = [(route_pattern, RouteHandler)]
    web_app.add_handlers(host_pattern, handlers)
