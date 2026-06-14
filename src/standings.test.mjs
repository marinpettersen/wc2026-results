import { describe, it, expect } from "vitest";
import { computeStandings, topScorers } from "./standings.mjs";

// ── fixture helpers ────────────────────────────────────────────────────────────

function makeMatch(overrides) {
  return {
    id: Math.random(),
    kickoff: "2026-06-15T15:00:00.000Z",
    group: "A",
    status: "FT",
    home: { name: "Tim A", flag: "🅰", goals: 0 },
    away: { name: "Tim B", flag: "🅱", goals: 0 },
    penalty: null,
    events: [],
    ...overrides,
  };
}

function goal(team, player, tag) {
  return { type: "goal", team, player, ...(tag ? { tag } : {}) };
}

// ── computeStandings ──────────────────────────────────────────────────────────

describe("computeStandings", () => {
  it("tim menang dapat 3 poin, kalah 0", () => {
    const matches = [
      makeMatch({ home: { name: "Alpha", flag: "🅰", goals: 2 }, away: { name: "Beta", flag: "🅱", goals: 0 } }),
    ];
    const standings = computeStandings(matches);
    const [first, second] = standings["A"];
    expect(first.name).toBe("Alpha");
    expect(first.P).toBe(3);
    expect(first.W).toBe(1);
    expect(first.L).toBe(0);
    expect(second.name).toBe("Beta");
    expect(second.P).toBe(0);
    expect(second.W).toBe(0);
    expect(second.L).toBe(1);
  });

  it("tim seri masing-masing dapat 1 poin", () => {
    const matches = [
      makeMatch({ home: { name: "Alpha", flag: "🅰", goals: 1 }, away: { name: "Beta", flag: "🅱", goals: 1 } }),
    ];
    const standings = computeStandings(matches);
    const grup = standings["A"];
    grup.forEach(t => {
      expect(t.P).toBe(1);
      expect(t.D).toBe(1);
      expect(t.W).toBe(0);
      expect(t.L).toBe(0);
    });
  });

  it("GF, GA, dan GD dihitung benar", () => {
    const matches = [
      makeMatch({ home: { name: "Alpha", flag: "🅰", goals: 3 }, away: { name: "Beta", flag: "🅱", goals: 1 } }),
    ];
    const standings = computeStandings(matches);
    const alpha = standings["A"].find(t => t.name === "Alpha");
    const beta  = standings["A"].find(t => t.name === "Beta");
    expect(alpha.GF).toBe(3); expect(alpha.GA).toBe(1); expect(alpha.GD).toBe(2);
    expect(beta.GF).toBe(1);  expect(beta.GA).toBe(3);  expect(beta.GD).toBe(-2);
  });

  it("urutan: poin lebih tinggi di atas, tie-break GD diterapkan", () => {
    // Alpha: menang 1-0 → 3 pts, GD +1
    // Delta: menang 3-0 → 3 pts, GD +3  ← harus di atas Alpha
    // Beta & Gamma: 0 pts
    const matches = [
      makeMatch({ home: { name: "Alpha", flag: "🅰", goals: 1 }, away: { name: "Beta",  flag: "🅱", goals: 0 } }),
      makeMatch({ home: { name: "Gamma", flag: "🅶", goals: 0 }, away: { name: "Delta", flag: "🅳", goals: 3 } }),
    ];
    const rows = computeStandings(matches)["A"];
    expect(rows[0].name).toBe("Delta");  // 3 pts, GD +3
    expect(rows[1].name).toBe("Alpha");  // 3 pts, GD +1
    expect(rows[2].P).toBe(0);
    expect(rows[3].P).toBe(0);
  });

  it("tie-break: poin sama → urut by GD, lalu GF", () => {
    // Alpha: W 2-0 (GD +2, GF 2)  Beta: W 1-0 (GD +1, GF 1)
    const matches = [
      makeMatch({ home: { name: "Alpha", flag: "🅰", goals: 2 }, away: { name: "X", flag: "❌", goals: 0 } }),
      makeMatch({ home: { name: "Beta",  flag: "🅱", goals: 1 }, away: { name: "Y", flag: "❌", goals: 0 } }),
    ];
    const rows = computeStandings(matches)["A"];
    const names = rows.map(t => t.name);
    expect(names.indexOf("Alpha")).toBeLessThan(names.indexOf("Beta"));
  });

  it("laga non-FT (NS/LIVE/AET typo) diabaikan", () => {
    const matches = [
      makeMatch({ status: "NS" }),
      makeMatch({ status: "1H" }),
      makeMatch({ status: "HT" }),
    ];
    const standings = computeStandings(matches);
    expect(Object.keys(standings)).toHaveLength(0);
  });

  it("laga group:null diabaikan — return {}", () => {
    const matches = [
      makeMatch({ group: null, status: "FT" }),
    ];
    const standings = computeStandings(matches);
    expect(standings).toEqual({});
  });

  it("akumulasi beberapa laga per tim dalam satu grup", () => {
    const matches = [
      makeMatch({ home: { name: "Alpha", flag: "🅰", goals: 1 }, away: { name: "Beta", flag: "🅱", goals: 0 } }),
      makeMatch({ home: { name: "Alpha", flag: "🅰", goals: 0 }, away: { name: "Beta", flag: "🅱", goals: 2 } }),
    ];
    const alpha = computeStandings(matches)["A"].find(t => t.name === "Alpha");
    expect(alpha.M).toBe(2);
    expect(alpha.W).toBe(1);
    expect(alpha.L).toBe(1);
    expect(alpha.GF).toBe(1);
    expect(alpha.GA).toBe(2);
    expect(alpha.P).toBe(3);
  });
});

