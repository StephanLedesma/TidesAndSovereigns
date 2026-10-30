import type { CardInstance } from '../game/types'
import { CARD_MAP } from '../data/fractilian'

export function CardView({card, onClick, selected=false, compact=false, power}:{card:CardInstance,onClick?:()=>void,selected?:boolean,compact?:boolean,power?:number}){
  const d=CARD_MAP[card.definitionId]
  return <button className={`card ${compact?'compact':''} ${selected?'selected':''}`} onClick={onClick} title={`${d.name} — ${d.strength}`}>
    <img src={d.image} alt={d.name} onError={(e)=>{e.currentTarget.style.display='none'; e.currentTarget.nextElementSibling?.classList.add('show')}} />
    <span className="fallback"><strong>{d.name}</strong><b>{d.strength}</b><small>{d.abilityTitle ?? d.rows.join(' / ')}</small></span>
    {typeof power==='number' && <span className="power-chip">{power}</span>}
  </button>
}
