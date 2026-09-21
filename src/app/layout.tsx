import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";
import { I18nProvider } from "@/lib/I18nProvider";
import { Navbar } from "@/components/layout/Navbar";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { Accueil } from "@/components/onboarding/Accueil";
import { PageTransition } from "@/components/layout/PageTransition";
import { ThemeColorDuFond } from "@/components/layout/ThemeColor";
import { LyricsCopyListener } from "@/components/song/LyricsCopyListener";
import "./globals.css";

export const metadata: Metadata = {
  title: "GCC Louange",
  description: "Partitions et setlists de louange — église GCC",
  applicationName: "GCC Louange",
  appleWebApp: {
    capable: true,
    title: "GCC Louange",
    // La page monte sous l'heure et la batterie au lieu de s'arrêter sous une bande
    // blanche (V7, T6) ; elle se réserve la place avec `env(safe-area-inset-top)`.
    // iOS lit ce réglage à l'installation de l'icône : réinstaller pour le voir changer.
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  // Une seule balise, sans `media` : la barre d'état d'Android prend la teinte du haut
  // de l'écran (fond + halo), posée à l'affichage par `ThemeColor` (V7, T6). Deux
  // balises `media` auraient gagné sur elle selon l'ordre du DOM. Le premier rendu part
  // du fond, blanc ou noir, comme avant (audit D5) : jamais de barre orange ni de saut
  // de luminosité au lancement.
  themeColor: "#ffffff",
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
        {/* Le fond sombre avant que React ne démarre : sinon la barre d'état d'Android
            s'allume en blanc à chaque lancement, le temps du premier rendu. */}
        <script dangerouslySetInnerHTML={{ __html: `if(matchMedia('(prefers-color-scheme: dark)').matches){document.querySelector('meta[name=theme-color]')?.setAttribute('content','#000000')}` }} />
      </head>
      <body className="font-sans antialiased min-h-screen bg-background">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <I18nProvider>
            <Navbar />
            <main className="pt-[var(--nav-h)]">
              <PageTransition>{children}</PageTransition>
            </main>
            <MobileTabBar />
            <ThemeColorDuFond />
            <LyricsCopyListener />
            <Accueil />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}