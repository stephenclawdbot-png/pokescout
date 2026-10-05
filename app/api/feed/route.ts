import { delayedFeed } from "../../../lib/feed";

export const dynamic = "force-dynamic";

export async function GET() {
  const feed = await delayedFeed();
  return Response.json({
    dataQuality: "DELAYED",
    note: "TCGdex guide prices and official card art. Not sold listings, not listing absorption, not a breakout score.",
    ...feed,
  });
}
