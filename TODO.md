# TODO

Running list of deferred tasks (not yet done).

## Before handoff

- [ ] **Clean the site down to Administrator + seed data** (reinstall + reseed).
      Approach confirmed: `bench reinstall` (wipes all data), re-apply dev config
      (`developer_mode`, `allow_cors`), then `python3 seed-demo.py` once.
      End state: Administrator + the 3 demo accounts + ONE clean demo course,
      no dummy data, no duplicate demo courses.
      - A full DB backup was taken 2026-10-08 and copied to `backups/`
        (gitignored) — restore with `bench restore` if anything goes wrong.
      - App code, custom fields, property setters, print formats and the EN/HI/MR
        language limit all survive (code/fixtures, not data).

- [ ] **Commit the 6 working-tree fixes** (currently live-but-uncommitted):
      `assessment.py` (EN/HI/MR languages), `content.py` + `api.py` +
      `content_review.py` + `lms-api.ts` (coordinator capability fixes),
      `youtube.ts` (privacy-enhanced embed). Plus the `demo-steps.txt` video
      tweak (separate commit).

## Product gaps (post-pilot)

- [ ] **Per-language certificate templates.** The plumbing exists
      (`get_certificate_template` selects `"Shatam Certificate - <Language>"`);
      just needs the real branded templates uploaded as English / Hindi / Marathi
      Print Formats. Until then the language choice has no visible effect on the
      certificate.
- [ ] **Language dropdown copy** over-promises ("…and your certificate") while
      per-language certificates don't exist — soften it, or add "(coming soon)".
- [ ] Authoring UI for assessment-question translations (checkpoints have one).
- [ ] Self-service student signup (today every account is admin-created).
