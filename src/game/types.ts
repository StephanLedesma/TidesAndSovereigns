export type Row = 'melee' | 'ranged' | 'siege'
export type Weather = 'frost' | 'fog' | 'rain'
export type CardKind = 'unit' | 'special'
export type Ability =
  | 'none'
  | 'bond'
  | 'morale'
  | 'summon_same'
  | 'summon_blackwake'
  | 'summon_bowrig_crew'
  | 'spy'
  | 'medic'
  | 'sunder'
  | 'brothers_in_arms'
  | 'sirens_call'
  | 'salt_of_the_earth'
  | 'fire_and_blood'
  | 'special_decoy'
  | 'special_frost'
  | 'special_fog'
  | 'special_rain'
  | 'special_scorch'

export interface CardDefinition {
  id: string
  name: string
  strength: number
  rows: Row[]
  ability: Ability
  kind?: CardKind
  unique?: boolean
  image?: string
  copies?: number
  abilityTitle?: string
  abilityText?: string
}

export interface CardInstance {
  uid: string
  definitionId: string
  owner: 0 | 1
}

export interface PlayerState {
  name: string
  deck: CardInstance[]
  hand: CardInstance[]
  discard: CardInstance[]
  rows: Record<Row, CardInstance[]>
  passed: boolean
  roundWins: number
}

export interface GameState {
  players: [PlayerState, PlayerState]
  activePlayer: 0 | 1
  startingPlayer: 0 | 1 | null
  coinFlipPending: boolean
  coinFlipWinner: 0 | 1 | null
  round: number
  weather: [Record<Row, Weather | null>, Record<Row, Weather | null>]
  message: string
  winner: 0 | 1 | null
  pendingMedic: { player: 0 | 1; medicUid: string } | null
  pendingDecoy: { player: 0 | 1; card: CardInstance } | null
  mulliganPlayer: 0 | 1 | null
}
