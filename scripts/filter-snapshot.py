#!/usr/bin/env python3
"""
Filter the committed public.* snapshot before applying to the TARGET Supabase
project.

Why this exists
---------------
pg_dump emits INSERT statements that can span many physical lines (string
literals contain newlines). A line-based grep filter drops only the first
line and leaves orphan continuation lines behind, which psql then parses as
top-level tokens (e.g. `### **Executive Summary**`), raising:

    error: backslash commands are restricted; only \\unrestrict is allowed

This script parses the SQL at the statement level (respecting single-quoted
strings with '' escapes) so whole statements are dropped as a unit.

Policy
------
The source project's auth.users rows are gone forever, so every public.* row
that references auth.users would fail its FK on the new TARGET.

  EXCLUDED entirely (historical / auto-repopulated on TARGET):
    audit_logs, profiles, user_roles, benchmark_results, storage_scan_results

  KEPT with the FK column FORCED TO NULL (business content):
    benchmark_tasks.created_by, explore_jobs.created_by

  KEPT unchanged (already NULL in snapshot): applicants.user_id

Reads stdin, writes stdout. Prints exclusion counts to stderr.
"""
from __future__ import annotations
import re
import sys

EXCLUDED_TABLES = {
    "audit_logs",
    "profiles",
    "user_roles",
    "benchmark_results",
    "storage_scan_results",
}
# Business tables where we keep the row but null the FK-to-auth.users column.
# All snapshot INSERTs for these two tables end with the pattern:
#     ..., <created_by>, '<created_at>', '<updated_at>') ON CONFLICT DO NOTHING;
# where <created_by> is either NULL or a single-quoted UUID literal.
NULL_CREATED_BY_TABLES = {"benchmark_tasks", "explore_jobs"}

INSERT_HEAD = re.compile(
    r"(?m)^INSERT\s+INTO\s+public\.([a-z_]+)\s", re.IGNORECASE
)


def iter_statements(text: str):
    """Yield (statement, trailing_whitespace) preserving order.

    Splits on semicolons that are OUTSIDE single-quoted strings. Handles
    the SQL '' escape inside string literals. Does not need to handle
    dollar-quoting because pg_dump --data-only INSERTs never emit it.
    """
    buf: list[str] = []
    in_str = False
    i, n = 0, len(text)
    while i < n:
        ch = text[i]
        buf.append(ch)
        if ch == "'":
            if in_str and i + 1 < n and text[i + 1] == "'":
                buf.append("'")
                i += 2
                continue
            in_str = not in_str
        elif ch == ";" and not in_str:
            # Include any run of whitespace/newlines following the ';' so
            # the emitted stream keeps pg_dump's original formatting.
            j = i + 1
            while j < n and text[j] in " \t\r\n":
                buf.append(text[j])
                j += 1
            yield "".join(buf)
            buf = []
            i = j
            continue
        i += 1
    if buf:
        yield "".join(buf)


def classify(stmt: str) -> tuple[str, str | None]:
    """Return (action, table_name_or_None).

    action ∈ {"keep", "drop", "null_created_by"}.
    Non-INSERT statements (comments, SET, blank runs) always keep.
    """
    stripped = stmt.lstrip()
    m = INSERT_HEAD.match(stripped)
    if not m:
        return "keep", None
    table = m.group(1).lower()
    if table in EXCLUDED_TABLES:
        return "drop", table
    if table in NULL_CREATED_BY_TABLES:
        return "null_created_by", table
    return "keep", table


def main() -> int:
    text = sys.stdin.read()
    dropped: dict[str, int] = {}
    nulled: dict[str, int] = {}
    out: list[str] = []
    for stmt in iter_statements(text):
        action, table = classify(stmt)
        if action == "drop":
            dropped[table] = dropped.get(table, 0) + 1
            continue
        if action == "null_created_by":
            new_stmt, n = NULL_CREATED_BY_RE.subn(r", NULL, \1", stmt)
            if n:
                nulled[table] = nulled.get(table, 0) + 1
            out.append(new_stmt)
            continue
        out.append(stmt)
    sys.stdout.write("".join(out))
    for t in sorted(EXCLUDED_TABLES):
        sys.stderr.write(
            f"  -- excluded {dropped.get(t, 0)} public.{t} row(s) "
            f"(FK to auth.users; source project deleted)\n"
        )
    for t in sorted(NULL_CREATED_BY_TABLES):
        sys.stderr.write(
            f"  -- nulled created_by on {nulled.get(t, 0)} public.{t} row(s) "
            f"(FK to auth.users)\n"
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
