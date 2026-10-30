# Pirates vs Titans — v0.9

A browser-based Witcher 3 Gwent-style minigame for the Boneyard campaign.

## Run locally

```powershell
npm install
npm run dev
```

Open the Vite address, normally `http://localhost:5173`.

## v0.9 changes

- The party now begins with **exactly the cards in the starter deck** — not the entire Fractilian database.
- Additional player cards must be unlocked through the Campaign Collection as they are discovered in the D&D world.
- The old v0.8 "everything owned" default is automatically cleansed when detected.
- NPC decks no longer depend on the party collection.
- NPCs can use **every non-Legendary Unit and Special card** in the database, up to normal copy limits.
- Legendary cards are excluded from NPC decks by default.
- Match setup now has an **NPC Legendary Access** panel. Toggle only the Legendary cards this opponent is allowed to draw from.
- Legendary access is match-only and resets when returning to the deck builder after a game.
- The Fractilian Sharpshooter display receives a card-specific 90° orientation correction without rotating any other card.

## Player collection vs NPC pool

These are deliberately separate systems:

- **Player collection:** starts with the starter deck and grows through campaign discoveries.
- **Player deck:** must use only owned copies from that collection.
- **NPC pool:** all non-Legendary cards, regardless of what the party has found.
- **NPC Legendary exceptions:** selected by the DM during match setup.

The NPC still builds a fresh randomized legal deck every match and obeys the minimum 22 Units / maximum 10 Specials rules.

## Persistence

Player collection, player deck and preferred opponent mode auto-save in browser localStorage. **Export Campaign** creates a portable JSON backup. NPC Legendary access is intentionally not saved because it belongs to a specific opponent/match.

## Deck rules

- Minimum 22 Unit cards.
- Maximum 10 Special cards.
- Player copy counts are limited by the campaign collection.
- NPC copy counts use each card's database copy limit.
- Specials: Decoy, Biting Frost, Impenetrable Fog, Torrential Rain and Scorch.

Card definitions are in `src/data/fractilian.ts`.
AI and NPC deck generation are in `src/game/ai.ts`.
