import { Configurator } from "@/components/configurator/configurator";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <Configurator slug={slug} />;
}
