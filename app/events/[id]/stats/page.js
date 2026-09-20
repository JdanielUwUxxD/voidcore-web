"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { collection, doc, increment, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../../../../lib/firebase";
import { useAuth } from "../../../../lib/AuthContext";
import Loader from "../../../../components/Loader";

function StatButton({ label, onClick, disabled }) {
  return (
    <button
      className="btn-ghost btn"
      style={{ padding: "4px 10px", fontSize: 13 }}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
}

export default function EventStatsPage() {
  const { id } = useParams();
  const { user, isAdmin, loading } = useAuth() || {};
  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [stats, setStats] = useState({});

  useEffect(() => {
    if (!user) return;
    const unsubEvent = onSnapshot(doc(db, "events", id), (d) => setEvent({ id: d.id, ...d.data() }));
    const unsubParticipants = onSnapshot(collection(db, "events", id, "participants"), (snap) => {
      setParticipants(snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((p) => p.mcNick));
    });
    const unsubStats = onSnapshot(collection(db, "events", id, "stats"), (snap) => {
      const map = {};
      snap.docs.forEach((d) => (map[d.id] = d.data()));
      setStats(map);
    });
    return () => {
      unsubEvent();
      unsubParticipants();
      unsubStats();
    };
  }, [id, user]);

  if (loading || !event) return <Loader />;
  if (!user) return null;

  async function bump(playerId, field, delta) {
    const current = stats[playerId]?.[field] || 0;
    if (current + delta < 0) return;
    await setDoc(
      doc(db, "events", id, "stats", playerId),
      { [field]: increment(delta) },
      { merge: true }
    );
  }

  const rows = participants
    .map((p) => ({
      ...p,
      kills: stats[p.id]?.kills || 0,
      deaths: stats[p.id]?.deaths || 0,
      hearts: stats[p.id]?.hearts || 0,
    }))
    .sort((a, b) => b.kills - a.kills);

  return (
    <div className="wrap" style={{ paddingTop: 40 }}>
      <Link href={`/events/${id}`} className="hint" style={{ display: "inline-block", marginBottom: 14 }}>
        ← Volver al evento
      </Link>
      <h1 className="display" style={{ fontSize: 28, marginBottom: 6 }}>⚔️ {event.name} — Stats</h1>
      <p className="hint" style={{ marginBottom: 24 }}>
        Kills, muertes y coras (corazones) de cada jugador.
      </p>

      {rows.length === 0 && <div className="empty">Todavía no hay nadie con nick puesto en este evento.</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map((p) => (
          <div key={p.id} className="participant" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <img src={`https://mc-heads.net/avatar/${encodeURIComponent(p.mcNick)}/40`} width={40} height={40} alt={p.mcNick} />
              <div className="p-name">{p.mcNick}</div>
            </div>

            <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="tag ok">⚔️ {p.kills}</span>
                {isAdmin && (
                  <>
                    <StatButton label="−" onClick={() => bump(p.id, "kills", -1)} />
                    <StatButton label="+" onClick={() => bump(p.id, "kills", 1)} />
                  </>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="tag" style={{ color: "#ff9d9d" }}>💀 {p.deaths}</span>
                {isAdmin && (
                  <>
                    <StatButton label="−" onClick={() => bump(p.id, "deaths", -1)} />
                    <StatButton label="+" onClick={() => bump(p.id, "deaths", 1)} />
                  </>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="tag ember">❤️ {p.hearts}</span>
                {isAdmin && (
                  <>
                    <StatButton label="−" onClick={() => bump(p.id, "hearts", -1)} />
                    <StatButton label="+" onClick={() => bump(p.id, "hearts", 1)} />
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
