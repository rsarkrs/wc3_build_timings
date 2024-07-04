# wc3_build_timings

This project contains JS scripts to do the following:

- Collect match data from W3Champions by defined race and league placement
- Downloads all replays associated with matches pulled
- Parses all replays in a folder and stores match data to a local SQLite db for further processing

Parsing is accomplished using w3gjs (https://github.com/PBug90/w3gjs). Minor changes made include capturing pause/unpause actions.

Planned updates will include SQL code, test db, and writeup summarizing work and findings.
