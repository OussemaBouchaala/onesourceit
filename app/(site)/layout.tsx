import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <div className="flex flex-1 flex-col">{children}</div>
      <Footer />
    </div>
  );
}
