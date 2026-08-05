"""Sources that CVs arrive from.

Each connector is responsible only for locating documents and describing where
they came from. Parsing, identity resolution, versioning and audit all happen
in `services.candidate_import`, so adding a source does not mean
reimplementing any of that -- and every source behaves identically once a
document is in hand.

A connector implements:

    name         short identifier stored on the resume version
    is_configured()          whether it can run at all
    fetch(since, limit)      yield CandidateDocument
"""

from services.connectors.base import CandidateDocument, Connector

__all__ = ["CandidateDocument", "Connector"]
