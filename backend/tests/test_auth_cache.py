"""The identity cache must never outlive a change that matters.

Resolving a caller costs four database round trips (session, user, headed
units, and a project count). Caching that briefly is what keeps the free-tier
cluster answering under page polling. The risk it introduces is stale rights,
so these tests pin the invalidation rather than the speed-up.
"""

import time

import server


def _seed(token, user_id, **extra):
    server._user_cache_put(token, {"user_id": user_id, **extra})


def setup_function():
    server.clear_user_cache()


def test_a_cached_identity_is_returned():
    _seed("tok-a", "user-1", role="super_admin")
    got = server._user_cache_get("tok-a")
    assert got["user_id"] == "user-1"
    assert got["role"] == "super_admin"


def test_the_caller_cannot_corrupt_the_cache():
    _seed("tok-a", "user-1", headed_units=["technology"])
    got = server._user_cache_get("tok-a")
    got["headed_units"].append("sales")
    got["role"] = "tampered"
    again = server._user_cache_get("tok-a")
    assert again.get("role") != "tampered", "callers decorate this dict; it must be a copy"


def test_an_unknown_token_is_a_miss():
    assert server._user_cache_get("never-seen") is None


def test_an_entry_expires():
    original = server._USER_CACHE_TTL
    server._USER_CACHE_TTL = 0.05
    try:
        _seed("tok-a", "user-1")
        assert server._user_cache_get("tok-a") is not None
        time.sleep(0.1)
        assert server._user_cache_get("tok-a") is None
    finally:
        server._USER_CACHE_TTL = original


def test_signing_out_forgets_that_session_only():
    _seed("tok-a", "user-1")
    _seed("tok-b", "user-2")
    server.invalidate_user_cache(token="tok-a")
    assert server._user_cache_get("tok-a") is None
    assert server._user_cache_get("tok-b") is not None


def test_changing_a_password_forgets_every_session_of_that_person():
    _seed("tok-a", "user-1")
    _seed("tok-b", "user-1")
    _seed("tok-c", "user-2")
    server.invalidate_user_cache(user_id="user-1")
    assert server._user_cache_get("tok-a") is None
    assert server._user_cache_get("tok-b") is None
    assert server._user_cache_get("tok-c") is not None


def test_naming_a_unit_head_forgets_everyone():
    # A unit head change alters more than one person's rights, so the whole
    # cache goes rather than trying to work out who was affected.
    _seed("tok-a", "user-1")
    _seed("tok-b", "user-2")
    server.clear_user_cache()
    assert server._user_cache_get("tok-a") is None
    assert server._user_cache_get("tok-b") is None


def test_the_cache_is_bounded():
    for i in range(server._USER_CACHE_MAX + 50):
        _seed(f"tok-{i}", f"user-{i}")
    assert len(server._USER_CACHE) <= server._USER_CACHE_MAX
