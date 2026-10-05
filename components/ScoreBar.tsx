export function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="panel">
      <div className="k">{label}</div>
      <div className="v">
        {value}
        <span style={{ color: "var(--muted)", fontSize: 12 }}>/100</span>
      </div>
    </div>
  );
}
