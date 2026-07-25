import { NextResponse, type NextRequest } from "next/server";
import { notifyEntrainement } from "@/lib/push/entrainements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Entraînement de la séance du LENDEMAIN MATIN — exécuté à 17:00 UTC (19h Paris,
// la fenêtre du campus est entièrement en heure d'été), soit 2h avant
// l'entraînement de 21h. Le volet « soir » est envoyé par /api/cron/reminders.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authz = req.headers.get("authorization");
  if (!secret || authz !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const matin = await notifyEntrainement("matin");
  return NextResponse.json({ ok: true, matin });
}
