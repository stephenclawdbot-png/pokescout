import { delayedFeed } from "../../../lib/feed";

export const dynamic = "force-dynamic";

export async function GET() {
  const feed = await delayedFeed();
  return Response.json({
    dataQuality: "DELAYED",
    note: "TCGPlayer market guide via pokemontcg.io. Not sold listings, not listing absorption, not a breakout score.",
    ...feed,
  });
}
