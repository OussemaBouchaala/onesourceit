import { PageTitle } from "@/components/admin/page-title";
import { PhotoAssistant } from "@/components/admin/photo-assistant";

export default function PhotosPage() {
  return (
    <>
      <PageTitle title="Photos" subtitle="Une photo par couleur, prise avec le téléphone. Elle est rangée automatiquement." />
      <PhotoAssistant />
    </>
  );
}
