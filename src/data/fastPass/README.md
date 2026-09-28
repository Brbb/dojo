# Built-in N3 Fast Pass set

`n3.json` is bundled with the app from `jlpt-n3-fast-past.json`. Every installation
running a build that includes this file gets the same default tags, including
existing installations with saved progress.

- Vocabulary matches `term` and the explicitly listed `match_forms` from both
  sections. When a card has a reading, that reading must match too.
- Defaults tag vocabulary cards only, including whole words in the source's
  `kanji` questions. The `characters` arrays are source metadata, not a tag list.
  For example, 家具 is tagged; its standalone kanji 家 and 具 are not.
  Single-character vocabulary words still match by spelling and reading, but
  their separate kanji cards do not inherit membership.
- Kanji cards can still be tagged manually; existing manual overrides are kept.
- Custom cards use the same rules, including terms not yet present in the library.
- JLPT levels and SRS schedules are independent of these tags.
- `fastPassCards` in saved user data stores overrides: `true` adds a card, `false`
  removes it from Fast Pass. No override means the bundled default applies.
  Previously inherited kanji tags disappear on update without changing stored
  reviews or requiring a data reset.

## Book vocabulary with definitions

`book-0019-0036.json` contains 18 entries and `book-0037-0072.json` contains 36
entries; `book-0073-0203.json` adds 131 entries extracted from the supplied book
photos, including readings and meanings. Overlapping photographed pages reuse
the earlier batches rather than importing duplicates.
The two senses of `～代` share one card. Explicit adjective aliases match dictionary
forms with or without `な`. Existing library words are tagged;
missing words are imported once as N3 custom cards. Matching custom cards are
reused with their existing IDs and definitions. The import marker in saved
`fastPassImports` prevents subsequent reloads from recreating cards the user
deleted. Each batch has its own marker, so adding later batches does not resurrect
deleted cards from earlier batches. Custom vocabulary is searchable in Library
and can be added to review. `/fast-pass` shows the entire tagged collection without
requiring a search, including custom words/kanji. Its N-level filters intersect
Fast Pass membership; they never change a card's existing JLPT level.
The filter is labeled **Fast Pass only**. **Show full library** clears that filter
while preserving the selected N-level and card type. Untagged detail/review cards
show an **Add to Fast Pass** action, not a filled membership badge. No JLPT level,
card type, or page navigation automatically tags cards.

The [latest extraction table](book-0073-0203-import.md) records each source word,
reading, meaning, and whether it reused library vocabulary or created a card.
Run `node scripts/test-fast-pass.mjs` to check coverage, per-level tag boundaries,
aliases, explicit overrides, and safe migrations between book batches.

To share an updated default set, update `n3.json`, then build and distribute the
app update to each installation. Updating one browser's saved data alone does
not update other installations. `n3.json` defines tags only; the book file also
creates missing custom cards because it provides definitions. Neither list
automatically enqueues cards for review.
