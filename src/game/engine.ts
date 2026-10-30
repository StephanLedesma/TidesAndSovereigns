import { CARD_MAP, FRACTILIAN_CARDS } from '../data/fractilian'
import type { CardInstance, GameState, PlayerState, Row } from './types'

const ROWS: Row[] = ['melee','ranged','siege']
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`
const shuffle = <T,>(items:T[]) => {
  const a = [...items]
  for (let i=a.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]] }
  return a
}

export function buildDeck(owner:0|1): CardInstance[] {
  const deck: CardInstance[] = []
  for (const def of FRACTILIAN_CARDS) {
    for (let i=0;i<(def.copies ?? 1);i++) deck.push({ uid:uid(), definitionId:def.id, owner })
  }
  return shuffle(deck)
}

function player(name:string, owner:0|1): PlayerState {
  const deck=buildDeck(owner)
  return { name, deck:deck.slice(10), hand:deck.slice(0,10), discard:[], rows:{melee:[],ranged:[],siege:[]}, passed:false, roundWins:0 }
}

export function createGame(): GameState {
  return { players:[player('Player 1',0),player('Player 2',1)], activePlayer:0, round:1, weather:[{melee:null,ranged:null,siege:null},{melee:null,ranged:null,siege:null}], message:'Player 1: choose up to 2 cards to redraw.', winner:null, pendingMedic:null, mulliganPlayer:0 }
}


export function completeMulligan(input:GameState, player:0|1, selectedUids:string[]):GameState {
  const state=structuredClone(input) as GameState
  if(state.mulliganPlayer!==player || state.winner!==null) return state

  const chosen=[...new Set(selectedUids)].slice(0,2)
  const returned:CardInstance[]=[]
  for(const cardUid of chosen){
    const card=removeByUid(state.players[player].hand,cardUid)
    if(card) returned.push(card)
  }

  // Draw replacements before returning the rejected cards to the deck, so a
  // player can never immediately redraw the exact card they just mulliganed.
  draw(state,player,returned.length)
  state.players[player].deck=shuffle([...state.players[player].deck,...returned])

  if(player===0){
    state.mulliganPlayer=1
    state.message='Player 2: choose up to 2 cards to redraw.'
  } else {
    state.mulliganPlayer=null
    state.activePlayer=0
    state.message='Player 1 to play.'
  }
  return state
}

function draw(state:GameState, p:0|1, count:number) {
  const pl=state.players[p]
  for(let i=0;i<count;i++) { const card=pl.deck.shift(); if(card) pl.hand.push(card) }
}
function def(c:CardInstance){ return CARD_MAP[c.definitionId] }
function other(p:0|1):0|1 { return p===0?1:0 }
function removeByUid(list:CardInstance[], uid:string){ const i=list.findIndex(c=>c.uid===uid); return i>=0 ? list.splice(i,1)[0] : undefined }
function putOnRow(state:GameState, side:0|1, row:Row, card:CardInstance){ state.players[side].rows[row].push(card) }
function locateOnBoard(state:GameState, predicate:(c:CardInstance)=>boolean){
  for (const side of [0,1] as const) for (const row of ROWS) {
    const idx=state.players[side].rows[row].findIndex(predicate)
    if(idx>=0) return {side,row,idx,card:state.players[side].rows[row][idx]}
  }
  return null
}
function pullByDefinition(state:GameState,p:0|1,id:string){
  const fromHand=state.players[p].hand.find(c=>c.definitionId===id)
  if(fromHand) return removeByUid(state.players[p].hand,fromHand.uid)
  const fromDeck=state.players[p].deck.find(c=>c.definitionId===id)
  if(fromDeck) return removeByUid(state.players[p].deck,fromDeck.uid)
  return undefined
}
function summonAll(state:GameState,p:0|1,id:string,row:Row,exceptUid?:string){
  while(true){ const c=pullByDefinition(state,p,id); if(!c) break; if(c.uid!==exceptUid) putOnRow(state,p,row,c) }
}

export function playCard(input:GameState, player:0|1, uidToPlay:string, chosenRow:Row):GameState {
  const state=structuredClone(input) as GameState
  if(state.mulliganPlayer!==null || state.winner!==null || state.activePlayer!==player || state.players[player].passed) return state
  const card=removeByUid(state.players[player].hand,uidToPlay); if(!card) return state
  const cardDef=def(card)
  if(!cardDef.rows.includes(chosenRow)){ state.players[player].hand.push(card); return state }
  const enemy=other(player)
  const side = cardDef.ability==='spy' ? enemy : player
  putOnRow(state,side,chosenRow,card)

  switch(cardDef.ability){
    case 'spy': draw(state,player,2); state.message=`${cardDef.name} spies for ${state.players[player].name}: draw 2.`; break
    case 'summon_same': summonAll(state,player,card.definitionId,chosenRow,card.uid); state.message=`${cardDef.name} calls the rest of the crew.`; break
    case 'summon_blackwake': for(const id of ['blackwake-deckhands','blackwake-deckhands']){ const c=pullByDefinition(state,player,id); if(c) putOnRow(state,player,'melee',c) } state.message='The Blackwake Deckhands answer the Bosun.'; break
    case 'summon_bowrig_crew': for(const id of ['jane-doe','bullrack','mickey']){ const c=pullByDefinition(state,player,id); if(c) putOnRow(state,player,'melee',c) } state.message='Bowrig summons her crew.'; break
    case 'brothers_in_arms': {
      const found=locateOnBoard(state,c=>c.definitionId==='tobias-fate' && c.owner===enemy)
      if(found && found.side===enemy){ const [tf]=state.players[found.side].rows[found.row].splice(found.idx,1); putOnRow(state,player,'ranged',tf); state.message='Brothers in Arms: Tobias Fate changes sides.' }
      break
    }
    case 'sirens_call': state.weather[enemy].ranged='fog'; state.message='Siren’s Call blankets the Ranged row in fog.'; break
    case 'salt_of_the_earth': state.weather[enemy].siege='rain'; state.message='Salt of the Earth drenches the Siege row.'; break
    case 'fire_and_blood': state.weather[enemy].melee='frost'; state.message='Fire & Blood freezes the Melee row.'; break
    case 'medic': {
      const candidates=state.players[player].discard.filter(c=>!def(c).unique)
      if(candidates.length) { state.pendingMedic={player,medicUid:card.uid}; state.message='Medic: choose a non-unique card from your discard pile.' }
      break
    }
    case 'sunder': {
      for(const side of [0,1] as const) for(const row of ROWS){
        const cards=state.players[side].rows[row].splice(0)
        for(const c of cards) state.players[c.owner].discard.push(c)
      }
      state.message='SUNDER: Dreadfist destroys the entire battlefield.'
      break
    }
  }
  if(!state.pendingMedic) advanceTurnOrRound(state)
  return state
}

export function resolveMedic(input:GameState, uidFromDiscard:string):GameState {
  const state=structuredClone(input) as GameState
  if(!state.pendingMedic) return state
  const p=state.pendingMedic.player
  const card=removeByUid(state.players[p].discard,uidFromDiscard)
  if(card && !def(card).unique){
    const d=def(card); const row=d.rows[0]
    // Medic replays the card, but avoids another medic-selection loop for simplicity.
    putOnRow(state,p,row,card)
    if(d.ability==='summon_same') summonAll(state,p,d.id,row,card.uid)
    if(d.ability==='summon_blackwake') for(const id of ['blackwake-deckhands','blackwake-deckhands']){ const c=pullByDefinition(state,p,id); if(c) putOnRow(state,p,'melee',c) }
    if(d.ability==='summon_bowrig_crew') for(const id of ['jane-doe','bullrack','mickey']){ const c=pullByDefinition(state,p,id); if(c) putOnRow(state,p,'melee',c) }
  }
  state.pendingMedic=null
  advanceTurnOrRound(state)
  return state
}

export function passTurn(input:GameState, player:0|1):GameState {
  const state=structuredClone(input) as GameState
  if(state.mulliganPlayer!==null || state.activePlayer!==player || state.winner!==null) return state
  state.players[player].passed=true
  state.message=`${state.players[player].name} passes.`
  advanceTurnOrRound(state)
  return state
}

function advanceTurnOrRound(state:GameState){
  if(state.players[0].passed && state.players[1].passed){ finishRound(state); return }
  const enemy=other(state.activePlayer)
  if(!state.players[enemy].passed) state.activePlayer=enemy
  state.message = state.players[state.activePlayer].passed ? state.message : `${state.players[state.activePlayer].name} to play.`
}

function finishRound(state:GameState){
  const a=playerScore(state,0), b=playerScore(state,1)
  if(a>b) state.players[0].roundWins++
  else if(b>a) state.players[1].roundWins++
  else { state.players[0].roundWins++; state.players[1].roundWins++ }
  for(const side of [0,1] as const) for(const row of ROWS){
    const cards=state.players[side].rows[row].splice(0)
    for(const c of cards) state.players[c.owner].discard.push(c)
  }
  state.weather=[{melee:null,ranged:null,siege:null},{melee:null,ranged:null,siege:null}]
  const winner = state.players[0].roundWins>=2 ? 0 : state.players[1].roundWins>=2 ? 1 : null
  if(winner!==null){ state.winner=winner; state.message=`${state.players[winner].name} wins the match!`; return }
  state.round++
  state.players[0].passed=false; state.players[1].passed=false
  state.activePlayer = a>=b ? 0 : 1
  state.message=`Round ${state.round}. ${state.players[state.activePlayer].name} to play.`
}

export function cardPower(state:GameState, side:0|1, row:Row, card:CardInstance):number {
  const d=def(card)
  if(d.unique) return d.strength
  if(state.weather[side][row]) return 1
  let power=d.strength
  if(d.ability==='bond' && state.players[side].rows[row].some(c=>c.uid!==card.uid && c.definitionId===card.definitionId)) power*=2
  const moraleCount=state.players[side].rows[row].filter(c=>c.uid!==card.uid && def(c).ability==='morale').length
  power += moraleCount
  return power
}
export function rowScore(state:GameState, side:0|1, row:Row){ return state.players[side].rows[row].reduce((n,c)=>n+cardPower(state,side,row,c),0) }
export function playerScore(state:GameState, side:0|1){ return ROWS.reduce((n,r)=>n+rowScore(state,side,r),0) }
export function medicCandidates(state:GameState){ if(!state.pendingMedic) return []; const p=state.pendingMedic.player; return state.players[p].discard.filter(c=>!def(c).unique) }
