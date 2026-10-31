import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

/** Écrans qui remplacent la page avant que la setlist ne s'affiche (chargement, connexion, erreur, introuvable, pas d'accès). */

export function EcranChargement() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
    </div>
  );
}

export function EcranConnexion({ id }: { id: string }) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 px-4">
      <p className="text-sm text-muted-foreground">{t("setlists.detail.loginRequired")}</p>
      <Link href={`/login?from=/setlists/${id}`} className="text-sm text-foreground hover:underline">
        {t("common.header.login")}
      </Link>
    </div>
  );
}

export function EcranErreur({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 px-4">
      <p className="text-sm text-muted-foreground">{t("setlists.detail.loadError")}</p>
      <Button variant="outline" onClick={onRetry}>
        {t("common.retry")}
      </Button>
    </div>
  );
}

export function EcranIntrouvable({ backPath }: { backPath: string }) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
      <p className="text-sm text-muted-foreground">{t("setlists.detail.notFound")}</p>
      <Link href={backPath} className="text-sm text-foreground hover:underline">{t("setlists.detail.back")}</Link>
    </div>
  );
}

export function EcranSansAcces() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 px-4">
      <p className="text-sm text-muted-foreground">{t("setlists.detail.noAccess")}</p>
      <Link href="/setlists" className="text-sm text-foreground hover:underline">{t("setlists.detail.back")}</Link>
    </div>
  );
}
