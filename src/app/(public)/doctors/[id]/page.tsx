import { DirectoryDetail } from "@/components/customer/public-pages";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DirectoryDetail id={Number(id)} kind="doctor" />;
}
