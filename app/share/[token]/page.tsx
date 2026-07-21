import { PublicShareViewer } from "@/components/PublicShareViewer";

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PublicShareViewer token={token} />;
}
