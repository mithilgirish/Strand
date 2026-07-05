"""Compatibility entrypoint for seeding the STRAND demo stores."""
from __future__ import annotations

import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.graph.seed import seed_all


if __name__ == "__main__":
    seed_all()
