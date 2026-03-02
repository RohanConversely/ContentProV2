#!/usr/bin/env python3
import json
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

_GLOBAL_LOCK = threading.Lock()


class JsonLogger:
    def __init__(
        self,
        global_log_file: str = "storage/logs/execution.log",
        job_log_file: Optional[str] = None,
        include_global_when_job_active: bool = False,
    ) -> None:
        self.global_log_file = Path(global_log_file)
        self.job_log_file = Path(job_log_file) if job_log_file else None
        self.include_global_when_job_active = include_global_when_job_active

    def _ensure_parent(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)

    def _write(self, path: Path, entry: Dict[str, Any]) -> None:
        self._ensure_parent(path)
        line = json.dumps(entry, ensure_ascii=False)
        with _GLOBAL_LOCK:
            with open(path, "a", encoding="utf-8") as f:
                f.write(line + "\n")

    def _targets(self) -> list[Path]:
        if self.job_log_file and not self.include_global_when_job_active:
            return [self.job_log_file]
        if self.job_log_file and self.include_global_when_job_active:
            return [self.global_log_file, self.job_log_file]
        return [self.global_log_file]

    def log(self, level: str, message: str, context: Optional[Dict[str, Any]] = None) -> None:
        entry: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": level.upper(),
            "message": message,
        }
        if context:
            entry["context"] = context
        for target in self._targets():
            self._write(target, entry)

    def debug(self, message: str, context: Optional[Dict[str, Any]] = None) -> None:
        self.log("DEBUG", message, context)

    def info(self, message: str, context: Optional[Dict[str, Any]] = None) -> None:
        self.log("INFO", message, context)

    def warning(self, message: str, context: Optional[Dict[str, Any]] = None) -> None:
        self.log("WARNING", message, context)

    def error(self, message: str, context: Optional[Dict[str, Any]] = None) -> None:
        self.log("ERROR", message, context)


def log_usage(logger: JsonLogger, response: Any, context: Optional[Dict[str, Any]] = None) -> None:
    usage = getattr(response, "usage", None)
    if not usage:
        logger.debug("No token usage available on response.", context)
        return

    try:
        usage_dict = usage if isinstance(usage, dict) else usage.model_dump()
    except Exception:
        try:
            usage_dict = dict(usage)
        except Exception:
            logger.debug("Token usage format not recognized.", context)
            return

    input_tokens = usage_dict.get("input_tokens")
    output_tokens = usage_dict.get("output_tokens")
    total_tokens = usage_dict.get("total_tokens")
    cache_tokens = None

    input_details = usage_dict.get("input_tokens_details") or {}
    if isinstance(input_details, dict):
        cache_tokens = input_details.get("cached_tokens")

    logger.info(
        "Token usage",
        {
            **(context or {}),
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "total_tokens": total_tokens,
            "cached_tokens": cache_tokens,
        },
    )
