"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ORDER_STATUS_LABEL, PROFILE_STATUS_LABEL, formatDT, formatDate } from "@/lib/format";

export function Account() {
  const me = useQuery(api.profiles.me);
  const orders = useQuery(api.orders.mine);
  const { signOut } = useAuthActions();
  const router = useRouter();

  async function logout() {
    await signOut();
    router.push("/");
    router.refresh();
  }

  if (me === undefined) return <main className="mx-auto w-full max-w-[860px] px-4 py-10"><div className="h-60 animate-pulse rounded-[20px] bg-card" /></main>;
  if (me === null) return <main className="mx-auto w-full max-w-[860px] px-4 py-10"><Link href="/connexion">Se connecter</Link></main>;

  return (
    <main className="mx-auto flex w-full max-w-[860px] flex-col gap-6 px-4 pt-[clamp(24px,5vw,56px)] pb-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="m-0 font-display text-[clamp(30px,8vw,44px)] leading-none font-bold uppercase">
          Mon <em className="text-red-text">compte</em>
        </h1>
        <div className="flex gap-2">
          {me.role === "admin" && <Button asChild variant="secondary" size="sm"><Link href="/admin">Administration</Link></Button>}
          <Button variant="outline" size="sm" onClick={logout}>Se déconnecter</Button>
        </div>
      </div>

      {me.role === "reseller" && me.status === "pending" && (
        <p role="status" className="m-0 rounded-[14px] border border-[#f3c98b] bg-warn-soft p-4 leading-normal text-warn-ink">
          Votre compte est en attente de validation. Vous pouvez commander au prix détail en attendant ; le prix de gros sera débloqué dès l&apos;activation.
        </p>
      )}
      {me.status === "refused" && (
        <p role="status" className="m-0 rounded-[14px] bg-bad-soft p-4 leading-normal text-bad-ink">
          Votre demande revendeur n&apos;a pas été acceptée.{me.refusalReason ? ` Motif : ${me.refusalReason}` : ""} Contactez-nous pour plus d&apos;informations.
        </p>
      )}

      <section className="flex flex-col gap-3 rounded-[20px] border border-line bg-card p-[clamp(20px,5vw,28px)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <strong className="font-display text-xl">{me.shopName}</strong>
          <Badge variant={me.status === "approved" ? "ok" : me.status === "pending" ? "warn" : "bad"}>
            {me.role === "admin" ? "Administrateur" : `Revendeur · ${PROFILE_STATUS_LABEL[me.status]}`}
          </Badge>
        </div>
        <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-4 text-[15px]">
          {[["Responsable", me.fullName], ["Email", me.email], ["Téléphone", me.phone], ["Adresse", `${me.address}, ${me.city}, ${me.governorate}`]].map(([k, v]) => (
            <div key={k} className="flex flex-col gap-1"><dt className="text-[13px] tracking-[0.1em] text-muted uppercase">{k}</dt><dd className="m-0">{v}</dd></div>
          ))}
        </dl>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="m-0 font-display text-xl">Mes commandes</h2>
        {orders === undefined ? null : orders.length === 0 ? (
          <p className="m-0 text-muted">Aucune commande pour le moment. <Link href="/produits" className="text-red-text">Voir le catalogue</Link></p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {orders.map((o) => (
              <li key={o.publicId}>
                <Link href={`/commande/${o.publicId}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-card p-4 text-ink no-underline hover:border-line-strong">
                  <span className="flex flex-col"><strong>#{o.ref}</strong><span className="text-sm text-muted">{formatDate(o.createdAt)} · {o.itemCount} pièces</span></span>
                  <span className="flex items-center gap-3"><Badge>{ORDER_STATUS_LABEL[o.status]}</Badge><strong>{formatDT(o.total)}</strong></span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
