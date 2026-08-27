// Placeholder league-phase calendar for the 2026-27 field. The real 2026-27
// fixtures are not published yet, so this is the real 2025-26 schedule with
// its dates relabelled a year forward and its teams substituted through a
// one-to-one mapping onto the confirmed 2026-27 field (2026-08-27).
//
// Because that substitution is a bijection, the schedule's *structure* is
// genuinely real — 18 matches a matchday, every team playing exactly 8,
// nobody meeting the same opponent twice — and the mapping was chosen so no
// two clubs from the same country are ever drawn together, which a real draw
// also forbids. Only the specific pairings are invented. Replace wholesale
// once the real calendar is published (PROJECT.md §11 problem 16).
//
// Kickoff times came from the source's primary listing zone (CEST/UTC+2
// through Matchday 3, CET/UTC+1 from Matchday 4 onward, matching the real EU
// DST transition date) converted to Turkish local time (UTC+3, fixed
// year-round, see tournamentPhase.ts), then stored here as UTC.
//
// Fixture ids are derived from team ids, so any change to the team list
// invalidates this file wholesale — fixtures.test.ts asserts that.
//
// `order` is the authoritative sequential index (1-144) the dev panel uses
// to enforce "can't decide a later match before all earlier ones are
// decided" — it is NOT necessarily the same as calendar order within a
// single matchday's two match-days, just the fixed order these are listed.
export interface Fixture {
  id: string;
  matchday: number;
  order: number;
  homeTeamId: string;
  awayTeamId: string;
  kickoffUtc: string;
}

