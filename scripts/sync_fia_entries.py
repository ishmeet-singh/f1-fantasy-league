#!/usr/bin/env python3
"""Sync official FIA event entry-list PDFs into race_entries.

Runs in GitHub Actions after the calendar sync and checks recent weekends for
recalled/corrected entry lists. It is deliberately conservative:
only a complete 22-driver roster made entirely of known permanent driver numbers
is published. Existing picks are never deleted.
"""

from __future__ import annotations

import html
import io
import json
import os
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

FIA_BASE_URL = "https://www.fia.com"
CHAMPIONSHIP_DOCUMENTS_URL = (
    f"{FIA_BASE_URL}/documents/championships/fia-formula-one-world-championship-14"
)
FIA_CRAWL_DELAY_SECONDS = 10.0
_last_fia_request_at: float | None = None
TEAM_PATTERNS = [
    ("Racing Bulls", ("racing bulls",)),
    ("Red Bull Racing", ("red bull racing",)),
    ("Aston Martin", ("aston martin",)),
    ("McLaren", ("mclaren",)),
    ("Mercedes", ("mercedes",)),
    ("Ferrari", ("ferrari",)),
    ("Williams", ("williams",)),
    ("Haas", ("haas",)),
    ("Audi", ("audi",)),
    ("Alpine", ("alpine",)),
    ("Cadillac", ("cadillac",)),
]


def wait_for_fia_crawl_delay(url: str) -> None:
    """Respect fia.com's robots.txt delay without slowing calls to our app."""
    global _last_fia_request_at
    if urllib.parse.urlparse(url).hostname not in {"fia.com", "www.fia.com"}:
        return

    now = time.monotonic()
    if _last_fia_request_at is not None:
        remaining = FIA_CRAWL_DELAY_SECONDS - (now - _last_fia_request_at)
        if remaining > 0:
            time.sleep(remaining)
    _last_fia_request_at = time.monotonic()


def request_bytes(url: str, secret: str | None = None, body: dict[str, Any] | None = None) -> bytes:
    headers = {"User-Agent": "f1-fantasy-league/1.0"}
    if secret:
        headers["Authorization"] = f"Bearer {secret}"
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    wait_for_fia_crawl_delay(url)
    request = urllib.request.Request(url, data=data, headers=headers)
    with urllib.request.urlopen(request, timeout=45) as response:
        return response.read()


def normalize(value: str) -> str:
    decomposed = unicodedata.normalize("NFKD", value)
    ascii_value = "".join(char for char in decomposed if not unicodedata.combining(char))
    return re.sub(r"[^a-z0-9]+", " ", ascii_value.lower()).strip()


def season_documents_url(year: int) -> str:
    index = request_bytes(CHAMPIONSHIP_DOCUMENTS_URL).decode("utf-8", errors="replace")
    match = re.search(
        rf'(?:href|value)="([^"]*/season/season-{year}-\d+)"[^>]*>\s*SEASON {year}',
        index,
        re.IGNORECASE,
    )
    if not match:
        raise RuntimeError(f"FIA season documents page not found for {year}")
    href = html.unescape(match.group(1))
    return href if href.startswith("http") else f"{FIA_BASE_URL}{href}"


def event_document_ids(year: int) -> dict[str, str]:
    page = request_bytes(season_documents_url(year)).decode("utf-8", errors="replace")
    matches = re.findall(
        r'/decision-document-list/nojs/(\d+)"[^>]*>\s*([^<]*Grand Prix)\s*</a>',
        page,
        re.IGNORECASE,
    )
    return {normalize(name): event_id for event_id, name in matches}


def find_event_id(grand_prix: str, events: dict[str, str]) -> str | None:
    target = normalize(grand_prix)
    if target in events:
        return events[target]
    target_core = target.replace(" grand prix", "").replace("formula 1", "").strip()
    for name, event_id in events.items():
        name_core = name.replace(" grand prix", "").replace("formula 1", "").strip()
        if target_core == name_core or target_core in name_core or name_core in target_core:
            return event_id
    return None


def flatten_ajax_html(value: Any) -> str:
    if isinstance(value, dict):
        return "\n".join(
            str(item) if key == "data" and isinstance(item, str) else flatten_ajax_html(item)
            for key, item in value.items()
        )
    if isinstance(value, list):
        return "\n".join(flatten_ajax_html(item) for item in value)
    return ""


