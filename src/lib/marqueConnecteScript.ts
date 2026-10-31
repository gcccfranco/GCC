// Lot CH (docs/spec-chargement.md) : la clé de la marque « était connecté » et le script inline qui la reflète sur
// `<html data-connecte="1">` avant le premier dessin. À part de marqueConnecte.ts : layout.tsx (composant serveur)
// l'importe, et ne peut pas importer un module qui utilise un hook React.
export const CLE_MARQUE_CONNECTE = "gcc-connecte";

export const SCRIPT_MARQUE_CONNECTE = `try{if(localStorage.getItem('${CLE_MARQUE_CONNECTE}')==='1')document.documentElement.dataset.connecte='1'}catch(e){}`;
