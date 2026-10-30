import { useEffect, useMemo, useState } from 'react'
import { BookOpen, ChevronDown, ChevronUp, Copy, Eye, Flag, Layers3, Minus, Plus, RotateCcw, Save, Skull, X, Coins } from 'lucide-react'
import { ALL_CARDS, CARD_MAP, STARTER_DECK_IDS, STARTING_COLLECTION_IDS } from './data/fractilian'
import { completeMulligan, confirmCoinFlip, createGame, decoyCandidates, deckStats, flipCoin, medicCandidates, passTurn, playCard, playerScore, resolveDecoy, resolveMedic } from './game/engine'
import type { CardDefinition, CardInstance, Row } from './game/types'
import { BoardRow } from './components/BoardRow'
import { CardView } from './components/CardView'
import './styles.css'

const order:Row[]=['melee','ranged','siege']
const CAMPAIGN_SAVE_KEY='pirates-vs-titans-campaign-v1'
type DeckCounts=Record<string,number>
interface CampaignSave { collection:DeckCounts; decks:[DeckCounts,DeckCounts] }

function countsFromIds(ids:string[]):DeckCounts{
  const counts:DeckCounts={}
  for(const id of ids) counts[id]=(counts[id]??0)+1
  return counts
}
function idsFromCounts(counts:DeckCounts){
  return ALL_CARDS.flatMap(d=>Array.from({length:counts[d.id]??0},()=>d.id))
}
function startingCollection():DeckCounts{
  const counts:DeckCounts={}
  for(const id of STARTING_COLLECTION_IDS){
    const card=CARD_MAP[id]
    if(card) counts[id]=card.copies??1
  }
  return counts
}
function sanitizeCollection(raw:unknown):DeckCounts{
  const input=(raw&&typeof raw==='object'?raw:{}) as Record<string,unknown>
  const counts:DeckCounts={}
  for(const card of ALL_CARDS){
    const value=Math.floor(Number(input[card.id]??0))
    const safe=Number.isFinite(value)?Math.max(0,Math.min(card.copies??1,value)):0
    if(safe>0) counts[card.id]=safe
  }
  return counts
}
function clampDeckToCollection(raw:DeckCounts,collection:DeckCounts):DeckCounts{
  const counts:DeckCounts={}
  for(const card of ALL_CARDS){
    const desired=Math.floor(Number(raw[card.id]??0))
    const max=Math.min(card.copies??1,collection[card.id]??0)
    const safe=Number.isFinite(desired)?Math.max(0,Math.min(max,desired)):0
    if(safe>0) counts[card.id]=safe
  }
  return counts
}
function loadCampaignSave():CampaignSave{
  const collection=startingCollection()
  const starter=clampDeckToCollection(countsFromIds(STARTER_DECK_IDS),collection)
  const fallback:CampaignSave={collection,decks:[starter,{...starter}]}
  try{
    const saved=window.localStorage.getItem(CAMPAIGN_SAVE_KEY)
    if(!saved) return fallback
    const parsed=JSON.parse(saved) as Partial<CampaignSave>
    const savedCollection=sanitizeCollection(parsed.collection)
    const hasCollection=Object.keys(savedCollection).length>0
    const finalCollection=hasCollection?savedCollection:collection
    const savedDecks=Array.isArray(parsed.decks)?parsed.decks:[]
    const p1=clampDeckToCollection((savedDecks[0]??starter) as DeckCounts,finalCollection)
    const p2=clampDeckToCollection((savedDecks[1]??starter) as DeckCounts,finalCollection)
    return {collection:finalCollection,decks:[p1,p2]}
  }catch{
    return fallback
  }
}
function fakeCard(definitionId:string, owner:0|1):CardInstance{
  return {uid:`preview-${owner}-${definitionId}`,definitionId,owner}
}
function cardLabel(d:CardDefinition){
  return d.kind==='special' ? 'Special' : `${d.strength} power · ${d.rows.join(' / ')}${d.unique?' · Legendary':''}`
}

