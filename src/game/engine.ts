import { CARD_MAP, STARTER_DECK_IDS } from '../data/fractilian'
import type { CardDefinition, CardInstance, GameState, PlayerState, Row } from './types'

const ROWS: Row[] = ['melee','ranged','siege']
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`
const shuffle = <T,>(items:T[]) => {
  const a = [...items]
  for (let i=a.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]] }
  return a
}
const defById=(id:string)=>CARD_MAP[id]
const def=(c:CardInstance)=>CARD_MAP[c.definitionId]
const isSpecial=(d:CardDefinition)=>d.kind==='special'
const other=(p:0|1):0|1=>p===0?1:0

export function deckStats(deckIds:string[]){
  let units=0, specials=0
  for(const id of deckIds){
    const d=defById(id)
    if(!d) continue
    if(isSpecial(d)) specials++
    else units++
  }
  return {units,specials,total:units+specials,valid:units>=22 && specials<=10}
}

export function buildDeck(owner:0|1, definitionIds:string[]=STARTER_DECK_IDS): CardInstance[] {
  return shuffle(definitionIds.filter(id=>CARD_MAP[id]).map(definitionId=>({uid:uid(),definitionId,owner})))
}

function player(name:string, owner:0|1, deckIds:string[]): PlayerState {
  const deck=buildDeck(owner,deckIds)
  return { name, deck:deck.slice(10), hand:deck.slice(0,10), discard:[], rows:{melee:[],ranged:[],siege:[]}, passed:false, roundWins:0 }
}

export function createGame(deck0:string[]=STARTER_DECK_IDS, deck1:string[]=STARTER_DECK_IDS, names:[string,string]=['Player 1','Player 2']): GameState {
  return {
    players:[player(names[0],0,deck0),player(names[1],1,deck1)],
    activePlayer:0,
    startingPlayer:null,
    coinFlipPending:true,
    coinFlipWinner:null,
    round:1,
    weather:[{melee:null,ranged:null,siege:null},{melee:null,ranged:null,siege:null}],
    message:'Flip the coin to determine who plays first.',
    winner:null,
    pendingMedic:null,
    pendingDecoy:null,
    mulliganPlayer:null
  }
}

export function flipCoin(input:GameState):GameState {
  const state=structuredClone(input) as GameState
  if(!state.coinFlipPending || state.coinFlipWinner!==null || state.winner!==null) return state
  const winner:(0|1)=Math.random()<0.5?0:1
  state.coinFlipWinner=winner
  state.startingPlayer=winner
  state.activePlayer=winner
  state.message=`${state.players[winner].name} wins the coin toss and will play first.`
  return state
}

export function confirmCoinFlip(input:GameState):GameState {
  const state=structuredClone(input) as GameState
  if(!state.coinFlipPending || state.coinFlipWinner===null || state.winner!==null) return state
  state.coinFlipPending=false
  state.mulliganPlayer=state.coinFlipWinner
  state.activePlayer=state.coinFlipWinner
  state.message=`${state.players[state.coinFlipWinner].name}: choose up to 2 cards to redraw.`
  return state
}

export function completeMulligan(input:GameState, player:0|1, selectedUids:string[]):GameState {
  const state=structuredClone(input) as GameState
  if(state.coinFlipPending || state.mulliganPlayer!==player || state.winner!==null || state.startingPlayer===null) return state
  const chosen=[...new Set(selectedUids)].slice(0,2)
  const returned:CardInstance[]=[]
  for(const cardUid of chosen){ const card=removeByUid(state.players[player].hand,cardUid); if(card) returned.push(card) }
  draw(state,player,returned.length)
  state.players[player].deck=shuffle([...state.players[player].deck,...returned])
  if(player===state.startingPlayer){
    const next=other(player)
    state.mulliganPlayer=next
    state.message=`${state.players[next].name}: choose up to 2 cards to redraw.`
  } else {
    state.mulliganPlayer=null
    state.activePlayer=state.startingPlayer
    state.message=`${state.players[state.activePlayer].name} to play.`
  }
  return state
}

function draw(state:GameState, p:0|1, count:number) {
  const pl=state.players[p]
  for(let i=0;i<count;i++) { const card=pl.deck.shift(); if(card) pl.hand.push(card) }
}
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
function discardSpecial(state:GameState, player:0|1, card:CardInstance){ state.players[player].discard.push(card) }

export function decoyCandidates(state:GameState, player:0|1=state.activePlayer){
  const out:{row:Row;card:CardInstance}[]=[]
  for(const row of ROWS) for(const card of state.players[player].rows[row]){
    const d=def(card)
    if(!isSpecial(d) && !d.unique) out.push({row,card})
  }
  return out
}

function resolveScorch(state:GameState, player:0|1){
  const targets:{side:0|1;row:Row;card:CardInstance;power:number}[]=[]
  for(const side of [0,1] as const) for(const row of ROWS) for(const card of state.players[side].rows[row]){
    const d=def(card)
    if(isSpecial(d) || d.unique) continue
    targets.push({side,row,card,power:cardPower(state,side,row,card)})
  }
  if(!targets.length){ state.message=`${state.players[player].name} plays Scorch, but there are no valid units.`; return }
  const max=Math.max(...targets.map(t=>t.power))
  const doomed=targets.filter(t=>t.power===max)
  for(const target of doomed){
    const removed=removeByUid(state.players[target.side].rows[target.row],target.card.uid)
    if(removed) state.players[removed.owner].discard.push(removed)
  }
  state.message=`Scorch destroys ${doomed.length} unit${doomed.length===1?'':'s'} at ${max} strength.`
}

function playSpecial(state:GameState, player:0|1, card:CardInstance){
  const d=def(card)
  switch(d.ability){
    case 'special_decoy': {
      if(decoyCandidates(state,player).length===0){
        state.players[player].hand.push(card)
        state.message='Decoy needs a non-legendary unit on your battlefield.'
        return false
      }
      state.pendingDecoy={player,card}
      state.message='Decoy: choose one of your non-legendary units to return to your hand.'
      return true
    }
    case 'special_frost':
      state.weather[0].melee='frost'; state.weather[1].melee='frost'; discardSpecial(state,player,card); state.message='Biting Frost covers both Melee rows.'; return true
    case 'special_fog':
      state.weather[0].ranged='fog'; state.weather[1].ranged='fog'; discardSpecial(state,player,card); state.message='Impenetrable Fog covers both Ranged rows.'; return true
    case 'special_rain':
      state.weather[0].siege='rain'; state.weather[1].siege='rain'; discardSpecial(state,player,card); state.message='Torrential Rain covers both Siege rows.'; return true
    case 'special_scorch':
      discardSpecial(state,player,card); resolveScorch(state,player); return true
    default:
      state.players[player].hand.push(card); return false
  }
}

export function playCard(input:GameState, player:0|1, uidToPlay:string, chosenRow?:Row):GameState {
  const state=structuredClone(input) as GameState
  if(state.coinFlipPending || state.mulliganPlayer!==null || state.winner!==null || state.activePlayer!==player || state.players[player].passed || state.pendingDecoy) return state
  const card=removeByUid(state.players[player].hand,uidToPlay); if(!card) return state
  const cardDef=def(card)

  if(isSpecial(cardDef)){
    const accepted=playSpecial(state,player,card)
    if(accepted && !state.pendingDecoy) advanceTurnOrRound(state)
    return state
  }

  if(!chosenRow || !cardDef.rows.includes(chosenRow)){ state.players[player].hand.push(card); return state }
  const enemy=other(player)
  const side = cardDef.ability==='spy' ? enemy : player
  putOnRow(state,side,chosenRow,card)

  switch(cardDef.ability){
    case 'spy': draw(state,player,2); state.message=`${cardDef.name} spies for ${state.players[player].name}: draw 2.`; break
    case 'summon_same': summonAll(state,player,card.definitionId,chosenRow,card.uid); state.message=`${cardDef.name} calls the rest of the crew.`; break
    case 'summon_blackwake': for(const id of ['blackwake-deckhands','blackwake-deckhands']){ const c=pullByDefinition(state,player,id); if(c) putOnRow(state,player,'melee',c) } state.message='The Blackwake Deckhands answer the Bosun.'; break
    case 'summon_bowrig_crew': for(const id of ['jane-doe','bullrack','mickey']){ const c=pullByDefinition(state,player,id); if(c) putOnRow(state,player,'melee',c) } state.message='Bowrig summons her crew.'; break
    case 'brothers_in_arms': {
      const found=locateOnBoard(state,c=>c.definitionId==='tobias-fate' && c.owner===player)
      if(found && found.side===enemy){ const [tf]=state.players[found.side].rows[found.row].splice(found.idx,1); putOnRow(state,player,'ranged',tf); state.message='Brothers in Arms: Tobias Fate changes sides.' }
      break
    }
    case 'sirens_call': state.weather[enemy].ranged='fog'; state.message='Siren’s Call blankets the enemy Ranged row in fog.'; break
    case 'salt_of_the_earth': state.weather[enemy].siege='rain'; state.message='Salt of the Earth drenches the enemy Siege row.'; break
    case 'fire_and_blood': state.weather[enemy].melee='frost'; state.message='Fire & Blood freezes the enemy Melee row.'; break
    case 'medic': {
      const candidates=state.players[player].discard.filter(c=>!def(c).unique && !isSpecial(def(c)))
      if(candidates.length) { state.pendingMedic={player,medicUid:card.uid}; state.message='Medic: choose a non-unique unit from your discard pile.' }
      break
    }
    case 'sunder': {
      for(const boardSide of [0,1] as const) for(const row of ROWS){
        const survivors:CardInstance[]=[]
        const cards=state.players[boardSide].rows[row].splice(0)
        for(const c of cards){
          // Sunder destroys units, not board-positioned Special cards such as Decoy.
          if(c.uid===card.uid || isSpecial(def(c))) survivors.push(c)
          else state.players[c.owner].discard.push(c)
        }
        state.players[boardSide].rows[row].push(...survivors)
      }
      state.message='SUNDER: Dreadfist destroys every other unit and remains standing.'
      break
    }
  }
  if(!state.pendingMedic) advanceTurnOrRound(state)
  return state
}

export function resolveDecoy(input:GameState, targetUid:string):GameState {
  const state=structuredClone(input) as GameState
  if(!state.pendingDecoy) return state
  const {player,card:decoy}=state.pendingDecoy
  for(const row of ROWS){
    const idx=state.players[player].rows[row].findIndex(c=>c.uid===targetUid)
    if(idx<0) continue
    const target=state.players[player].rows[row][idx]
    const td=def(target)
    if(td.unique || isSpecial(td)) return state
    state.players[player].rows[row][idx]=decoy
    state.players[player].hand.push(target)
    state.pendingDecoy=null
    state.message=`Decoy returns ${td.name} to ${state.players[player].name}'s hand.`
    advanceTurnOrRound(state)
    return state
  }
  return state
}

