const API_BASE = "https://v3.football.api-sports.io/fixtures";
const WORLD_CUP_LEAGUE_ID = "1";
const WORLD_CUP_SEASON = "2026";

function normalizeFixture(item) {
  const fixture = item.fixture || {};
  const teams = item.teams || {};
  const goals = item.goals || {};
  const league = item.league || {};
  const venue = fixture.venue || {};
  const status = fixture.status || {};

  return {
    apiFixtureId: fixture.id,
    leagueId: league.id,
    leagueName: league.name,
    round: league.round || "",
    season: league.season,
    date: fixture.date,
    venue: {
      id: venue.id,
      name: venue.name || "",
      city: venue.city || "",
    },
    statusShort: status.short || "",
    statusLong: status.long || "",
    elapsed: status.elapsed || null,
    home: {
      id: teams.home?.id,
      name: teams.home?.name || "",
      code: teams.home?.code || "",
    },
    away: {
      id: teams.away?.id,
      name: teams.away?.name || "",
      code: teams.away?.code || "",
    },
    scoreHome: goals.home ?? null,
    scoreAway: goals.away ?? null,
  };
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");

  const apiKey =
    process.env.API_FOOTBALL_KEY ||
    process.env.APIFOOTBALL_KEY ||
    process.env.API_SPORTS_KEY;

  if (!apiKey) {
    return res.status(200).json({
      ok: false,
      configured: false,
      error: "Missing API_FOOTBALL_KEY environment variable.",
      fixtures: [],
    });
  }

  const url = new URL(API_BASE);
  url.searchParams.set("league", req.query.league || WORLD_CUP_LEAGUE_ID);
  url.searchParams.set("season", req.query.season || WORLD_CUP_SEASON);
  if (req.query.from) url.searchParams.set("from", req.query.from);
  if (req.query.to) url.searchParams.set("to", req.query.to);
  if (req.query.timezone) url.searchParams.set("timezone", req.query.timezone);

  try {
    const upstream = await fetch(url, {
      headers: {
        "x-apisports-key": apiKey,
      },
    });
    const payload = await upstream.json();
    const fixtures = Array.isArray(payload.response)
      ? payload.response.map(normalizeFixture)
      : [];

    return res.status(upstream.ok ? 200 : upstream.status).json({
      ok: upstream.ok,
      configured: true,
      fetchedAt: new Date().toISOString(),
      results: payload.results || fixtures.length,
      errors: payload.errors || [],
      fixtures,
    });
  } catch (error) {
    return res.status(502).json({
      ok: false,
      configured: true,
      error: error.message || "API-Football schedule request failed.",
      fixtures: [],
    });
  }
};
