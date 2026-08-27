"""One place the rest of the app asks a language model a question.

This replaces the `emergentintegrations` import that
`CROWTHER_MIGRATION_PLAN.md` §11.2 records as broken: that package is not in
`requirements.txt`, what loads instead is a local stub whose constructors
raise, and it depended on `EMERGENT_LLM_KEY` — a key belonging to the
scaffolding vendor. The plan's own prescription is followed here: *"replace
the `emergentintegrations` import with a `litellm` adapter; move off
`EMERGENT_LLM_KEY`."*

Three rules, and they are the whole design:

**Never raise into a request.** Every failure — no key, bad key, timeout,
rate limit, malformed JSON — returns `None`. A project page that breaks
because a language model was slow is worse than a project page with no
intelligence on it, and Tier 4 sits on top of Tiers 1–3 rather than inside
them.

**Never silently pretend.** `availability()` reports exactly why the layer is
off, so the interface can say "no model configured" rather than showing an
empty panel that looks like a bug. A recommendation that came from a model
is labelled as such everywhere it surfaces.

**Provider-agnostic, one env var.** `litellm` already routes to Groq,
Anthropic, OpenAI and the rest behind one call, and it is already a pinned
dependency. Changing provider is `LLM_MODEL` plus that provider's key —
no code change, which is what makes it safe to start on a free tier and move
to a better model later.
"""

import asyncio
import json
import logging
import os
import re
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# Which model to talk to, in litellm's `provider/model` form. Groq is the
# default because it is the provider this deployment already has a key slot
# for; nothing else in the code assumes it.
DEFAULT_MODEL = "groq/llama-3.3-70b-versatile"

# Each provider reads its own key. Listed rather than inferred so that adding
# a provider is a visible edit and an unset key produces a precise message
# instead of a generic auth failure from deep inside the client.
PROVIDER_KEYS = {
    "groq": "GROQ_API_KEY",
    "anthropic": "ANTHROPIC_API_KEY",
    "openai": "OPENAI_API_KEY",
    "azure": "AZURE_API_KEY",
    "gemini": "GEMINI_API_KEY",
    "mistral": "MISTRAL_API_KEY",
}

# A project page waits on this. Past roughly this long the honest answer is
# "no suggestion" rather than a spinner nobody asked for -- the panel already
# has something to show without us.
TIMEOUT_SECONDS = float(os.environ.get("LLM_TIMEOUT_SECONDS", "20"))

# Suggestions are short by design: a paragraph and a few bullet points. A large
# ceiling here would only ever buy a rambling answer, never a better one.
DEFAULT_MAX_TOKENS = 1200


def model_name() -> str:
    return os.environ.get("LLM_MODEL", DEFAULT_MODEL)


def _provider(model: str) -> str:
    return model.split("/", 1)[0] if "/" in model else "openai"


def availability() -> Dict[str, Any]:
    """Whether the intelligence layer can run, and if not, precisely why.

    Returned to the browser so a panel can say "no model configured" and mean
    it. The key itself is never included — only whether one is present.
    """
    model = model_name()
    provider = _provider(model)
    key_env = PROVIDER_KEYS.get(provider)
    key_set = bool(key_env and os.environ.get(key_env))

    if not key_env:
        return {
            "available": False, "model": model, "provider": provider,
            "reason": f"No key environment variable is mapped for provider '{provider}'.",
            "fix": f"Add it to PROVIDER_KEYS in services/llm.py, or set LLM_MODEL to a mapped provider.",
        }
    if not key_set:
        return {
            "available": False, "model": model, "provider": provider,
            "reason": f"{key_env} is not set.",
            "fix": f"Set {key_env} in backend/.env, then restart the backend.",
        }
    return {
        "available": True, "model": model, "provider": provider,
        "reason": None, "fix": None,
    }


def is_available() -> bool:
    return availability()["available"]


# One live probe result, cached for the process. `availability()` can only
# report that a key is *present*; it cannot tell a working key from a revoked
# one, and reporting "available" for a key that 403s is the most misleading
# thing this module could do. `verify()` settles it with one tiny call and
# remembers the answer, so the truth costs one request rather than one per
# page load.
_verified: Optional[Dict[str, Any]] = None


