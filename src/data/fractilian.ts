import type { CardDefinition } from '../game/types'

export const FRACTILIAN_CARDS: CardDefinition[] = [
  { id:'cabin-boys', name:'Cabin Boys', strength:1, rows:['melee','ranged'], ability:'morale', copies:3, image:'/cards/fractilian/cabin-boys.png', abilityTitle:'Morale Boost', abilityText:'All other units in this row gain +1 Power.' },
  { id:'poor-fucking-pirates', name:'Poor Fucking Pirates', strength:1, rows:['melee'], ability:'bond', copies:3, image:'/cards/fractilian/poor-fucking-pirates.png', abilityTitle:'Bond', abilityText:'Strength doubles if there is another copy of this card in the same row.' },
  { id:'deck-duelist', name:'Deck Duelist', strength:5, rows:['melee','ranged'], ability:'none', copies:2, image:'/cards/fractilian/deck-duelist.png' },
  { id:'blackwake-bosun', name:'Blackwake Bosun', strength:4, rows:['melee'], ability:'summon_blackwake', copies:1, image:'/cards/fractilian/blackwake-bosun.png', abilityTitle:'Summon', abilityText:'Play both Blackwake Deckhands from your hand or deck.' },
  { id:'blackwake-deckhands', name:'Blackwake Deckhands', strength:3, rows:['melee'], ability:'none', copies:2, image:'/cards/fractilian/blackwake-deckhands.png' },
  { id:'tidecutters', name:'Tidecutters', strength:4, rows:['melee','ranged'], ability:'bond', copies:3, image:'/cards/fractilian/tidecutters.png', abilityTitle:'Bond', abilityText:'Strength doubles if there is another copy of this card in the same row.' },
  { id:'cutlass-corsair', name:'Cutlass Corsair', strength:4, rows:['melee','ranged'], ability:'none', copies:2, image:'/cards/fractilian/cutlass-corsair.png' },
  { id:'blackpowder-raider', name:'Blackpowder Raider', strength:5, rows:['ranged'], ability:'none', copies:2, image:'/cards/fractilian/blackpowder-raider.png' },
  { id:'boarding-gunners', name:'Boarding Gunners', strength:3, rows:['ranged'], ability:'summon_same', copies:3, image:'/cards/fractilian/boarding-gunners.png', abilityTitle:'Summon', abilityText:'Play all remaining Boarding Gunners from your hand or deck.' },
  { id:'saltshot-veteran', name:'Saltshot Veteran', strength:6, rows:['ranged'], ability:'none', copies:2, image:'/cards/fractilian/saltshot-veteran.png' },
  { id:'corsair-pistolier', name:'Corsair Pistolier', strength:4, rows:['ranged'], ability:'none', copies:2, image:'/cards/fractilian/corsair-pistolier.png' },
  { id:'fractilian-sharpshooter', name:'Fractilian Sharpshooter', strength:5, rows:['ranged'], ability:'none', copies:2, image:'/cards/fractilian/fractilian-sharpshooter.png' },
  { id:'powder-hand', name:'Powder Hand', strength:4, rows:['ranged'], ability:'none', copies:2, image:'/cards/fractilian/powder-hand.png' },
  { id:'reefrunner', name:'Reefrunner', strength:4, rows:['siege'], ability:'bond', copies:3, image:'/cards/fractilian/reefrunner.png', abilityTitle:'Bond', abilityText:'Strength doubles if there is another copy of this card in the same row.' },

  { id:'hess-bowrig', name:'Hess Bowrig', strength:6, rows:['melee'], ability:'summon_bowrig_crew', copies:1, image:'/cards/fractilian/hess-bowrig.png', abilityTitle:'Summon', abilityText:'Play Jane Doe, Bullrack and Mickey from your hand or deck.' },
  { id:'jane-doe', name:'Jane Doe', strength:4, rows:['melee'], ability:'none', copies:1, image:'/cards/fractilian/jane-doe.png' },
  { id:'bullrack', name:'Bullrack', strength:3, rows:['melee'], ability:'none', copies:1, image:'/cards/fractilian/bullrack.png' },
  { id:'mickey', name:'Mickey', strength:3, rows:['melee'], ability:'none', copies:1, image:'/cards/fractilian/mickey.png' },

  { id:'tobias-fate', name:'Tobias Fate', strength:5, rows:['ranged'], ability:'spy', copies:1, image:'/cards/fractilian/tobias-fate.png', abilityTitle:'Spy', abilityText:'Place this unit on your opponent’s side of the battlefield, then draw 2 cards.' },
  { id:'jasper', name:'Jasper', strength:4, rows:['ranged'], ability:'spy', copies:1, image:'/cards/fractilian/jasper.png', abilityTitle:'Spy', abilityText:'Place this unit on your opponent’s side of the battlefield, then draw 2 cards.' },
  { id:'malcom-graves', name:'Malcom Graves', strength:5, rows:['melee','ranged'], ability:'brothers_in_arms', copies:1, image:'/cards/fractilian/malcom-graves.png', abilityTitle:'Brothers in Arms', abilityText:'If Tobias Fate is on the enemy board, move Tobias Fate onto your side.' },

  { id:'dreadfist', name:'Dreadfist', strength:0, rows:['melee'], ability:'sunder', unique:true, copies:1, image:'/cards/fractilian/dreadfist.png', abilityTitle:'Sunder', abilityText:'Destroy all units on the battlefield, including legendary units.' },
  { id:'cassiopeia', name:'Cassiopeia', strength:7, rows:['ranged'], ability:'sirens_call', unique:true, copies:1, image:'/cards/fractilian/cassiopeia.png', abilityTitle:'Siren’s Call', abilityText:'When played, summon fog onto the enemy field, reducing all units on that row to 1 strength.' },
  { id:'orrick-saltbane', name:'Orrick Saltbane', strength:6, rows:['melee'], ability:'salt_of_the_earth', unique:true, copies:1, image:'/cards/fractilian/orrick-saltbane.png', abilityTitle:'Salt of the Earth', abilityText:'When played, summon rain onto the enemy field, reducing all units on that row to 1 strength.' },
  { id:'yara-bloodfire', name:'Yara Bloodfire', strength:6, rows:['siege'], ability:'fire_and_blood', unique:true, copies:1, image:'/cards/fractilian/yara-bloodfire.png', abilityTitle:'Fire & Blood', abilityText:'When played, summon frost on the enemy field, reducing all units on that row to 1 strength.' },
  { id:'karthos-vale', name:'Karthos Vale', strength:5, rows:['ranged'], ability:'morale', unique:true, copies:1, image:'/cards/fractilian/karthos-vale.png', abilityTitle:'Morale Boost', abilityText:'All other units in this row gain +1 Power.' },
  { id:'cassandra', name:'Cassandra', strength:10, rows:['ranged'], ability:'none', unique:true, copies:1, image:'/cards/fractilian/cassandra.png' },
  { id:'maelis-thorn', name:'Maelis Thorn', strength:3, rows:['ranged'], ability:'spy', unique:true, copies:1, image:'/cards/fractilian/maelis-thorn.png', abilityTitle:'Spy', abilityText:'Place this unit on your opponent’s side of the battlefield, then draw 2 cards.' },
  { id:'lysandra', name:'Lysandra', strength:7, rows:['ranged'], ability:'none', unique:true, copies:1, image:'/cards/fractilian/lysandra.png' },

  { id:'wailing-hangman', name:'The Wailing Hangman', strength:7, rows:['siege'], ability:'medic', copies:1, image:'/cards/fractilian/wailing-hangman.png', abilityTitle:'Medic', abilityText:'Play one non-unique card from your discard pile.' },
  { id:'eagle-of-the-sea', name:'Eagle of the Sea', strength:8, rows:['siege'], ability:'none', copies:1, image:'/cards/fractilian/eagle-of-the-sea.png' },
  { id:'crimson-rush', name:'Crimson Rush', strength:2, rows:['siege'], ability:'spy', copies:1, image:'/cards/fractilian/crimson-rush.png', abilityTitle:'Spy', abilityText:'Place this unit on your opponent’s side of the battlefield, then draw 2 cards.' },
  { id:'salt-widow', name:'The Salt Widow', strength:6, rows:['siege'], ability:'none', copies:1, image:'/cards/fractilian/salt-widow.png' },
  { id:'black-gull', name:'The Black Gull', strength:6, rows:['siege'], ability:'none', copies:1, image:'/cards/fractilian/black-gull.png' },
  { id:'gallowswake', name:'Gallowswake', strength:5, rows:['siege'], ability:'none', copies:1, image:'/cards/fractilian/gallowswake.png' },
  { id:'storms-folly', name:'Storm’s Folly', strength:5, rows:['siege'], ability:'none', copies:1, image:'/cards/fractilian/storms-folly.png' },
  { id:'grinning-maiden', name:'Grinning Maiden', strength:4, rows:['siege'], ability:'none', copies:1, image:'/cards/fractilian/grinning-maiden.png' },
  { id:'river-king', name:'The River King', strength:10, rows:['siege'], ability:'none', unique:true, copies:1, image:'/cards/fractilian/river-king.png' }
]

