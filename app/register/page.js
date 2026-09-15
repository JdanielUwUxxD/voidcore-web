"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../lib/firebase";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setBusy(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      router.push("/");
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setError("Ese correo ya tiene una cuenta.");
      } else {
        setError("No se pudo crear la cuenta. Revisa el correo.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-box">
      <h1 style={{ fontSize: 24, marginBottom: 24 }}>Crear cuenta</h1>
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
          {busy ? "Creando..." : "Crear cuenta"}
        </button>
      </form>
      <p className="hint">
        ¿Ya tienes cuenta? <Link href="/login" style={{ color: "var(--rift)" }}>Entra aquí</Link>
      </p>
    </div>
  );
}
