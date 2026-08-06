/**
 * Wikidata P31 (instance of) allow/deny for place-like Wikipedia articles.
 * Pure helpers — safe to unit-test without network.
 */

/** Hard reject — people, orgs, works (common false positives for place names). */
export const WIKIDATA_DENY_P31 = new Set([
  "Q5", // human
  "Q21070568", // human whose existence is disputed
  "Q4167410", // Wikimedia disambiguation page
  "Q11266439", // Wikimedia template
  "Q13406463", // Wikimedia list article
  "Q17633526", // Wikinews article
  "Q13442814", // scholarly article
  "Q571", // book
  "Q47461344", // written work
  "Q7725634", // literary work
  "Q11424", // film
  "Q7889", // video game
  "Q5398426", // television series
  "Q4830453", // business
  "Q783794", // company
  "Q43229", // organization
  "Q1616075", // brand
  "Q215380", // musical group / band
  "Q6881511", // enterprise
  "Q167037", // corporation
  "Q22687", // bank
  "Q891723", // public company
]);

/** Accept — settlements, admin units, named geography. */
export const WIKIDATA_ALLOW_P31 = new Set([
  "Q515", // city
  "Q3957", // town
  "Q532", // village
  "Q486972", // human settlement
  "Q1549591", // big city
  "Q1637706", // city with millions of inhabitants
  "Q5119", // capital city
  "Q200250", // metropolis
  "Q7930989", // city/town
  "Q15284", // municipality
  "Q13220204", // second-level administrative division
  "Q10864048", // first-level administrative country subdivision
  "Q56061", // administrative territorial entity
  "Q1048835", // political territorial entity
  "Q82794", // geographic region
  "Q2221906", // geographic location
  "Q618123", // geographical object
  "Q23442", // island
  "Q33837", // archipelago
  "Q8502", // mountain
  "Q46831", // mountain range
  "Q23397", // lake
  "Q4022", // river
  "Q123705", // neighborhood
  "Q5084", // hamlet
  "Q2679156", // market town
  "Q22698", // borough
  "Q127448", // municipality of Finland
  "Q856076", // municipality of Sweden (kommun)
  "Q262166", // municipality of Germany (Gemeinde)
  "Q15916867", // city of Finland
  "Q174844", // megacity
  "Q15642541", // human-geographic territorial entity
  "Q15063160", // rural municipality of Finland
  "Q1906268", // municipal district
  "Q755707", // municipality of Norway
  "Q2198484", // municipality of Denmark
  "Q3781414", // city municipality
  "Q133442", // city of the United States
  "Q1093829", // city of the United States (alternate)
  "Q33010562", // city or town
]);

export type PlaceTypeVerdict = "allow" | "deny" | "unknown";

/** Classify Wikidata instance-of QIDs for place matching. */
export function classifyPlaceInstanceOf(
  instanceOfIds: readonly string[],
): PlaceTypeVerdict {
  if (instanceOfIds.length === 0) return "unknown";
  for (const id of instanceOfIds) {
    if (WIKIDATA_DENY_P31.has(id)) return "deny";
  }
  for (const id of instanceOfIds) {
    if (WIKIDATA_ALLOW_P31.has(id)) return "allow";
  }
  return "unknown";
}

/** Haversine distance in kilometres. */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function coordsWithinKm(
  near: { lat: number; lon: number },
  page: { lat: number; lon: number },
  maxKm: number,
): boolean {
  return haversineKm(near.lat, near.lon, page.lat, page.lon) <= maxKm;
}
