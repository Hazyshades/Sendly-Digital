#!/usr/bin/env python3
"""Merge up to TARGET CLEAN PRs in Hazyshades/Sendly-Test-Repo over WINDOW_SEC."""
from __future__ import annotations

import json
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

REPO = "Hazyshades/Sendly-Test-Repo"
TARGET = 43
WINDOW_SEC = 3 * 60 * 60  # 3 hours
INTERVAL = WINDOW_SEC / TARGET  # ~251s between merges
LOG = Path(__file__).with_name("merge_worker.log")
STATE = Path(__file__).with_name("merge_worker_state.json")


def log(msg: str) -> None:
    line = f"{datetime.now(timezone.utc).isoformat()} {msg}"
    print(line, flush=True)
    with LOG.open("a", encoding="utf-8") as f:
        f.write(line + "\n")


def gh_json(args: list[str]):
    r = subprocess.run(
        ["gh"] + args,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip() or r.stdout.strip() or f"gh failed: {args}")
    return json.loads(r.stdout) if r.stdout.strip() else None


def gh_run(args: list[str]) -> tuple[int, str, str]:
    r = subprocess.run(
        ["gh"] + args,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    return r.returncode, r.stdout.strip(), r.stderr.strip()


def save_state(data: dict) -> None:
    STATE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def list_candidates() -> list[dict]:
    prs = gh_json(
        [
            "pr",
            "list",
            "-R",
            REPO,
            "--state",
            "open",
            "--limit",
            "200",
            "--json",
            "number,title,mergeable,mergeStateStatus,author,closingIssuesReferences,updatedAt",
        ]
    )
    open_issues = {
        i["number"]
        for i in gh_json(
            [
                "issue",
                "list",
                "-R",
                REPO,
                "--state",
                "open",
                "--limit",
                "100",
                "--json",
                "number",
            ]
        )
    }

    clean = [
        p
        for p in prs
        if p.get("mergeable") == "MERGEABLE" and p.get("mergeStateStatus") == "CLEAN"
    ]

    def score(p: dict) -> tuple:
        refs = [x["number"] for x in (p.get("closingIssuesReferences") or [])]
        open_refs = [n for n in refs if n in open_issues]
        # Prefer PRs that still close an open issue, then newest
        return (0 if open_refs else 1, -p["number"])

    clean.sort(key=score)
    return clean


def merge_one(pr_number: int) -> bool:
    rc, out, err = gh_run(
        [
            "pr",
            "merge",
            str(pr_number),
            "-R",
            REPO,
            "--merge",
            "--delete-branch=false",
        ]
    )
    if rc == 0:
        log(f"MERGED #{pr_number} {out or 'ok'}")
        return True
    log(f"FAIL merge #{pr_number}: {(err or out)[:500]}")
    return False


def main() -> int:
    started = time.time()
    deadline = started + WINDOW_SEC + 120  # small grace
    merged: list[dict] = []
    attempts = 0
    save_state(
        {
            "target": TARGET,
            "started": datetime.now(timezone.utc).isoformat(),
            "interval_sec": INTERVAL,
            "merged_count": 0,
            "merged": [],
        }
    )
    log(f"START target={TARGET} interval={INTERVAL:.1f}s window={WINDOW_SEC}s")

    while len(merged) < TARGET and time.time() < deadline:
        slot = len(merged)
        next_due = started + slot * INTERVAL
        now = time.time()
        if now < next_due:
            sleep_for = min(next_due - now, 30)
            time.sleep(sleep_for)
            continue

        try:
            candidates = list_candidates()
        except Exception as e:
            log(f"ERROR listing PRs: {e}")
            time.sleep(30)
            continue

        if not candidates:
            remaining = deadline - time.time()
            log(f"WAIT no CLEAN mergeable PRs (have {len(merged)}/{TARGET}, {remaining:.0f}s left)")
            time.sleep(min(60, max(5, remaining)))
            continue

        pr = candidates[0]
        attempts += 1
        refs = [x["number"] for x in (pr.get("closingIssuesReferences") or [])]
        log(
            f"TRY #{pr['number']} @{pr['author']['login']} issues={refs} "
            f"title={pr['title'][:100]} ({len(merged)+1}/{TARGET})"
        )
        ok = merge_one(pr["number"])
        if ok:
            entry = {
                "pr": pr["number"],
                "title": pr["title"],
                "author": pr["author"]["login"],
                "issues": refs,
                "at": datetime.now(timezone.utc).isoformat(),
            }
            merged.append(entry)
            save_state(
                {
                    "target": TARGET,
                    "started": datetime.fromtimestamp(started, timezone.utc).isoformat(),
                    "interval_sec": INTERVAL,
                    "merged_count": len(merged),
                    "attempts": attempts,
                    "merged": merged,
                }
            )
            # Brief pause so GitHub can recalculate mergeability
            time.sleep(5)
        else:
            # Don't spin on the same broken PR forever
            time.sleep(15)

    log(f"DONE merged={len(merged)}/{TARGET} attempts={attempts} elapsed={time.time()-started:.0f}s")
    save_state(
        {
            "target": TARGET,
            "started": datetime.fromtimestamp(started, timezone.utc).isoformat(),
            "finished": datetime.now(timezone.utc).isoformat(),
            "interval_sec": INTERVAL,
            "merged_count": len(merged),
            "attempts": attempts,
            "merged": merged,
            "success": len(merged) >= TARGET,
        }
    )
    return 0 if len(merged) >= TARGET else 2


if __name__ == "__main__":
    sys.exit(main())
