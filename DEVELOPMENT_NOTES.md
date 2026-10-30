# Development Notes — v0.9

## Campaign save schema

Local key: `pirates-vs-titans-campaign-v3`

Portable JSON:

```json
{
  "version": 3,
  "collection": {},
  "playerDeck": {},
  "opponentMode": "computer"
}
```

NPC Legendary access is intentionally omitted from the campaign save because it is a per-match DM option.

## v0.8 collection migration

v0.8 accidentally initialized the shared campaign collection with every card at its maximum copy limit. The v0.9 loader detects that exact legacy state and replaces it with the exact starter-deck counts. A legacy collection that differs from the accidental full default is preserved, so deliberately edited/discovered progress is not blindly erased.

## NPC deck generation

`generateRandomNpcDeck(allowedLegendaryIds)` no longer takes the player collection.

Pool rules:

- every non-Legendary card in `ALL_CARDS` is available;
- normal database copy limits still apply;
- all Legendary cards are excluded by default;
- selected Legendary IDs are added to the eligible pool for that match;
- generated decks still require at least 22 Units and no more than 10 Specials.

## Sharpshooter orientation

`CardView` adds the card ID as a CSS class. `fractilian-sharpshooter` receives an isolated rotation rule, and the inspection modal receives the same correction. This avoids changing the source orientation or affecting other cards.

The packaged source history did not contain the Sharpshooter PNG itself; the orientation fix applies to the existing `public/cards/fractilian/fractilian-sharpshooter.png` in the user's working project. If producing a clean project from scratch, add that asset at the same path.

## Testing performed

- `App.tsx`, `ai.ts`, and `CardView.tsx` syntax-transpile successfully with TypeScript 5.8.3.
- 2,000 default NPC decks generated with **zero illegal decks** and **zero Legendary leaks**.
- 1,000 NPC decks generated with Dreadfist/Cassandra allowed; only those selected Legendaries were eligible, with no other Legendary appearing.
- Starter collection resolves to exactly 27 physical cards across 18 card types, including only one Cutlass Corsair and one copy of each starter Special.

A full Vite build was not available in this environment because npm dependencies could not be downloaded during packaging; run `npm install` then `npm run dev` locally as usual.

## v0.10 implementation notes
- Campaign save schema advanced to v4. An untouched v0.9 starter save migrates to the corrected starter automatically.
- `PlayerState.horns` stores one optional Special card for each row (`melee`, `ranged`, `siege`).
- `special_clear_skies` clears `GameState.weather` only; it never removes Horns.
- `special_horn` requires a row target and cannot be played into a row whose Horn slot is already occupied.
- NPC random deck generation automatically includes both new Specials because they are non-Legendary Special cards.

## v0.12
- Spy discard routing now follows the battlefield side: a Spy left/destroyed on the opponent's board enters that opponent's discard pile, so their Medic can target it.
- Medics can revive a Spy from their discard; the Spy resolves onto the enemy battlefield and draws 2 for the Medic's controller.
- Hand cards are larger.
- Battlefield unit cards use a larger cropped viewport showing the top/art/stat portion of the unchanged card PNG; clicking still opens the full card.


## v0.12 battlefield power overlay
- Battlefield power now overlays the printed top-left strength medallion instead of appearing below the card.
- Unchanged strength uses a parchment/white bubble.
- Buffed strength is green.
- Reduced strength is red.
- Original card artwork remains untouched; the live bubble simply covers the printed value while the card is on the board.
