"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";

export default function HomePage() {
  const { user, loading } = useAuth() || {};
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "events"), orderBy("date", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoadingEvents(false);
    });
    return () => unsub();
  }, [user]);

  if (loading) return null;

  if (!user) {
    return (
      <div className="wrap" style={{ paddingTop: 60 }}>
        <h1 className="display" style={{ fontSize: 40, marginBottom: 14 }}>
          Eventos de <span style={{ color: "var(--rift)" }}>VoidCore Studios</span>
        </h1>
        <p style={{ color: "var(--text-lo)", maxWidth: 480, marginBottom: 28 }}>
          Entra con tu cuenta para ver los próximos eventos, apuntarte y poner tu nick en la whitelist.
        </p>
        <Link href="/login" className="btn">Entrar a la cuenta</Link>
      </div>
    );
  }

  return (
    <div className="wrap" style={{ paddingTop: 40 }}>
      <h1 className="display" style={{ fontSize: 30, marginBottom: 24 }}>Próximos eventos</h1>

      {loadingEvents && <p style={{ color: "var(--text-lo)" }}>Cargando...</p>}

      {!loadingEvents && events.length === 0 && (
        <div className="empty">
          Todavía no hay eventos creados.
        </div>
      )}

      {events.map((ev) => {
        const full = ev.capacity && (ev.participantCount || 0) >= ev.capacity;
        const status = full ? "full" : ev.whitelistOpen ? "wl" : "open";
        return (
          <Link key={ev.id} href={`/events/${ev.id}`} style={{ textDecoration: "none" }}>
            <div className={`card ${status}`} style={{ padding: 0, overflow: "hidden" }}>
              {ev.imageUrl && (
                <div
                  style={{
                    height: 120,
                    backgroundImage: `url(${ev.imageUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
              )}
              <div style={{ padding: 22 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <h3 style={{ fontSize: 19 }}>{ev.name}</h3>
                  <span className="tag" style={{ color: "var(--text-hi)" }}>{ev.date}</span>
                </div>
                <p style={{ color: "var(--text-lo)", fontSize: 14, margin: "10px 0" }}>{ev.description}</p>
                <div style={{ display: "flex", gap: 16 }}>
                  <span className={`tag ${full ? "" : "ok"}`}>
                    {ev.participantCount || 0}/{ev.capacity} apuntados
                  </span>
                  {ev.whitelistOpen && <span className="tag ember">whitelist abierta</span>}
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
