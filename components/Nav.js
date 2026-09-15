"use client";

import Link from "next/link";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";

export default function Nav() {
  const { user, isAdmin, loading } = useAuth() || {};

  return (
    <nav className="nav">
      <Link href="/" style={{ textDecoration: "none" }}>
        <div className="nav-brand">
          <span className="void">Void</span>Core Studios
        </div>
      </Link>
      <div className="nav-links">
        {!loading && isAdmin && <span className="pill">admin</span>}
        {!loading && isAdmin && <Link href="/admin">Panel</Link>}
        {!loading && user && (
          <button className="btn-ghost btn" onClick={() => signOut(auth)}>
            Salir
          </button>
        )}
        {!loading && !user && <Link href="/login">Entrar</Link>}
      </div>
    </nav>
  );
}
