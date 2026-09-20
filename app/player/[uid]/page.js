"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { collection, collectionGroup, getDocs } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { useAuth } from "../../../lib/AuthContext";
import { isPastEvent } from "../../../lib/eventDate";
import Loader from "../../../components/Loader";

export default function PlayerProfilePage() {
  const { uid } = useParams();
  const { user, loading } = useAuth() || {};
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const eventsSnap = await getDocs(collection(db, "events"));
      const eventsById = {};
      eventsSnap.docs.forEach((d) => (eventsById[d.id] = { id: d.id, ...d.data() }));

      const participantsSnap = await getDocs(collectionGroup(db, "participants"));
      const mine = participantsSnap.docs.filter((d) => d.id === uid);

      let mcNick = "";
      let discordUsername = "";
      let wins = 0;
      const history = mine
        .map((d) => {
          const data = d.data();
          if (data.mcNick) mcNick = data.mcNick;
          if (data.discordUsername) discordUsername = data.discordUsername;
          const eventId = d.ref.parent.parent.id;
          const ev = eventsById[eventId];
          if (!ev) return null;
          const past = isPastEvent(ev.date, ev.dateEnd);
          const won = past && ev.winnerUid === uid;
          if (won) wins += 1;
          return { id: eventId, name: ev.name, date: ev.date, past, won };
        })
        .filter(Boolean)
        .sort((a, b) => (a.date < b.date ? 1 : -1));

      const played = history.filter((h) => h.past).length;

      setProfile({ mcNick, discordUsername, wins, played, history });
    })();
  }, [user, uid]);

  if (loading) return <Loader />;
  if (!user) return null;
  if (!profile) return <Loader />;

  if (!profile.mcNick) {
    return (
      <div className="wrap" style={{ paddingTop: 60 }}>
        <div className="empty">No encontramos a este jugador.</div>
      </div>
    );
  }

  return (
    <div className="wrap" style={{ paddingTop: 40 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 24 }}>
        <img
          src={`https://mc-heads.net/avatar/${encodeURIComponent(profile.mcNick)}/80`}
          width={80}
          height={80}
          alt={profile.mcNick}
          style={{ imageRendering: "pixelated", border: "1px solid var(--border)" }}
        />
        <div>
          <h1 className="display" style={{ fontSize: 26 }}>{profile.mcNick}</h1>
          {profile.discordUsername && <div className="p-discord" style={{ marginTop: 6 }}>@{profile.discordUsername}</div>}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 30 }}>
        {profile.wins > 0 && (
          <span className="tag ember">🏆 {profile.wins} {profile.wins === 1 ? "victoria" : "victorias"}</span>
        )}
        <span className="tag ok">{profile.played} {profile.played === 1 ? "evento jugado" : "eventos jugados"}</span>
      </div>

      <h3 style={{ marginBottom: 12 }}>Historial</h3>
      {profile.history.length === 0 && (
        <div className="empty">Todavía no hay eventos registrados.</div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {profile.history.map((h) => (
          <Link key={h.id} href={`/events/${h.id}`} style={{ textDecoration: "none" }}>
            <div className="participant card-hover" style={{ justifyContent: "space-between" }}>
              <div>
                <div className="p-name">{h.name}</div>
                <div style={{ color: "var(--text-lo)", fontSize: 12, marginTop: 2 }}>{h.date}</div>
              </div>
              {h.won && <span className="tag ember">🏆 Ganó</span>}
              {!h.won && !h.past && <span className="tag ok">Próximo</span>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
