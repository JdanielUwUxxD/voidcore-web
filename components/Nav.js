"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useAuth } from "../lib/AuthContext";

export default function Nav() {
  const { user, isAdmin, loading } = useAuth() || {};
  const pathname = usePathname();

  return (
    <nav className="nav">
      <Link href="/" style={{ textDecoration: "none" }}>
        <div className="nav-brand">
          <span className="void">Void</span>Core Studios
        </div>
      </Link>
      <div className="nav-links">
        {!loading && user && (
          <Link href="/" className={`nav-link ${pathname === "/" ? "active" : ""}`}>
            Eventos
          </Link>
        )}
        {!loading && user && (
          <Link href="/ranking" className={`nav-link ${pathname === "/ranking" ? "active" : ""}`}>
            Ranking
          </Link>
        )}
        {!loading && isAdmin && (
          <Link href="/admin" className={`nav-link ${pathname === "/admin" ? "active" : ""}`}>
            Panel
          </Link>
        )}

        {!loading && user && (
          <div className="nav-account">
            {isAdmin && <span className="pill">admin</span>}
            <button className="btn-ghost btn" onClick={() => signOut(auth)}>
              Salir
            </button>
          </div>
        )}
        {!loading && !user && (
          <Link href="/login" className="nav-link">Entrar</Link>
        )}
      </div>
    </nav>
  );
}
