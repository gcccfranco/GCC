"use client";

// Messages › Notifier (agencement v18, B11 de docs/spec-agencement-v18.md ; planche
// `v18-bo-messages-notifier`) : à droite du formulaire, l'aperçu de la notification telle qu'un
// téléphone la montre (logo, « GCC Louange », le titre et le message tapés), puis « Derniers
// envois » : les cinq dernières notifications manuelles (`kind: "manual"`, celles qu'écrit
// Notifier, api/push/notify-audience), lues dans `notifications` (lecture permise à tout connecté).
// `getNotifsSince` ne filtre pas le type : le tri se fait après la lecture. Bloc d'administration :
// en français seulement (Q16 de U6).
import { useEffect, useState } from "react";
import Image from "next/image";
import { getNotifsSince, type PushNotif } from "@/lib/firebase/notifications";

/** Une notification de téléphone, avec le titre et le message tapés. */
export function ApercuNotification({ titre, message }: { titre: string; message: string }) {
  return (
    <section aria-label="Aperçu" className="raised rounded-2xl p-[18px]">
      <h2 className="mb-3 text-[16px] font-bold text-foreground">Aperçu</h2>
      <div className="rounded-[22px] bg-gradient-to-b from-[#3a4a7a] to-[#1e2440] px-4 pb-5 pt-4">
        <p className="mb-4 text-center text-[40px] font-light leading-none text-white/95 tabular-nums">9:41</p>
        <div className="rounded-2xl bg-white/85 px-3 py-2.5 text-[#1c1c1e] shadow-sm backdrop-blur dark:bg-white/80">
          <div className="flex items-start gap-2.5">
            <span className="relative mt-0.5 h-7 w-7 shrink-0 overflow-hidden rounded-full bg-white">
              <Image src="/logo.png" alt="" fill sizes="28px" className="object-contain" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[12px] font-semibold">GCC Louange</p>
                <p className="shrink-0 text-[11px] text-black/50">maintenant</p>
              </div>
              <p className={`truncate text-[14px] font-semibold ${titre.trim() ? "" : "text-black/40"}`}>
                {titre.trim() || "Titre de la notification"}
              </p>
              <p className={`line-clamp-3 whitespace-pre-wrap text-[13px] leading-[18px] ${message.trim() ? "" : "text-black/40"}`}>
                {message.trim() || "Le message apparaît ici."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Les cinq derniers envois de Notifier. `cle` : relu quand elle change (après un envoi). */
export function DerniersEnvois({ cle = 0 }: { cle?: number }) {
  const [envois, setEnvois] = useState<PushNotif[] | null>(null);

  useEffect(() => {
    let vivant = true;
    getNotifsSince(0, 50)
      .then((n) => { if (vivant) setEnvois(n.filter((x) => x.kind === "manual").slice(0, 5)); })
      .catch(() => { if (vivant) setEnvois([]); });
    return () => { vivant = false; };
  }, [cle]);

  return (
    <section aria-label="Derniers envois" className="raised rounded-2xl px-[18px] py-4">
      <h2 className="text-[16px] font-bold text-foreground">Derniers envois</h2>
      {envois === null ? (
        <p className="mt-2 text-sm text-muted-foreground">Chargement…</p>
      ) : envois.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Aucune notification envoyée pour l&apos;instant.</p>
      ) : (
        <ul className="mt-1">
          {envois.map((n) => (
            <li key={n.id} className="border-t border-border py-2.5 first:border-t-0">
              <p className="truncate text-[15px] font-semibold text-foreground">{n.title}</p>
              <p className="text-[13px] text-muted-foreground">
                {n.everyone ? "Tout le monde" : n.recipients.length > 1 ? `${n.recipients.length} personnes` : `${n.recipients.length} personne`}
                {n.createdAt ? ` · ${n.createdAt.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
