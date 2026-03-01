#!/usr/bin/env python3
"""Pre-commit hook: Check that Python files have zone headers."""

import re
import sys
from pathlib import Path

ZONE_PATTERN = re.compile(r"#\s*ZONE:\s*(CHALLENGER|CONTENDER|CHAMPION|CORE)", re.IGNORECASE)
EXEMPT_PATHS = {"scripts/", "tests/", "app/", "examples/", "mcp/"}


def main():
    # Pre-commit passes file list as args; if none, pass (allow manual run)
    failed = []
    files = sys.argv[1:] if len(sys.argv) > 1 else []
    if not files:
        sys.exit(0)
    for f in files:
        p = Path(f)
        if p.suffix != ".py":
            continue
        if any(ex in str(p) for ex in EXEMPT_PATHS):
            continue
        content = p.read_text(encoding="utf-8")
        if "# ZONE:" not in content and "ZONE:" not in content.upper():
            failed.append(str(p))
    if failed:
        print("Missing ZONE header in:", ", ".join(failed))
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
