#!/usr/bin/env python3
"""Small demo for the bizlogic module.

Run from the `backend/` directory:
  $ python scripts/demo.py
"""

import sys
from pathlib import Path

# Ensure src/ is on sys.path when invoked directly
ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from bizlogic import calculate_discount, CustomerTier  # noqa: E402


def main() -> None:
    for tier in (CustomerTier.standard, CustomerTier.gold, CustomerTier.platinum):
        res = calculate_discount(650, tier)
        print(f"Tier={tier:<9} subtotal={res.subtotal:.2f} discount={res.discount:.2f} total={res.total:.2f} reason={res.reason}")


if __name__ == "__main__":
    main()

