"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, collectionGroup, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../lib/AuthContext";
import { isPastEvent } from "../../lib/eventDate";
import Loader from "../../components/Loader";

export default function RankingPage() {
  const { user, loading } = useAuth() || {};
  const [ranking, setRanking] = useState(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const eventsSnap = await getDocs(collection(db, "events"));
      const pastEventIds = new Set(
        eventsSnap.docs.filter((d) => isPastEvent(d.data().date)).map((d) => d.id)
      );

      const participantsSnap = await getDocs(collectionGroup(db, "participants"));
      const byUser = {};
      participantsSnap.docs.forEach((d) => {
        const eventId = d.ref.parent.parent.id;
        if (!pastEventIds.has(eventId)) return;
        const data = d.data();
        if (!data.mcNick) return;
        const uid = d.id;
        if (!byUser[uid]) byUser[uid] = { uid, played: 0, wins: 0, mcNick: "", discordUsername: "" };
        byUser[uid].played += 1;
        byUser[uid].mcNick = data.mcNick;
        byUser[uid].discordUsername = data.discordUsername || byUser[uid].discordUsername;
      });

      eventsSnap.docs.forEach((d) => {
        if (!pastEventIds.has(d.id)) return;
        const winnerUid = d.data().winnerUid;
        if (winnerUid && byUser[winnerUid]) {
          byUser[winnerUid].wins += 1;
        }
      });

      const sorted = Object.values(byUser).sort((a, b) => b.wins - a.wins || b.played - a.played);
      setRanking(sorted);
    })();
  }, [user]);

  if (loading) return <Loader />;
  if (!user) return null;

  return (
    <div className="wrap" style={{ paddingTop: 40 }}>
      <h1 className="display" style={{ fontSize: 30, marginBottom: 8 }}>Ranking</h1>
      <p className="hint" style={{ marginBottom: 24 }}>
        Eventos jugados y ganados, entre los eventos ya pasados.
      </p>

      {ranking === null && <Loader />}

      {ranking && ranking.length === 0 && (
        <div className="empty">Todavía no hay eventos pasados con gente apuntada.</div>
      )}

      {ranking && ranking.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ranking.map((r, i) => (
            <Link key={r.uid} href={`/player/${r.uid}`} style={{ textDecoration: "none" }}>
              <div className="participant card-hover" style={{ justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ color: "var(--text-lo)", fontSize: 13, width: 22 }}>#{i + 1}</span>
                  <img src={`https://mc-heads.net/avatar/${encodeURIComponent(r.mcNick)}/40`} width={40} height={40} alt={r.mcNick} />
                  <div>
                    <div className="p-name">{r.mcNick}</div>
                    {r.discordUsername && <div className="p-discord">@{r.discordUsername}</div>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {r.wins > 0 && (
                    <span className="tag ember">🏆 {r.wins} {r.wins === 1 ? "victoria" : "victorias"}</span>
                  )}
                  <span className="tag ok">{r.played} {r.played === 1 ? "jugado" : "jugados"}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
