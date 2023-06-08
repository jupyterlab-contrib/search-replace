"""Search regex engine using ripgrep

Inspired by:
https://github.com/simark/theia/commit/5691f3811c5e82fec7fca3ad8e2952c8d03c9026
"""

import asyncio
import json
import logging
import os

from functools import partial
from pathlib import Path
from subprocess import Popen, PIPE
from typing import ClassVar, Iterable, List, Optional, Tuple, Union

import tornado
from jupyter_server.services.contents.manager import (
    AsyncContentsManager,
    ContentsManager,
)
from jupyter_server.utils import ensure_async, url2path

from .log import get_logger


MAX_LOG_OUTPUT = 6000  # type: int


def construct_command(
    query: str,
    case_sensitive: bool,
    whole_word: bool,
    include: List[str],
    exclude: List[str],
    use_regex: bool,
    max_count: int,
):
    """Helper to construct the ripgrep command line."""
    command = ["rg", "--json", "--max-count", f"{max_count}"]

    if not use_regex:
        command.append("--fixed-strings")
    if not case_sensitive:
        command.append("--ignore-case")
    if whole_word:
        command.append("--word-regexp")

    if include:
        for i in include:
            command.extend(["-g", i])
    if exclude:
        for e in exclude:
            command.extend(["-g", f"!{e}"])

    # Deal with query starting with '-'
    command.extend(["--", query])

    return command


def get_utf8_positions(string: str, positions: Iterable[int]) -> List[int]:
    """Get the utf-8 position within a ``string`` from its binary ``position``.

    Args:
        string: The utf-8 string
        position: The binary position
    Returns
        The utf-8 position
    """
    bstring = string.encode("utf-8")
    return [len(bstring[:position].decode("utf-8")) for position in positions]


class SearchEngine:
    """Engine to search recursively for a regex pattern in text files of a directory.

    The implementation is using `ripgrep <https://github.com/BurntSushi/ripgrep>`_.
    """

    # Keep track of the previous search task to run only one task at a time
    search_task: ClassVar[Optional[asyncio.Task]] = None

    def __init__(
        self, contents_manager: Union[AsyncContentsManager, ContentsManager]
    ) -> None:
        """
        Args:
            contents_manager: Server contents manager
        """
        self._contents_manager = contents_manager
        self._root_dir = Path(os.path.expanduser(contents_manager.root_dir)).resolve()

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
            self.log.debug(f"exit code: {returncode!s}")
            error_msg = error.decode("utf-8")
            if returncode == 1 and output:
                # This is the case for no match found
                self.log.debug(f"error: {error_msg}")
                output = output.decode("utf-8")
            else:
                output = error_msg

        self.log.debug(
            f"output: {output[:MAX_LOG_OUTPUT]}"
            + ("..." if len(output) > MAX_LOG_OUTPUT else "")
        )

        return returncode, output

    @property
    def log(self) -> logging.Logger:
        """logging.Logger : Extension logger"""
        return get_logger()

    async def search(
        self,
        query: str,
        path: str = "",
        case_sensitive: bool = False,
        whole_word: bool = False,
        include: Optional[List[str]] = None,
        exclude: Optional[List[str]] = None,
        use_regex: bool = False,
        max_count: int = 100,
    ) -> dict:
        """Search for ``query`` in files in ``path``.

        Notes:
            include and exclude cannot be defined simultaneously

        Args:
            query: The search term
            path: The root folder to run the search in
            case_sensitive: Whether the search is case sensitive or not
            whole_word: Whether the search is for whole words or not
            include: Filters specifying files to include
            exclude: Filters specifying files to exclude
            use_regex: Whether the search term is a regular expression or not
            max_count: The maximal number of lines with matches per file to return

        Returns:
            Dictionary with the matches or the error description
        """
        # JSON output is described at https://docs.rs/grep-printer/0.1.0/grep_printer/struct.JSON.html
        command = construct_command(
            query,
            case_sensitive,
            whole_word,
            include or [],
            exclude or [],
            use_regex,
            max_count,
        )
        cwd = os.path.join(self._root_dir, url2path(path))
        # TODO this is not compatible of a multi-users server
        if SearchEngine.search_task is not None and not SearchEngine.search_task.done():
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
                                    # TODO Provision the ability to get the replacement string from ripgrep
                                    # See https://github.com/BurntSushi/ripgrep/issues/1872
                                    "replace": None,
                                }
                                # Compute positions for utf-8 string
                                positions = get_utf8_positions(
                                    formatted_entry["line"],
                                    [match["start"], match["end"]],
                                )
                                formatted_entry["start_utf8"] = positions[0]
                                formatted_entry["end_utf8"] = positions[1]
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

    def group_matches_by_line(self, line_matches: List[dict]) -> dict:
        """Group matches within a file by line.

        Args:
            line_matches: The matches to group by
        Returns:
            The mapping line/matches positions ``{line_number: List[Tuple[start, end, replace_bytes]]}``
        """
        d = {}
        for match in line_matches:
            if match["line_number"] not in d:
                d[match["line_number"]] = [
                    (match["start"], match["end"], match["replace"].encode("utf-8"))
                ]
            else:
                d[match["line_number"]].append(
                    (match["start"], match["end"], match["replace"].encode("utf-8"))
                )
        for line, matches in d.items():
            d[line] = sorted(matches, key=lambda tup: tup[0])
        return d

    async def replace(self, matches: List, path: str, create_checkpoint=True) -> None:
        """Replace the ``matches`` within ``path``.

        A match is described by a dictionary: {"line_number", "start", "end", "replace"}
        where ``line_number`` is base 1, ``start`` and ``end`` are bytes positions
        in the line and ``replace`` is UTF-8 string to use as replacement.

        Args:
            matches: The search matches to replace
            path: The root folder in which to apply the replace
            create_checkpoint: Whether to create a checkpoint before replacing matches
        """
        for file_match in matches:
            file_relative_path = file_match["path"]
            line_matches = file_match["matches"]

            relative_path = os.path.join(url2path(path), file_relative_path)

            if create_checkpoint:
                self.log.debug(f"Creating checkpoints for {relative_path}")
                await ensure_async(
                    self._contents_manager.create_checkpoint(relative_path)
                )

            file_path: Path = self._root_dir / relative_path

            grouped_line_matches = self.group_matches_by_line(line_matches)

            with file_path.open("rb") as fp:
                data = fp.readlines()
            for line_number, matches in grouped_line_matches.items():
                original_line = data[line_number - 1]
                replaced_line = b""
                for i, match in enumerate(matches):
                    start = 0 if i == 0 else matches[i - 1][1]
                    end = match[0]
                    replace = match[2]
                    replaced_line += original_line[start:end] + replace

                start = matches[-1][1]
                data[line_number - 1] = replaced_line + original_line[start:]

            with file_path.open("wb") as fp:
                fp.writelines(data)
