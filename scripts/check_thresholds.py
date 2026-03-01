#!/usr/bin/env python3
"""Pre-commit hook: Check for hardcoded thresholds (should use policies/)."""

import re
import sys
from pathlib import Path

# Patterns that suggest hardcoded thresholds
FORBIDDEN_PATTERNS = [
    (r"max_missingness\s*=\s*[\d.]+", "Use policies/01_data_contracts/"),
    (r"min_lift\s*=\s*[\d.]+", "Use policies/04_validation_controls/"),
    (r"threshold\s*=\s*[\d.]+", "Load from policy YAML"),
]
EXEMPT_PATHS = {"scripts/", "tests/", "policies/"}


def main():
    failed = []
    for f in sys.argv[1:] if len(sys.argv) > 1 else []:
        path = Path(f)
        if not path.suffix == ".py":
            continue
        if any(ex in str(path) for ex in EXEMPT_PATHS):
            continue
        content = path.read_text(encoding="utf-8")
        for pattern, msg in FORBIDDEN_PATTERNS:
            if re.search(pattern, content):
                failed.append((str(path), msg))
    if failed:
        for path, msg in failed:
            print(f"{path}: Possible hardcoded threshold - {msg}")
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
