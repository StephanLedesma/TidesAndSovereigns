import { ALL_CARDS, CARD_MAP } from '../data/fractilian'
import { completeMulligan, decoyCandidates, deckStats, medicCandidates, passTurn, playCard, playerScore, resolveDecoy, resolveMedic } from './engine'
import type { CardDefinition, GameState, Row } from './types'

export type DeckCounts = Record<string, number>
export type ComputerAction =
  | { type:'pass' }
  | { type:'play'; uid:string; row?:Row }
  | { type:'medic'; uid:string }
  | { type:'decoy'; uid:string }

const ROWS:Row[]=['melee','ranged','siege']

function shuffle<T>(items:T[]){
  const a=[...items]
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
  return a
}

/** Build a fresh legal NPC deck from the full NPC card pool.
 * NPCs can use every non-Legendary card in the database. Legendary cards are
 * opt-in per match through allowedLegendaryIds. Player collection ownership
 * never limits NPC deck generation.
 */
export function generateRandomNpcDeck(allowedLegendaryIds:string[]=[]):string[]{
  const units:string[]=[]
  const specials:string[]=[]
  const allowedLegendaries=new Set(allowedLegendaryIds)
  for(const card of ALL_CARDS){
    if(card.unique&&!allowedLegendaries.has(card.id)) continue
    const available=Math.max(0,card.copies??1)
    for(let i=0;i<available;i++) (card.kind==='special'?specials:units).push(card.id)
  }
  if(units.length<22) return []

  const maxExtra=Math.min(8,units.length-22)
  const unitTarget=22+(maxExtra>0?Math.floor(Math.random()*(maxExtra+1)):0)
  const specialCap=Math.min(10,specials.length)
  // NPCs usually carry some tricks, but the count still varies considerably.
  const specialFloor=Math.min(3,specialCap)
  const specialTarget=specialCap===0?0:specialFloor+Math.floor(Math.random()*(specialCap-specialFloor+1))
  const deck=[...shuffle(units).slice(0,unitTarget),...shuffle(specials).slice(0,specialTarget)]
  return shuffle(deck)
}

function cardKeepScore(def:CardDefinition){
  let score=def.kind==='special'?4:def.strength
  if(def.unique) score+=2
  if(def.ability==='spy') score+=5
  if(def.ability==='medic') score+=4
  if(def.ability==='sunder') score+=4
  if(def.ability==='summon_same'||def.ability==='summon_blackwake'||def.ability==='summon_bowrig_crew') score+=2
  if(def.ability==='special_scorch') score+=3
  return score+Math.random()*1.5
}

/** The computer redraws up to two of the weakest cards in its opening hand. */
export function chooseComputerMulligan(state:GameState,player:0|1=1):string[]{
  const scored=state.players[player].hand.map(card=>({card,score:cardKeepScore(CARD_MAP[card.definitionId])})).sort((a,b)=>a.score-b.score)
  if(scored.length<2) return scored.map(x=>x.card.uid)
  return scored.slice(0,2).map(x=>x.card.uid)
}

function resolveSimulationPending(sim:GameState):GameState{
  let next=sim
  if(next.pendingMedic?.player===1){
    const options=medicCandidates(next)
    if(options.length){
      const best=[...options].sort((a,b)=>(CARD_MAP[b.definitionId]?.strength??0)-(CARD_MAP[a.definitionId]?.strength??0))[0]
      next=resolveMedic(next,best.uid)
    }
  }
  if(next.pendingDecoy?.player===1){
    const options=decoyCandidates(next,1)
    if(options.length){
      const scored=options.map(({card})=>{
        const d=CARD_MAP[card.definitionId]
        let value=d.strength
        if(d.ability==='medic'||d.ability==='spy') value+=6
        if(d.ability.startsWith('summon')) value+=4
        if(d.ability==='morale') value+=3
        return {card,value}
      }).sort((a,b)=>b.value-a.value)
      next=resolveDecoy(next,scored[0].card.uid)
    }
  }
  return next
}

function stateUtility(before:GameState,after:GameState){
  const board=(playerScore(after,1)-playerScore(after,0))*2.2
  const hand=after.players[1].hand.length*2.8
  const roundLead=(after.players[1].roundWins-after.players[0].roundWins)*22
  const won=after.winner===1?1000:after.winner===0?-1000:0
  const cardConservation=(after.players[1].hand.length-before.players[1].hand.length)*0.8
  return board+hand+roundLead+won+cardConservation+Math.random()*2
}

