export default async function CardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <main className="panel">
      <div className="k">Card terminal</div>
      <div className="v" style={{ fontSize: 16 }}>{slug}</div>
      <p style={{ color: "var(--muted)" }}>Scores, listing wall, JP vs US, analogues, bull/bear. Placeholder until ingestion exists.</p>
    </main>
  );
}
