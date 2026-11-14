import type { Metadata } from "next";
import { Check } from "lucide-react";
import { Eyebrow } from "@/components/site/eyebrow";
import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata: Metadata = { title: "Créer un compte revendeur" };

export default function SignUpPage() {
  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-wrap gap-[clamp(24px,5vw,56px)] px-4 pt-[clamp(24px,5vw,56px)] pb-[clamp(48px,8vw,96px)]">
      <aside className="flex min-w-0 flex-[1_1_320px] flex-col gap-6">
        <Eyebrow>Espace professionnel</Eyebrow>
        <h1 className="m-0 font-display text-[clamp(34px,9vw,52px)] leading-none font-bold uppercase">
          Créer un compte <em className="text-red-text">revendeur</em>
        </h1>
        <p className="m-0 text-[17px] leading-relaxed text-soft">
          Accédez aux prix professionnels et commandez en volume. Chaque demande est vérifiée par notre équipe avant activation.
        </p>
        <ul className="m-0 flex list-none flex-col gap-3.5 p-0 text-[15px]">
          {["Prix revendeur sur tout le catalogue", "Historique de vos commandes", "Validation sous [24 h] ouvrées"].map((t) => (
            <li key={t} className="flex items-start gap-3"><Check aria-hidden className="size-[22px] flex-none text-cta" strokeWidth={2.2} />{t}</li>
          ))}
        </ul>
      </aside>
      <div className="min-w-0 flex-[2_1_560px] rounded-[clamp(18px,4vw,28px)] border border-line bg-card p-[clamp(20px,5vw,40px)]">
        <SignUpForm />
      </div>
    </main>
  );
}
