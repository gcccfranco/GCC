"use client";

// Messages › Réception (admins). Qui n'a que le droit de notifier arrive sur Notifier.
// En grand, la liste et le message côte à côte (U4 bis, B7, `ReceptionVolets`).
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/lib/firebase/users";
import { isAdminUser } from "@/lib/access";
import { ReceptionVolets } from "@/components/messages/ReceptionVolets";
import { ReserveAuxAdmins } from "@/components/admin/commun";

export default function ReceptionPage() {
  const router = useRouter();
  const { user, profile } = useProfile();
  const admin = isAdminUser(user);
  const notifier = !admin && (profile?.notify?.length ?? 0) > 0;

  useEffect(() => {
    if (notifier) router.replace("/back-office/messages/notifier");
  }, [notifier, router]);

  if (admin) return <ReceptionVolets />;
  if (notifier) return null;
  return <ReserveAuxAdmins connecte={!!user} retour="/back-office/messages" />;
}
