# Built-in N3 Fast Pass set

`n3.json` is bundled with the app from `jlpt-n3-fast-past.json`. Every installation
running a build that includes this file gets the same default tags, including
existing installations with saved progress.

- Vocabulary matches `term` and the explicitly listed `match_forms` from both
  sections. When a card has a reading, that reading must match too.
- Kanji matches the `characters` listed in the `kanji` section.
- Custom cards use the same rules, including terms not yet present in the library.
- JLPT levels and SRS schedules are independent of these tags.
- `fastPassCards` in saved user data stores overrides: `true` adds a card, `false`
  removes it from Fast Pass. No override means the bundled default applies.

To share an updated default set, update `n3.json`, then build and distribute the
app update to each installation. Updating one browser's saved data alone does
not update other installations. This file defines tags; it does not create
missing library cards or automatically enqueue them for review.
