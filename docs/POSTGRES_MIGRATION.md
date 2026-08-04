# Migrating THCO CRM from MongoDB to PostgreSQL

**Status:** proposal, not started
**Prepared:** 4 August 2026
**Question it answers:** why does THCO CRM use MongoDB when `recruit-flow` uses
PostgreSQL, and what would it take to unify them?

---

## 1. Why the two apps differ

Nothing was decided against PostgreSQL. The two applications were simply
scaffolded from different starting points.

`.emergent/emergent.yml` in this repository records the template THCO CRM was
generated from:

```json
"env_image_name": "fastapi_react_mongo_shadcn_base_image_cloud_arm"
```

The CRM was built on Emergent's **FastAPI + React + Mongo + shadcn** base image.
MongoDB came with the template; it was never an evaluated choice. `recruit-flow`
was built separately and uses PostgreSQL Flexible Server (`thco-rf-db-prod`,
v18) with Supabase for document storage.

So the divergence is an accident of tooling, not an architectural decision.

## 2. PostgreSQL is not the problem

`recruit-flow` runs on PostgreSQL without issue, and the same would be true
here. The obstacle is not the database — it is that **this codebase cannot
speak to one**.

The CRM uses the Motor driver directly, with MongoDB query documents written
inline at every call site. There is no ORM, no repository layer, and no
abstraction that could be swapped.

| Coupling point | Count |
|---|---|
| MongoDB driver calls (`find_one`, `insert_one`, `aggregate`, …) | 463 |
| Mongo query operators (`$set`, `$regex`, `$text`, `$group`, …) | 275+ |
| Collections referenced in code | 40 |
| Aggregation pipelines | 27 |
| Index definitions, including full-text | 27 |

Pointing the application at PostgreSQL does not degrade gracefully — it fails
at the first query. Every one of those call sites has to be rewritten.

An analogy that holds: the fuel is fine, the engine is built for a different one.

## 3. What the data actually looks like

Measured from the live database, not estimated.

**23 populated collections, 271 distinct fields.**

| Collection | Documents | Fields | Arrays | Nested |
|---|---|---|---|---|
| `candidates` | 1,305 | 17 | 1 | 0 |
| `external_candidates` | 492 | 26 | 2 | 0 |
| `candidate_activity` | 616 | 5 | 0 | 1 |
| `page_views` | 873 | 12 | 0 | 0 |
| `projects` | 1 | 47 | 3 | 0 |
| `task_boards` / `task_cards` | 9 | 24 | 2 | 0 |
| 17 others | — | — | — | — |

### The data is unusually well-behaved

This is the significant finding. Mongo→SQL migrations usually fail on type
drift — a field that is a string in some documents and a number in others.

**There is none here.** Across both principal collections, zero fields hold
mixed types. Field presence is also largely consistent:

- `candidates`: 15 of 17 fields present in every document
- `external_candidates`: 14 always present, 12 optional

The data modelling is therefore tractable. The difficulty lies in the code.

## 4. Proposed relational schema

A first-cut mapping for the two collections that carry real volume. The same
approach extends to the remaining 21.

### `candidates` (internal CV database)

```sql
CREATE TABLE candidates (
    id                BIGSERIAL PRIMARY KEY,
    candidate_id      TEXT UNIQUE NOT NULL,        -- existing external key
    name              TEXT NOT NULL,
    email             TEXT,
    phone             TEXT,
    linkedin          TEXT,
    experience_years  NUMERIC(4,1),
    raw_text          TEXT,                        -- parsed CV body
    source            TEXT NOT NULL,               -- upload | drive | external
    source_reference  TEXT,
    status            TEXT NOT NULL DEFAULT 'new',
    filename          TEXT,
    uploaded_by       TEXT,
    uploaded_by_name  TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    search_vector     TSVECTOR                     -- replaces the $text index
);

CREATE INDEX candidates_search_idx ON candidates USING GIN (search_vector);
CREATE INDEX candidates_email_idx  ON candidates (lower(email));
CREATE INDEX candidates_status_idx ON candidates (status);
```

Skills are a normalised child table rather than an array, because the CRM
filters and counts by skill:

```sql
CREATE TABLE candidate_skills (
    candidate_id BIGINT REFERENCES candidates(id) ON DELETE CASCADE,
    skill        TEXT NOT NULL,
    PRIMARY KEY (candidate_id, skill)
);
CREATE INDEX candidate_skills_skill_idx ON candidate_skills (skill);
```

### `external_candidates` (talent network)

