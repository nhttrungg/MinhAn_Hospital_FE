import { QueueBoard } from "@/components/display/queue-board";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ rooms?: string | string[] }>;
}) {
  const { rooms } = await searchParams;
  return <QueueBoard rooms={typeof rooms === "string" ? rooms : ""} />;
}
