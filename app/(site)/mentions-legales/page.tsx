import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mentions légales" };

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-[760px] flex-col gap-5 px-4 py-[clamp(32px,8vw,72px)] leading-relaxed">
      <h1 className="m-0 font-display text-[clamp(30px,8vw,44px)] leading-tight font-bold uppercase">Mentions légales</h1>
      <p className="m-0 text-soft">[TEXTE À FOURNIR PAR LE CLIENT — à faire relire par un professionnel du droit.]</p>
      <p className="m-0 text-soft">ONEsource IT · Avenue des Martyrs, immeuble Ben Arab, Sfax Médina, 3000 Sfax · contact@onesourceit.shop · +216 21 050 742</p>
    </main>
  );
}
