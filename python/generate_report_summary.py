#!/usr/bin/env python3
"""
Optional Python enhancement for Clockwork OrangeHRM Desktop.
Reads a report payload from stdin JSON and returns a concise summary + anomalies.
"""

from __future__ import annotations

import json
import sys
from typing import Any, Dict, List


def load_payload() -> Dict[str, Any]:
    raw = sys.stdin.read().strip()
    if not raw:
        return {"rows": [], "totals": {"hours": 0, "records": 0, "users": 0}}
    return json.loads(raw)


def build_summary(payload: Dict[str, Any]) -> Dict[str, Any]:
    rows: List[Dict[str, Any]] = payload.get("rows", [])
    totals: Dict[str, Any] = payload.get("totals", {})

    total_hours = float(totals.get("hours", 0))
    record_count = int(totals.get("records", len(rows)))
    user_count = int(totals.get("users", len({row.get('username') for row in rows if row.get('username')})))

    anomalies = []
    for row in rows:
        hours = row.get("hours")
        if isinstance(hours, (int, float)) and hours >= 12:
            anomalies.append(
                {
                    "username": row.get("username", "unknown"),
                    "date": row.get("date", ""),
                    "hours": round(float(hours), 2),
                }
            )

    average_hours = round(total_hours / record_count, 2) if record_count else 0

    summary = (
        f"Processed {record_count} attendance records for {user_count} user(s). "
        f"Total hours: {total_hours:.2f}. Average hours per record: {average_hours:.2f}."
    )

    if anomalies:
        summary += f" Found {len(anomalies)} potential anomaly entries with 12+ hours."
    else:
        summary += " No high-hour anomalies detected."

    return {
        "summary": summary,
        "anomalies": anomalies,
        "rowCount": record_count,
    }


def main() -> int:
    try:
        payload = load_payload()
        output = build_summary(payload)
        sys.stdout.write(json.dumps(output))
        return 0
    except Exception as exc:  # pragma: no cover
        sys.stderr.write(f"python-summary-error: {exc}\n")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
