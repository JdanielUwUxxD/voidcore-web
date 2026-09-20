"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../lib/AuthContext";
import Loader from "../../components/Loader";

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

function EventAdminCard({ ev, copiedFor, onToggleWhitelist, onDelete, onCopyWhitelist }) {
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: ev.name,
    description: ev.description,
    date: ev.date,
    dateEnd: ev.dateEnd || "",
    capacity: ev.capacity,
  });
  const [editImageFile, setEditImageFile] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [manualNick, setManualNick] = useState("");
  const [manualDiscord, setManualDiscord] = useState("");
  const [addingManual, setAddingManual] = useState(false);

  const [showWinnerPicker, setShowWinnerPicker] = useState(false);
  const [winnerOptions, setWinnerOptions] = useState([]);
  const [selectedWinner, setSelectedWinner] = useState("");
  const [savingWinner, setSavingWinner] = useState(false);

  async function openWinnerPicker() {
    const snap = await getDocs(collection(db, "events", ev.id, "participants"));
    const list = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((p) => p.mcNick);
    setWinnerOptions(list);
    setSelectedWinner(ev.winnerUid || "");
    setShowWinnerPicker(true);
  }

  async function saveWinner() {
    setSavingWinner(true);
    const picked = winnerOptions.find((p) => p.id === selectedWinner);
    await updateDoc(doc(db, "events", ev.id), {
      winnerUid: picked ? picked.id : "",
      winnerNick: picked ? picked.mcNick : "",
    });
    setSavingWinner(false);
    setShowWinnerPicker(false);
  }

  async function saveEdit(e) {
    e.preventDefault();
    setSavingEdit(true);
    const updates = {
      name: editForm.name,
      description: editForm.description,
      date: editForm.date,
      dateEnd: editForm.dateEnd,
      capacity: Number(editForm.capacity),
    };
    if (editImageFile) {
      updates.imageUrl = await uploadToCloudinary(editImageFile);
    }
    await updateDoc(doc(db, "events", ev.id), updates);
    setSavingEdit(false);
    setEditing(false);
    setEditImageFile(null);
  }

  async function addManual(e) {
    e.preventDefault();
    if (!manualNick.trim()) return;
    setAddingManual(true);
    await addDoc(collection(db, "events", ev.id, "participants"), {
      mcNick: manualNick.trim().slice(0, 20),
      discordUsername: manualDiscord.trim(),
      manual: true,
      joinedAt: Date.now(),
    });
    await updateDoc(doc(db, "events", ev.id), { participantCount: increment(1) });
    setManualNick("");
    setManualDiscord("");
    setAddingManual(false);
  }

  if (editing) {
    return (
      <div className="card">
        <h3 style={{ marginBottom: 18 }}>Editando: {ev.name}</h3>
        <form onSubmit={saveEdit}>
          <div className="field">
            <label>Nombre</label>
            <input required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
          </div>
          <div className="field">
            <label>Descripción</label>
            <textarea rows={3} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
          </div>
          <div className="field">
            <label>Fecha de inicio</label>
            <input type="date" required value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} />
          </div>
          <div className="field">
            <label>Fecha de fin (opcional)</label>
            <input type="date" value={editForm.dateEnd} onChange={(e) => setEditForm({ ...editForm, dateEnd: e.target.value })} />
          </div>
          <div className="field">
            <label>Cupo máximo</label>
            <input type="number" min="1" required value={editForm.capacity} onChange={(e) => setEditForm({ ...editForm, capacity: e.target.value })} />
          </div>
          <div className="field">
            <label>Reemplazar imagen (opcional)</label>
            <input type="file" accept="image/*" onChange={(e) => setEditImageFile(e.target.files?.[0] || null)} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-ember" disabled={savingEdit}>
              {savingEdit ? "Guardando..." : "Guardar cambios"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h3 style={{ fontSize: 18 }}>{ev.name}</h3>
        <span className="tag">{ev.participantCount || 0}/{ev.capacity}</span>
      </div>
      {ev.winnerNick && (
        <p style={{ color: "var(--ember)", fontSize: 13, marginTop: 6 }}>🏆 Ganador: {ev.winnerNick}</p>
      )}
      <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
        <Link href={`/events/${ev.id}`} className="btn btn-ghost">Ver evento</Link>
        <button className="btn btn-ghost" onClick={() => setEditing(true)}>Editar</button>
        <button className="btn btn-ghost" onClick={() => onToggleWhitelist(ev)}>
          {ev.whitelistOpen ? "Cerrar whitelist" : "Abrir whitelist"}
        </button>
        <button className="btn btn-ember" onClick={() => onCopyWhitelist(ev)}>
          {copiedFor === ev.id ? "¡Copiada!" : "Copiar whitelist"}
        </button>
        <button className="btn btn-ghost" onClick={openWinnerPicker}>
          {ev.winnerNick ? "Cambiar ganador" : "Poner ganador"}
        </button>
        <button
          className="btn btn-ghost"
          style={{ borderColor: "#ff5a5a", color: "#ff9d9d" }}
          onClick={() => onDelete(ev)}
        >
          Borrar evento
        </button>
      </div>

      {showWinnerPicker && (
        <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="field" style={{ marginBottom: 0, flex: "1 1 200px" }}>
            <label>Elige el ganador</label>
            <select
              value={selectedWinner}
              onChange={(e) => setSelectedWinner(e.target.value)}
              style={{
                width: "100%",
                background: "var(--void-2)",
                border: "1px solid var(--border)",
                color: "var(--text-hi)",
                padding: "11px 12px",
                fontSize: 14,
              }}
            >
              <option value="">— sin ganador —</option>
              {winnerOptions.map((p) => (
                <option key={p.id} value={p.id}>{p.mcNick}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-ember" disabled={savingWinner} onClick={saveWinner}>
            {savingWinner ? "Guardando..." : "Guardar"}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setShowWinnerPicker(false)}>
            Cancelar
          </button>
        </div>
      )}

      <form onSubmit={addManual} style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div className="field" style={{ marginBottom: 0, flex: "1 1 140px" }}>
          <label>Agregar a la whitelist a mano</label>
          <input
            placeholder="Nick de Minecraft"
            value={manualNick}
            maxLength={20}
            onChange={(e) => setManualNick(e.target.value)}
          />
        </div>
        <div className="field" style={{ marginBottom: 0, flex: "1 1 140px" }}>
          <label>&nbsp;</label>
          <input
            placeholder="Discord (opcional)"
            value={manualDiscord}
            onChange={(e) => setManualDiscord(e.target.value)}
          />
        </div>
        <button className="btn btn-ghost" disabled={addingManual}>
          {addingManual ? "Agregando..." : "Agregar"}
        </button>
      </form>
    </div>
  );
}

export default function AdminPage() {
  const { user, isAdmin, loading } = useAuth() || {};
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState({ name: "", description: "", date: "", dateEnd: "", capacity: 20 });
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

  if (loading) return <Loader />;

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
      dateEnd: form.dateEnd,
      capacity: Number(form.capacity),
      participantCount: 0,
      whitelistOpen: false,
      imageUrl,
      createdBy: user.uid,
    });
    setForm({ name: "", description: "", date: "", dateEnd: "", capacity: 20 });
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
            <label>Fecha de inicio</label>
            <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div className="field">
            <label>Fecha de fin (opcional)</label>
            <input type="date" value={form.dateEnd} onChange={(e) => setForm({ ...form, dateEnd: e.target.value })} />
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
        <EventAdminCard
          key={ev.id}
          ev={ev}
          copiedFor={copiedFor}
          onToggleWhitelist={toggleWhitelist}
          onDelete={deleteEvent}
          onCopyWhitelist={copyWhitelist}
        />
      ))}
    </div>
  );
}
