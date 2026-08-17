"""Watch for Cosmos public connectivity and auto-resume the CV migration.

Loops until the production cluster is reachable, then runs the idempotent
migration (migrate_new_gmail_cvs.py --apply) once and exits. The migration is
safe to run when the cluster recovers: it re-reads existing version_ids and
inserts only what is missing, so there are no duplicates.

Usage (from backend/, with venv + .env):
    venv/Scripts/python.exe watch_resume_migration.py [--interval 120]
"""

import argparse
import os
import subprocess
import sys
import time

from dotenv import load_dotenv
from pymongo import MongoClient
from sync_from_prod import PROD_URL


def prod_reachable() -> bool:
    """Return True if production Cosmos answers a ping."""
    try:
        client = MongoClient(PROD_URL, tls=True, serverSelectionTimeoutMS=15000,
                             connectTimeoutMS=15000, socketTimeoutMS=40000)
        client.admin.command("ping", maxTimeMS=15000)
        return True
    except Exception:
        return False


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--interval", type=int, default=120,
                        help="seconds between connectivity checks")
    args = parser.parse_args()

    load_dotenv(".env")
    if "MONGO_URL" not in os.environ or "DB_NAME" not in os.environ:
        print("[watcher] MONGO_URL / DB_NAME missing from .env", file=sys.stderr)
        return 2

    print(f"[watcher] polling production every {args.interval}s "
          f"(Ctrl+C to stop)", flush=True)
    attempts = 0
    while True:
        attempts += 1
        if prod_reachable():
            print("[watcher] production reachable — starting migration "
                  "--apply", flush=True)
            result = subprocess.run(
                [sys.executable, "migrate_new_gmail_cvs.py", "--apply"],
                check=False)
            print(f"[watcher] migration exited {result.returncode}", flush=True)
            return result.returncode

        print(f"[watcher] unreachable (attempt {attempts}); "
              f"retrying in {args.interval}s", flush=True)
        time.sleep(args.interval)


if __name__ == "__main__":
    raise SystemExit(main())
