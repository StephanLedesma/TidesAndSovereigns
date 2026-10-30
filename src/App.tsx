import { useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, Bot, ChevronDown, ChevronUp, Download, Eye, Flag, Layers3, Minus, Plus, RotateCcw, Save, Skull, Upload, UserRound, X, Coins } from 'lucide-react'
import { ALL_CARDS, CARD_MAP, STARTER_DECK_IDS } from './data/fractilian'
import { completeMulligan, confirmCoinFlip, createGame, decoyCandidates, deckStats, flipCoin, medicCandidates, passTurn, playCard, playerScore, resolveDecoy, resolveMedic } from './game/engine'
import { applyComputerAction, applyComputerMulligan, chooseComputerAction, generateRandomNpcDeck } from './game/ai'
import type { CardDefinition, CardInstance, Row } from './game/types'
import { BoardRow } from './components/BoardRow'
import { CardView } from './components/CardView'
import './styles.css'

const order:Row[]=['melee','ranged','siege']
const CAMPAIGN_SAVE_KEY='pirates-vs-titans-campaign-v4'
const LEGACY_SAVE_KEYS=['pirates-vs-titans-campaign-v3','pirates-vs-titans-campaign-v2','pirates-vs-titans-campaign-v1']
type DeckCounts=Record<string,number>
type OpponentMode='computer'|'dm'
interface CampaignSave { version:4; collection:DeckCounts; playerDeck:DeckCounts; opponentMode:OpponentMode }

const LEGACY_V09_STARTER_DECK_IDS:string[] = [
  'poor-fucking-pirates','poor-fucking-pirates','poor-fucking-pirates',
  'tidecutters','tidecutters','tidecutters',
  'cabin-boys','cabin-boys','cabin-boys',
  'boarding-gunners','boarding-gunners','boarding-gunners',
  'blackwake-bosun','blackwake-deckhands','blackwake-deckhands',
  'cutlass-corsair','tobias-fate','jasper','karthos-vale',
  'wailing-hangman','eagle-of-the-sea','salt-widow',
  'decoy','biting-frost','impenetrable-fog','torrential-rain','scorch'
]

function countsFromIds(ids:string[]):DeckCounts{
  const counts:DeckCounts={}
  for(const id of ids) counts[id]=(counts[id]??0)+1
  return counts
}
function idsFromCounts(counts:DeckCounts){
  return ALL_CARDS.flatMap(d=>Array.from({length:counts[d.id]??0},()=>d.id))
}
function countsEqual(a:DeckCounts,b:DeckCounts){
  return ALL_CARDS.every(card=>(a[card.id]??0)===(b[card.id]??0))
}
function startingCollection():DeckCounts{
  // The party begins owning exactly the cards physically present in the starter deck.
  // Extra copies and every other card must be found during the D&D campaign.
  return countsFromIds(STARTER_DECK_IDS)
}
function isLegacyFullCollection(collection:DeckCounts){
  // v0.8 accidentally granted every then-existing card at its maximum copy limit.
  // Newer v0.10 Specials did not exist in that save, so exclude them from this legacy fingerprint.
  return ALL_CARDS.filter(card=>card.id!=='clear-skies'&&card.id!=='commanders-horn').every(card=>(collection[card.id]??0)===(card.copies??1))
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
    const desired=Math.floor(Number(raw?.[card.id]??0))
    const max=Math.min(card.copies??1,collection[card.id]??0)
    const safe=Number.isFinite(desired)?Math.max(0,Math.min(max,desired)):0
    if(safe>0) counts[card.id]=safe
  }
  return counts
}
function normalizeCampaignSave(raw:unknown):CampaignSave|null{
  if(!raw||typeof raw!=='object') return null
  const data=raw as Record<string,unknown>
  const defaultCollection=startingCollection()
  const parsedCollection=sanitizeCollection(data.collection)
  const importedVersion=Number(data.version??0)
  const shouldCleanseLegacy=importedVersion<3&&isLegacyFullCollection(parsedCollection)
  let collection=shouldCleanseLegacy?defaultCollection:(Object.keys(parsedCollection).length?parsedCollection:defaultCollection)
  // v0.10 corrects the starter set: Karthos was included by mistake. Malcolm replaces him,
  // and the starter now includes one Clear Skies and one Commander's Horn.
  if(importedVersion<4 && countsEqual(collection,countsFromIds(LEGACY_V09_STARTER_DECK_IDS))) collection=defaultCollection
  let rawDeck:DeckCounts={}
  if(data.playerDeck&&typeof data.playerDeck==='object') rawDeck=data.playerDeck as DeckCounts
  else if(Array.isArray(data.decks)&&data.decks[0]&&typeof data.decks[0]==='object') rawDeck=data.decks[0] as DeckCounts
  const starter=clampDeckToCollection(countsFromIds(STARTER_DECK_IDS),collection)
  if(importedVersion<4 && countsEqual(rawDeck,countsFromIds(LEGACY_V09_STARTER_DECK_IDS))) rawDeck=countsFromIds(STARTER_DECK_IDS)
  let playerDeck=clampDeckToCollection(Object.keys(rawDeck).length?rawDeck:starter,collection)
  if(!deckStats(idsFromCounts(playerDeck)).valid) playerDeck=starter
  const opponentMode:OpponentMode=data.opponentMode==='dm'?'dm':'computer'
  return {version:4,collection,playerDeck,opponentMode}
}
function loadCampaignSave():CampaignSave{
  const fallback=normalizeCampaignSave({collection:startingCollection(),playerDeck:countsFromIds(STARTER_DECK_IDS),opponentMode:'computer'})!
  try{
    const saved=window.localStorage.getItem(CAMPAIGN_SAVE_KEY) ?? LEGACY_SAVE_KEYS.map(key=>window.localStorage.getItem(key)).find(Boolean)
    if(!saved) return fallback
    return normalizeCampaignSave(JSON.parse(saved))??fallback
  }catch{return fallback}
}
function fakeCard(definitionId:string, owner:0|1):CardInstance{
  return {uid:`preview-${owner}-${definitionId}`,definitionId,owner}
}
function cardLabel(d:CardDefinition){
  return d.kind==='special' ? 'Special' : `${d.strength} power · ${d.rows.join(' / ')}${d.unique?' · Legendary':''}`
}
function npcName(mode:OpponentMode){return mode==='computer'?'Computer':'Dungeon Master'}

