"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../../lib/firebase";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function handleGoogleLogin() {
    setError("");
    setBusy(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      router.push("/");
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user") {
        setError("No se pudo entrar con Google. Intenta de nuevo.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-box">
      <h1 style={{ fontSize: 24, marginBottom: 10 }}>Entrar</h1>
      <p className="hint" style={{ marginBottom: 24 }}>
        Usamos tu cuenta de Google para evitar cuentas falsas.
      </p>
      {error && <div className="error">{error}</div>}
      <button className="btn btn-block" disabled={busy} onClick={handleGoogleLogin}>
        {busy ? "Entrando..." : "Continuar con Google"}
      </button>
    </div>
  );
}