export const SPECIAL_CARDS: CardDefinition[] = [
  { id:'decoy', name:'Decoy', strength:0, rows:[], ability:'special_decoy', kind:'special', copies:3, image:'/cards/specials/decoy.png', abilityTitle:'Decoy', abilityText:'Swap this card with one non-legendary unit on your side of the battlefield, returning that unit to your hand.' },
  { id:'biting-frost', name:'Biting Frost', strength:0, rows:[], ability:'special_frost', kind:'special', copies:3, image:'/cards/specials/frost.png', abilityTitle:'Biting Frost', abilityText:'Set the base Strength of all non-legendary Melee units on both sides to 1.' },
  { id:'impenetrable-fog', name:'Impenetrable Fog', strength:0, rows:[], ability:'special_fog', kind:'special', copies:3, image:'/cards/specials/fog.png', abilityTitle:'Impenetrable Fog', abilityText:'Set the base Strength of all non-legendary Ranged units on both sides to 1.' },
  { id:'torrential-rain', name:'Torrential Rain', strength:0, rows:[], ability:'special_rain', kind:'special', copies:3, image:'/cards/specials/rain.png', abilityTitle:'Torrential Rain', abilityText:'Set the base Strength of all non-legendary Siege units on both sides to 1.' },
  { id:'scorch', name:'Scorch', strength:0, rows:[], ability:'special_scorch', kind:'special', copies:3, image:'/cards/specials/scorch.png', abilityTitle:'Scorch', abilityText:'Destroy the strongest non-legendary unit or units on the battlefield.' },
  { id:'clear-skies', name:'Clear Skies', strength:0, rows:[], ability:'special_clear_skies', kind:'special', copies:3, image:'/cards/specials/clear-skies.png', abilityTitle:'Clear Skies', abilityText:'Remove all active Weather effects from every row on both sides of the battlefield.' },
  { id:'commanders-horn', name:"Commander’s Horn", strength:0, rows:['melee','ranged','siege'], ability:'special_horn', kind:'special', copies:3, image:'/cards/specials/commanders-horn.png', abilityTitle:"Commander’s Horn", abilityText:'Place on one of your rows. Double the final Strength of every non-Legendary unit in that row. Limited to one Horn per row.' }
]

export const ALL_CARDS: CardDefinition[] = [...FRACTILIAN_CARDS, ...SPECIAL_CARDS]
export const CARD_MAP = Object.fromEntries(ALL_CARDS.map(c => [c.id, c])) as Record<string, CardDefinition>

export const STARTER_DECK_IDS: string[] = [
  'poor-fucking-pirates','poor-fucking-pirates','poor-fucking-pirates',
  'tidecutters','tidecutters','tidecutters',
  'cabin-boys','cabin-boys','cabin-boys',
  'boarding-gunners','boarding-gunners','boarding-gunners',
  'blackwake-bosun','blackwake-deckhands','blackwake-deckhands',
  'cutlass-corsair','tobias-fate','jasper','malcom-graves',
  'wailing-hangman','eagle-of-the-sea','salt-widow',
  'decoy','biting-frost','impenetrable-fog','torrential-rain','scorch','clear-skies','commanders-horn'
]

