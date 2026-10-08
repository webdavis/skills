---
name: tiktok-crawling
description: >-
  Crawl TikTok with yt-dlp: download single videos, whole profiles or collections, keep an
  incremental archive, filter by date, views, duration or title, export metadata only as JSON, JSONL
  or CSV, analyze it with jq, run on a schedule, and diagnose empty results, 403s and region locks.
  Use whenever a request mentions TikTok videos, creators, profiles, hashtags, sounds, engagement
  metrics or TikTok data analysis, even if it does not say "download" or "crawl".
---

# TikTok crawling with yt-dlp

yt-dlp downloads video, audio and metadata from TikTok and
[many other sites](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md). Everything
below is a yt-dlp command; nothing else is needed.

## Setup and a check before you start

```bash
brew install yt-dlp ffmpeg        # macOS; or: pip install yt-dlp, plus ffmpeg from your package manager
yt-dlp --update                   # TikTok changes often; most failures are a stale yt-dlp
yt-dlp --list-extractors | grep -i tiktok
```

The last line shows what works today. yt-dlp marks broken TikTok extractors `(CURRENTLY BROKEN)`; at
the time of writing `tiktok:tag`, `tiktok:sound` and `tiktok:effect` were, while single videos,
`tiktok:user`, `tiktok:collection`, `tiktok:live` and `vm.tiktok` short links worked. **There is no
TikTok search extractor**: a `tiktoksearch:` prefix does not exist, so search is done by crawling a
profile or collection and filtering (below). Run the check before promising a hashtag or sound crawl.

## Download

One video:

```bash
yt-dlp "https://www.tiktok.com/@handle/video/1234567890"
```

A whole profile, one folder per video with its metadata:

```bash
yt-dlp "https://www.tiktok.com/@handle" \
  -P "./tiktok/data" \
  -o "%(uploader)s/%(upload_date)s-%(id)s/video.%(ext)s" \
  --write-info-json \
  --download-archive "./tiktok/downloaded.txt"
```

```
tiktok/data/handle/20260220-7331234567890/video.mp4
tiktok/data/handle/20260220-7331234567890/video.info.json
```

`--download-archive` records every id it downloads and skips them next time, so the same command run
later fetches only what is new. Keep it from the first run. Several profiles are a loop over the same
command with the same archive. A collection URL (`https://www.tiktok.com/@handle/collection/...`)
takes the same flags.

Formats: `-F <url>` lists them; `-f best` picks the best muxed one. TikTok formats carry the watermark
unless `-F` shows one without it.

## Filter

Dates are `YYYYMMDD`:

```bash
--dateafter 20260215                              # on or after
--datebefore 20260220                             # on or before
--dateafter "$(date -u -v-7d +%Y%m%d)"            # last 7 days, macOS
--dateafter "$(date -u -d '7 days ago' +%Y%m%d)"  # last 7 days, Linux
```

Metadata filters, combinable with `&`:

```bash
--match-filters "view_count >= 100000"
--match-filters "duration >= 30 & duration <= 60"
--match-filters "title ~= (?i)recipe"            # ~= is a regex match
--playlist-end 50                                # stop after N videos
```

## Metadata only

Preview, then export, without downloading anything:

```bash
yt-dlp "https://www.tiktok.com/@handle" --simulate --print "%(upload_date)s | %(view_count)s views | %(title)s"
yt-dlp "https://www.tiktok.com/@handle" --simulate -j > handle.jsonl             # one JSON object per line
yt-dlp "https://www.tiktok.com/@handle" --simulate --dump-json > handle.json     # one array
yt-dlp "https://www.tiktok.com/@handle" --simulate \
  --print-to-file "%(uploader)s,%(id)s,%(upload_date)s,%(view_count)s,%(like_count)s,%(webpage_url)s" \
  "./tiktok/analysis/metadata.csv"
```

Analyze the `.info.json` files or the JSONL with jq:

```bash
jq -s 'sort_by(.view_count) | reverse | .[:10] | .[] | {title, view_count, url: .webpage_url}' tiktok/data/*/*/*.info.json
jq -s 'map(.view_count) | add' tiktok/data/*/*/*.info.json
jq -s 'group_by(.upload_date) | map({date: .[0].upload_date, count: length})' tiktok/data/*/*/*.info.json
```

For charts or cross-creator comparison, load the JSONL or CSV into pandas.

## Authentication and schedule

TikTok rate-limits anonymous requests, so an empty result is usually fixed by cookies:

```bash
yt-dlp --cookies-from-browser chrome "https://www.tiktok.com/@handle"
yt-dlp --cookies tiktok_cookies.txt "https://www.tiktok.com/@handle"
```

Cookies are a logged-in session. Use a separate low-privilege browser profile, delete exported cookie
files afterwards, and keep downloads in a scoped project directory with a retention decision.

A daily crawl is the profile command in a script, with pauses between downloads, run from cron:

```bash
#!/bin/bash
set -euo pipefail
for handle in handle1 handle2; do
  yt-dlp "https://www.tiktok.com/@$handle" \
    -P "./tiktok/data" -o "%(uploader)s/%(upload_date)s-%(id)s/video.%(ext)s" \
    --write-info-json --download-archive "./tiktok/downloaded.txt" \
    --cookies-from-browser chrome \
    --dateafter "$(date -u -v-7d +%Y%m%d)" \
    --sleep-interval 2 --max-sleep-interval 5
done
```

```
0 2 * * * cd /path/to/project && ./scripts/scrape-tiktok.sh >> ./tiktok/logs/cron.log 2>&1
```

## Troubleshooting

| problem | fix |
| --- | --- |
| empty results, no videos | `yt-dlp --update`, then `--cookies-from-browser chrome` |
| 403 Forbidden | rate limited: wait 10 to 15 minutes, use cookies or another IP |
| "Video unavailable" | region lock: `--xff <country code>` (the current name of `--geo-bypass`) or a VPN |
| hashtag or sound URL fails | check `--list-extractors`; crawl the creators instead and filter |
| fewer videos than the profile shows | pass `--playlist-end N` explicitly and use cookies |
| slow downloads | `--concurrent-fragments 4` |
| anything else | `yt-dlp -v <url> 2>&1 \| tee debug.log` and read the first error |

## Reference

| option | meaning |
| --- | --- |
| `-P PATH` / `-o TEMPLATE` | base directory / filename template |
| `--write-info-json` | save metadata beside each video |
| `--download-archive FILE` | record ids, skip them next run |
| `--dateafter` / `--datebefore DATE` | date bounds, `YYYYMMDD` |
| `--match-filters EXPR` | filter on metadata fields |
| `--playlist-end N` | stop after N videos |
| `--simulate`, `-j`, `--dump-json`, `--print`, `--print-to-file` | metadata without downloading |
| `--cookies-from-browser NAME` / `--cookies FILE` | authenticate |
| `--sleep-interval` / `--max-sleep-interval SEC` | pause between downloads |

Template fields: `%(id)s`, `%(uploader)s`, `%(upload_date)s`, `%(title).50s` (first 50 characters),
`%(view_count)s`, `%(like_count)s`, `%(ext)s`.
[Full template reference](https://github.com/yt-dlp/yt-dlp#output-template).

Based on RomneyDa's `tiktok-crawling` ClawHub skill; see `skill-card.md`.
