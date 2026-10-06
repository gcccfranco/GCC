"use client";

// Back-Office › Évènements › Évènements : ceux qu'on gère. Les réunions ont leur entrée
// (agencement v18, B15).
import { ListeGestion } from "./ListeGestion";

export default function EvenementsPage() {
  return <ListeGestion reunions={false} />;
}
