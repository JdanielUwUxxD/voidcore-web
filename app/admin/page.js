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
  setDoc,
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

function isDuplicateNick(list, nick, excludeId) {
  const clean = nick.trim().toLowerCase();
  return list.some(
    (p) => p.id !== excludeId && p.mcNick && p.mcNick.trim().toLowerCase() === clean
  );
}

const selectStyle = {
  width: "100%",
  background: "var(--void-2)",
  border: "1px solid var(--border)",
  color: "var(--text-hi)",
  padding: "11px 12px",
  fontSize: 14,
};

function EventAdminCard({ ev, allEvents, ranks, copiedFor, onToggleWhitelist, onDelete, onCopyWhitelist }) {
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: ev.name,
    description: ev.description,
    date: ev.date,
    dateEnd: ev.dateEnd || "",
    capacity: ev.capacity,
    hasStatsHub: !!ev.hasStatsHub,
  });
  const [editImageFile, setEditImageFile] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [manualNick, setManualNick] = useState("");
  const [manualDiscord, setManualDiscord] = useState("");
  const [addingManual, setAddingManual] = useState(false);
  const [manualError, setManualError] = useState("");

  const [showParticipants, setShowParticipants] = useState(false);
  const [participantsList, setParticipantsList] = useState([]);
  const [playerRankMap, setPlayerRankMap] = useState({});
  const [nickDrafts, setNickDrafts] = useState({});
  const [rankDrafts, setRankDrafts] = useState({});
  const [moveTarget, setMoveTarget] = useState({});
  const [rowBusy, setRowBusy] = useState(null);

  const [showWinnerPicker, setShowWinnerPicker] = useState(false);
  const [winnerOptions, setWinnerOptions] = useState([]);
  const [selectedWinner, setSelectedWinner] = useState("");
  const [savingWinner, setSavingWinner] = useState(false);

  async function loadParticipants() {
    const snap = await getDocs(collection(db, "events", ev.id, "participants"));
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    setParticipantsList(list);
    const ranksSnap = await getDocs(collection(db, "playerRanks"));
    const map = {};
    ranksSnap.docs.forEach((d) => (map[d.id] = d.data().rankId));
    setPlayerRankMap(map);
    setShowParticipants(true);
  }

  async function saveParticipantNick(p) {
    const newNick = (nickDrafts[p.id] ?? p.mcNick ?? "").trim().slice(0, 20);
    if (!newNick) return;
    if (isDuplicateNick(participantsList, newNick, p.id)) {
      alert("Ese nick ya lo tiene otra persona en este evento.");
      return;
    }
    setRowBusy(p.id);
    await updateDoc(doc(db, "events", ev.id, "participants", p.id), { mcNick: newNick });
    setParticipantsList((cur) => cur.map((x) => (x.id === p.id ? { ...x, mcNick: newNick } : x)));
    setRowBusy(null);
  }

  async function saveParticipantRank(p) {
    const rankId = rankDrafts[p.id] ?? (playerRankMap[p.id] || "");
    setRowBusy(p.id);
    if (!rankId) {
      await deleteDoc(doc(db, "playerRanks", p.id)).catch(() => {});
    } else {
      await setDoc(doc(db, "playerRanks", p.id), { rankId });
    }
    setPlayerRankMap((cur) => ({ ...cur, [p.id]: rankId }));
    setRowBusy(null);
  }

  async function moveParticipant(p) {
    const targetId = moveTarget[p.id];
    if (!targetId) return;
    setRowBusy(p.id);
    await addDoc(collection(db, "events", targetId, "participants"), {
      mcNick: p.mcNick,
      discordUsername: p.discordUsername || "",
      manual: true,
      joinedAt: Date.now(),
    });
    await updateDoc(doc(db, "events", targetId), { participantCount: increment(1) });
    await deleteDoc(doc(db, "events", ev.id, "participants", p.id));
    await updateDoc(doc(db, "events", ev.id), { participantCount: increment(-1) });
    setParticipantsList((cur) => cur.filter((x) => x.id !== p.id));
    setRowBusy(null);
  }

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
      hasStatsHub: editForm.hasStatsHub,
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
    setManualError("");
    const cleanNick = manualNick.trim().slice(0, 20);
    if (!cleanNick) return;
    setAddingManual(true);
    const snap = await getDocs(collection(db, "events", ev.id, "participants"));
    const existing = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (isDuplicateNick(existing, cleanNick, null)) {
      setManualError("Ese nick ya está apuntado en este evento.");
      setAddingManual(false);
      return;
    }
    await addDoc(collection(db, "events", ev.id, "participants"), {
      mcNick: cleanNick,
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
          <div className="field" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              id={`stats-${ev.id}`}
              checked={editForm.hasStatsHub}
              onChange={(e) => setEditForm({ ...editForm, hasStatsHub: e.target.checked })}
              style={{ width: "auto" }}
            />
            <label htmlFor={`stats-${ev.id}`} style={{ marginBottom: 0 }}>
              Activar panel de estadísticas (kills / muertes / coras)
            </label>
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
        <button className="btn btn-ghost" onClick={() => (showParticipants ? setShowParticipants(false) : loadParticipants())}>
          {showParticipants ? "Ocultar participantes" : "Ver/editar participantes"}
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
            <select value={selectedWinner} onChange={(e) => setSelectedWinner(e.target.value)} style={selectStyle}>
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

      {showParticipants && (
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {participantsList.length === 0 && (
            <p className="hint">Todavía nadie está apuntado.</p>
          )}
          {participantsList.map((p) => (
            <div key={p.id} style={{ border: "1px solid var(--border)", padding: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div className="field" style={{ marginBottom: 0, flex: "1 1 140px" }}>
                <label>Nick {p.manual ? "(manual)" : ""}</label>
                <input
                  value={nickDrafts[p.id] ?? p.mcNick ?? ""}
                  maxLength={20}
                  onChange={(e) => setNickDrafts((cur) => ({ ...cur, [p.id]: e.target.value }))}
                />
              </div>
              <button className="btn btn-ghost" disabled={rowBusy === p.id} onClick={() => saveParticipantNick(p)}>
                Guardar nick
              </button>

              <div className="field" style={{ marginBottom: 0, flex: "1 1 140px" }}>
                <label>Rango</label>
                <select
                  value={rankDrafts[p.id] ?? (playerRankMap[p.id] || "")}
                  onChange={(e) => setRankDrafts((cur) => ({ ...cur, [p.id]: e.target.value }))}
                  style={selectStyle}
                >
                  <option value="">USER (por defecto)</option>
                  {ranks.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <button className="btn btn-ghost" disabled={rowBusy === p.id} onClick={() => saveParticipantRank(p)}>
                Asignar rango
              </button>

              {p.manual && (
                <>
                  <div className="field" style={{ marginBottom: 0, flex: "1 1 140px" }}>
                    <label>Mover a</label>
                    <select
                      value={moveTarget[p.id] || ""}
                      onChange={(e) => setMoveTarget((cur) => ({ ...cur, [p.id]: e.target.value }))}
                      style={selectStyle}
                    >
                      <option value="">— elige evento —</option>
                      {allEvents.filter((e2) => e2.id !== ev.id).map((e2) => (
                        <option key={e2.id} value={e2.id}>{e2.name}</option>
                      ))}
                    </select>
                  </div>
                  <button className="btn btn-ghost" disabled={rowBusy === p.id || !moveTarget[p.id]} onClick={() => moveParticipant(p)}>
                    Mover
                  </button>
                </>
              )}
            </div>
          ))}
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
      {manualError && <div className="error" style={{ marginTop: 10 }}>{manualError}</div>}
    </div>
  );
}

function RanksCard({ ranks }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#a64dff");
  const [saving, setSaving] = useState(false);

  async function createRank(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await addDoc(collection(db, "ranks"), { name: name.trim(), color });
    setName("");
    setSaving(false);
  }

  async function deleteRank(id) {
    if (!confirm("¿Borrar este rango? La gente que lo tenga vuelve a USER.")) return;
    await deleteDoc(doc(db, "ranks", id));
  }

  return (
    <div className="card">
      <h3 style={{ marginBottom: 18 }}>Rangos de jugadores</h3>
      <p className="hint" style={{ marginBottom: 16 }}>
        Crea rangos con su color, y asígnaselos a cada quien desde "Ver/editar participantes" en cualquier evento.
      </p>

      {ranks.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
          {ranks.map((r) => (
            <span
              key={r.id}
              className="tag"
              style={{ border: `1px solid ${r.color}`, color: r.color, display: "flex", alignItems: "center", gap: 8 }}
            >
              {r.name}
              <button
                onClick={() => deleteRank(r.id)}
                style={{ background: "none", border: "none", color: r.color, cursor: "pointer", padding: 0, fontSize: 13 }}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      <form onSubmit={createRank} style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div className="field" style={{ marginBottom: 0, flex: "1 1 160px" }}>
          <label>Nombre del rango</label>
          <input placeholder="ej. Fundador" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Color</label>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ padding: 2, height: 44, width: 60 }} />
        </div>
        <button className="btn" disabled={saving}>{saving ? "Creando..." : "Crear rango"}</button>
      </form>
    </div>
  );
}

export default function AdminPage() {
  const { user, isAdmin, loading } = useAuth() || {};
  const [events, setEvents] = useState([]);
  const [ranks, setRanks] = useState([]);
  const [form, setForm] = useState({ name: "", description: "", date: "", dateEnd: "", capacity: 20, hasStatsHub: false });
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
    const unsubRanks = onSnapshot(collection(db, "ranks"), (snap) => {
      setRanks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => {
      unsub();
      unsubRanks();
    };
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
      hasStatsHub: form.hasStatsHub,
      imageUrl,
      createdBy: user.uid,
    });
    setForm({ name: "", description: "", date: "", dateEnd: "", capacity: 20, hasStatsHub: false });
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
          <div className="field" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              id="new-stats"
              checked={form.hasStatsHub}
              onChange={(e) => setForm({ ...form, hasStatsHub: e.target.checked })}
              style={{ width: "auto" }}
            />
            <label htmlFor="new-stats" style={{ marginBottom: 0 }}>
              Activar panel de estadísticas (kills / muertes / coras)
            </label>
          </div>
          <button className="btn" disabled={busy}>{busy ? "Creando..." : "Crear evento"}</button>
        </form>
      </div>

      <RanksCard ranks={ranks} />

      <h3 style={{ margin: "32px 0 16px" }}>Tus eventos</h3>
      {events.map((ev) => (
        <EventAdminCard
          key={ev.id}
          ev={ev}
          allEvents={events}
          ranks={ranks}
          copiedFor={copiedFor}
          onToggleWhitelist={toggleWhitelist}
          onDelete={deleteEvent}
          onCopyWhitelist={copyWhitelist}
        />
      ))}
    </div>
  );
}
