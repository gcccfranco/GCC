"use client";

// Liste groupée (direction A « Réglages », docs/spec-look.md) : un bloc aux
// coins arrondis sur le fond gris, des lignes séparées par un filet en retrait.
// Une ligne est un lien, un bouton ou une simple rangée selon ce qu'on lui donne.

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Group({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      {title && <h2 className="mb-1.5 px-4 text-sm font-semibold text-muted-foreground">{title}</h2>}
      <div className="overflow-hidden rounded-xl bg-card">{children}</div>
    </section>
  );
}

type RowProps = {
  href?: string;
  onClick?: () => void;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  /** Chevron à droite : la ligne mène à une autre page. */
  chevron?: boolean;
  destructive?: boolean;
  className?: string;
  children: React.ReactNode;
};

export function GroupRow({ href, onClick, leading, trailing, chevron, destructive, className, children }: RowProps) {
  const interactive = Boolean(href || onClick);
  const classes = cn(
    "group-row relative flex w-full min-h-[52px] items-center gap-3 px-4 py-2.5 text-left text-base",
    interactive && "transition-colors duration-150 active:bg-secondary/70 cursor-pointer",
    destructive ? "text-destructive" : "text-foreground",
    className,
  );
  const inner = (
    <>
      {leading && <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground/80 [&_svg]:h-4 [&_svg]:w-4">{leading}</span>}
      <span className="min-w-0 flex-1">{children}</span>
      {trailing && <span className="shrink-0 text-sm text-muted-foreground">{trailing}</span>}
      {chevron && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden />}
    </>
  );
  if (href) return <Link href={href} className={classes}>{inner}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={classes}>{inner}</button>;
  return <div className={classes}>{inner}</div>;
}
