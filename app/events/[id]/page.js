"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  collection,
  doc,
  increment,
  onSnapshot,
  runTransaction,
  setDoc,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { useAuth } from "../../../lib/AuthContext";

export default function EventPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, profile, loading } = useAuth() || {};
  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [myEntry, setMyEntry] = useState(null);
  const [nick, setNick] = useState("");
  const [discord, setDiscord] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    const unsubEvent = onSnapshot(doc(db, "events", id), (d) => setEvent({ id: d.id, ...d.data() }));
    const unsubParticipants = onSnapshot(collection(db, "events", id, "participants"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setParticipants(list);
      setMyEntry(list.find((p) => p.id === user.uid) || null);
    });
    return () => {
      unsubEvent();
      unsubParticipants();
    };
  }, [id, user]);

  if (loading || !event) return null;

  if (!user) {
    router.push("/login");
    return null;
  }

  const full = event.capacity && (event.participantCount || 0) >= event.capacity;

  async function join() {
    setError("");
    setBusy(true);
    try {
      await runTransaction(db, async (tx) => {
        const eventRef = doc(db, "events", id);
        const evSnap = await tx.get(eventRef);
        const data = evSnap.data();
        if ((data.participantCount || 0) >= data.capacity) {
          throw new Error("full");
        }
        tx.set(doc(db, "events", id, "participants", user.uid), {
          email: user.email,
          discordUsername: profile?.discordUsername || "",
          mcNick: "",
          joinedAt: Date.now(),
        });
        tx.update(eventRef, { participantCount: increment(1) });
      });
    } catch (err) {
      setError("El cupo se llenó justo ahora. Intenta con otro evento.");
    } finally {
      setBusy(false);
    }
  }

  async function saveNick(e) {
    e.preventDefault();
    setBusy(true);
    const cleanNick = nick.trim().slice(0, 20) || myEntry.mcNick || "";
    const cleanDiscord = discord.trim() || myEntry.discordUsername || "";
    await setDoc(
      doc(db, "events", id, "participants", user.uid),
      { mcNick: cleanNick, discordUsername: cleanDiscord },
      { merge: true }
    );
    setBusy(false);
  }

  return (
    <div className="wrap" style={{ paddingTop: 40 }}>
      {event.imageUrl && (
        <div
          style={{
            height: 180,
            marginBottom: 20,
            backgroundImage: `linear-gradient(180deg, rgba(8,6,13,0.1), rgba(8,6,13,0.9)), url(${event.imageUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            border: "1px solid var(--border)",
          }}
        />
      )}
      <h1 className="display" style={{ fontSize: 28 }}>{event.name}</h1>
      <p style={{ color: "var(--text-lo)", margin: "10px 0 4px" }}>{event.date}</p>
      <p style={{ margin: "14px 0 24px" }}>{event.description}</p>

      {error && <div className="error">{error}</div>}

      {!myEntry && (
        <button className="btn" disabled={busy || full} onClick={join}>
          {full ? "Cupo lleno" : busy ? "Apuntando..." : "Apuntarme"}
        </button>
      )}

      {myEntry && (
        <div className="card open">
          <p style={{ marginBottom: 12 }}>Ya estás apuntado a este evento.</p>
          {event.whitelistOpen ? (
            <form onSubmit={saveNick}>
              <div className="field">
                <label>Tu nick de Minecraft (máx. 20 caracteres)</label>
                <input
                  placeholder={myEntry.mcNick || "ej. Steve123"}
                  value={nick}
                  maxLength={20}
                  onChange={(e) => setNick(e.target.value.slice(0, 20))}
                />
              </div>
              <div className="field">
                <label>Tu usuario de Discord</label>
                <input
                  placeholder={myEntry.discordUsername || "ej. steve.mc"}
                  value={discord}
                  onChange={(e) => setDiscord(e.target.value)}
                />
              </div>
              <button className="btn btn-ember" disabled={busy}>
                {myEntry.mcNick ? "Actualizar" : "Guardar"}
              </button>
            </form>
          ) : (
            <p className="hint">La whitelist todavía no está abierta para este evento.</p>
          )}
        </div>
      )}

      <h3 style={{ margin: "32px 0 4px" }}>Gente apuntada ({participants.length})</h3>
      <div className="participants">
        {participants
          .filter((p) => p.mcNick)
          .map((p) => (
            <div className="participant" key={p.id}>
              <img src={`https://mc-heads.net/avatar/${encodeURIComponent(p.mcNick)}/40`} width={40} height={40} alt={p.mcNick} />
              <div>
                <div className="p-name">{p.mcNick}</div>
                {p.discordUsername && <div className="p-discord">@{p.discordUsername}</div>}
              </div>
            </div>
          ))}
        {participants.filter((p) => p.mcNick).length === 0 && (
          <p style={{ color: "var(--text-lo)", fontSize: 14 }}>Nadie ha puesto su nick todavía.</p>
        )}
      </div>
    </div>
  );
}
