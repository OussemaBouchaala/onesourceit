import type { Metadata } from "next";
import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata: Metadata = { title: "Se connecter" };

export default function SignInPage() {
  return (
    <main className="mx-auto flex w-full max-w-[460px] flex-col gap-7 px-4 pt-[clamp(32px,8vw,72px)] pb-[clamp(48px,8vw,96px)]">
      <div className="flex flex-col gap-2.5">
        <h1 className="m-0 font-display text-[clamp(34px,9vw,44px)] leading-none font-bold uppercase">
          Se <em className="text-red-text">connecter</em>
        </h1>
        <p className="m-0 text-soft">Espace revendeurs.</p>
      </div>
      <SignInForm />
    </main>
  );
}
