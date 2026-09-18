"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../lib/AuthContext";

// Cloudinary (gratis, sin tarjeta) — reemplaza estos dos valores por los tuyos
const CLOUDINARY_CLOUD_NAME = "rzk7kole";
const CLOUDINARY_UPLOAD_PRESET = "voidcore_unsigned";

async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );
  if (!res.ok) throw new Error("upload failed");
  const data = await res.json();
  return data.secure_url;
}

export default function AdminPage() {
  const { user, isAdmin, loading } = useAuth() || {};
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState({ name: "", description: "", date: "", capacity: 20 });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [copiedFor, setCopiedFor] = useState(null);

  useEffect(() => {
    if (!isAdmin) return;
    const q = query(collection(db, "events"), orderBy("date", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [isAdmin]);

  if (loading) return null;

  if (!loading && !isAdmin) {
    return (
      <div className="wrap" style={{ paddingTop: 60 }}>
        <p>No tienes acceso a esta página.</p>
      </div>
    );
  }

  async function createEvent(e) {
    e.preventDefault();
    setBusy(true);
    let imageUrl = "";
    if (imageFile) {
      imageUrl = await uploadToCloudinary(imageFile);
    }
    await addDoc(collection(db, "events"), {
      name: form.name,
      description: form.description,
      date: form.date,
      capacity: Number(form.capacity),
      participantCount: 0,
      whitelistOpen: false,
      imageUrl,
      createdBy: user.uid,
    });
    setForm({ name: "", description: "", date: "", capacity: 20 });
    setImageFile(null);
    setImagePreview(null);
    setBusy(false);
  }

  function handleImagePick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function toggleWhitelist(ev) {
    await updateDoc(doc(db, "events", ev.id), { whitelistOpen: !ev.whitelistOpen });
  }

  async function deleteEvent(ev) {
    if (!confirm(`¿Seguro que quieres borrar "${ev.name}"? Esto no se puede deshacer.`)) return;
    await deleteDoc(doc(db, "events", ev.id));
  }

  async function copyWhitelist(ev) {
    const snap = await getDocs(collection(db, "events", ev.id, "participants"));
    const nicks = snap.docs
      .map((d) => d.data().mcNick)
      .filter(Boolean);
    await navigator.clipboard.writeText(nicks.join("\n"));
    setCopiedFor(ev.id);
    setTimeout(() => setCopiedFor(null), 2000);
  }

  return (
    <div className="wrap" style={{ paddingTop: 40 }}>
      <h1 className="display" style={{ fontSize: 30, marginBottom: 24 }}>Panel de administración</h1>

      <div className="card">
        <h3 style={{ marginBottom: 18 }}>Crear evento</h3>
        <form onSubmit={createEvent}>
          <div className="field">
            <label>Nombre</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="field">
            <label>Descripción</label>
            <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="field">
            <label>Fecha</label>
            <input required placeholder="ej. 20 sept - 8pm" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div className="field">
            <label>Cupo máximo</label>
            <input type="number" min="1" required value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
          </div>
          <div className="field">
            <label>Imagen de fondo (opcional)</label>
            <input type="file" accept="image/*" onChange={handleImagePick} />
            {imagePreview && (
              <img
                src={imagePreview}
                alt="Vista previa"
                style={{ marginTop: 10, maxWidth: "100%", maxHeight: 160, border: "1px solid var(--border)" }}
              />
            )}
          </div>
          <button className="btn" disabled={busy}>{busy ? "Creando..." : "Crear evento"}</button>
        </form>
      </div>

      <h3 style={{ margin: "32px 0 16px" }}>Tus eventos</h3>
      {events.map((ev) => (
        <div key={ev.id} className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <h3 style={{ fontSize: 18 }}>{ev.name}</h3>
            <span className="tag">{ev.participantCount || 0}/{ev.capacity}</span>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            <Link href={`/events/${ev.id}`} className="btn btn-ghost">Ver evento</Link>
            <button className="btn btn-ghost" onClick={() => toggleWhitelist(ev)}>
              {ev.whitelistOpen ? "Cerrar whitelist" : "Abrir whitelist"}
            </button>
            <button className="btn btn-ember" onClick={() => copyWhitelist(ev)}>
              {copiedFor === ev.id ? "¡Copiada!" : "Copiar whitelist"}
            </button>
            <button
              className="btn btn-ghost"
              style={{ borderColor: "#ff5a5a", color: "#ff9d9d" }}
              onClick={() => deleteEvent(ev)}
            >
              Borrar evento
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
