# Development Notes

## Current scope

This is a deliberately small **local hotseat MVP**. The goal is to prove the Pirates vs Titans rules and make balance changes cheap before adding networking.

## Known assumptions reconstructed from the design session

The following values were reconstructed from the card-building conversation and are intentionally easy to change in `src/data/fractilian.ts`:

- Blackwake Deckhands: 3 strength, Melee, 2 copies.
- Deck Duelist: 2 copies in the prototype deck.
- Several generic units use 2 copies to make the test deck large enough for repeated matches.
- Weather created by Cassiopeia / Orrick / Yara affects **only the opponent's corresponding row**, matching the wording used during design rather than original Gwent's global weather.
- Legendary/unique cards ignore weather and morale bonuses. Dreadfist's Sunder is the explicit exception and destroys everything.
- Medic currently replays a flexible card into its first listed row. A later UI pass can allow the resurrected flexible card to choose its row.

## Missing final PNGs

The runtime has a built-in fallback card, but these two final art files were not recoverable as distinct assets from the earlier image session:

- `public/cards/fractilian/blackwake-deckhands.png`
- `public/cards/fractilian/fractilian-sharpshooter.png`

Drop the final 1024x1536 PNGs at those exact paths and they will appear automatically; no code change is needed.

## Recommended next steps

1. Play several local matches and tune strengths/copy counts.
2. Add deck-building / minimum deck-size rules.
3. Add Eternal leader cards and leader powers once those are finalized.
4. Add Abyssal, Ferren, and Veyra card definition files.
5. Add Supabase room-state synchronization for online multiplayer.
6. Add animations, sounds, card zoom, and weather VFX after the rules are stable.
