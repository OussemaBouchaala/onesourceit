import type { ReactNode } from "react";
import { CONTACT } from "@/lib/format";

/** Shared layout for the legal pages (mentions légales, CGV, confidentialité). */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-[760px] flex-col gap-5 px-4 py-[clamp(32px,8vw,72px)] leading-relaxed">
      <h1 className="m-0 font-display text-[clamp(30px,8vw,44px)] leading-tight font-bold uppercase">{title}</h1>
      <p className="m-0 text-sm text-muted">Dernière mise à jour : {updated}</p>
      {children}
      <p className="m-0 border-t border-line pt-5 text-sm text-soft">
        ONEsource IT · {CONTACT.address} · <a href={`mailto:${CONTACT.email}`} className="underline">{CONTACT.email}</a> ·{" "}
        <a href={CONTACT.phoneHref} className="underline">{CONTACT.phoneDisplay}</a>
      </p>
    </main>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="m-0 font-display text-xl">{title}</h2>
      <div className="flex flex-col gap-2 text-soft [&_li]:ml-5 [&_li]:list-disc [&_p]:m-0 [&_ul]:m-0 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1 [&_ul]:p-0">
        {children}
      </div>
    </section>
  );
}
