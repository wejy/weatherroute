# Follow-ups

## Public transit travel mode

- [ ] Add `transit` travel mode (UI already reserved in i18n: `travel.transit`)
- [ ] Integrate Digitransit / OpenTripPlanner (or regional OTP) for itineraries
- [ ] Mapbox does **not** support transit Directions profiles — needs a separate provider
- [ ] Show legs (walk → bus/train → walk), duration, transfers; graceful “unavailable outside coverage”

Related: car + bike already use Mapbox `driving` / `cycling` via `getMapboxRoute`.