export default function App(){
  const [initialSave]=useState<CampaignSave>(()=>loadCampaignSave())
  const [collection,setCollection]=useState<DeckCounts>(initialSave.collection)
  const [deckCounts,setDeckCounts]=useState<[DeckCounts,DeckCounts]>([initialSave.playerDeck,{}])
  const [opponentMode,setOpponentMode]=useState<OpponentMode>(initialSave.opponentMode)
  const [buildingDecks,setBuildingDecks]=useState(true)
  const [state,setState]=useState(()=>createGame(STARTER_DECK_IDS,STARTER_DECK_IDS,['Player 1',npcName(initialSave.opponentMode)]))
  const [showRules,setShowRules]=useState(false)
  const [inspected,setInspected]=useState<CardInstance|null>(null)
  const [mulliganSelection,setMulliganSelection]=useState<string[]>([])
  const [handOpen,setHandOpen]=useState(true)
  const [showCollection,setShowCollection]=useState(false)
  const [unlockQuery,setUnlockQuery]=useState('')
  const [collectionMessage,setCollectionMessage]=useState('')
  const [saveMessage,setSaveMessage]=useState('')
  const [npcLegendaryIds,setNpcLegendaryIds]=useState<string[]>([])
  const importRef=useRef<HTMLInputElement|null>(null)

  const current=state.activePlayer
  const computerMode=opponentMode==='computer'
  const viewPlayer:0|1=computerMode?0:current
  const enemy:0|1=viewPlayer===0?1:0
  const candidates=useMemo(()=>medicCandidates(state),[state])
  const decoys=useMemo(()=>state.pendingDecoy?decoyCandidates(state,state.pendingDecoy.player):[],[state])
  const inspectedDef=inspected?CARD_MAP[inspected.definitionId]:null
  const mulliganPlayer=state.mulliganPlayer
  const deckIds:[string[],string[]]=[idsFromCounts(deckCounts[0]),idsFromCounts(deckCounts[1])]
  const playerDeckInfo=deckStats(deckIds[0])
  const npcLegendarySet=new Set(npcLegendaryIds)
  const availableNpcUnits=ALL_CARDS.filter(d=>d.kind!=='special'&&(!d.unique||npcLegendarySet.has(d.id))).reduce((n,d)=>n+(d.copies??1),0)
  const npcCanBuild=availableNpcUnits>=22
  const computerThinking=computerMode&&!state.coinFlipPending&&state.winner===null&&(state.mulliganPlayer===1||(state.mulliganPlayer===null&&state.activePlayer===1&&!state.players[1].passed))

  useEffect(()=>{ setMulliganSelection([]) },[state.mulliganPlayer])
  useEffect(()=>{
    const save:CampaignSave={version:4,collection,playerDeck:deckCounts[0],opponentMode}
    try{window.localStorage.setItem(CAMPAIGN_SAVE_KEY,JSON.stringify(save))}catch{/* game still runs without browser storage */}
  },[collection,deckCounts,opponentMode])
  useEffect(()=>{
    if(!inspected) return
    const onKeyDown=(event:KeyboardEvent)=>{ if(event.key==='Escape') setInspected(null) }
    window.addEventListener('keydown',onKeyDown)
    return ()=>window.removeEventListener('keydown',onKeyDown)
  },[inspected])
  useEffect(()=>{
    if(buildingDecks||!computerMode||state.coinFlipPending||state.winner!==null) return
    if(state.mulliganPlayer===1){
      const timer=window.setTimeout(()=>setState(s=>applyComputerMulligan(s)),650)
      return ()=>window.clearTimeout(timer)
    }
    if(state.mulliganPlayer!==null||state.activePlayer!==1||state.players[1].passed) return
    const timer=window.setTimeout(()=>setState(s=>applyComputerAction(s,chooseComputerAction(s))),800)
    return ()=>window.clearTimeout(timer)
  },[state,buildingDecks,computerMode])

  const inspectedIsPlayable = inspected && inspectedDef
    ? !buildingDecks && !state.coinFlipPending && state.mulliganPlayer===null && current===viewPlayer && state.players[current].hand.some(card=>card.uid===inspected.uid) && !state.players[current].passed && state.winner===null && !state.pendingDecoy
    : false
  const inspectedIsMulligan = inspected && mulliganPlayer!==null && !(computerMode&&mulliganPlayer===1)
    ? state.players[mulliganPlayer].hand.some(card=>card.uid===inspected.uid)
    : false
  const hornRowsAvailable:Row[] = inspectedDef?.ability==='special_horn' ? order.filter(row=>!state.players[current].horns[row]) : []

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
    if(mulliganPlayer===null || (computerMode&&mulliganPlayer===1)) return
    setState(s=>completeMulligan(s,mulliganPlayer,mulliganSelection))
    setInspected(null)
  }

  const updateDeckCount=(d:CardDefinition,delta:number)=>{
    setDeckCounts(currentCounts=>{
      const nextPlayer={...currentCounts[0]}
      const now=nextPlayer[d.id]??0
      const owned=collection[d.id]??0
      const next=Math.max(0,Math.min(d.copies??1,owned,now+delta))
      const stats=deckStats(idsFromCounts(nextPlayer))
      if(delta>0 && d.kind==='special' && stats.specials>=10) return currentCounts
      if(next===0) delete nextPlayer[d.id]
      else nextPlayer[d.id]=next
      return [nextPlayer,currentCounts[1]]
    })
  }
  const updateCollectionCount=(d:CardDefinition,delta:number)=>{
    const now=collection[d.id]??0
    const next=Math.max(0,Math.min(d.copies??1,now+delta))
    const updated={...collection}
    if(next===0) delete updated[d.id]
    else updated[d.id]=next
    setCollection(updated)
    setDeckCounts(current=>[clampDeckToCollection(current[0],updated),{}])
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

  const exportCampaign=()=>{
    const payload:CampaignSave={version:4,collection,playerDeck:deckCounts[0],opponentMode}
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'})
    const url=URL.createObjectURL(blob)
    const link=document.createElement('a')
    link.href=url
    link.download='pirates-vs-titans-campaign-save.json'
    document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url)
    setSaveMessage('Campaign save exported.')
  }
  const importCampaign=async(file:File)=>{
    try{
      const parsed=normalizeCampaignSave(JSON.parse(await file.text()))
      if(!parsed) throw new Error('invalid')
      setCollection(parsed.collection)
      setDeckCounts([parsed.playerDeck,{}])
      setOpponentMode(parsed.opponentMode)
      setNpcLegendaryIds([])
      setBuildingDecks(true)
      setInspected(null)
      setSaveMessage('Campaign save imported.')
    }catch{setSaveMessage('That file is not a valid Pirates vs Titans campaign save.')}
    if(importRef.current) importRef.current.value=''
  }

  const createFreshMatch=()=>{
    if(!playerDeckInfo.valid||!npcCanBuild) return
    const npcIds=generateRandomNpcDeck(npcLegendaryIds)
    if(!deckStats(npcIds).valid){setSaveMessage('The NPC card pool cannot make a legal deck with the current match options.');return}
    setDeckCounts(currentCounts=>[currentCounts[0],countsFromIds(npcIds)])
    setState(createGame(deckIds[0],npcIds,['Player 1',npcName(opponentMode)]))
    setBuildingDecks(false)
    setInspected(null)
    setHandOpen(true)
    setMulliganSelection([])
  }
  const newMatch=()=>{
    setBuildingDecks(true)
    setNpcLegendaryIds([])
    setInspected(null)
    setMulliganSelection([])
  }

  if(buildingDecks){
    return <main className="deck-builder-shell">
      <header className="topbar builder-topbar">
        <div><h1>Pirates <span>vs</span> Titans</h1><p>Build the party deck · NPCs draw from the full non-Legendary card pool</p></div>
        <div className="builder-top-actions">
          <span className="save-indicator"><Save size={14}/> Saved locally</span>
          <button className="rules-button" onClick={exportCampaign}><Download size={16}/> Export campaign</button>
          <button className="rules-button" onClick={()=>importRef.current?.click()}><Upload size={16}/> Import campaign</button>
          <input ref={importRef} className="hidden-file-input" type="file" accept="application/json,.json" onChange={e=>{const file=e.target.files?.[0];if(file)void importCampaign(file)}}/>
          <button className="rules-button" onClick={()=>setShowCollection(true)}><BookOpen size={16}/> Campaign collection</button>
          <button className="rules-button" onClick={()=>setShowRules(true)}><Eye size={16}/> Deck rules</button>
        </div>
      </header>

      <section className="deck-builder">
        {saveMessage&&<div className="save-message">{saveMessage}</div>}
        <div className="opponent-mode-panel">
          <div><span className="mulligan-kicker">Opponent</span><h2>Who controls the NPC?</h2><p>Player 2 always receives a new legal randomized deck. Choose whether the game controls that deck or you do.</p></div>
          <div className="opponent-mode-buttons">
            <button className={opponentMode==='computer'?'active':''} onClick={()=>setOpponentMode('computer')}><Bot size={22}/><span><b>Computer</b><small>AI plays the NPC automatically</small></span></button>
            <button className={opponentMode==='dm'?'active':''} onClick={()=>setOpponentMode('dm')}><UserRound size={22}/><span><b>Dungeon Master</b><small>You manually play the randomized NPC deck on this browser</small></span></button>
          </div>
        </div>

        <div className="npc-legendary-panel">
          <div className="npc-legendary-heading"><div><span className="mulligan-kicker">NPC match options</span><h2>Legendary access</h2><p>NPCs can use every non-Legendary card automatically. Legendaries are excluded unless you explicitly allow them for this match.</p></div><button onClick={()=>setNpcLegendaryIds([])} disabled={npcLegendaryIds.length===0}>Clear Legendary access</button></div>
          <div className="npc-legendary-grid">{ALL_CARDS.filter(card=>card.unique).map(card=>{const allowed=npcLegendaryIds.includes(card.id);return <button key={card.id} className={allowed?'allowed':''} onClick={()=>setNpcLegendaryIds(ids=>allowed?ids.filter(id=>id!==card.id):[...ids,card.id])}><span>{allowed?'Allowed':'Locked'}</span><b>{card.name}</b><small>{card.strength} power · {card.rows.join(' / ')}</small></button>})}</div>
          <small className="npc-legendary-note">This is a match-only setting and resets when you return to the deck builder after a game.</small>
        </div>

        <div className="builder-header single-deck-header">
          <div className="player-tabs"><button className="active">Player 1 deck</button></div>
          <div className={`deck-stats ${playerDeckInfo.valid?'valid':'invalid'}`}>
            <span><b>{playerDeckInfo.units}</b> units <small>minimum 22</small></span>
            <span><b>{playerDeckInfo.specials}</b> specials <small>maximum 10</small></span>
            <span><b>{playerDeckInfo.total}</b> total</span>
          </div>
          <div className="builder-tools">
            <button onClick={()=>setDeckCounts(c=>[clampDeckToCollection(countsFromIds(STARTER_DECK_IDS),collection),c[1]])}>Starter deck</button>
            <button onClick={()=>setDeckCounts(c=>[{},c[1]])}>Clear</button>
          </div>
        </div>

        <div className="pool-section">
          <div className="pool-title"><h2>Fractilian Units</h2><span>Click a card to inspect it. Use + / − to build your saved player deck.</span></div>
          <div className="card-pool">
            {ALL_CARDS.filter(d=>d.kind!=='special'&&(collection[d.id]??0)>0).map(d=>{
              const count=deckCounts[0][d.id]??0
              const owned=collection[d.id]??0
              return <div className={`pool-card ${count?'chosen':''}`} key={d.id}>
                <CardView card={fakeCard(d.id,0)} onClick={()=>setInspected(fakeCard(d.id,0))}/>
                <div className="pool-controls">
                  <button onClick={()=>updateDeckCount(d,-1)} disabled={count===0}><Minus size={15}/></button>
                  <b>{count} / {owned} owned</b>
                  <button onClick={()=>updateDeckCount(d,1)} disabled={count>=owned}><Plus size={15}/></button>
                </div>
              </div>
            })}
          </div>
        </div>

        <div className="pool-section special-pool-section">
          <div className="pool-title"><h2>Special Cards</h2><span>Neutral cards. Maximum 10 Specials in a deck.</span></div>
          <div className="card-pool specials-pool">
            {ALL_CARDS.filter(d=>d.kind==='special'&&(collection[d.id]??0)>0).map(d=>{
              const count=deckCounts[0][d.id]??0
              const owned=collection[d.id]??0
              return <div className={`pool-card ${count?'chosen':''}`} key={d.id}>
                <CardView card={fakeCard(d.id,0)} onClick={()=>setInspected(fakeCard(d.id,0))}/>
                <div className="pool-controls">
                  <button onClick={()=>updateDeckCount(d,-1)} disabled={count===0}><Minus size={15}/></button>
                  <b>{count} / {owned} owned</b>
                  <button onClick={()=>updateDeckCount(d,1)} disabled={count>=owned||playerDeckInfo.specials>=10}><Plus size={15}/></button>
                </div>
              </div>
            })}
          </div>
        </div>

        <div className="builder-footer">
          <div>
            {!playerDeckInfo.valid&&<span>Your deck needs at least 22 unit cards and no more than 10 Specials.</span>}
            {!npcCanBuild&&<span>The NPC card pool needs at least 22 Unit copies before a legal deck can be generated.</span>}
            {playerDeckInfo.valid&&npcCanBuild&&<span>Ready. Player 2 will receive a fresh legal randomized deck from all non-Legendary cards{npcLegendaryIds.length?` plus ${npcLegendaryIds.length} allowed Legendary card${npcLegendaryIds.length===1?'':'s'}`:''}.</span>}
          </div>
          <button className="start-match" disabled={!playerDeckInfo.valid||!npcCanBuild} onClick={createFreshMatch}>Start match</button>
        </div>
      </section>

      {showCollection&&<CollectionModal collection={collection} unlockQuery={unlockQuery} message={collectionMessage} onUnlockQuery={setUnlockQuery} onUnlock={unlockDiscoveredCard} onAdjust={updateCollectionCount} onInspect={id=>setInspected(fakeCard(id,0))} onClose={()=>{setShowCollection(false);setCollectionMessage('')}}/>}
      {inspected&&inspectedDef&&<CardInspector card={inspected} definition={inspectedDef} onClose={()=>setInspected(null)}/>}
      {showRules&&<RulesModal onClose={()=>setShowRules(false)}/>} 
    </main>
  }

  return <main className={`app-shell ${handOpen?'hand-is-open':'hand-is-closed'}`}>
    <header className="topbar">
      <div><h1>Pirates <span>vs</span> Titans</h1><p>{computerMode?'Player vs Computer':'Player vs Dungeon Master'} · NPC deck randomized for this match</p></div>
      <div className="toolbar">
        <button onClick={()=>setShowRules(true)}><Eye size={16}/> Rules</button>
        <button onClick={newMatch}><RotateCcw size={16}/> Deck / new match</button>
      </div>
    </header>

    <div className="statusbar">
      <b>Round {state.round}</b>
      <span>{state.players[0].name}: {state.players[0].roundWins} wins · {playerScore(state,0)} power</span>
      <span>{state.players[1].name}: {state.players[1].roundWins} wins · {playerScore(state,1)} power</span>
      {computerThinking&&<span className="thinking-label"><Bot size={14}/> Computer thinking…</span>}
      <strong>{state.message}</strong>
    </div>

    <section className="table">
      <aside className="side-panel enemy-side"><div className="board-total"><span>Total</span><strong>{playerScore(state,enemy)}</strong></div><Skull/><b>{state.players[enemy].name}</b><small>{state.players[enemy].hand.length} cards</small><small>{state.players[enemy].deck.length} deck</small><small>{state.players[enemy].discard.length} discard</small>{state.players[enemy].passed&&<em>PASSED</em>}</aside>
      <div className="battlefield opponent">{[...order].reverse().map(r=><BoardRow key={r} state={state} side={enemy} row={r} onInspect={setInspected}/>)}</div>
      <div className="divider"><span>ROUND {state.round}</span></div>
      <div className="battlefield player">{order.map(r=><BoardRow key={r} state={state} side={viewPlayer} row={r} onInspect={setInspected}/>)}</div>
      <aside className="side-panel player-side"><div className="board-total"><span>Total</span><strong>{playerScore(state,viewPlayer)}</strong></div><Layers3/><b>{state.players[viewPlayer].name}</b><small>{state.players[viewPlayer].deck.length} deck</small><small>{state.players[viewPlayer].discard.length} discard</small>{current===viewPlayer&&<button className="pass" onClick={()=>{setState(s=>passTurn(s,current));setInspected(null)}} disabled={state.coinFlipPending||state.mulliganPlayer!==null||state.players[current].passed||state.winner!==null||!!state.pendingDecoy||(computerMode&&current===1)}><Flag size={16}/> Pass</button>}</aside>
    </section>

    <section className={`hand-area ${handOpen?'open':'collapsed'}`}>
      <button className="hand-heading hand-toggle" onClick={()=>setHandOpen(v=>!v)}>
        <span><b>{state.players[viewPlayer].name}'s hand</b> · {state.players[viewPlayer].hand.length} cards</span>
        <span>{handOpen?'Hide hand':'Show hand'} {handOpen?<ChevronDown size={18}/>:<ChevronUp size={18}/>}</span>
      </button>
      {handOpen&&<div className="hand">{state.players[viewPlayer].hand.map(c=><CardView key={c.uid} card={c} onClick={()=>setInspected(c)}/>)}</div>}
    </section>

    {state.coinFlipPending&&<div className="coin-backdrop"><div className="coin-modal">
      <Coins className="coin-icon" size={54}/><span className="mulligan-kicker">Opening toss</span><h2>Who plays first?</h2>
      {state.coinFlipWinner===null?<><p>{state.players[0].name} takes Heads. {state.players[1].name} takes Tails.</p><button className="coin-button" onClick={()=>setState(s=>flipCoin(s))}>Flip coin</button></>:<><div className="coin-result">{state.players[state.coinFlipWinner].name} wins the toss</div><p><b>{state.players[state.coinFlipWinner].name}</b> will take the first turn after both opening hands are settled.</p><button className="coin-button" onClick={()=>setState(s=>confirmCoinFlip(s))}>Continue to redraw</button></>}
    </div></div>}

    {mulliganPlayer!==null&&!(computerMode&&mulliganPlayer===1)&&<div className="mulligan-backdrop"><div className="mulligan-modal">
      <div className="mulligan-copy"><span className="mulligan-kicker">Opening hand</span><h2>{state.players[mulliganPlayer].name} — Redraw</h2><p>Select up to <b>2 cards</b> to replace. Click any card to inspect it first.</p><div className="mulligan-count">{mulliganSelection.length} / 2 selected</div></div>
      <div className="mulligan-hand">{state.players[mulliganPlayer].hand.map(card=><div className={`mulligan-card-slot ${mulliganSelection.includes(card.uid)?'selected':''}`} key={card.uid}><CardView card={card} onClick={()=>setInspected(card)}/><button className="redraw-toggle" onClick={()=>toggleMulligan(card.uid)}>{mulliganSelection.includes(card.uid)?'Keep':'Redraw'}</button></div>)}</div>
      <div className="mulligan-actions"><small>{mulliganSelection.length===0?'Keep your opening hand, or choose cards to redraw.':`These ${mulliganSelection.length} card${mulliganSelection.length===1?'':'s'} will be replaced.`}</small><button onClick={finishMulligan}>{mulliganSelection.length===0?'Keep hand':`Redraw ${mulliganSelection.length}`}</button></div>
    </div></div>}

    {inspected&&inspectedDef&&<CardInspector card={inspected} definition={inspectedDef} onClose={()=>setInspected(null)} playable={!!inspectedIsPlayable} onPlay={playInspected} mulligan={!!inspectedIsMulligan} mulliganSelected={mulliganSelection.includes(inspected.uid)} onToggleMulligan={()=>toggleMulligan(inspected.uid)} decoyPlayable={inspectedDef.ability!=='special_decoy'||decoyCandidates(state,current).length>0} hornRows={hornRowsAvailable}/>}

    {state.pendingDecoy&&!(computerMode&&state.pendingDecoy.player===1)&&<div className="modal-backdrop"><div className="modal"><h2>Decoy</h2><p>Choose one non-Legendary unit on your battlefield to return to your hand.</p><div className="medic-grid">{decoys.map(({card})=><CardView key={card.uid} card={card} onClick={()=>setState(s=>resolveDecoy(s,card.uid))}/>)}</div></div></div>}
    {state.pendingMedic&&!(computerMode&&state.pendingMedic.player===1)&&<div className="modal-backdrop"><div className="modal"><h2>Medic</h2><p>Play one non-unique unit from your discard pile.</p><div className="medic-grid">{candidates.map(c=><CardView key={c.uid} card={c} onClick={()=>setState(s=>resolveMedic(s,c.uid))}/>)}</div></div></div>}

    {state.winner!==null&&<div className="modal-backdrop"><div className="modal winner"><h2>{state.players[state.winner].name} wins!</h2><p>The tavern owes you a drink.</p><button onClick={createFreshMatch}>Rematch — new NPC deck</button><button onClick={newMatch}>Back to deck builder</button></div></div>}
    {showRules&&<RulesModal onClose={()=>setShowRules(false)}/>} 
  </main>
}

