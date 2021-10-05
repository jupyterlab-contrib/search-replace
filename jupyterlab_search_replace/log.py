import logging
from typing import Optional

from traitlets.config import Application


class _ExtensionLogger:
    _LOGGER: Optional[logging.Logger] = None

    @classmethod
    def get_logger(cls) -> logging.Logger:
        if cls._LOGGER is None:
            app = Application.instance()
            cls._LOGGER = logging.getLogger(
                "{!s}.jupyterlab_search_replace".format(app.log.name)
            )
            app.clear_instance()

        return cls._LOGGER


get_logger = _ExtensionLogger.get_logger
