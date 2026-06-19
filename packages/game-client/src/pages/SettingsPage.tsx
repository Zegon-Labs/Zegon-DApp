import { useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageShell } from "@/components/PageShell";
import { useLocale } from "@/hooks/useLocale";
import type { Language } from "../i18n/index.js";
import { cn } from "@/lib/utils";

interface SettingsPageProps {
  onBack: () => void;
}

export function SettingsPage({ onBack }: SettingsPageProps) {
  const { strings, language, setLanguage } = useLocale();
  const [saved, setSaved] = useState(false);

  function pickLanguage(lang: Language) {
    if (language === lang) return;
    setLanguage(lang);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1200);
  }

  return (
    <PageShell>
      <Button variant="ghost" size="sm" className="mb-4 w-fit" onClick={onBack}>
        <ArrowLeft className="size-4" />
        {strings.back}
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-3xl">{strings.settingsTitle}</CardTitle>
          <CardDescription>{strings.language}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            {(["en", "es"] as Language[]).map((lang) => (
              <Button
                key={lang}
                variant={language === lang ? "default" : "outline"}
                className={cn("h-12 font-mono text-lg", language === lang && "ring-2 ring-ring")}
                onClick={() => pickLanguage(lang)}
              >
                {lang === "en" ? strings.languageEn : strings.languageEs}
              </Button>
            ))}
          </div>
          {saved && (
            <p className="flex items-center gap-1.5 text-sm text-primary">
              <Check className="size-4" />
              {strings.saved}
            </p>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
