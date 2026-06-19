import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageShellProps {
  children: ReactNode;
  className?: string;
  narrow?: boolean;
}

export function PageShell({ children, className, narrow = true }: PageShellProps) {
  return (
    <div className="relative min-h-screen overflow-auto bg-background">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(255,77,46,0.1),transparent)]" />
      <div
        className={cn(
          "relative mx-auto flex min-h-screen flex-col px-4 py-8 sm:px-6",
          narrow ? "max-w-lg" : "max-w-2xl",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
