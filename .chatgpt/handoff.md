# Handoff
**Issue:** County cleanup script failed - data still exists in multiple locations
**Ask:** Complete the county cleanup by removing ALL county data from: 1) data/applications/ directories, 2) Firestore applications collection, 3) Firestore user collections related to county data

## Repro
```bash
#!/usr/bin/env bash
set -e
# minimal run to view the form
npm -v || true
echo "Open the app and navigate to San Diego > SOP PDF step. Expect fields to render."
```

## Env & Checks
```bash
$ find data/applications -type d -name '*county*'
data/applications/los_angeles_county_mehko
data/applications/san_diego_county_mehko
```
```bash
$ ls -la data/applications/
total 0
drwxr-xr-x  4 avan  staff  128 Aug 29 16:47 .
drwxr-xr-x  8 avan  staff  256 Aug 30 11:02 ..
drwxr-xr-x  3 avan  staff   96 Aug 29 16:42 los_angeles_county_mehko
drwxr-xr-x  3 avan  staff   96 Aug 29 16:47 san_diego_county_mehko
```
```bash
$ firebase firestore:collections list
Error: firestore:collections is not a Firebase command

Did you mean firestore:locations?
