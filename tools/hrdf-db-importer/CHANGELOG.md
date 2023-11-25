# CHANGELOG hrdf-db-importer

25.Nov 2023
- import `LINIE` service_lines metadata in DB `service_line` table, adjust FPLAN lookups for service lines
- adds support for multiple agency_id in BETRIEB file, i.e. `00167 : 800631 800693 8006C4 8006C5 8006SH`
- rename `fplan.infotext_id` fieldname to `fplan.swiss_journey_id` (more specific)
- stop using generic `kennung` parsing, use custom ones for `BETRIEB`, `GLEIS`
- prevent `/tmp` CSV filenames clash, useful when running the importer in parallel for multiple datasets
- harmonize `shared` inclusion, re-use json, db helpers
- apply pylint suggestions

15.Oct 2023
- add support for journey information `A JY` from `INFOTEXT` - [PR #34](https://github.com/openTdataCH/OJP-Showcase/pull/34)
- improve `GLEIS` parsing - [PR #35](https://github.com/openTdataCH/OJP-Showcase/pull/35)