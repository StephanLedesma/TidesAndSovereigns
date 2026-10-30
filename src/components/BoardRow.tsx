import type { CardInstance, GameState, Row } from '../game/types'
import { cardPower, rowScore } from '../game/engine'
import { CardView } from './CardView'

const names:Record<Row,string>={melee:'Melee',ranged:'Ranged',siege:'Siege'}
export function BoardRow({state,side,row,onInspect}:{state:GameState,side:0|1,row:Row,onInspect?:(card:CardInstance)=>void}){
  const cards=state.players[side].rows[row]
  return <section className={`board-row ${state.weather[side][row]?'weathered':''}`}>
    <div className="row-label"><strong>{names[row]}</strong><span>{state.weather[side][row] ?? ''}</span></div>
    <div className="row-cards">{cards.map(c=><CardView key={c.uid} card={c} compact power={cardPower(state,side,row,c)} onClick={()=>onInspect?.(c)} />)}</div>
    <div className="row-score">{rowScore(state,side,row)}</div>
  </section>
}
