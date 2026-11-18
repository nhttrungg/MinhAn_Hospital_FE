import { KnowledgePage } from "@/components/customer/knowledge-page";
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <KnowledgePage slug={slug} />;
}
