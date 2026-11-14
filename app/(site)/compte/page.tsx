import type { Metadata } from "next";
import { Account } from "@/components/auth/account";

export const metadata: Metadata = { title: "Mon compte" };

export default function AccountPage() {
  return <Account />;
}