// ── topScorers ────────────────────────────────────────────────────────────────

describe("topScorers", () => {
  it("gol biasa dihitung per pemain", () => {
    const matches = [
      makeMatch({
        events: [goal("home", "Ronaldo"), goal("home", "Messi")],
      }),
    ];
    const scorers = topScorers(matches);
    expect(scorers).toHaveLength(2);
    scorers.forEach(s => expect(s.goals).toBe(1));
  });

  it("gol bunuh diri (tag b.d.) TIDAK dihitung ke pencetak", () => {
    const matches = [
      makeMatch({
        events: [goal("away", "Pemain A", "b.d."), goal("home", "Pemain B")],
      }),
    ];
    const scorers = topScorers(matches);
    expect(scorers.some(s => s.player === "Pemain A")).toBe(false);
    expect(scorers).toHaveLength(1);
    expect(scorers[0].player).toBe("Pemain B");
  });

  it("urut menurun by jumlah gol", () => {
    const matches = [
      makeMatch({
        events: [
          goal("home", "Kane"),
          goal("home", "Kane"),
          goal("away", "Mbappe"),
        ],
      }),
    ];
    const scorers = topScorers(matches);
    expect(scorers[0].player).toBe("Kane");
    expect(scorers[0].goals).toBe(2);
    expect(scorers[1].player).toBe("Mbappe");
    expect(scorers[1].goals).toBe(1);
  });

  it("gol pemain sama di beberapa laga terakumulasi", () => {
    const matches = [
      makeMatch({ events: [goal("home", "Kane")] }),
      makeMatch({ events: [goal("home", "Kane")] }),
      makeMatch({ events: [goal("home", "Kane")] }),
    ];
    const scorers = topScorers(matches);
    expect(scorers).toHaveLength(1);
    expect(scorers[0].player).toBe("Kane");
    expect(scorers[0].goals).toBe(3);
  });

  it("laga non-FT tidak masuk hitungan", () => {
    const matches = [
      makeMatch({ status: "NS", events: [goal("home", "Siapa")] }),
      makeMatch({ status: "1H", events: [goal("home", "Siapa")] }),
    ];
    expect(topScorers(matches)).toHaveLength(0);
  });

  it("info tim (nama + bendera) diambil dari sisi yang benar", () => {
    const m = makeMatch({
      home: { name: "Jerman", flag: "🇩🇪", goals: 1 },
      away: { name: "Prancis", flag: "🇫🇷", goals: 1 },
      events: [goal("home", "Muller"), goal("away", "Mbappe")],
    });
    const scorers = topScorers([m]);
    const muller = scorers.find(s => s.player === "Muller");
    const mbappe = scorers.find(s => s.player === "Mbappe");
    expect(muller.team).toBe("Jerman");
    expect(muller.flag).toBe("🇩🇪");
    expect(mbappe.team).toBe("Prancis");
    expect(mbappe.flag).toBe("🇫🇷");
  });
});
