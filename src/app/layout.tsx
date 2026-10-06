import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";
import { I18nProvider } from "@/lib/I18nProvider";
import { Navbar } from "@/components/layout/Navbar";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { BarreLaterale } from "@/components/layout/BarreLaterale";
import { HaloParDefaut } from "@/components/layout/HaloParDefaut";
import { Accueil } from "@/components/onboarding/Accueil";
import { PageTransition } from "@/components/layout/PageTransition";
import { LyricsCopyListener } from "@/components/song/LyricsCopyListener";
import { NotificationsProvider } from "@/components/layout/NotificationsPartagees";
import { ConfirmerProvider } from "@/components/layout/Confirmer";
import { SCRIPT_BARRE_REDUITE } from "@/lib/barreLateralePref";
import "./globals.css";

export const metadata: Metadata = {
  title: "GCC Louange",
  description: "Partitions et setlists de louange — église GCC",
  applicationName: "GCC Louange",
  appleWebApp: {
    capable: true,
    title: "GCC Louange",
    // La page s'arrête sous la barre d'état. `black-translucent` la faisait monter
    // jusque sous l'heure (V7, T6), mais iOS pose alors SON propre voile derrière
    // l'heure et la batterie pour les garder lisibles — un flou qu'on ne peut pas
    // retirer, et que Timothée n'a pas voulu (21/09/2026). Repli assumé.
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  // Égale au fond, par schéma : plus de barre orange sur Android ni de saut
  // de luminosité au lancement (audit D5).
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
  // Pinch-zoom désactivé : sur iOS, un zoom pincé décroche les éléments
  // position:fixed (la barre d'onglets se retrouve au milieu de l'écran).
  // L'app a ses propres contrôles A−/A+ pour la taille du texte.
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Le manifeste vient de src/app/manifest.ts, que Next lie lui-même :
            aucun lien de manifeste écrit ici (deux manifestes se contredisaient
            jusqu'au 19/09/2026). */}
        <link rel="icon" href="/icon.png" type="image/png" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* Service worker push-only (public/sw.js) — requis pour les notifications
            Web Push sur PWA iOS/Android. Il ne fait plus de cache hors-ligne. */}
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker'in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){})})}` }} />
        {/* Barre latérale réduite sur cet appareil (lot U4, N3) : `data-barre` posé avant le
            premier affichage, sinon la page sauterait de 180 px à chaque chargement. */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_BARRE_REDUITE }} />
      </head>
      <body className="font-sans antialiased min-h-screen bg-background">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <I18nProvider>
            {/* Une seule fenêtre de confirmation pour tout le site (agencement v18, R9) : `useConfirmer`. */}
            <ConfirmerProvider>
            {/* Une seule cloche pour toutes les barres (lot U4, Q7). */}
            <NotificationsProvider>
              <Navbar />
              {/* Ordinateur : une seule barre, à gauche ; montrée par le CSS (lot U4). */}
              <BarreLaterale />
              {/* `--barre-laterale` : place de la barre latérale sur grand écran (0 ailleurs).
                  Rien ici ne doit devenir repère ni pile (ni transform, filter, contain,
                  container-type, z-index) : le mode louange doit couvrir les barres (Q9). */}
              {/* Avant `main` : le halo d'une page, plus bas, l'emporte sur lui. */}
              <HaloParDefaut />
              <main className="pt-[var(--nav-h)] pl-[var(--barre-laterale)]">
                <PageTransition>{children}</PageTransition>
              </main>
              <MobileTabBar />
            </NotificationsProvider>
            <LyricsCopyListener />
            <Accueil />
            </ConfirmerProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}