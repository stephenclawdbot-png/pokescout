import { watchlist } from "../../../lib/catalog";

export function GET(req: Request) {
  const kind = new URL(req.url).searchParams.get("kind") ?? "early";
  return Response.json({
    kind,
    dataQuality: "ESTIMATED",
    scoreQuality: "MODEL-INFERRED",
    cards: watchlist(kind),
  });
}
