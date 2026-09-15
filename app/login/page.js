"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../lib/firebase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/");
    } catch (err) {
      setError("Correo o contraseña incorrectos.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-box">
      <h1 style={{ fontSize: 24, marginBottom: 24 }}>Entrar</h1>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Correo</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label>Contraseña</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button className="btn btn-block" disabled={busy}>
          {busy ? "Entrando..." : "Entrar"}
        </button>
      </form>
      <p className="hint">
        ¿No tienes cuenta? <Link href="/register" style={{ color: "var(--rift)" }}>Regístrate</Link>
      </p>
    </div>
  );
}