```sql
CREATE TABLE external_candidates (
    id                 BIGSERIAL PRIMARY KEY,
    candidate_id       TEXT UNIQUE NOT NULL,
    name               TEXT NOT NULL,
    title              TEXT,
    current_role       TEXT,
    current_company    TEXT,
    location           TEXT,
    linkedin           TEXT,
    linkedin_canonical TEXT UNIQUE,                -- dedup key
    source_url         TEXT,
    source_platform    TEXT,
    summary            TEXT,
    ai_summary         TEXT,
    confidence         TEXT,
    discovery_count    INTEGER NOT NULL DEFAULT 1,
    geo_verified       BOOLEAN,
    name_verified      BOOLEAN,
    stale              BOOLEAN NOT NULL DEFAULT false,
    enriched           BOOLEAN NOT NULL DEFAULT false,
    first_discovered   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    match_reasons      JSONB,                      -- unordered, never queried
    search_vector      TSVECTOR
);

CREATE INDEX ext_candidates_search_idx ON external_candidates USING GIN (search_vector);
CREATE UNIQUE INDEX ext_candidates_canonical_idx ON external_candidates (linkedin_canonical)
    WHERE linkedin_canonical IS NOT NULL;
```

### Array and nested-field decisions

| Field | Treatment | Reason |
|---|---|---|
| `candidates.skills` | child table | filtered and aggregated on |
| `external_candidates.skills` | child table | same |
| `match_reasons` | `JSONB` | display only, never queried |
| `projects.*` arrays | `JSONB` | read as a whole, not filtered |
| `candidate_activity.details` | `JSONB` | free-form audit payload |

`ObjectId` (`_id`) is dropped. Every collection already carries its own
string business key (`candidate_id`, `user_id`, …), which becomes the natural
unique column alongside a `BIGSERIAL` primary key.

Timestamps are currently ISO-8601 **strings**. They become `TIMESTAMPTZ`,
which is a genuine improvement — sorting and range queries are correct rather
than lexicographic.

## 5. Code migration scope

The schema is the smaller half of the work.

| Area | Work |
|---|---|
| 463 driver call sites | Rewrite to SQLAlchemy or asyncpg |
| 27 aggregation pipelines | Rewrite as SQL with `GROUP BY` / CTEs |
| `$text` search (9 uses) | Replace with `tsvector` + `GIN`, including ranking |
| `$regex` filters (41) | `ILIKE` or trigram indexes |
| 27 index definitions | Redefine as PostgreSQL indexes |
| Dedup logic | `talent_dedup.py` upserts become `INSERT … ON CONFLICT` |
| Data migration | One-off ETL, MongoDB → PostgreSQL |
| Test suite | Every data path re-tested |

### Rough effort

| Phase | Estimate |
|---|---|
| Schema design and review | 3–5 days |
| Data access layer (models, session, repositories) | 5–8 days |
| Rewriting the 463 call sites | 10–15 days |
| Aggregations and full-text search | 4–6 days |
| ETL and reconciliation | 3–4 days |
| Testing and stabilisation | 5–8 days |
| **Total** | **~6–9 weeks, one engineer** |

This assumes no feature work lands in parallel. It roughly doubles if the
application continues to be developed during the migration.

## 6. Risks

- **Full-text behaviour changes.** `$text` and `tsvector` tokenise and stem
  differently. Search results will not be identical, and the ranking used by
  candidate matching will need re-tuning.
- **A long-lived branch.** A migration of this size diverges from `main` for
  weeks. Continued feature work causes painful merges.
- **Schema rigidity.** Sourcing currently writes whatever fields a provider
  returns. Under PostgreSQL, new fields require migrations — better discipline,
  but a change in workflow.
- **No rollback once cut over.** Writes to the new database are not
  reflected back into MongoDB.

## 7. Recommendation

**Decouple the two decisions.**

1. **Now — deploy on MongoDB.** The application is ready: it is containerised,
   verified running, and the data migration is written and tested against the
   full 1,761 records. Azure hosts MongoDB natively via Cosmos DB for MongoDB
   (vCore), so this remains an Azure-native deployment on the company
   subscription. Nothing about it precludes a later move to PostgreSQL.

2. **Then — plan the PostgreSQL migration properly**, if unifying with
   `recruit-flow` is the goal. It is a sound objective: one database
   technology, one operational model, one set of skills. It is also a
   6–9 week project that deserves its own planning and testing cycle.

Attempting both at once risks delivering neither.

### If unification is the priority

The pragmatic sequence is to introduce a data access layer **first**, while
still on MongoDB — collapsing 463 scattered driver calls into a repository
interface. That is useful work in its own right, and it reduces the eventual
PostgreSQL swap from a rewrite of the whole application to a rewrite of one
layer.
