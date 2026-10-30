import { useEffect, useMemo, useState } from 'react'
import { RotateCcw, Flag, Layers3, Skull, Eye, X } from 'lucide-react'
import { CARD_MAP } from './data/fractilian'
import { completeMulligan, createGame, medicCandidates, passTurn, playCard, playerScore, resolveMedic } from './game/engine'
import type { CardInstance, Row } from './game/types'
import { BoardRow } from './components/BoardRow'
import { CardView } from './components/CardView'
import './styles.css'

const order:Row[]=['melee','ranged','siege']

export default function App(){
  const [state,setState]=useState(createGame)
  const [showRules,setShowRules]=useState(false)
  const [inspected,setInspected]=useState<CardInstance|null>(null)
  const [mulliganSelection,setMulliganSelection]=useState<string[]>([])
  const current=state.activePlayer
  const enemy=current===0?1:0
  const candidates=useMemo(()=>medicCandidates(state),[state])
  const inspectedDef=inspected?CARD_MAP[inspected.definitionId]:null
  const mulliganPlayer=state.mulliganPlayer

  useEffect(()=>{
    setMulliganSelection([])
  },[state.mulliganPlayer])

  useEffect(()=>{
    if(!inspected) return
    const onKeyDown=(event:KeyboardEvent)=>{
      if(event.key==='Escape') setInspected(null)
    }
    window.addEventListener('keydown',onKeyDown)
    return ()=>window.removeEventListener('keydown',onKeyDown)
  },[inspected])

  const inspectedIsPlayable = inspected
    ? state.mulliganPlayer===null && state.players[current].hand.some(card=>card.uid===inspected.uid) && !state.players[current].passed && state.winner===null
    : false

  const playInspected=(row:Row)=>{
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
  }

  return <main className="app-shell">
    <header className="topbar">
      <div><h1>Pirates <span>vs</span> Titans</h1><p>Fractilian prototype · local hotseat</p></div>
      <div className="toolbar">
        <button onClick={()=>setShowRules(true)}><Eye size={16}/> Rules</button>
        <button onClick={()=>{setState(createGame());setInspected(null)}}><RotateCcw size={16}/> New match</button>
      </div>
    </header>

    <div className="statusbar">
      <b>Round {state.round}</b>
      <span>{state.players[0].name}: {state.players[0].roundWins} wins · {playerScore(state,0)} power</span>
      <span>{state.players[1].name}: {state.players[1].roundWins} wins · {playerScore(state,1)} power</span>
      <strong>{state.message}</strong>
    </div>

    <section className="table">
      <aside className="side-panel enemy-side"><Skull/><b>{state.players[enemy].name}</b><small>{state.players[enemy].hand.length} cards</small><small>{state.players[enemy].deck.length} deck</small><small>{state.players[enemy].discard.length} discard</small>{state.players[enemy].passed&&<em>PASSED</em>}</aside>
      <div className="battlefield opponent">{[...order].reverse().map(r=><BoardRow key={r} state={state} side={enemy} row={r} onInspect={setInspected}/>)}</div>
      <div className="divider"><span>ROUND {state.round}</span></div>
      <div className="battlefield player">{order.map(r=><BoardRow key={r} state={state} side={current} row={r} onInspect={setInspected}/>)}</div>
      <aside className="side-panel player-side"><Layers3/><b>{state.players[current].name}</b><small>{state.players[current].deck.length} deck</small><small>{state.players[current].discard.length} discard</small><button className="pass" onClick={()=>{setState(s=>passTurn(s,current));setInspected(null)}} disabled={state.mulliganPlayer!==null||state.players[current].passed||state.winner!==null}><Flag size={16}/> Pass</button></aside>
    </section>

    <section className="hand-area">
      <div className="hand-heading"><b>{state.players[current].name}'s hand</b><span>{state.players[current].hand.length} cards</span></div>
      <div className="hand">{state.players[current].hand.map(c=><CardView key={c.uid} card={c} onClick={()=>setInspected(c)}/>)}</div>
    </section>

    {mulliganPlayer!==null && <div className="mulligan-backdrop">
      <div className="mulligan-modal">
        <div className="mulligan-copy">
          <span className="mulligan-kicker">Opening hand</span>
          <h2>{state.players[mulliganPlayer].name} — Redraw</h2>
          <p>Select up to <b>2 cards</b> to replace. Your replacements are drawn first, then the rejected cards are shuffled back into your deck.</p>
          <div className="mulligan-count">{mulliganSelection.length} / 2 selected</div>
        </div>
        <div className="mulligan-hand">
          {state.players[mulliganPlayer].hand.map(card=><CardView key={card.uid} card={card} selected={mulliganSelection.includes(card.uid)} onClick={()=>toggleMulligan(card.uid)}/>) }
        </div>
        <div className="mulligan-actions">
          <small>{mulliganSelection.length===0?'Keep your opening hand, or choose cards to redraw.':`These ${mulliganSelection.length} card${mulliganSelection.length===1?'':'s'} will be replaced.`}</small>
          <button onClick={finishMulligan}>{mulliganSelection.length===0?'Keep hand':`Redraw ${mulliganSelection.length}`}</button>
        </div>
      </div>
    </div>}

    {inspected && inspectedDef && <div className="card-inspect-backdrop" onClick={()=>setInspected(null)}>
      <div className="card-inspect" onClick={e=>e.stopPropagation()}>
        <button className="inspect-close" onClick={()=>setInspected(null)} aria-label="Close card"><X/></button>
        <img src={inspectedDef.image} alt={inspectedDef.name} />
        <div className="inspect-caption">
          <strong>{inspectedDef.name}</strong>
          <span>{inspectedDef.strength} power · {inspectedDef.rows.join(' / ')}{inspectedDef.unique?' · Legendary':''}</span>
          {inspectedIsPlayable && <div className="inspect-actions">
            <b>Play this card</b>
            <div className="inspect-row-buttons">
              {inspectedDef.rows.map(row=><button key={row} onClick={()=>playInspected(row)}>Play {row}</button>)}
            </div>
          </div>}
          {!inspectedIsPlayable && <small>Viewing card on the battlefield.</small>}
          <small>Click outside or press Esc to close.</small>
        </div>
      </div>
    </div>}

    {state.pendingMedic && <div className="modal-backdrop"><div className="modal"><h2>Medic</h2><p>Play one non-unique card from your discard pile.</p><div className="medic-grid">{candidates.map(c=><CardView key={c.uid} card={c} onClick={()=>setState(s=>resolveMedic(s,c.uid))}/>)}</div></div></div>}

    {state.winner!==null && <div className="modal-backdrop"><div className="modal winner"><h2>{state.players[state.winner].name} wins!</h2><p>The tavern owes you a drink.</p><button onClick={()=>setState(createGame())}>Play again</button></div></div>}

    {showRules && <div className="modal-backdrop" onClick={()=>setShowRules(false)}><div className="modal rules" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setShowRules(false)}><X/></button><h2>Prototype rules</h2><ul><li>Each player begins with 10 cards and may redraw up to 2 before round one begins.</li><li>Highest total power wins a round; first to 2 rounds wins.</li><li>Play one card per turn or pass. Once you pass, you take no more turns that round.</li><li>Spy cards are placed on the opponent's row and draw 2 cards for their owner.</li><li>Bond doubles a card when another copy is in the same row. Morale gives every other non-legendary card in that row +1.</li><li>Fog affects Ranged, Rain affects Siege, Frost affects Melee. Weather reduces non-legendary units in that row to 1.</li><li>Legendary black cards ignore weather and morale. Dreadfist's Sunder explicitly destroys them anyway.</li></ul><p className="note">All card definitions live in <code>src/data/fractilian.ts</code>, so balance changes are easy.</p></div></div>}
  </main>
}
