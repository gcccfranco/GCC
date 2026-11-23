// « Libre » / « 空闲 » en graisse 600 et encre normale dans la phrase d'état d'une salle libre (T7, AS13) ;
// le reste de la phrase garde la couleur de son parent. Partagé par la Liste et la feuille « Réserver ».
export function MotLibre({ texte }: { texte: string }) {
  return <>{texte.split(/(Libre|空闲)/).map((p, i) => (i % 2 ? <span key={i} data-libre className="font-semibold text-foreground">{p}</span> : p))}</>
}