function CollectionModal({collection,unlockQuery,message,onUnlockQuery,onUnlock,onAdjust,onInspect,onClose}:{collection:DeckCounts;unlockQuery:string;message:string;onUnlockQuery:(value:string)=>void;onUnlock:()=>void;onAdjust:(card:CardDefinition,delta:number)=>void;onInspect:(id:string)=>void;onClose:()=>void}){
  const ownedCards=ALL_CARDS.filter(card=>(collection[card.id]??0)>0)
  const ownedCopies=ownedCards.reduce((sum,card)=>sum+(collection[card.id]??0),0)
  return <div className="modal-backdrop collection-backdrop" onClick={onClose}><div className="modal collection-modal" onClick={(e:any)=>e.stopPropagation()}>
    <button className="close" onClick={onClose}><X/></button>
    <div className="collection-heading"><div><span className="mulligan-kicker">Campaign progress</span><h2>Shared Card Collection</h2><p>Only cards the party has discovered appear in the player deck builder. NPCs use their own separate card pool, so discovering a card changes the player's collection without limiting NPC opponents. The collection auto-saves locally and can also be exported as a campaign save file.</p></div><div className="collection-total"><strong>{ownedCards.length}</strong><span>card types</span><strong>{ownedCopies}</strong><span>copies owned</span></div></div>
    <div className="unlock-panel"><div><b>Found a card in the D&D world?</b><small>Enter its exact card name or internal ID. Locked cards are not listed here, so undiscovered cards stay hidden.</small></div><div className="unlock-form"><input value={unlockQuery} onChange={e=>onUnlockQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')onUnlock()}} placeholder="Exact card name or ID"/><button onClick={onUnlock}>Add discovered copy</button></div>{message&&<span className="collection-message">{message}</span>}</div>
    <div className="collection-grid">{ownedCards.map(card=>{const owned=collection[card.id]??0;return <div className="collection-card" key={card.id}><CardView card={fakeCard(card.id,0)} onClick={()=>onInspect(card.id)}/><div className="collection-card-copy"><b>{owned} owned</b><span>deck limit {card.copies??1}</span></div><div className="collection-card-actions"><button onClick={()=>onAdjust(card,-1)} disabled={owned<=0}><Minus size={14}/></button><button onClick={()=>onAdjust(card,1)} disabled={owned>=(card.copies??1)}><Plus size={14}/></button></div></div>})}</div>
  </div></div>
}

function CardInspector({card,definition,onClose,playable=false,onPlay,mulligan=false,mulliganSelected=false,onToggleMulligan,decoyPlayable=true,hornRows=[]}:{card:CardInstance;definition:CardDefinition;onClose:()=>void;playable?:boolean;onPlay?:(row?:Row)=>void;mulligan?:boolean;mulliganSelected?:boolean;onToggleMulligan?:()=>void;decoyPlayable?:boolean;hornRows?:Row[]}){
  return <div className="card-inspect-backdrop" onClick={onClose}><div className="card-inspect" onClick={(e:any)=>e.stopPropagation()}>
    <button className="inspect-close" onClick={onClose} aria-label="Close card"><X/></button>
    {definition.image?<img className={definition.id==='fractilian-sharpshooter'?'sharpshooter-image-fix':''} src={definition.image} alt={definition.name}/>:null}
    <div className="inspect-caption"><strong>{definition.name}</strong><span>{cardLabel(definition)}</span>{definition.abilityText&&<p className="inspect-ability"><b>{definition.abilityTitle}</b>{definition.abilityText}</p>}{mulligan&&<div className="inspect-actions"><button className="mulligan-inspect-button" onClick={onToggleMulligan}>{mulliganSelected?'Remove from redraw':'Select for redraw'}</button></div>}{playable&&<div className="inspect-actions"><b>Play this card</b><div className="inspect-row-buttons">{definition.ability==='special_horn'?(hornRows.length?hornRows.map(row=><button key={row} onClick={()=>onPlay?.(row)}>Horn {row}</button>):<button disabled>No empty Horn slot</button>):definition.kind==='special'?<button disabled={!decoyPlayable} onClick={()=>onPlay?.()}>{decoyPlayable?'Play special':'No valid Decoy target'}</button>:definition.rows.map(row=><button key={row} onClick={()=>onPlay?.(row)}>Play {row}</button>)}</div></div>}{!playable&&!mulligan&&<small>Card inspection.</small>}<small>Click outside or press Esc to close.</small></div>
  </div></div>
}

function RulesModal({onClose}:{onClose:()=>void}){
  return <div className="modal-backdrop" onClick={onClose}><div className="modal rules" onClick={(e:any)=>e.stopPropagation()}><button className="close" onClick={onClose}><X/></button><h2>Pirates vs Titans rules</h2><ul>
    <li><b>Deck building:</b> at least 22 Unit cards. No more than 10 Special cards. You may include cards only up to the number of copies in the shared campaign collection.</li>
    <li>Player 1's deck and the campaign collection auto-save in this browser. Export Campaign creates a portable JSON backup that can be imported on another browser or machine.</li>
    <li>Player 2 is always an NPC seat. Its deck is randomly rebuilt for every match and obeys the 22-unit minimum and 10-Special maximum. NPCs may use every non-Legendary card in the database regardless of the party collection.</li>
    <li>NPC Legendary cards are disabled by default. During match setup, the DM may explicitly allow any Legendary cards that this particular opponent should have access to.</li>
    <li>Computer mode plays the NPC automatically. Dungeon Master mode gives you manual control of that same randomized NPC deck.</li>
    <li>Special cards are Decoy, Biting Frost, Impenetrable Fog, Torrential Rain, Scorch, Clear Skies and Commander’s Horn.</li>
    <li><b>Clear Skies:</b> removes every active Weather effect from both sides.</li>
    <li><b>Commander’s Horn:</b> choose one of your rows and place the Horn in its dedicated slot. Only one Horn may occupy a row. It doubles the final Strength of every non-Legendary unit in that row until the round ends.</li>
    <li>Normal Weather Specials affect both matching rows. Cassiopeia, Orrick and Yara only affect the enemy row because their card text specifically says so.</li>
    <li>Decoy swaps with one of your non-Legendary units and returns that unit to your hand.</li>
    <li>Scorch destroys the strongest non-Legendary unit or units currently on the battlefield.</li>
    <li>A coin toss determines who takes the first turn. The toss winner also resolves their opening redraw first.</li><li>Each player begins with 10 cards and may redraw up to 2 before round one begins.</li><li>Highest total power wins a round; first to 2 rounds wins.</li><li>Play one card per turn or pass. Once you pass, you take no more turns that round.</li><li>Spy cards are placed on the opponent's row and draw 2 cards for their owner.</li>
    <li><b>Strength precedence:</b> printed strength → Weather sets base strength → Bond multiplies that base → Morale adds afterward → Commander’s Horn doubles the result.</li><li>Fog affects Ranged, Rain affects Siege, Frost affects Melee. Weather sets the base strength of affected non-Legendary units to 1; it does not erase later buffs.</li><li>Example: a normal unit under Frost has base 1. Three Cabin Boys give that unit +3 Morale, so it finishes at 4 strength. Each Cabin Boy is 3 because it only receives the other two boosts.</li><li>Legendary black cards ignore ordinary Weather, Morale and Commander’s Horn. Specific card text beats general rules: Dreadfist's Sunder destroys Legendary units and leaves Dreadfist himself standing.</li>
  </ul><p className="note">Unit and Special card definitions live in <code>src/data/fractilian.ts</code>.</p></div></div>
}