export default function App(){
  const [initialSave]=useState<CampaignSave>(()=>loadCampaignSave())
  const [collection,setCollection]=useState<DeckCounts>(initialSave.collection)
  const [deckCounts,setDeckCounts]=useState<[DeckCounts,DeckCounts]>(initialSave.decks)
  const [buildingDecks,setBuildingDecks]=useState(true)
  const [deckPlayer,setDeckPlayer]=useState<0|1>(0)
  const [state,setState]=useState(()=>createGame(STARTER_DECK_IDS,STARTER_DECK_IDS))
  const [showRules,setShowRules]=useState(false)
  const [inspected,setInspected]=useState<CardInstance|null>(null)
  const [mulliganSelection,setMulliganSelection]=useState<string[]>([])
  const [handOpen,setHandOpen]=useState(true)
  const [showCollection,setShowCollection]=useState(false)
  const [unlockQuery,setUnlockQuery]=useState('')
  const [collectionMessage,setCollectionMessage]=useState('')

  const current=state.activePlayer
  const enemy=current===0?1:0
  const candidates=useMemo(()=>medicCandidates(state),[state])
  const decoys=useMemo(()=>state.pendingDecoy?decoyCandidates(state,state.pendingDecoy.player):[],[state])
  const inspectedDef=inspected?CARD_MAP[inspected.definitionId]:null
  const mulliganPlayer=state.mulliganPlayer
  const deckIds:[string[],string[]]=[idsFromCounts(deckCounts[0]),idsFromCounts(deckCounts[1])]
  const deckInfo=[deckStats(deckIds[0]),deckStats(deckIds[1])] as const

  useEffect(()=>{ setMulliganSelection([]) },[state.mulliganPlayer])
  useEffect(()=>{
    try{
      window.localStorage.setItem(CAMPAIGN_SAVE_KEY,JSON.stringify({collection,decks:deckCounts}))
    }catch{
      // Browser storage may be unavailable; the game itself can still run.
    }
  },[collection,deckCounts])
  useEffect(()=>{
    if(!inspected) return
    const onKeyDown=(event:KeyboardEvent)=>{ if(event.key==='Escape') setInspected(null) }
    window.addEventListener('keydown',onKeyDown)
    return ()=>window.removeEventListener('keydown',onKeyDown)
  },[inspected])

  const inspectedIsPlayable = inspected && inspectedDef
    ? !buildingDecks && !state.coinFlipPending && state.mulliganPlayer===null && state.players[current].hand.some(card=>card.uid===inspected.uid) && !state.players[current].passed && state.winner===null && !state.pendingDecoy
    : false

  const inspectedIsMulligan = inspected && mulliganPlayer!==null
    ? state.players[mulliganPlayer].hand.some(card=>card.uid===inspected.uid)
    : false

  const playInspected=(row?:Row)=>{
    if(!inspected || !inspectedIsPlayable) return
    setState(s=>playCard(s,current,inspected.uid,row))
    setInspected(null)
  }

  const toggleMulligan=(uid:string)=>{
    setMulliganSelection(selected=>{
      if(selected.includes(uid)) return selected.filter(id=>id!==uid)
      if(selected.length>=2) return selected
      return [...selected,uid]
    })
  }

  const finishMulligan=()=>{
    if(mulliganPlayer===null) return
    setState(s=>completeMulligan(s,mulliganPlayer,mulliganSelection))
    setInspected(null)
  }

  const updateDeckCount=(player:0|1,d:CardDefinition,delta:number)=>{
    setDeckCounts(currentCounts=>{
      const copy:[DeckCounts,DeckCounts]=[{...currentCounts[0]},{...currentCounts[1]}]
      const now=copy[player][d.id]??0
      const owned=collection[d.id]??0
      const next=Math.max(0,Math.min(d.copies??1,owned,now+delta))
      const stats=deckStats(idsFromCounts(copy[player]))
      if(delta>0 && d.kind==='special' && stats.specials>=10) return currentCounts
      if(next===0) delete copy[player][d.id]
      else copy[player][d.id]=next
      return copy
    })
  }

  const updateCollectionCount=(d:CardDefinition,delta:number)=>{
    const now=collection[d.id]??0
    const next=Math.max(0,Math.min(d.copies??1,now+delta))
    const updated={...collection}
    if(next===0) delete updated[d.id]
    else updated[d.id]=next
    setCollection(updated)
    setDeckCounts(current=>[
      clampDeckToCollection(current[0],updated),
      clampDeckToCollection(current[1],updated)
    ])
    setCollectionMessage(next>now?`${d.name} added to the campaign collection.`:next<now?`${d.name} ownership updated.`:'')
  }

  const unlockDiscoveredCard=()=>{
    const query=unlockQuery.trim().toLowerCase()
    if(!query){ setCollectionMessage('Enter the exact card name or card ID.'); return }
    const found=ALL_CARDS.find(card=>card.id.toLowerCase()===query||card.name.toLowerCase()===query)
    if(!found){ setCollectionMessage('No card with that exact name or ID exists in the card database.'); return }
    const owned=collection[found.id]??0
    if(owned>=(found.copies??1)){ setCollectionMessage(`You already own every available copy of ${found.name}.`); return }
    updateCollectionCount(found,1)
    setUnlockQuery('')
  }

  const startMatch=()=>{
    if(!deckInfo[0].valid || !deckInfo[1].valid) return
    setState(createGame(deckIds[0],deckIds[1]))
    setBuildingDecks(false)
    setInspected(null)
    setHandOpen(true)
  }

  const newMatch=()=>{
    setBuildingDecks(true)
    setDeckPlayer(0)
    setInspected(null)
    setMulliganSelection([])
  }

  if(buildingDecks){
    const info=deckInfo[deckPlayer]
    return <main className="deck-builder-shell">
      <header className="topbar builder-topbar">
        <div><h1>Pirates <span>vs</span> Titans</h1><p>Build your Fractilian decks · campaign collection auto-saves on this browser</p></div>
        <div className="builder-top-actions">
          <span className="save-indicator"><Save size={14}/> Saved locally</span>
          <button className="rules-button" onClick={()=>setShowCollection(true)}><BookOpen size={16}/> Campaign collection</button>
          <button className="rules-button" onClick={()=>setShowRules(true)}><Eye size={16}/> Deck rules</button>
        </div>
      </header>

      <section className="deck-builder">
        <div className="builder-header">
          <div className="player-tabs">
            {[0,1].map(p=><button key={p} className={deckPlayer===p?'active':''} onClick={()=>setDeckPlayer(p as 0|1)}>Player {p+1}</button>)}
          </div>
          <div className={`deck-stats ${info.valid?'valid':'invalid'}`}>
            <span><b>{info.units}</b> units <small>minimum 22</small></span>
            <span><b>{info.specials}</b> specials <small>maximum 10</small></span>
            <span><b>{info.total}</b> total</span>
          </div>
          <div className="builder-tools">
            <button onClick={()=>setDeckCounts(c=>{const copy:[DeckCounts,DeckCounts]=[{...c[0]},{...c[1]}];copy[deckPlayer]=clampDeckToCollection(countsFromIds(STARTER_DECK_IDS),collection);return copy})}>Starter deck</button>
            <button onClick={()=>setDeckCounts(c=>{const copy:[DeckCounts,DeckCounts]=[{...c[0]},{...c[1]}];copy[deckPlayer]={};return copy})}>Clear</button>
            {deckPlayer===1 && <button onClick={()=>setDeckCounts(c=>[{...c[0]},{...c[0]}])}><Copy size={15}/> Copy Player 1</button>}
          </div>
        </div>

        <div className="pool-section">
          <div className="pool-title"><h2>Fractilian Units</h2><span>Click a card to inspect it. Use + / − to build your deck.</span></div>
          <div className="card-pool">
            {ALL_CARDS.filter(d=>d.kind!=='special'&&(collection[d.id]??0)>0).map(d=>{
              const count=deckCounts[deckPlayer][d.id]??0
              const owned=collection[d.id]??0
              return <div className={`pool-card ${count?'chosen':''}`} key={d.id}>
                <CardView card={fakeCard(d.id,deckPlayer)} onClick={()=>setInspected(fakeCard(d.id,deckPlayer))}/>
                <div className="pool-controls">
                  <button onClick={()=>updateDeckCount(deckPlayer,d,-1)} disabled={count===0}><Minus size={15}/></button>
                  <b>{count} / {owned} owned</b>
                  <button onClick={()=>updateDeckCount(deckPlayer,d,1)} disabled={count>=owned}><Plus size={15}/></button>
                </div>
              </div>
            })}
          </div>
        </div>

        <div className="pool-section special-pool-section">
          <div className="pool-title"><h2>Special Cards</h2><span>Neutral cards. Maximum 10 Specials in a deck.</span></div>
          <div className="card-pool specials-pool">
            {ALL_CARDS.filter(d=>d.kind==='special'&&(collection[d.id]??0)>0).map(d=>{
              const count=deckCounts[deckPlayer][d.id]??0
              const owned=collection[d.id]??0
              return <div className={`pool-card ${count?'chosen':''}`} key={d.id}>
                <CardView card={fakeCard(d.id,deckPlayer)} onClick={()=>setInspected(fakeCard(d.id,deckPlayer))}/>
                <div className="pool-controls">
                  <button onClick={()=>updateDeckCount(deckPlayer,d,-1)} disabled={count===0}><Minus size={15}/></button>
                  <b>{count} / {owned} owned</b>
                  <button onClick={()=>updateDeckCount(deckPlayer,d,1)} disabled={count>=owned||info.specials>=10}><Plus size={15}/></button>
                </div>
              </div>
            })}
          </div>
        </div>

        <div className="builder-footer">
          <div>
            {!deckInfo[0].valid && <span>Player 1 needs at least 22 unit cards.</span>}
            {!deckInfo[1].valid && <span>Player 2 needs at least 22 unit cards.</span>}
            {deckInfo[0].valid&&deckInfo[1].valid&&<span>Both decks are legal.</span>}
          </div>
          <button className="start-match" disabled={!deckInfo[0].valid||!deckInfo[1].valid} onClick={startMatch}>Start match</button>
        </div>
      </section>

      {showCollection && <CollectionModal
        collection={collection}
        unlockQuery={unlockQuery}
        message={collectionMessage}
        onUnlockQuery={setUnlockQuery}
        onUnlock={unlockDiscoveredCard}
        onAdjust={updateCollectionCount}
        onInspect={id=>setInspected(fakeCard(id,0))}
        onClose={()=>{setShowCollection(false);setCollectionMessage('')}}
      />}
      {inspected && inspectedDef && <CardInspector card={inspected} definition={inspectedDef} onClose={()=>setInspected(null)} />}
      {showRules && <RulesModal onClose={()=>setShowRules(false)}/>} 
    </main>
  }

  return <main className={`app-shell ${handOpen?'hand-is-open':'hand-is-closed'}`}>
    <header className="topbar">
      <div><h1>Pirates <span>vs</span> Titans</h1><p>Fractilian prototype · local hotseat</p></div>
      <div className="toolbar">
        <button onClick={()=>setShowRules(true)}><Eye size={16}/> Rules</button>
        <button onClick={newMatch}><RotateCcw size={16}/> Decks / new match</button>
      </div>
    </header>

    <div className="statusbar">
      <b>Round {state.round}</b>
      <span>{state.players[0].name}: {state.players[0].roundWins} wins · {playerScore(state,0)} power</span>
      <span>{state.players[1].name}: {state.players[1].roundWins} wins · {playerScore(state,1)} power</span>
      <strong>{state.message}</strong>
    </div>

    <section className="table">
      <aside className="side-panel enemy-side"><div className="board-total"><span>Total</span><strong>{playerScore(state,enemy)}</strong></div><Skull/><b>{state.players[enemy].name}</b><small>{state.players[enemy].hand.length} cards</small><small>{state.players[enemy].deck.length} deck</small><small>{state.players[enemy].discard.length} discard</small>{state.players[enemy].passed&&<em>PASSED</em>}</aside>
      <div className="battlefield opponent">{[...order].reverse().map(r=><BoardRow key={r} state={state} side={enemy} row={r} onInspect={setInspected}/>)}</div>
      <div className="divider"><span>ROUND {state.round}</span></div>
      <div className="battlefield player">{order.map(r=><BoardRow key={r} state={state} side={current} row={r} onInspect={setInspected}/>)}</div>
      <aside className="side-panel player-side"><div className="board-total"><span>Total</span><strong>{playerScore(state,current)}</strong></div><Layers3/><b>{state.players[current].name}</b><small>{state.players[current].deck.length} deck</small><small>{state.players[current].discard.length} discard</small><button className="pass" onClick={()=>{setState(s=>passTurn(s,current));setInspected(null)}} disabled={state.coinFlipPending||state.mulliganPlayer!==null||state.players[current].passed||state.winner!==null||!!state.pendingDecoy}><Flag size={16}/> Pass</button></aside>
    </section>

    <section className={`hand-area ${handOpen?'open':'collapsed'}`}>
      <button className="hand-heading hand-toggle" onClick={()=>setHandOpen(v=>!v)}>
        <span><b>{state.players[current].name}'s hand</b> · {state.players[current].hand.length} cards</span>
        <span>{handOpen?'Hide hand':'Show hand'} {handOpen?<ChevronDown size={18}/>:<ChevronUp size={18}/>}</span>
      </button>
      {handOpen && <div className="hand">{state.players[current].hand.map(c=><CardView key={c.uid} card={c} onClick={()=>setInspected(c)}/>)}</div>}
    </section>

    {state.coinFlipPending && <div className="coin-backdrop">
      <div className="coin-modal">
        <Coins className="coin-icon" size={54}/><span className="mulligan-kicker">Opening toss</span><h2>Who plays first?</h2>
        {state.coinFlipWinner===null ? <><p>Player 1 takes Heads. Player 2 takes Tails.</p><button className="coin-button" onClick={()=>setState(s=>flipCoin(s))}>Flip coin</button></> : <><div className="coin-result">{state.players[state.coinFlipWinner].name} wins the toss</div><p><b>{state.players[state.coinFlipWinner].name}</b> will take the first turn after both opening hands are settled.</p><button className="coin-button" onClick={()=>setState(s=>confirmCoinFlip(s))}>Continue to redraw</button></>}
      </div>
    </div>}

    {mulliganPlayer!==null && <div className="mulligan-backdrop">
      <div className="mulligan-modal">
        <div className="mulligan-copy"><span className="mulligan-kicker">Opening hand</span><h2>{state.players[mulliganPlayer].name} — Redraw</h2><p>Select up to <b>2 cards</b> to replace. Click any card to inspect it first.</p><div className="mulligan-count">{mulliganSelection.length} / 2 selected</div></div>
        <div className="mulligan-hand">
          {state.players[mulliganPlayer].hand.map(card=><div className={`mulligan-card-slot ${mulliganSelection.includes(card.uid)?'selected':''}`} key={card.uid}>
            <CardView card={card} onClick={()=>setInspected(card)}/>
            <button className="redraw-toggle" onClick={()=>toggleMulligan(card.uid)}>{mulliganSelection.includes(card.uid)?'Keep':'Redraw'}</button>
          </div>)}
        </div>
        <div className="mulligan-actions"><small>{mulliganSelection.length===0?'Keep your opening hand, or choose cards to redraw.':`These ${mulliganSelection.length} card${mulliganSelection.length===1?'':'s'} will be replaced.`}</small><button onClick={finishMulligan}>{mulliganSelection.length===0?'Keep hand':`Redraw ${mulliganSelection.length}`}</button></div>
      </div>
    </div>}

    {inspected && inspectedDef && <CardInspector
      card={inspected}
      definition={inspectedDef}
      onClose={()=>setInspected(null)}
      playable={!!inspectedIsPlayable}
      onPlay={playInspected}
      mulligan={!!inspectedIsMulligan}
      mulliganSelected={mulliganSelection.includes(inspected.uid)}
      onToggleMulligan={()=>toggleMulligan(inspected.uid)}
      decoyPlayable={inspectedDef.ability!=='special_decoy'||decoyCandidates(state,current).length>0}
    />}

    {state.pendingDecoy && <div className="modal-backdrop"><div className="modal"><h2>Decoy</h2><p>Choose one non-Legendary unit on your battlefield to return to your hand.</p><div className="medic-grid">{decoys.map(({card})=><CardView key={card.uid} card={card} onClick={()=>setState(s=>resolveDecoy(s,card.uid))}/>)}</div></div></div>}
    {state.pendingMedic && <div className="modal-backdrop"><div className="modal"><h2>Medic</h2><p>Play one non-unique unit from your discard pile.</p><div className="medic-grid">{candidates.map(c=><CardView key={c.uid} card={c} onClick={()=>setState(s=>resolveMedic(s,c.uid))}/>)}</div></div></div>}

    {state.winner!==null && <div className="modal-backdrop"><div className="modal winner"><h2>{state.players[state.winner].name} wins!</h2><p>The tavern owes you a drink.</p><button onClick={()=>setState(createGame(deckIds[0],deckIds[1]))}>Play same decks again</button><button onClick={newMatch}>Change decks</button></div></div>}
    {showRules && <RulesModal onClose={()=>setShowRules(false)}/>} 
  </main>
}


