"""Startup seeder for shipped/bundled proposals.

Runs once on backend startup. If a record for a bundled proposal doesn't exist,
creates the client + proposal pointing at the bundled file in static_assets/.
Idempotent — safe to run on every boot.
"""
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path

logger = logging.getLogger("seed_proposals")

# (client_name, share_token, original_filename, bundled_path, file_size, require_email)
BUNDLED_PROPOSALS = [
    {
        "client_name": "THCO Ventures",
        "share_token": "JYLe33GgkcNbvIUcDLGTF3M7jOSxiV-kNkCOQy7w4eg",
        "original_filename": "AI Lab Venture Document.pdf",
        "bundled_filename": "ai-lab-venture.pdf",
        "require_email": True,
    },
]


async def seed_bundled_proposals(db, backend_root: Path):
    """Insert bundled proposals + their clients if not already present."""
    try:
        for spec in BUNDLED_PROPOSALS:
            bundled_path = backend_root / "static_assets" / "proposals" / spec["bundled_filename"]
            if not bundled_path.exists():
                logger.warning(f"Bundled file missing, skipping seed: {bundled_path}")
                continue

            file_size = bundled_path.stat().st_size

            # Ensure client exists (lookup by name, case-insensitive)
            client = await db.clients.find_one(
                {"name": {"$regex": f"^{spec['client_name']}$", "$options": "i"}},
                {"_id": 0, "client_id": 1},
            )
            if not client:
                client_id = f"client_{uuid.uuid4().hex[:12]}"
                await db.clients.insert_one({
                    "client_id": client_id,
                    "name": spec["client_name"],
                    "description": "",
                    "created_by": "system_seed",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                })
                logger.info(f"Seeded client {spec['client_name']} as {client_id}")
            else:
                client_id = client["client_id"]

            # Ensure proposal exists (lookup by share_token — stable identifier)
            existing = await db.proposals.find_one(
                {"share_token": spec["share_token"]},
                {"_id": 0, "proposal_id": 1, "file_path": 1},
            )
            file_path_str = str(bundled_path)
            if existing:
                # Repoint to bundled path in case container layout changed across deploys
                if existing.get("file_path") != file_path_str:
                    await db.proposals.update_one(
                        {"share_token": spec["share_token"]},
                        {"$set": {"file_path": file_path_str,
                                  "file_size": file_size,
                                  "require_email": spec["require_email"]}},
                    )
                    logger.info(f"Re-pointed bundled proposal {spec['original_filename']} → {file_path_str}")
                continue

            proposal_id = f"prop_{uuid.uuid4().hex[:12]}"
            await db.proposals.insert_one({
                "proposal_id": proposal_id,
                "share_token": spec["share_token"],
                "client_id": client_id,
                "client_name": spec["client_name"],
                "original_filename": spec["original_filename"],
                "file_path": file_path_str,
                "file_type": "PDF",
                "file_size": file_size,
                "require_email": spec["require_email"],
                "created_by": "system_seed",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "uploaded_at": datetime.now(timezone.utc).isoformat(),
            })
            logger.info(f"Seeded proposal {spec['original_filename']} (share_token={spec['share_token']})")
    except Exception as e:
        logger.exception(f"Bundled proposal seed failed: {e}")
