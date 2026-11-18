import { PortalRecordDetail } from "@/components/customer/portal-record-detail";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PortalRecordDetail key={id} id={Number(id)} />;
}