async def verify(force: bool = False) -> Dict[str, Any]:
    """Actually call the model once to prove the key works.

    Returns the `availability()` shape with `verified` and, on failure, the
    provider's own error text — which is what tells somebody whether to fix
    the key, the model name, or their billing.
    """
    global _verified
    if _verified is not None and not force:
        return _verified

    state = availability()
    if not state["available"]:
        _verified = {**state, "verified": False}
        return _verified

    reply = await complete(
        system="Reply with the single word: ok",
        prompt="ok",
        max_tokens=5,
        temperature=0,
    )
    if reply:
        _verified = {**state, "verified": True}
    else:
        _verified = {
            **state,
            "available": False,
            "verified": False,
            "reason": (
                f"{PROVIDER_KEYS[state['provider']]} is set, but the provider rejected it "
                f"or was unreachable. Check the backend log for the exact error."
            ),
            "fix": f"Replace {PROVIDER_KEYS[state['provider']]} in backend/.env with a "
                   f"working key, or set LLM_MODEL to a provider you have a key for.",
        }
    return _verified


def _extract_json(text: str) -> Optional[Any]:
    """Pull a JSON object out of a model response.

    Even asked for JSON and nothing else, models fence it in ```json blocks or
    add a sentence in front. Rather than fail the whole suggestion on that,
    strip fences and fall back to the outermost brace-balanced span.
    """
    if not text:
        return None
    cleaned = text.strip()

    fenced = re.search(r"```(?:json)?\s*(.+?)```", cleaned, re.DOTALL)
    if fenced:
        cleaned = fenced.group(1).strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start >= 0 and end > start:
        try:
            return json.loads(cleaned[start:end + 1])
        except json.JSONDecodeError:
            return None
    return None


async def complete(
    system: str,
    prompt: str,
    *,
    max_tokens: int = DEFAULT_MAX_TOKENS,
    temperature: float = 0.2,
    json_mode: bool = False,
) -> Optional[str]:
    """Ask the model once. `None` on any failure, never an exception.

    `litellm` is imported here rather than at module scope on purpose: it is a
    heavy import that would slow every backend boot, including the boots where
    no key is configured and nothing will ever call this.
    """
    state = availability()
    if not state["available"]:
        logger.info("LLM call skipped: %s", state["reason"])
        return None

    model = state["model"]
    api_key = os.environ.get(PROVIDER_KEYS[state["provider"]])

    kwargs: Dict[str, Any] = {
        "model": model,
        "api_key": api_key,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
        "max_tokens": max_tokens,
        # Low, because every use of this is extraction, scoring or drafting
        # against real project records. Invention is the failure mode here,
        # not dullness.
        "temperature": temperature,
        "timeout": TIMEOUT_SECONDS,
    }
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    try:
        from litellm import acompletion
    except Exception as exc:                     # pragma: no cover
        logger.warning("litellm is not importable, intelligence layer is off: %s", exc)
        return None

    try:
        response = await asyncio.wait_for(
            acompletion(**kwargs), timeout=TIMEOUT_SECONDS + 5
        )
        return (response.choices[0].message.content or "").strip() or None
    except asyncio.TimeoutError:
        logger.warning("LLM call timed out after %ss (%s)", TIMEOUT_SECONDS, model)
        return None
    except Exception as exc:
        # Deliberately broad. Providers raise their own exception types for
        # auth, rate limits, content filters and outages, and there is exactly
        # one correct response to all of them here: no suggestion.
        logger.warning("LLM call failed (%s): %s: %s", model, type(exc).__name__, exc)
        return None


async def complete_json(
    system: str,
    prompt: str,
    *,
    max_tokens: int = DEFAULT_MAX_TOKENS,
    temperature: float = 0.2,
) -> Optional[Any]:
    """`complete`, but the answer is parsed JSON or nothing."""
    system = (
        f"{system}\n\n"
        "Reply with a single valid JSON object and nothing else. "
        "No prose before or after it, no markdown fences."
    )
    raw = await complete(
        system, prompt, max_tokens=max_tokens, temperature=temperature, json_mode=True
    )
    if raw is None:
        return None
    parsed = _extract_json(raw)
    if parsed is None:
        logger.warning("LLM returned unparseable JSON: %.200s", raw)
    return parsed


def clip(text: Any, limit: int) -> str:
    """Trim a field before it goes into a prompt.

    Transcripts and extracted PDFs run to tens of thousands of characters. The
    useful signal for these tasks is near the top, and sending the rest costs
    money and context for nothing.
    """
    if not isinstance(text, str):
        return ""
    text = text.strip()
    return text if len(text) <= limit else text[:limit].rstrip() + " …[trimmed]"


def bulleted(items: List[str], limit: int = 20) -> str:
    """Render a list for a prompt, capped so one long project cannot dominate."""
    rows = [str(i).strip() for i in items if str(i or "").strip()]
    out = "\n".join(f"- {r}" for r in rows[:limit])
    if len(rows) > limit:
        out += f"\n- …and {len(rows) - limit} more"
    return out or "- (none recorded)"