function candidateActions(state:GameState){
  const candidates:{action:ComputerAction;after:GameState;utility:number}[]=[]
  for(const card of state.players[1].hand){
    const d=CARD_MAP[card.definitionId]
    if(!d) continue
    const rows:(Row|undefined)[]=d.kind==='special'?[undefined]:d.rows
    for(const row of rows){
      let after=playCard(state,1,card.uid,row)
      // Illegal Decoy returns to hand and does not advance the turn.
      if(after.activePlayer===state.activePlayer && after.players[1].hand.some(c=>c.uid===card.uid) && !after.pendingDecoy && d.kind==='special') continue
      after=resolveSimulationPending(after)
      candidates.push({action:{type:'play',uid:card.uid,row},after,utility:stateUtility(state,after)})
    }
  }
  return candidates
}

/** A deliberately readable, deterministic-ish Gwent AI rather than a cheating AI. */
export function chooseComputerAction(state:GameState):ComputerAction{
  if(state.pendingMedic?.player===1){
    const choices=medicCandidates(state)
    if(!choices.length) return {type:'pass'}
    const best=[...choices].sort((a,b)=>(CARD_MAP[b.definitionId]?.strength??0)-(CARD_MAP[a.definitionId]?.strength??0))[0]
    return {type:'medic',uid:best.uid}
  }
  if(state.pendingDecoy?.player===1){
    const options=decoyCandidates(state,1)
    if(!options.length) return {type:'pass'}
    const best=[...options].sort((a,b)=>(CARD_MAP[b.card.definitionId]?.strength??0)-(CARD_MAP[a.card.definitionId]?.strength??0))[0]
    return {type:'decoy',uid:best.card.uid}
  }
  if(state.activePlayer!==1 || state.players[1].passed || state.winner!==null) return {type:'pass'}
  if(state.players[1].hand.length===0) return {type:'pass'}

  const ai=playerScore(state,1), human=playerScore(state,0)
  if(state.players[0].passed && ai>human) return {type:'pass'}

  const candidates=candidateActions(state)
  if(!candidates.length) return {type:'pass'}

  // If the human has passed, spend the cheapest possible card that gets ahead.
  if(state.players[0].passed){
    const winners=candidates.filter(c=>playerScore(c.after,1)>playerScore(c.after,0))
    if(winners.length){
      winners.sort((a,b)=>{
        const aUid=a.action.type==='play'?a.action.uid:''
        const bUid=b.action.type==='play'?b.action.uid:''
        const ad=CARD_MAP[state.players[1].hand.find(c=>c.uid===aUid)?.definitionId??'']
        const bd=CARD_MAP[state.players[1].hand.find(c=>c.uid===bUid)?.definitionId??'']
        return (ad?.strength??0)-(bd?.strength??0) || b.utility-a.utility
      })
      return winners[0].action
    }
    // Don't throw the whole hand at an obviously lost round.
    if(human-ai>18 && state.players[1].hand.length<=state.players[0].hand.length+1) return {type:'pass'}
  }

  // Occasionally concede a badly losing first/second round to conserve cards.
  if(human-ai>20 && state.players[1].hand.length<=state.players[0].hand.length && state.round<3) return {type:'pass'}

  candidates.sort((a,b)=>b.utility-a.utility)
  return candidates[0].action
}

export function applyComputerAction(state:GameState,action:ComputerAction):GameState{
  if(action.type==='pass') return passTurn(state,1)
  if(action.type==='medic') return resolveMedic(state,action.uid)
  if(action.type==='decoy') return resolveDecoy(state,action.uid)
  return playCard(state,1,action.uid,action.row)
}

export function applyComputerMulligan(state:GameState):GameState{
  if(state.mulliganPlayer!==1) return state
  return completeMulligan(state,1,chooseComputerMulligan(state,1))
}

export function randomNpcDeckIsLegal(allowedLegendaryIds:string[]=[]){
  const deck=generateRandomNpcDeck(allowedLegendaryIds)
  return deck.length>0 && deckStats(deck).valid
}
