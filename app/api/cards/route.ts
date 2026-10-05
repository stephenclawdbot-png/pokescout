import { scoredCatalog } from "../../../lib/catalog";

export function GET() {
  return Response.json({
    dataQuality: "ESTIMATED",
    scoreQuality: "MODEL-INFERRED",
    note: "Fixture catalog. No marketplace connector is attached.",
    cards: scoredCatalog(),
  });
}
