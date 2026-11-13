// Lot CH (docs/spec-chargement.md) : la clé de la marque « était connecté » et le script inline qui la reflète sur
// `<html data-connecte="1">` avant le premier dessin. À part de marqueConnecte.ts : layout.tsx (composant serveur)
// l'importe, et ne peut pas importer un module qui utilise un hook React.
export const CLE_MARQUE_CONNECTE = "gcc-connecte";

// C6 : la forme retenue (JSON, voir marqueConnecte.ts) ; seuls `responsable` et `musiciens` servent avant l'hydratation (le CSS garde
// la place du sélecteur : `data-responsable` = un sélecteur, `data-selecteur3` = trois segments).
export const CLE_FORME = "gcc-forme";

export const SCRIPT_MARQUE_CONNECTE = `try{if(localStorage.getItem('${CLE_MARQUE_CONNECTE}')==='1'){var d=document.documentElement;d.dataset.connecte='1';var f=JSON.parse(localStorage.getItem('${CLE_FORME}')||'null');if(f){var m=Array.isArray(f.musiciens)&&f.musiciens.length>0;if(f.responsable===true||m)d.dataset.responsable='1';if(f.responsable===true&&m)d.dataset.selecteur3='1'}}}catch(e){}`;