export function resolveMedic(input:GameState, uidFromDiscard:string):GameState {
  const state=structuredClone(input) as GameState
  if(!state.pendingMedic) return state
  const p=state.pendingMedic.player
  const card=removeByUid(state.players[p].discard,uidFromDiscard)
  if(card && !def(card).unique && !isSpecial(def(card))){
    const d=def(card); const row=d.rows[0]
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
  if(state.coinFlipPending || state.mulliganPlayer!==null || state.activePlayer!==player || state.winner!==null || state.pendingDecoy) return state
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

/**
 * Strength precedence:
 * 1. Printed strength.
 * 2. Base setters such as Weather (affected non-Legendary base becomes 1).
 * 3. Base multipliers such as Bond.
 * 4. Additive buffs such as Morale Boost.
 * Legendary units ignore ordinary Weather and Morale effects. Explicit card text
 * can supersede that protection (for example Dreadfist's Sunder).
 */
export function cardPower(state:GameState, side:0|1, row:Row, card:CardInstance):number {
  const d=def(card)
  if(isSpecial(d)) return 0
  if(d.unique) return d.strength
  let base = state.weather[side][row] ? 1 : d.strength
  if(d.ability==='bond' && state.players[side].rows[row].some(c=>c.uid!==card.uid && c.definitionId===card.definitionId)) base*=2
  const moraleCount=state.players[side].rows[row].filter(c=>c.uid!==card.uid && !isSpecial(def(c)) && def(c).ability==='morale').length
  return base + moraleCount
}

export function rowScore(state:GameState, side:0|1, row:Row){ return state.players[side].rows[row].reduce((n,c)=>n+cardPower(state,side,row,c),0) }
export function playerScore(state:GameState, side:0|1){ return ROWS.reduce((n,r)=>n+rowScore(state,side,r),0) }
export function medicCandidates(state:GameState){ if(!state.pendingMedic) return []; const p=state.pendingMedic.player; return state.players[p].discard.filter(c=>!def(c).unique && !isSpecial(def(c))) }
