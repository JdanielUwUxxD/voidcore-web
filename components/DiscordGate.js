"use client";

import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";

export default function DiscordGate({ children }) {
  const { user, profile, loading, refreshProfile } = useAuth() || {};
  const [discord, setDiscord] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (loading || !user || !profile) return children;
  if (profile.discordUsername) return children;

  async function saveDiscord(e) {
    e.preventDefault();
    const clean = discord.trim();
    if (!clean) {
      setError("Escribe tu usuario de Discord.");
      return;
    }
    setBusy(true);
    await updateDoc(doc(db, "users", user.uid), { discordUsername: clean });
    await refreshProfile();
    setBusy(false);
  }

  return (
    <div className="auth-box">
      <h1 style={{ fontSize: 24, marginBottom: 10 }}>Un último paso</h1>
      <p className="hint" style={{ marginBottom: 24 }}>
        Antes de entrar, dinos tu usuario de Discord para poder ubicarte en el servidor de VoidCore Studios.
      </p>
      {error && <div className="error">{error}</div>}
      <form onSubmit={saveDiscord}>
        <div className="field">
          <label>Tu usuario de Discord</label>
          <input
            placeholder="ej. steve.mc"
            value={discord}
            onChange={(e) => setDiscord(e.target.value)}
          />
        </div>
        <button className="btn btn-block" disabled={busy}>
          {busy ? "Guardando..." : "Continuar"}
        </button>
      </form>
    </div>
  );
}
