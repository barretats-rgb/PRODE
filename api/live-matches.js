const API_BASE = "https://v3.football.api-sports.io/fixtures";

function mapStatus(short) {
  const code = String(short || "").toUpperCase();
  if (["1H", "2H", "HT", "ET", "BT", "P", "LIVE", "INT"].includes(code)) return "vivo";
  if (["FT", "AET", "PEN"].includes(code)) return "finalizado";
  return "abierto";
}

function normalizeFixture(item) {
  const fixture = item.fixture || {};
  const status = fixture.status || {};
  const teams = item.teams || {};
  const goals = item.goals || {};
  const league = item.league || {};

  return {
    apiFixtureId: fixture.id,
    leagueId: league.id,
    leagueName: league.name,
    season: league.season,
    date: fixture.date,
    status: mapStatus(status.short),
    statusShort: status.short || "",
    statusLong: status.long || "",
    minute: status.elapsed ? `${status.elapsed}'` : "",
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
    scoreHome: Number.isFinite(goals.home) ? goals.home : goals.home ?? 0,
    scoreAway: Number.isFinite(goals.away) ? goals.away : goals.away ?? 0,
  };
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=45, stale-while-revalidate=180");

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
  url.searchParams.set("live", req.query.live || "all");
  if (req.query.league) url.searchParams.set("league", req.query.league);
  if (req.query.season) url.searchParams.set("season", req.query.season);
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
      error: error.message || "API-Football request failed.",
      fixtures: [],
    });
  }
};
