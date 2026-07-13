"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, resetPassword } from "@/lib/firebase/auth";
import { getProfile } from "@/lib/firebase/users";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function LoginForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") ?? "/setlists";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const user = await signIn(email, password);
      // Comptes existants : profil à compléter à la connexion
      const profile = await getProfile(user.uid);
      router.push(profile ? from : "/profil");
    } catch (err) {
      // Erreur réseau ≠ identifiants invalides : ne pas accuser l'utilisateur à tort
      const code = (err as { code?: string })?.code;
      setError(code === "auth/network-request-failed" ? t("login.errorNetwork") : t("login.errorInvalid"));
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    setError("");
    setInfo("");
    if (!email.trim()) {
      setError(t("login.resetNeedEmail"));
      return;
    }
    try {
      await resetPassword(email.trim());
      setInfo(t("login.resetSent"));
    } catch {
      setError(t("login.resetError"));
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{t("login.title")}</CardTitle>
          <CardDescription>{t("login.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="login-email">{t("login.emailLabel")}</Label>
              <Input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-11"
                placeholder={t("login.emailPlaceholder")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="login-password">{t("login.passwordLabel")}</Label>
              <Input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="h-11"
                placeholder={t("login.passwordPlaceholder")}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {info && (
              <Alert>
                <AlertDescription>{info}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={loading} className="w-full h-11">
              {loading ? t("login.submitLoading") : t("login.submit")}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <button
            type="button"
            onClick={handleForgotPassword}
            className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 block cursor-pointer"
          >
            {t("login.forgotPassword")}
          </button>
          <Link href="/signup" className="text-sm text-primary hover:underline block">
            {t("login.signupLink")}
          </Link>
          <Link href="/setlists" className="text-sm text-muted-foreground hover:text-foreground block">
            {t("login.backToSetlists")}
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