def entry_list_url(event_id: str) -> str | None:
    payload = json.loads(
        request_bytes(f"{FIA_BASE_URL}/decision-document-list/ajax/{event_id}").decode("utf-8")
    )
    document_html = html.unescape(flatten_ajax_html(payload))
    links = [
        href
        for href, body in re.findall(
            r'<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>',
            document_html,
            re.IGNORECASE | re.DOTALL,
        )
        if re.search(r"\bEntry\s+List\b", re.sub(r"<[^>]+>", " ", body), re.IGNORECASE)
    ]
    if not links:
        return None
    href = links[0].replace("\\/", "/")
    return href if href.startswith("http") else f"{FIA_BASE_URL}{href}"


def extract_pdf_text(url: str) -> str:
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(request_bytes(url)))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def find_driver_position(text: str, code: str, driver_name: str) -> int | None:
    normalized_name = normalize(driver_name)
    surname = normalized_name.split()[-1]
    for match in re.finditer(rf"\b{re.escape(code.upper())}\b", text.upper()):
        window = normalize(text[match.start() : match.start() + 140])
        if surname in window:
            return match.start()
    return None


def team_from_segment(segment: str, fallback: str) -> str:
    normalized = normalize(segment)
    matches: list[tuple[int, str]] = []
    for team, patterns in TEAM_PATTERNS:
        for pattern in patterns:
            position = normalized.find(pattern)
            if position >= 0:
                matches.append((position, team))
    if matches:
        return min(matches, key=lambda item: item[0])[1]
    return fallback or "Unknown"


def parse_race_entries(pdf_text: str, known_drivers: list[dict[str, str]]) -> list[dict[str, str]]:
    main_table = re.split(
        r"In\s+addition\s+to\s+the\s+list\s+of\s+cars\s+and\s+drivers\s+eligible\s+to\s+take\s+part",
        pdf_text,
        maxsplit=1,
        flags=re.IGNORECASE,
    )[0]
    located: list[tuple[int, dict[str, str]]] = []
    for driver in known_drivers:
        position = find_driver_position(main_table, driver["code"], driver["driverName"])
        if position is not None:
            located.append((position, driver))
    located.sort(key=lambda item: item[0])

    entries: list[dict[str, str]] = []
    for index, (position, driver) in enumerate(located):
        end = located[index + 1][0] if index + 1 < len(located) else len(main_table)
        entries.append(
            {
                "driverId": driver["driverId"],
                "driverName": driver["driverName"],
                "team": team_from_segment(main_table[position:end], driver["team"]),
            }
        )
    return entries


def main() -> int:
    app_base_url = os.environ["APP_BASE_URL"].rstrip("/")
    cron_secret = os.environ["CRON_SECRET"]
    endpoint = f"{app_base_url}/api/cron/sync-fia-entries"
    context = json.loads(request_bytes(endpoint, secret=cron_secret))
    try:
        events = event_document_ids(int(context["year"]))
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as error:
        print(f"[fia] FIA unavailable; retaining existing race entries: {error}", file=sys.stderr)
        return 0
    failures: list[str] = []

    for race in context["races"]:
        event_id = find_event_id(race["grand_prix"], events)
        if not event_id:
            print(f"[fia] {race['grand_prix']}: no FIA event page yet")
            continue
        try:
            document_url = entry_list_url(event_id)
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as error:
            print(f"[fia] FIA unavailable; retaining existing race entries: {error}", file=sys.stderr)
            return 0
        if not document_url:
            print(f"[fia] {race['grand_prix']}: entry list not published yet")
            continue

        try:
            pdf_text = extract_pdf_text(document_url)
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as error:
            print(f"[fia] FIA unavailable; retaining existing race entries: {error}", file=sys.stderr)
            return 0
        entries = parse_race_entries(pdf_text, context["drivers"])
        expected_entry_count = int(race["expectedEntryCount"])
        if len(entries) != expected_entry_count:
            message = (
                f"{race['grand_prix']}: parsed {len(entries)}/{expected_entry_count} "
                f"race drivers; refusing update"
            )
            failures.append(message)
            print(f"[fia] {message}", file=sys.stderr)
            continue

        result = json.loads(
            request_bytes(
                endpoint,
                secret=cron_secret,
                body={
                    "raceId": race["id"],
                    "documentUrl": document_url,
                    "entries": entries,
                },
            )
        )
        print(
            f"[fia] {race['grand_prix']}: {result.get('status')} "
            f"(+{len(result.get('addedDriverIds', []))}/-{len(result.get('removedDriverIds', []))}, "
            f"affected picks={result.get('affectedPredictionRows', 0)})"
        )

    if failures:
        raise RuntimeError("; ".join(failures))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
