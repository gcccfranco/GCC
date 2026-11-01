import Link from "next/link";
import { Lock, LogIn, UserPen } from "lucide-react";
import { useTranslation } from "react-i18next";

/** Non connecté : les setlists sont réservées aux membres. */
export function EcranConnexionRequise() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center space-y-4 max-w-sm">
        <Lock className="h-8 w-8 mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t("setlists.list.loginRequired")}</p>
        <div className="flex flex-col gap-2">
          <Link
            href="/login?from=/setlists"
            className="flex items-center justify-center gap-2 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <LogIn className="h-4 w-4" />
            {t("common.header.login")}
          </Link>
          <Link
            href="/signup"
            className="flex items-center justify-center gap-2 py-2.5 rounded-lg border border-border text-foreground text-sm font-semibold hover:bg-muted/50 transition-colors"
          >
            {t("common.header.signup")}
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Connecté mais profil incomplet (les admins passent quand même). */
export function EcranProfilRequis() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center space-y-4 max-w-sm">
        <UserPen className="h-8 w-8 mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{t("setlists.list.profileRequired")}</p>
        <Link
          href="/profil?from=/setlists"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          {t("common.header.profile")}
        </Link>
      </div>
    </div>
  );
}
