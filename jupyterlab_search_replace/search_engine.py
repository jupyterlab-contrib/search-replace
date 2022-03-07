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
from typing import ClassVar, List, Optional, Tuple

import tornado
from jupyter_server.utils import url2path

from .log import get_logger


MAX_LOG_OUTPUT = 6000  # type: int


def construct_command(
    query, max_count, case_sensitive, whole_word, include, exclude, use_regex
):
    command = ["rg", "-F", query, "--json", f"--max-count={max_count}"]
    if use_regex:
        command.remove("-F")
    if not case_sensitive:
        command.append("--ignore-case")
    if whole_word:
        command.append("--word-regexp")
    if include and exclude:
        raise ValueError("cannot use include and exclude simultaneously")
    if include and type(include) == str:
        command.append("-g")
        command.append(f"{include}")
    if exclude and type(exclude) == str:
        command.append("-g")
        command.append(f"!{exclude}")

    return command


class SearchEngine:
    """Engine to search recursively for a regex pattern in text files of a directory.

    The implementation is using `ripgrep <https://github.com/BurntSushi/ripgrep>`_.
    """

    # Keep track of the previous search task to run only one task at a time
    search_task: ClassVar[Optional[asyncio.Task]] = None

    def __init__(self, root_dir: str) -> None:
        """
        Args:
            root_dir (str): Server root path
        """
        self._root_dir = os.path.expanduser(root_dir)

    async def _execute(
        self, cmd: List[str], cwd: Optional[str] = None
    ) -> Tuple[int, str]:
        """Asynchronously execute a command.

        Args:
            cmd (List[str]): command with arguments to execute


        Returns:
            (int, str): (return code, output) or (return code, error)
        """

        self.log.debug("run '{!s}' in {!s}".format(" ".join(cmd), cwd))

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
            self.log.debug("error: {!s}".format(error.decode("utf-8")))
            output = output.decode("utf-8")

        self.log.debug("output: {!s}".format(output[:MAX_LOG_OUTPUT]))

        if len(output) > MAX_LOG_OUTPUT:
            self.log.debug("...")

        return returncode, output

    @property
    def log(self) -> logging.Logger:
        """logging.Logger : Extension logger"""
        return get_logger()

    async def search(
        self,
        query: str,
        path: str = "",
        max_count: int = 100,
        case_sensitive: bool = False,
        whole_word: bool = False,
        include: Optional[str] = None,
        exclude: Optional[str] = None,
        use_regex: bool = False,
    ):
        """"""
        # JSON output is described at https://docs.rs/grep-printer/0.1.0/grep_printer/struct.JSON.html
        command = construct_command(
            query, max_count, case_sensitive, whole_word, include, exclude, use_regex
        )
        cwd = os.path.join(self._root_dir, url2path(path))
        if SearchEngine.search_task is not None:
            SearchEngine.search_task.cancel()
        SearchEngine.search_task = asyncio.create_task(self._execute(command, cwd=cwd))
        code, output = await SearchEngine.search_task

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
            try:
                output = json.loads(output)
                if output["type"] == "summary":
                    stats = output["data"]["stats"]
                    if (
                        stats["matched_lines"] == 0
                        and stats["matches"] == 0
                        and stats["searches"] == 0
                        and stats["searches_with_match"] == 0
                    ):
                        return {"matches": []}
            except (json.JSONDecodeError, KeyError):
                # If parsing the JSON fails or one key is missing
                # consider the output as invalid
                pass
            return {"code": code, "command": command, "message": output}