export const FIXTURES: Fixture[] = [

  // Matchday 1 (16-18 September 2026)
  { id: "md1-como-arsenal", matchday: 1, order: 1, homeTeamId: "como", awayTeamId: "arsenal", kickoffUtc: "2026-09-16T16:45:00Z" },
  { id: "md1-psv-eindhoven-lens", matchday: 1, order: 2, homeTeamId: "psv-eindhoven", awayTeamId: "lens", kickoffUtc: "2026-09-16T16:45:00Z" },
  { id: "md1-roma-borussia-dortmund", matchday: 1, order: 3, homeTeamId: "roma", awayTeamId: "borussia-dortmund", kickoffUtc: "2026-09-16T19:00:00Z" },
  { id: "md1-real-madrid-rb-leipzig", matchday: 1, order: 4, homeTeamId: "real-madrid", awayTeamId: "rb-leipzig", kickoffUtc: "2026-09-16T19:00:00Z" },
  { id: "md1-stuttgart-fenerbahce", matchday: 1, order: 5, homeTeamId: "stuttgart", awayTeamId: "fenerbahce", kickoffUtc: "2026-09-16T19:00:00Z" },
  { id: "md1-manchester-united-villarreal", matchday: 1, order: 6, homeTeamId: "manchester-united", awayTeamId: "villarreal", kickoffUtc: "2026-09-16T19:00:00Z" },
  { id: "md1-lask-shakhtar-donetsk", matchday: 1, order: 7, homeTeamId: "lask", awayTeamId: "shakhtar-donetsk", kickoffUtc: "2026-09-17T16:45:00Z" },
  { id: "md1-slavia-prague-bodo-glimt", matchday: 1, order: 8, homeTeamId: "slavia-prague", awayTeamId: "bodo-glimt", kickoffUtc: "2026-09-17T16:45:00Z" },
  { id: "md1-sabah-inter-milan", matchday: 1, order: 9, homeTeamId: "sabah", awayTeamId: "inter-milan", kickoffUtc: "2026-09-17T19:00:00Z" },
  { id: "md1-bayern-munich-porto", matchday: 1, order: 10, homeTeamId: "bayern-munich", awayTeamId: "porto", kickoffUtc: "2026-09-17T19:00:00Z" },
  { id: "md1-liverpool-atletico-madrid", matchday: 1, order: 11, homeTeamId: "liverpool", awayTeamId: "atletico-madrid", kickoffUtc: "2026-09-17T19:00:00Z" },
  { id: "md1-paris-saint-germain-real-betis", matchday: 1, order: 12, homeTeamId: "paris-saint-germain", awayTeamId: "real-betis", kickoffUtc: "2026-09-17T19:00:00Z" },
  { id: "md1-club-brugge-lille", matchday: 1, order: 13, homeTeamId: "club-brugge", awayTeamId: "lille", kickoffUtc: "2026-09-18T16:45:00Z" },
  { id: "md1-viking-slovan-bratislava", matchday: 1, order: 14, homeTeamId: "viking", awayTeamId: "slovan-bratislava", kickoffUtc: "2026-09-18T16:45:00Z" },
  { id: "md1-aek-athens-galatasaray", matchday: 1, order: 15, homeTeamId: "aek-athens", awayTeamId: "galatasaray", kickoffUtc: "2026-09-18T19:00:00Z" },
  { id: "md1-manchester-city-napoli", matchday: 1, order: 16, homeTeamId: "manchester-city", awayTeamId: "napoli", kickoffUtc: "2026-09-18T19:00:00Z" },
  { id: "md1-aston-villa-barcelona", matchday: 1, order: 17, homeTeamId: "aston-villa", awayTeamId: "barcelona", kickoffUtc: "2026-09-18T19:00:00Z" },
  { id: "md1-sporting-cp-feyenoord", matchday: 1, order: 18, homeTeamId: "sporting-cp", awayTeamId: "feyenoord", kickoffUtc: "2026-09-18T19:00:00Z" },


  // Matchday 2 (30 September - 1 October 2026)
  { id: "md2-real-betis-club-brugge", matchday: 2, order: 19, homeTeamId: "real-betis", awayTeamId: "club-brugge", kickoffUtc: "2026-09-30T16:45:00Z" },
  { id: "md2-feyenoord-real-madrid", matchday: 2, order: 20, homeTeamId: "feyenoord", awayTeamId: "real-madrid", kickoffUtc: "2026-09-30T16:45:00Z" },
  { id: "md2-atletico-madrid-aek-athens", matchday: 2, order: 21, homeTeamId: "atletico-madrid", awayTeamId: "aek-athens", kickoffUtc: "2026-09-30T19:00:00Z" },
  { id: "md2-porto-stuttgart", matchday: 2, order: 22, homeTeamId: "porto", awayTeamId: "stuttgart", kickoffUtc: "2026-09-30T19:00:00Z" },
  { id: "md2-inter-milan-slavia-prague", matchday: 2, order: 23, homeTeamId: "inter-milan", awayTeamId: "slavia-prague", kickoffUtc: "2026-09-30T19:00:00Z" },
  { id: "md2-bodo-glimt-manchester-united", matchday: 2, order: 24, homeTeamId: "bodo-glimt", awayTeamId: "manchester-united", kickoffUtc: "2026-09-30T19:00:00Z" },
  { id: "md2-galatasaray-liverpool", matchday: 2, order: 25, homeTeamId: "galatasaray", awayTeamId: "liverpool", kickoffUtc: "2026-09-30T19:00:00Z" },
  { id: "md2-rb-leipzig-sabah", matchday: 2, order: 26, homeTeamId: "rb-leipzig", awayTeamId: "sabah", kickoffUtc: "2026-09-30T19:00:00Z" },
  { id: "md2-shakhtar-donetsk-bayern-munich", matchday: 2, order: 27, homeTeamId: "shakhtar-donetsk", awayTeamId: "bayern-munich", kickoffUtc: "2026-09-30T19:00:00Z" },
  { id: "md2-fenerbahce-viking", matchday: 2, order: 28, homeTeamId: "fenerbahce", awayTeamId: "viking", kickoffUtc: "2026-10-01T16:45:00Z" },
  { id: "md2-lens-aston-villa", matchday: 2, order: 29, homeTeamId: "lens", awayTeamId: "aston-villa", kickoffUtc: "2026-10-01T16:45:00Z" },
  { id: "md2-arsenal-lask", matchday: 2, order: 30, homeTeamId: "arsenal", awayTeamId: "lask", kickoffUtc: "2026-10-01T19:00:00Z" },
  { id: "md2-lille-manchester-city", matchday: 2, order: 31, homeTeamId: "lille", awayTeamId: "manchester-city", kickoffUtc: "2026-10-01T19:00:00Z" },
  { id: "md2-slovan-bratislava-psv-eindhoven", matchday: 2, order: 32, homeTeamId: "slovan-bratislava", awayTeamId: "psv-eindhoven", kickoffUtc: "2026-10-01T19:00:00Z" },
  { id: "md2-borussia-dortmund-como", matchday: 2, order: 33, homeTeamId: "borussia-dortmund", awayTeamId: "como", kickoffUtc: "2026-10-01T19:00:00Z" },
  { id: "md2-barcelona-paris-saint-germain", matchday: 2, order: 34, homeTeamId: "barcelona", awayTeamId: "paris-saint-germain", kickoffUtc: "2026-10-01T19:00:00Z" },
  { id: "md2-napoli-sporting-cp", matchday: 2, order: 35, homeTeamId: "napoli", awayTeamId: "sporting-cp", kickoffUtc: "2026-10-01T19:00:00Z" },
  { id: "md2-villarreal-roma", matchday: 2, order: 36, homeTeamId: "villarreal", awayTeamId: "roma", kickoffUtc: "2026-10-01T19:00:00Z" },


  // Matchday 3 (21-22 October 2026)
  { id: "md3-barcelona-lask", matchday: 3, order: 37, homeTeamId: "barcelona", awayTeamId: "lask", kickoffUtc: "2026-10-21T16:45:00Z" },
  { id: "md3-feyenoord-shakhtar-donetsk", matchday: 3, order: 38, homeTeamId: "feyenoord", awayTeamId: "shakhtar-donetsk", kickoffUtc: "2026-10-21T16:45:00Z" },
  { id: "md3-arsenal-atletico-madrid", matchday: 3, order: 39, homeTeamId: "arsenal", awayTeamId: "atletico-madrid", kickoffUtc: "2026-10-21T19:00:00Z" },
  { id: "md3-slovan-bratislava-paris-saint-germain", matchday: 3, order: 40, homeTeamId: "slovan-bratislava", awayTeamId: "paris-saint-germain", kickoffUtc: "2026-10-21T19:00:00Z" },
  { id: "md3-viking-borussia-dortmund", matchday: 3, order: 41, homeTeamId: "viking", awayTeamId: "borussia-dortmund", kickoffUtc: "2026-10-21T19:00:00Z" },
  { id: "md3-aston-villa-stuttgart", matchday: 3, order: 42, homeTeamId: "aston-villa", awayTeamId: "stuttgart", kickoffUtc: "2026-10-21T19:00:00Z" },
  { id: "md3-psv-eindhoven-napoli", matchday: 3, order: 43, homeTeamId: "psv-eindhoven", awayTeamId: "napoli", kickoffUtc: "2026-10-21T19:00:00Z" },
  { id: "md3-lens-inter-milan", matchday: 3, order: 44, homeTeamId: "lens", awayTeamId: "inter-milan", kickoffUtc: "2026-10-21T19:00:00Z" },
  { id: "md3-villarreal-manchester-city", matchday: 3, order: 45, homeTeamId: "villarreal", awayTeamId: "manchester-city", kickoffUtc: "2026-10-21T19:00:00Z" },
  { id: "md3-como-fenerbahce", matchday: 3, order: 46, homeTeamId: "como", awayTeamId: "fenerbahce", kickoffUtc: "2026-10-22T16:45:00Z" },
  { id: "md3-galatasaray-bodo-glimt", matchday: 3, order: 47, homeTeamId: "galatasaray", awayTeamId: "bodo-glimt", kickoffUtc: "2026-10-22T16:45:00Z" },
  { id: "md3-lille-manchester-united", matchday: 3, order: 48, homeTeamId: "lille", awayTeamId: "manchester-united", kickoffUtc: "2026-10-22T19:00:00Z" },
  { id: "md3-real-betis-slavia-prague", matchday: 3, order: 49, homeTeamId: "real-betis", awayTeamId: "slavia-prague", kickoffUtc: "2026-10-22T19:00:00Z" },
  { id: "md3-porto-sabah", matchday: 3, order: 50, homeTeamId: "porto", awayTeamId: "sabah", kickoffUtc: "2026-10-22T19:00:00Z" },
  { id: "md3-aek-athens-liverpool", matchday: 3, order: 51, homeTeamId: "aek-athens", awayTeamId: "liverpool", kickoffUtc: "2026-10-22T19:00:00Z" },
  { id: "md3-bayern-munich-club-brugge", matchday: 3, order: 52, homeTeamId: "bayern-munich", awayTeamId: "club-brugge", kickoffUtc: "2026-10-22T19:00:00Z" },
  { id: "md3-real-madrid-roma", matchday: 3, order: 53, homeTeamId: "real-madrid", awayTeamId: "roma", kickoffUtc: "2026-10-22T19:00:00Z" },
  { id: "md3-sporting-cp-rb-leipzig", matchday: 3, order: 54, homeTeamId: "sporting-cp", awayTeamId: "rb-leipzig", kickoffUtc: "2026-10-22T19:00:00Z" },


  // Matchday 4 (4-5 November 2026)
  { id: "md4-slavia-prague-arsenal", matchday: 4, order: 55, homeTeamId: "slavia-prague", awayTeamId: "arsenal", kickoffUtc: "2026-11-04T17:45:00Z" },
  { id: "md4-napoli-aek-athens", matchday: 4, order: 56, homeTeamId: "napoli", awayTeamId: "aek-athens", kickoffUtc: "2026-11-04T17:45:00Z" },
  { id: "md4-atletico-madrid-lens", matchday: 4, order: 57, homeTeamId: "atletico-madrid", awayTeamId: "lens", kickoffUtc: "2026-11-04T20:00:00Z" },
  { id: "md4-bodo-glimt-lille", matchday: 4, order: 58, homeTeamId: "bodo-glimt", awayTeamId: "lille", kickoffUtc: "2026-11-04T20:00:00Z" },
  { id: "md4-roma-sporting-cp", matchday: 4, order: 59, homeTeamId: "roma", awayTeamId: "sporting-cp", kickoffUtc: "2026-11-04T20:00:00Z" },
  { id: "md4-liverpool-real-madrid", matchday: 4, order: 60, homeTeamId: "liverpool", awayTeamId: "real-madrid", kickoffUtc: "2026-11-04T20:00:00Z" },
  { id: "md4-lask-psv-eindhoven", matchday: 4, order: 61, homeTeamId: "lask", awayTeamId: "psv-eindhoven", kickoffUtc: "2026-11-04T20:00:00Z" },
  { id: "md4-paris-saint-germain-bayern-munich", matchday: 4, order: 62, homeTeamId: "paris-saint-germain", awayTeamId: "bayern-munich", kickoffUtc: "2026-11-04T20:00:00Z" },
  { id: "md4-manchester-united-viking", matchday: 4, order: 63, homeTeamId: "manchester-united", awayTeamId: "viking", kickoffUtc: "2026-11-04T20:00:00Z" },
  { id: "md4-shakhtar-donetsk-villarreal", matchday: 4, order: 64, homeTeamId: "shakhtar-donetsk", awayTeamId: "villarreal", kickoffUtc: "2026-11-05T17:45:00Z" },
  { id: "md4-fenerbahce-porto", matchday: 4, order: 65, homeTeamId: "fenerbahce", awayTeamId: "porto", kickoffUtc: "2026-11-05T17:45:00Z" },
  { id: "md4-sabah-galatasaray", matchday: 4, order: 66, homeTeamId: "sabah", awayTeamId: "galatasaray", kickoffUtc: "2026-11-05T20:00:00Z" },
  { id: "md4-club-brugge-barcelona", matchday: 4, order: 67, homeTeamId: "club-brugge", awayTeamId: "barcelona", kickoffUtc: "2026-11-05T20:00:00Z" },
  { id: "md4-inter-milan-feyenoord", matchday: 4, order: 68, homeTeamId: "inter-milan", awayTeamId: "feyenoord", kickoffUtc: "2026-11-05T20:00:00Z" },
  { id: "md4-manchester-city-borussia-dortmund", matchday: 4, order: 69, homeTeamId: "manchester-city", awayTeamId: "borussia-dortmund", kickoffUtc: "2026-11-05T20:00:00Z" },
  { id: "md4-aston-villa-como", matchday: 4, order: 70, homeTeamId: "aston-villa", awayTeamId: "como", kickoffUtc: "2026-11-05T20:00:00Z" },
  { id: "md4-rb-leipzig-real-betis", matchday: 4, order: 71, homeTeamId: "rb-leipzig", awayTeamId: "real-betis", kickoffUtc: "2026-11-05T20:00:00Z" },
  { id: "md4-stuttgart-slovan-bratislava", matchday: 4, order: 72, homeTeamId: "stuttgart", awayTeamId: "slovan-bratislava", kickoffUtc: "2026-11-05T20:00:00Z" },


  // Matchday 5 (25-26 November 2026)
  { id: "md5-sabah-stuttgart", matchday: 5, order: 73, homeTeamId: "sabah", awayTeamId: "stuttgart", kickoffUtc: "2026-11-25T17:45:00Z" },
  { id: "md5-galatasaray-lens", matchday: 5, order: 74, homeTeamId: "galatasaray", awayTeamId: "lens", kickoffUtc: "2026-11-25T17:45:00Z" },
  { id: "md5-borussia-dortmund-villarreal", matchday: 5, order: 75, homeTeamId: "borussia-dortmund", awayTeamId: "villarreal", kickoffUtc: "2026-11-25T20:00:00Z" },
  { id: "md5-porto-barcelona", matchday: 5, order: 76, homeTeamId: "porto", awayTeamId: "barcelona", kickoffUtc: "2026-11-25T20:00:00Z" },
  { id: "md5-bodo-glimt-roma", matchday: 5, order: 77, homeTeamId: "bodo-glimt", awayTeamId: "roma", kickoffUtc: "2026-11-25T20:00:00Z" },
  { id: "md5-manchester-city-slovan-bratislava", matchday: 5, order: 78, homeTeamId: "manchester-city", awayTeamId: "slovan-bratislava", kickoffUtc: "2026-11-25T20:00:00Z" },
  { id: "md5-rb-leipzig-aston-villa", matchday: 5, order: 79, homeTeamId: "rb-leipzig", awayTeamId: "aston-villa", kickoffUtc: "2026-11-25T20:00:00Z" },
  { id: "md5-slavia-prague-como", matchday: 5, order: 80, homeTeamId: "slavia-prague", awayTeamId: "como", kickoffUtc: "2026-11-25T20:00:00Z" },
  { id: "md5-napoli-fenerbahce", matchday: 5, order: 81, homeTeamId: "napoli", awayTeamId: "fenerbahce", kickoffUtc: "2026-11-25T20:00:00Z" },
  { id: "md5-viking-feyenoord", matchday: 5, order: 82, homeTeamId: "viking", awayTeamId: "feyenoord", kickoffUtc: "2026-11-26T17:45:00Z" },
  { id: "md5-shakhtar-donetsk-lille", matchday: 5, order: 83, homeTeamId: "shakhtar-donetsk", awayTeamId: "lille", kickoffUtc: "2026-11-26T17:45:00Z" },
  { id: "md5-arsenal-bayern-munich", matchday: 5, order: 84, homeTeamId: "arsenal", awayTeamId: "bayern-munich", kickoffUtc: "2026-11-26T20:00:00Z" },
  { id: "md5-atletico-madrid-inter-milan", matchday: 5, order: 85, homeTeamId: "atletico-madrid", awayTeamId: "inter-milan", kickoffUtc: "2026-11-26T20:00:00Z" },
  { id: "md5-aek-athens-real-betis", matchday: 5, order: 86, homeTeamId: "aek-athens", awayTeamId: "real-betis", kickoffUtc: "2026-11-26T20:00:00Z" },
  { id: "md5-liverpool-psv-eindhoven", matchday: 5, order: 87, homeTeamId: "liverpool", awayTeamId: "psv-eindhoven", kickoffUtc: "2026-11-26T20:00:00Z" },
  { id: "md5-lask-real-madrid", matchday: 5, order: 88, homeTeamId: "lask", awayTeamId: "real-madrid", kickoffUtc: "2026-11-26T20:00:00Z" },
  { id: "md5-paris-saint-germain-manchester-united", matchday: 5, order: 89, homeTeamId: "paris-saint-germain", awayTeamId: "manchester-united", kickoffUtc: "2026-11-26T20:00:00Z" },
  { id: "md5-sporting-cp-club-brugge", matchday: 5, order: 90, homeTeamId: "sporting-cp", awayTeamId: "club-brugge", kickoffUtc: "2026-11-26T20:00:00Z" },


  // Matchday 6 (9-10 December 2026)
  { id: "md6-feyenoord-lask", matchday: 6, order: 91, homeTeamId: "feyenoord", awayTeamId: "lask", kickoffUtc: "2026-12-09T15:30:00Z" },
  { id: "md6-bayern-munich-sporting-cp", matchday: 6, order: 92, homeTeamId: "bayern-munich", awayTeamId: "sporting-cp", kickoffUtc: "2026-12-09T17:45:00Z" },
  { id: "md6-lille-galatasaray", matchday: 6, order: 93, homeTeamId: "lille", awayTeamId: "galatasaray", kickoffUtc: "2026-12-09T20:00:00Z" },
  { id: "md6-real-betis-porto", matchday: 6, order: 94, homeTeamId: "real-betis", awayTeamId: "porto", kickoffUtc: "2026-12-09T20:00:00Z" },
  { id: "md6-barcelona-aek-athens", matchday: 6, order: 95, homeTeamId: "barcelona", awayTeamId: "aek-athens", kickoffUtc: "2026-12-09T20:00:00Z" },
  { id: "md6-inter-milan-liverpool", matchday: 6, order: 96, homeTeamId: "inter-milan", awayTeamId: "liverpool", kickoffUtc: "2026-12-09T20:00:00Z" },
  { id: "md6-psv-eindhoven-atletico-madrid", matchday: 6, order: 97, homeTeamId: "psv-eindhoven", awayTeamId: "atletico-madrid", kickoffUtc: "2026-12-09T20:00:00Z" },
  { id: "md6-lens-rb-leipzig", matchday: 6, order: 98, homeTeamId: "lens", awayTeamId: "rb-leipzig", kickoffUtc: "2026-12-09T20:00:00Z" },
  { id: "md6-manchester-united-slavia-prague", matchday: 6, order: 99, homeTeamId: "manchester-united", awayTeamId: "slavia-prague", kickoffUtc: "2026-12-09T20:00:00Z" },
  { id: "md6-fenerbahce-sabah", matchday: 6, order: 100, homeTeamId: "fenerbahce", awayTeamId: "sabah", kickoffUtc: "2026-12-10T17:45:00Z" },
  { id: "md6-villarreal-viking", matchday: 6, order: 101, homeTeamId: "villarreal", awayTeamId: "viking", kickoffUtc: "2026-12-10T17:45:00Z" },
  { id: "md6-como-paris-saint-germain", matchday: 6, order: 102, homeTeamId: "como", awayTeamId: "paris-saint-germain", kickoffUtc: "2026-12-10T20:00:00Z" },
  { id: "md6-slovan-bratislava-aston-villa", matchday: 6, order: 103, homeTeamId: "slovan-bratislava", awayTeamId: "aston-villa", kickoffUtc: "2026-12-10T20:00:00Z" },
  { id: "md6-borussia-dortmund-bodo-glimt", matchday: 6, order: 104, homeTeamId: "borussia-dortmund", awayTeamId: "bodo-glimt", kickoffUtc: "2026-12-10T20:00:00Z" },
  { id: "md6-club-brugge-arsenal", matchday: 6, order: 105, homeTeamId: "club-brugge", awayTeamId: "arsenal", kickoffUtc: "2026-12-10T20:00:00Z" },
  { id: "md6-roma-shakhtar-donetsk", matchday: 6, order: 106, homeTeamId: "roma", awayTeamId: "shakhtar-donetsk", kickoffUtc: "2026-12-10T20:00:00Z" },
  { id: "md6-real-madrid-manchester-city", matchday: 6, order: 107, homeTeamId: "real-madrid", awayTeamId: "manchester-city", kickoffUtc: "2026-12-10T20:00:00Z" },
  { id: "md6-stuttgart-napoli", matchday: 6, order: 108, homeTeamId: "stuttgart", awayTeamId: "napoli", kickoffUtc: "2026-12-10T20:00:00Z" },


  // Matchday 7 (20-21 January 2027)
  { id: "md7-feyenoord-club-brugge", matchday: 7, order: 109, homeTeamId: "feyenoord", awayTeamId: "club-brugge", kickoffUtc: "2027-01-20T15:30:00Z" },
  { id: "md7-bodo-glimt-manchester-city", matchday: 7, order: 110, homeTeamId: "bodo-glimt", awayTeamId: "manchester-city", kickoffUtc: "2027-01-20T17:45:00Z" },
  { id: "md7-viking-napoli", matchday: 7, order: 111, homeTeamId: "viking", awayTeamId: "napoli", kickoffUtc: "2027-01-20T20:00:00Z" },
  { id: "md7-inter-milan-arsenal", matchday: 7, order: 112, homeTeamId: "inter-milan", awayTeamId: "arsenal", kickoffUtc: "2027-01-20T20:00:00Z" },
  { id: "md7-lask-slovan-bratislava", matchday: 7, order: 113, homeTeamId: "lask", awayTeamId: "slovan-bratislava", kickoffUtc: "2027-01-20T20:00:00Z" },
  { id: "md7-real-madrid-lille", matchday: 7, order: 114, homeTeamId: "real-madrid", awayTeamId: "lille", kickoffUtc: "2027-01-20T20:00:00Z" },
  { id: "md7-sporting-cp-paris-saint-germain", matchday: 7, order: 115, homeTeamId: "sporting-cp", awayTeamId: "paris-saint-germain", kickoffUtc: "2027-01-20T20:00:00Z" },
  { id: "md7-manchester-united-borussia-dortmund", matchday: 7, order: 116, homeTeamId: "manchester-united", awayTeamId: "borussia-dortmund", kickoffUtc: "2027-01-20T20:00:00Z" },
  { id: "md7-villarreal-sabah", matchday: 7, order: 117, homeTeamId: "villarreal", awayTeamId: "sabah", kickoffUtc: "2027-01-20T20:00:00Z" },
  { id: "md7-galatasaray-atletico-madrid", matchday: 7, order: 118, homeTeamId: "galatasaray", awayTeamId: "atletico-madrid", kickoffUtc: "2027-01-21T17:45:00Z" },
  { id: "md7-fenerbahce-aek-athens", matchday: 7, order: 119, homeTeamId: "fenerbahce", awayTeamId: "aek-athens", kickoffUtc: "2027-01-21T17:45:00Z" },
  { id: "md7-real-betis-como", matchday: 7, order: 120, homeTeamId: "real-betis", awayTeamId: "como", kickoffUtc: "2027-01-21T20:00:00Z" },
  { id: "md7-porto-shakhtar-donetsk", matchday: 7, order: 121, homeTeamId: "porto", awayTeamId: "shakhtar-donetsk", kickoffUtc: "2027-01-21T20:00:00Z" },
  { id: "md7-bayern-munich-lens", matchday: 7, order: 122, homeTeamId: "bayern-munich", awayTeamId: "lens", kickoffUtc: "2027-01-21T20:00:00Z" },
  { id: "md7-roma-stuttgart", matchday: 7, order: 123, homeTeamId: "roma", awayTeamId: "stuttgart", kickoffUtc: "2027-01-21T20:00:00Z" },
  { id: "md7-aston-villa-psv-eindhoven", matchday: 7, order: 124, homeTeamId: "aston-villa", awayTeamId: "psv-eindhoven", kickoffUtc: "2027-01-21T20:00:00Z" },
  { id: "md7-rb-leipzig-liverpool", matchday: 7, order: 125, homeTeamId: "rb-leipzig", awayTeamId: "liverpool", kickoffUtc: "2027-01-21T20:00:00Z" },
  { id: "md7-slavia-prague-barcelona", matchday: 7, order: 126, homeTeamId: "slavia-prague", awayTeamId: "barcelona", kickoffUtc: "2027-01-21T20:00:00Z" },


  // Matchday 8 (28 January 2027)
  { id: "md8-sabah-lask", matchday: 8, order: 127, homeTeamId: "sabah", awayTeamId: "lask", kickoffUtc: "2027-01-28T20:00:00Z" },
  { id: "md8-arsenal-feyenoord", matchday: 8, order: 128, homeTeamId: "arsenal", awayTeamId: "feyenoord", kickoffUtc: "2027-01-28T20:00:00Z" },
  { id: "md8-lille-roma", matchday: 8, order: 129, homeTeamId: "lille", awayTeamId: "roma", kickoffUtc: "2027-01-28T20:00:00Z" },
  { id: "md8-como-sporting-cp", matchday: 8, order: 130, homeTeamId: "como", awayTeamId: "sporting-cp", kickoffUtc: "2027-01-28T20:00:00Z" },
  { id: "md8-atletico-madrid-bodo-glimt", matchday: 8, order: 131, homeTeamId: "atletico-madrid", awayTeamId: "bodo-glimt", kickoffUtc: "2027-01-28T20:00:00Z" },
  { id: "md8-slovan-bratislava-villarreal", matchday: 8, order: 132, homeTeamId: "slovan-bratislava", awayTeamId: "villarreal", kickoffUtc: "2027-01-28T20:00:00Z" },
  { id: "md8-borussia-dortmund-inter-milan", matchday: 8, order: 133, homeTeamId: "borussia-dortmund", awayTeamId: "inter-milan", kickoffUtc: "2027-01-28T20:00:00Z" },
  { id: "md8-club-brugge-rb-leipzig", matchday: 8, order: 134, homeTeamId: "club-brugge", awayTeamId: "rb-leipzig", kickoffUtc: "2027-01-28T20:00:00Z" },
  { id: "md8-aek-athens-manchester-united", matchday: 8, order: 135, homeTeamId: "aek-athens", awayTeamId: "manchester-united", kickoffUtc: "2027-01-28T20:00:00Z" },
  { id: "md8-barcelona-viking", matchday: 8, order: 136, homeTeamId: "barcelona", awayTeamId: "viking", kickoffUtc: "2027-01-28T20:00:00Z" },
  { id: "md8-liverpool-fenerbahce", matchday: 8, order: 137, homeTeamId: "liverpool", awayTeamId: "fenerbahce", kickoffUtc: "2027-01-28T20:00:00Z" },
  { id: "md8-manchester-city-galatasaray", matchday: 8, order: 138, homeTeamId: "manchester-city", awayTeamId: "galatasaray", kickoffUtc: "2027-01-28T20:00:00Z" },
  { id: "md8-shakhtar-donetsk-slavia-prague", matchday: 8, order: 139, homeTeamId: "shakhtar-donetsk", awayTeamId: "slavia-prague", kickoffUtc: "2027-01-28T20:00:00Z" },
  { id: "md8-paris-saint-germain-aston-villa", matchday: 8, order: 140, homeTeamId: "paris-saint-germain", awayTeamId: "aston-villa", kickoffUtc: "2027-01-28T20:00:00Z" },
  { id: "md8-psv-eindhoven-bayern-munich", matchday: 8, order: 141, homeTeamId: "psv-eindhoven", awayTeamId: "bayern-munich", kickoffUtc: "2027-01-28T20:00:00Z" },
  { id: "md8-lens-real-betis", matchday: 8, order: 142, homeTeamId: "lens", awayTeamId: "real-betis", kickoffUtc: "2027-01-28T20:00:00Z" },
  { id: "md8-stuttgart-real-madrid", matchday: 8, order: 143, homeTeamId: "stuttgart", awayTeamId: "real-madrid", kickoffUtc: "2027-01-28T20:00:00Z" },
  { id: "md8-napoli-porto", matchday: 8, order: 144, homeTeamId: "napoli", awayTeamId: "porto", kickoffUtc: "2027-01-28T20:00:00Z" },
];
