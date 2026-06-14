const FINAL = new Set(["FT", "AET", "PEN"]);

export function computeStandings(matches) {
  const groups = {};

  for (const m of matches) {
    if (!m.group || !FINAL.has(m.status)) continue;

    const g = m.group;
    if (!groups[g]) groups[g] = {};

    const ensure = (name, flag) => {
      if (!groups[g][name]) groups[g][name] = { name, flag, M: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, P: 0 };
    };
    ensure(m.home.name, m.home.flag);
    ensure(m.away.name, m.away.flag);

    const h = m.home.goals ?? 0, a = m.away.goals ?? 0;
    const home = groups[g][m.home.name];
    const away = groups[g][m.away.name];

    home.M++; away.M++;
    home.GF += h; home.GA += a;
    away.GF += a; away.GA += h;

    if (h > a) { home.W++; home.P += 3; away.L++; }
    else if (h < a) { away.W++; away.P += 3; home.L++; }
    else { home.D++; away.D++; home.P++; away.P++; }
  }

  const result = {};
  for (const [group, teams] of Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))) {
    result[group] = Object.values(teams)
      .sort((a, b) => b.P - a.P || (b.GF - b.GA) - (a.GF - a.GA) || b.GF - a.GF)
      .map(t => ({ ...t, GD: t.GF - t.GA }));
  }
  return result;
}

export function topScorers(matches) {
  const scorers = {};

  for (const m of matches) {
    if (!FINAL.has(m.status) || !m.events) continue;
    for (const e of m.events) {
      if (e.type !== "goal" || e.tag === "b.d.") continue;
      if (!scorers[e.player]) {
        const team = e.team === "home" ? m.home : m.away;
        scorers[e.player] = { player: e.player, team: team.name, flag: team.flag, goals: 0 };
      }
      scorers[e.player].goals++;
    }
  }

  return Object.values(scorers).sort((a, b) => b.goals - a.goals);
}
