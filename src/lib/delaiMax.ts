/** Signal qui s'interrompt après `ms`. `AbortSignal.timeout` manque aux vieux Safari (avant 16) : on se replie
 *  sur un AbortController + setTimeout. */
export function delaiMax(ms: number): AbortSignal {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") return AbortSignal.timeout(ms);
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), ms);
  return ctrl.signal;
}
