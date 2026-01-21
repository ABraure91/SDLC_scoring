from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional


@dataclass
class UserFacingError(Exception):
    """
    Exception meant to be shown to end-users as a clean JSON payload.
    """
    code: str
    message: str
    status_code: int = 400
    details: Optional[Any] = None

    def to_dict(self) -> dict:
        payload = {
            "error": {
                "code": self.code,
                "message": self.message,
            }
        }
        if self.details is not None:
            payload["error"]["details"] = self.details
        return payload
