"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { addDoc, collection, deleteDoc, doc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../../../../lib/firebase";
import { useAuth } from "../../../../lib/AuthContext";
import Loader from "../../../../components/Loader";

const DEFAULTS = { kills: 0, deaths: 0, hearts: 10 };
const EMPTY_ENTRY = { mcNick: "", kills: 0 };

function StatButton({ label, onClick, disabled }) {
  return (
    <button
      className="btn-ghost btn"
      style={{ padding: "2px 9px", fontSize: 12 }}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
}

function PlayerCard({ p, isAdmin, onBump, onRemoveFromTeam }) {
  const hearts = p.hearts;
  const alive = hearts > 0;
  return (
    <div className="player-stat-card">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <img src={`https://mc-heads.net/avatar/${encodeURIComponent(p.mcNick)}/40`} width={40} height={40} alt={p.mcNick} />
        <div>
          <div className="p-name">{p.mcNick}</div>
          <span className={`status-pill ${alive ? "vivo" : "muerto"}`}>{alive ? "VIVO" : "MUERTO"}</span>
        </div>
      </div>
      <div>
        <div className="heart-row">{"❤️".repeat(Math.max(hearts, 0))}</div>
        <div className="hint" style={{ marginTop: 2 }}>{hearts} {hearts === 1 ? "Corazón" : "Corazones"}</div>
      </div>
      {isAdmin && (
        <div className="stat-controls">
          <div className="stat-group">
            ⚔️ {p.kills}
            <StatButton label="−" onClick={() => onBump(p.id, "kills", -1)} />
            <StatButton label="+" onClick={() => onBump(p.id, "kills", 1)} />
          </div>
          <div className="stat-group">
            💀 {p.deaths}
            <StatButton label="−" onClick={() => onBump(p.id, "deaths", -1)} />
            <StatButton label="+" onClick={() => onBump(p.id, "deaths", 1)} />
          </div>
          <div className="stat-group">
            ❤️
            <StatButton label="−" onClick={() => onBump(p.id, "hearts", -1)} />
            <StatButton label="+" onClick={() => onBump(p.id, "hearts", 1)} />
          </div>
          {p.teamId && (
            <button className="btn-ghost btn" style={{ padding: "2px 9px", fontSize: 12 }} onClick={() => onRemoveFromTeam(p.id)}>
              Quitar del equipo
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function StatsTab({ id, isAdmin, participants, statsMap, teams }) {
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamColor, setNewTeamColor] = useState("#a64dff");
  const [addPick, setAddPick] = useState({});

  async function bump(playerId, field, delta) {
    const current = statsMap[playerId]?.[field] ?? DEFAULTS[field];
    const next = current + delta;
    if (next < 0) return;
    await setDoc(doc(db, "events", id, "stats", playerId), { [field]: next }, { merge: true });
  }

  async function createTeam(e) {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    await addDoc(collection(db, "events", id, "teams"), { name: newTeamName.trim(), color: newTeamColor });
    setNewTeamName("");
  }

  async function deleteTeam(teamId) {
    if (!confirm("¿Borrar este equipo? La gente queda sin equipo.")) return;
    const members = participants.filter((p) => statsMap[p.id]?.teamId === teamId);
    for (const m of members) {
      await setDoc(doc(db, "events", id, "stats", m.id), { teamId: "" }, { merge: true });
    }
    await deleteDoc(doc(db, "events", id, "teams", teamId));
  }

  async function addToTeam(teamId) {
    const playerId = addPick[teamId];
    if (!playerId) return;
    await setDoc(doc(db, "events", id, "stats", playerId), { teamId }, { merge: true });
    setAddPick((cur) => ({ ...cur, [teamId]: "" }));
  }

  async function removeFromTeam(playerId) {
    await setDoc(doc(db, "events", id, "stats", playerId), { teamId: "" }, { merge: true });
  }

  const rows = participants.map((p) => ({
    ...p,
    kills: statsMap[p.id]?.kills ?? DEFAULTS.kills,
    deaths: statsMap[p.id]?.deaths ?? DEFAULTS.deaths,
    hearts: statsMap[p.id]?.hearts ?? DEFAULTS.hearts,
    teamId: statsMap[p.id]?.teamId || "",
  }));

  const unassigned = rows.filter((r) => !r.teamId || !teams.some((t) => t.id === r.teamId));

  return (
    <>
      {isAdmin && (
        <div className="card">
          <h3 style={{ marginBottom: 14 }}>Crear equipo</h3>
          <form onSubmit={createTeam} style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div className="field" style={{ marginBottom: 0, flex: "1 1 180px" }}>
              <label>Nombre del equipo</label>
              <input placeholder="ej. Equipo Rojo" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Color</label>
              <input type="color" value={newTeamColor} onChange={(e) => setNewTeamColor(e.target.value)} style={{ padding: 2, height: 44, width: 60 }} />
            </div>
            <button className="btn">Crear equipo</button>
          </form>
        </div>
      )}

      {rows.length === 0 && <div className="empty">Todavía no hay nadie con nick puesto en este evento.</div>}

      {teams.map((team) => {
        const members = rows.filter((r) => r.teamId === team.id);
        return (
          <div key={team.id} className="team-section">
            <div className="team-header" style={{ borderLeft: `4px solid ${team.color}` }}>
              <span style={{ color: team.color }}>{team.name}</span>
              {isAdmin && (
                <button
                  className="btn-ghost btn"
                  style={{ padding: "3px 10px", fontSize: 12, borderColor: "#ff5a5a", color: "#ff9d9d" }}
                  onClick={() => deleteTeam(team.id)}
                >
                  Borrar equipo
                </button>
              )}
            </div>
            <div className="team-body">
              {members.length === 0 && <p className="hint">Todavía no hay nadie en este equipo.</p>}
              {members.map((p) => (
                <PlayerCard key={p.id} p={p} isAdmin={isAdmin} onBump={bump} onRemoveFromTeam={removeFromTeam} />
              ))}
            </div>
            {isAdmin && (
              <div style={{ padding: "0 16px 16px", display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
                <div className="field" style={{ marginBottom: 0, flex: "1 1 200px" }}>
                  <label>Agregar jugador (solo sin equipo)</label>
                  <select
                    value={addPick[team.id] || ""}
                    onChange={(e) => setAddPick((cur) => ({ ...cur, [team.id]: e.target.value }))}
                    style={{ width: "100%", background: "var(--void-2)", border: "1px solid var(--border)", color: "var(--text-hi)", padding: "11px 12px", fontSize: 14 }}
                  >
                    <option value="">— elige jugador —</option>
                    {unassigned.map((p) => (
                      <option key={p.id} value={p.id}>{p.mcNick}</option>
                    ))}
                  </select>
                </div>
                <button className="btn btn-ghost" disabled={!addPick[team.id]} onClick={() => addToTeam(team.id)}>
                  Agregar al equipo
                </button>
              </div>
            )}
          </div>
        );
      })}

      {(teams.length === 0 || unassigned.length > 0) && (
        <div className="team-section">
          <div className="team-header">
            <span>{teams.length === 0 ? "Todos" : "Sin equipo"}</span>
          </div>
          <div className="team-body">
            {(teams.length === 0 ? rows : unassigned).map((p) => (
              <PlayerCard key={p.id} p={p} isAdmin={isAdmin} onBump={bump} onRemoveFromTeam={removeFromTeam} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function TopKillsDay({ id, day, isAdmin, participants }) {
  const [editing, setEditing] = useState(false);
  const [entries, setEntries] = useState(day.entries?.length === 5 ? day.entries : [...Array(5)].map((_, i) => day.entries?.[i] || EMPTY_ENTRY));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await updateDoc(doc(db, "events", id, "topkills", day.id), { entries });
    setSaving(false);
    setEditing(false);
  }

  async function removeDay() {
    if (!confirm(`¿Borrar el Día ${day.dayNumber}?`)) return;
    await deleteDoc(doc(db, "events", id, "topkills", day.id));
  }

  const medals = ["🥇", "🥈", "🥉", "4.", "5."];

  if (editing) {
    return (
      <div className="card">
        <h3 style={{ marginBottom: 14 }}>Editando Día {day.dayNumber}</h3>
        {entries.map((entry, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "flex-end" }}>
            <span style={{ width: 26 }}>{medals[i]}</span>
            <div className="field" style={{ marginBottom: 0, flex: "1 1 160px" }}>
              <select
                value={entry.mcNick}
                onChange={(e) => setEntries((cur) => cur.map((x, xi) => (xi === i ? { ...x, mcNick: e.target.value } : x)))}
                style={{ width: "100%", background: "var(--void-2)", border: "1px solid var(--border)", color: "var(--text-hi)", padding: "11px 12px", fontSize: 14 }}
              >
                <option value="">— jugador —</option>
                {participants.map((p) => (
                  <option key={p.id} value={p.mcNick}>{p.mcNick}</option>
                ))}
              </select>
            </div>
            <div className="field" style={{ marginBottom: 0, width: 100 }}>
              <input
                type="number"
                min="0"
                placeholder="Kills"
                value={entry.kills}
                onChange={(e) => setEntries((cur) => cur.map((x, xi) => (xi === i ? { ...x, kills: Number(e.target.value) } : x)))}
              />
            </div>
          </div>
        ))}
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-ember" disabled={saving} onClick={save}>
            {saving ? "Guardando..." : "Guardar día"}
          </button>
          <button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancelar</button>
        </div>
      </div>
    );
  }

  const filled = entries.filter((e) => e.mcNick);

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
        <h3>Día {day.dayNumber}</h3>
        {isAdmin && (
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-ghost btn" style={{ padding: "3px 10px", fontSize: 12 }} onClick={() => setEditing(true)}>
              Editar
            </button>
            <button
              className="btn-ghost btn"
              style={{ padding: "3px 10px", fontSize: 12, borderColor: "#ff5a5a", color: "#ff9d9d" }}
              onClick={removeDay}
            >
              Borrar
            </button>
          </div>
        )}
      </div>
      {filled.length === 0 && <p className="hint">Todavía no se cargó el top de este día.</p>}
      {filled.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {entries.map((entry, i) =>
            entry.mcNick ? (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 26 }}>{medals[i]}</span>
                <img src={`https://mc-heads.net/avatar/${encodeURIComponent(entry.mcNick)}/28`} width={28} height={28} alt={entry.mcNick} style={{ imageRendering: "pixelated", border: "1px solid var(--border)" }} />
                <span className="p-name">{entry.mcNick}</span>
                <span className="tag ok" style={{ marginLeft: "auto" }}>{entry.kills} kills</span>
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}

function TopKillsTab({ id, isAdmin, participants, days }) {
  async function addDay() {
    const nextNumber = days.length > 0 ? Math.max(...days.map((d) => d.dayNumber)) + 1 : 1;
    await addDoc(collection(db, "events", id, "topkills"), {
      dayNumber: nextNumber,
      entries: [...Array(5)].map(() => EMPTY_ENTRY),
    });
  }

  return (
    <>
      {isAdmin && (
        <button className="btn" style={{ marginBottom: 20 }} onClick={addDay}>
          + Agregar día
        </button>
      )}
      {days.length === 0 && <div className="empty">Todavía no hay ningún día cargado.</div>}
      {[...days].sort((a, b) => a.dayNumber - b.dayNumber).map((day) => (
        <TopKillsDay key={day.id} id={id} day={day} isAdmin={isAdmin} participants={participants} />
      ))}
    </>
  );
}

export default function EventStatsPage() {
  const { id } = useParams();
  const { user, isAdmin, loading } = useAuth() || {};
  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [statsMap, setStatsMap] = useState({});
  const [teams, setTeams] = useState([]);
  const [topDays, setTopDays] = useState([]);
  const [tab, setTab] = useState("stats");

  useEffect(() => {
    if (!user) return;
    const unsubEvent = onSnapshot(doc(db, "events", id), (d) => setEvent({ id: d.id, ...d.data() }));
    const unsubParticipants = onSnapshot(collection(db, "events", id, "participants"), (snap) => {
      setParticipants(snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((p) => p.mcNick));
    });
    const unsubStats = onSnapshot(collection(db, "events", id, "stats"), (snap) => {
      const map = {};
      snap.docs.forEach((d) => (map[d.id] = d.data()));
      setStatsMap(map);
    });
    const unsubTeams = onSnapshot(collection(db, "events", id, "teams"), (snap) => {
      setTeams(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsubTop = onSnapshot(collection(db, "events", id, "topkills"), (snap) => {
      setTopDays(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => {
      unsubEvent();
      unsubParticipants();
      unsubStats();
      unsubTeams();
      unsubTop();
    };
  }, [id, user]);

  if (loading || !event) return <Loader />;
  if (!user) return null;

  return (
    <div className="wrap" style={{ paddingTop: 40 }}>
      <Link href={`/events/${id}`} className="hint" style={{ display: "inline-block", marginBottom: 14 }}>
        ← Volver al evento
      </Link>
      <h1 className="display" style={{ fontSize: 28, marginBottom: 6 }}>⚔️ {event.name}</h1>
      <p className="hint" style={{ marginBottom: 20 }}>
        Kills, muertes, corazones y el top kills de cada día.
      </p>

      <div className="nav-links" style={{ marginBottom: 24, gap: 4 }}>
        <button
          className={`nav-link ${tab === "stats" ? "active" : ""}`}
          style={{ background: "transparent", border: "none" }}
          onClick={() => setTab("stats")}
        >
          Stats
        </button>
        <button
          className={`nav-link ${tab === "topkills" ? "active" : ""}`}
          style={{ background: "transparent", border: "none" }}
          onClick={() => setTab("topkills")}
        >
          Top Kills Días
        </button>
      </div>

      {tab === "stats" && (
        <StatsTab id={id} isAdmin={isAdmin} participants={participants} statsMap={statsMap} teams={teams} />
      )}
      {tab === "topkills" && (
        <TopKillsTab id={id} isAdmin={isAdmin} participants={participants} days={topDays} />
      )}
    </div>
  );
}