function CollectionModal({collection,unlockQuery,message,onUnlockQuery,onUnlock,onAdjust,onInspect,onClose}:{collection:DeckCounts;unlockQuery:string;message:string;onUnlockQuery:(value:string)=>void;onUnlock:()=>void;onAdjust:(card:CardDefinition,delta:number)=>void;onInspect:(id:string)=>void;onClose:()=>void}){
  const ownedCards=ALL_CARDS.filter(card=>(collection[card.id]??0)>0)
  const ownedCopies=ownedCards.reduce((sum,card)=>sum+(collection[card.id]??0),0)
  return <div className="modal-backdrop collection-backdrop" onClick={onClose}>
    <div className="modal collection-modal" onClick={(e:any)=>e.stopPropagation()}>
      <button className="close" onClick={onClose}><X/></button>
      <div className="collection-heading">
        <div><span className="mulligan-kicker">Campaign progress</span><h2>Shared Card Collection</h2><p>Only cards the party has discovered appear in the deck builder. This collection is shared by both players and auto-saves locally.</p></div>
        <div className="collection-total"><strong>{ownedCards.length}</strong><span>card types</span><strong>{ownedCopies}</strong><span>copies owned</span></div>
      </div>

      <div className="unlock-panel">
        <div><b>Found a card in the D&D world?</b><small>Enter its exact card name or internal ID. Locked cards are not listed here, so undiscovered cards stay hidden.</small></div>
        <div className="unlock-form">
          <input value={unlockQuery} onChange={e=>onUnlockQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')onUnlock()}} placeholder="Exact card name or ID"/>
          <button onClick={onUnlock}>Add discovered copy</button>
        </div>
        {message&&<span className="collection-message">{message}</span>}
      </div>

      <div className="collection-grid">
        {ownedCards.map(card=>{
          const owned=collection[card.id]??0
          return <div className="collection-card" key={card.id}>
            <CardView card={fakeCard(card.id,0)} onClick={()=>onInspect(card.id)}/>
            <div className="collection-card-copy"><b>{owned} owned</b><span>deck limit {card.copies??1}</span></div>
            <div className="collection-card-actions">
              <button onClick={()=>onAdjust(card,-1)} disabled={owned<=0}><Minus size={14}/></button>
              <button onClick={()=>onAdjust(card,1)} disabled={owned>=(card.copies??1)}><Plus size={14}/></button>
            </div>
          </div>
        })}
      </div>
    </div>
  </div>
}

function CardInspector({card,definition,onClose,playable=false,onPlay,mulligan=false,mulliganSelected=false,onToggleMulligan,decoyPlayable=true}:{card:CardInstance;definition:CardDefinition;onClose:()=>void;playable?:boolean;onPlay?:(row?:Row)=>void;mulligan?:boolean;mulliganSelected?:boolean;onToggleMulligan?:()=>void;decoyPlayable?:boolean}){
  return <div className="card-inspect-backdrop" onClick={onClose}>
    <div className="card-inspect" onClick={(e:any)=>e.stopPropagation()}>
      <button className="inspect-close" onClick={onClose} aria-label="Close card"><X/></button>
      {definition.image?<img src={definition.image} alt={definition.name}/>:null}
      <div className="inspect-caption">
        <strong>{definition.name}</strong><span>{cardLabel(definition)}</span>
        {definition.abilityText&&<p className="inspect-ability"><b>{definition.abilityTitle}</b>{definition.abilityText}</p>}
        {mulligan && <div className="inspect-actions"><button className="mulligan-inspect-button" onClick={onToggleMulligan}>{mulliganSelected?'Remove from redraw':'Select for redraw'}</button></div>}
        {playable && <div className="inspect-actions"><b>Play this card</b><div className="inspect-row-buttons">
          {definition.kind==='special' ? <button disabled={!decoyPlayable} onClick={()=>onPlay?.()}>{decoyPlayable?'Play special':'No valid Decoy target'}</button> : definition.rows.map(row=><button key={row} onClick={()=>onPlay?.(row)}>Play {row}</button>)}
        </div></div>}
        {!playable&&!mulligan&&<small>Card inspection.</small>}<small>Click outside or press Esc to close.</small>
      </div>
    </div>
  </div>
}

function RulesModal({onClose}:{onClose:()=>void}){
  return <div className="modal-backdrop" onClick={onClose}><div className="modal rules" onClick={(e:any)=>e.stopPropagation()}><button className="close" onClick={onClose}><X/></button><h2>Pirates vs Titans rules</h2><ul>
    <li><b>Deck building:</b> at least 22 Unit cards. No more than 10 Special cards. You may include cards only up to the number of copies in the shared campaign collection.</li><li>The campaign collection and both players’ most recent deck choices are saved automatically in this browser.</li>
    <li>Special cards are Decoy, Biting Frost, Impenetrable Fog, Torrential Rain and Scorch.</li>
    <li>Normal Weather Specials affect both matching rows. Cassiopeia, Orrick and Yara only affect the enemy row because their card text specifically says so.</li>
    <li>Decoy swaps with one of your non-Legendary units and returns that unit to your hand.</li>
    <li>Scorch destroys the strongest non-Legendary unit or units currently on the battlefield.</li>
    <li>A coin toss determines who takes the first turn. The toss winner also resolves their opening redraw first.</li><li>Each player begins with 10 cards and may redraw up to 2 before round one begins.</li><li>Highest total power wins a round; first to 2 rounds wins.</li><li>Play one card per turn or pass. Once you pass, you take no more turns that round.</li><li>Spy cards are placed on the opponent's row and draw 2 cards for their owner.</li>
    <li><b>Strength precedence:</b> printed strength → Weather sets base strength → Bond multiplies that base → Morale adds afterward.</li><li>Fog affects Ranged, Rain affects Siege, Frost affects Melee. Weather sets the base strength of affected non-Legendary units to 1; it does not erase later buffs.</li><li>Example: a normal unit under Frost has base 1. Three Cabin Boys give that unit +3 Morale, so it finishes at 4 strength. Each Cabin Boy is 3 because it only receives the other two boosts.</li><li>Legendary black cards ignore ordinary Weather and Morale. Specific card text beats general rules: Dreadfist's Sunder destroys Legendary units and leaves Dreadfist himself standing.</li>
  </ul><p className="note">Unit and Special card definitions live in <code>src/data/fractilian.ts</code>.</p></div></div>
}
