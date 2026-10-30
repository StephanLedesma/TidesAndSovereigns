# Pirates vs Titans — Development Notes (v0.5)

## New in v0.5

- Opening coin toss now determines the first player.
- Coin-toss winner resolves their opening mulligan first, then takes the first turn.
- Large total-power displays now sit to the left of both battlefields.
- Dreadfist survives his own **Sunder** effect while every other unit is destroyed, including Legendary units.
- Strength calculation now uses explicit precedence layers instead of Weather overwriting the final value.

## Strength precedence

Normal card strength resolves in this order:

1. **Printed strength** — the number printed on the card.
2. **Base setters** — Weather sets the affected non-Legendary unit's base strength to 1.
3. **Base multipliers** — Bond multiplies that current base strength.
4. **Additive modifiers** — Morale Boost is added after Weather/Bond.

Example: a 6-strength unit under Frost has base 1. Three Cabin Boys in that row provide +3 Morale, so the unit's final strength is **4**.

Each Cabin Boy only buffs **other** units, so three Cabin Boys under Weather are each strength **3**: base 1 + the other two Cabin Boys.

## Superseding rules

- Specific card text supersedes general rules.
- Legendary black cards currently retain Gwent-style protection from ordinary Weather and Morale effects.
- Dreadfist's Sunder explicitly says it destroys Legendary units, so it supersedes Legendary protection.
- Dreadfist is excluded from his own destruction effect and remains on the battlefield at 0 strength.

## Core balance data

Card stats and ability metadata remain in:

`src/data/fractilian.ts`

Strength calculations and ability resolution are in:

`src/game/engine.ts`
