import { useCallback, useState } from "react";

/** Un message qui s'efface seul après `delai` ms (6 s par défaut). Comme à l'origine, aucun minuteur n'est annulé :
 *  un second message est effacé par le minuteur du premier. Rend `[message, montrer]`. */
export function useMessageTemporaire(delai = 6000): [string | null, (texte: string) => void] {
  const [message, setMessage] = useState<string | null>(null);
  const montrer = useCallback(
    (texte: string) => {
      setMessage(texte);
      window.setTimeout(() => setMessage(null), delai);
    },
    [delai]
  );
  return [message, montrer];
}
