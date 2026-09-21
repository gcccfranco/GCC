import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";
import { I18nProvider } from "@/lib/I18nProvider";
import { Navbar } from "@/components/layout/Navbar";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { Accueil } from "@/components/onboarding/Accueil";
import { PageTransition } from "@/components/layout/PageTransition";
import { LyricsCopyListener } from "@/components/song/LyricsCopyListener";
import "./globals.css";

export const metadata: Metadata = {
  title: "GCC Louange",
  description: "Partitions et setlists de louange — église GCC",
  applicationName: "GCC Louange",
  appleWebApp: {
    capable: true,
    title: "GCC Louange",
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
      </head>
      <body className="font-sans antialiased min-h-screen bg-background">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <I18nProvider>
            <Navbar />
            <main className="pt-[var(--nav-h)]">
              <PageTransition>{children}</PageTransition>
            </main>
            <MobileTabBar />
            <LyricsCopyListener />
            <Accueil />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}