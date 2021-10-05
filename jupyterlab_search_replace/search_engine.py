"""Search regex engine using ripgrep

Inspired by:
https://github.com/simark/theia/commit/5691f3811c5e82fec7fca3ad8e2952c8d03c9026
"""

import asyncio
import json
import logging
import os

from functools import partial
from subprocess import Popen, PIPE
from typing import List, Optional, Tuple

import tornado

from .log import get_logger


MAX_LOG_OUTPUT = 6000  # type: int


class SearchEngine:
    """Engine to search recursively for a regex pattern in text files of a directory.

    The implementation is using `ripgrep <https://github.com/BurntSushi/ripgrep>`_.
    """

    def __init__(self, root_dir: str) -> None:
        """
        Args:
            root_dir (str): Server root path
        """
        self._root_dir = root_dir

    async def _execute(
        self, cmd: List[str], cwd: Optional[str] = None
    ) -> Tuple[int, str]:
        """Asynchronously execute a command.

        Args:
            cmd (List[str]): command with arguments to execute


        Returns:
            (int, str): (return code, output) or (return code, error)
        """

        self.log.debug("command: {!s}".format(" ".join(cmd)))

        current_loop = tornado.ioloop.IOLoop.current()
        process = await current_loop.run_in_executor(
            None, partial(Popen, cmd, stdout=PIPE, stderr=PIPE, cwd=cwd)
        )
        try:
            output, error = await current_loop.run_in_executor(
                None, process.communicate
            )
        except asyncio.CancelledError:
            process.terminate()
            await current_loop.run_in_executor(None, process.wait)
            raise

        returncode = process.returncode
        if returncode == 0:
            output = output.decode("utf-8")
        else:
            self.log.debug("exit code: {!s}".format(returncode))
            output = error.decode("utf-8") + output.decode("utf-8")

        self.log.debug("output: {!s}".format(output[:MAX_LOG_OUTPUT]))

        if len(output) > MAX_LOG_OUTPUT:
            self.log.debug("...")

        return returncode, output

    @property
    def log(self) -> logging.Logger:
        """logging.Logger : Extension logger"""
        return get_logger()

    async def search(self, regex: str, path: str = "", max_count: int = 100):
        """"""
        # JSON output is described at https://docs.rs/grep-printer/0.1.0/grep_printer/struct.JSON.html
        command = ["rg", "-e", regex, "--json", f"--max-count={max_count}"]
        code, output = await self._execute(
            command, cwd=os.path.join(self._root_dir, path)
        )

        if code == 0:
            matches_per_files = []
            iter_lines = iter(output.splitlines())
            for line in iter_lines:
                entry = json.loads(line)

                if entry.get("type") == "begin":
                    path = entry.get("data", {}).get("path", {}).get("text")
                    matches = []
                    for file_line in iter_lines:
                        subentry = json.loads(file_line)
                        if subentry.get("type") == "match":
                            data = subentry.get("data")
                            for match in data.get("submatches", []):
                                formatted_entry = {
                                    "line": data.get("lines", {}).get("text"),
                                    "match": match.get("match", {}).get("text"),
                                    "start": match.get("start"),
                                    "end": match.get("end"),
                                }
                                for key in ("line_number", "absolute_offset"):
                                    formatted_entry[key] = data.get(key)

                                matches.append(formatted_entry)

                        elif subentry.get("type") == "end":
                            matches_per_files.append({"path": path, "matches": matches})
                            break

            return {"matches": matches_per_files}
        else:
            return {"code": code, "command": command, "message": output}
