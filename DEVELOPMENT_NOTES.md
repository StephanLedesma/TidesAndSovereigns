# Development Notes — v0.7

## Persistence

Campaign data is stored in browser `localStorage` under:

`pirates-vs-titans-campaign-v1`

It stores:
- shared campaign collection counts
- Player 1's most recent deck
- Player 2's most recent deck

This survives refreshes and browser restarts on the same browser/profile. It is not cloud-synced.

## Starting collection

`src/data/fractilian.ts` exports `STARTING_COLLECTION_IDS`.

All cards currently available to the party are in that explicit list. Future card definitions should normally be added to `ALL_CARDS` but omitted from `STARTING_COLLECTION_IDS`, which makes them locked by default.

## Unlocking campaign cards

The Campaign Collection modal deliberately lists only owned cards. This avoids exposing undiscovered card names/artwork. A new card is unlocked by entering its exact card name or card ID. Each unlock adds one owned copy up to that card's copy limit.

## Mulligan scrolling

The mulligan modal is now a fixed-height flex column. The hand area owns horizontal/vertical overflow and always uses `justify-content:flex-start`, fixing the previous centered-flex overflow bug where the first/last cards could become unreachable.
