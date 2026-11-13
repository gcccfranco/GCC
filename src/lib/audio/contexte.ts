// Contexte Web Audio commun (écoute d'harmonie et métronome) : iOS en limite le nombre, donc une seule instance, créée
// au premier appel (dans un geste de l'utilisateur) et jamais fermée.
let ctx: AudioContext | null = null;

export function contexteAudio(): AudioContext {
  if (!ctx) {
    const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    const Ctor = (w.AudioContext ?? w.webkitAudioContext)!;
    ctx = new Ctor();
    // iOS récents : joue malgré le bouton silencieux.
    try { (navigator as unknown as { audioSession?: { type: string } }).audioSession!.type = "playback"; } catch { /* absent */ }
  }
  void ctx.resume();
  return ctx;
}

/** Le contexte déjà créé, sans le reprendre (lecture de l'horloge à chaque image). */
export function contexteExistant(): AudioContext | null {
  return ctx;
}
