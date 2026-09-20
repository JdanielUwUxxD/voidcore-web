"use client";

import { useEffect, useState } from "react";

export default function Countdown({ target }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  const targetTime = new Date(target + "T00:00:00").getTime();
  if (isNaN(targetTime)) return null;

  const diff = targetTime - now;
  if (diff <= 0) return <span className="tag ok">¡Ya empezó!</span>;

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);

  let text;
  if (days > 0) text = `Faltan ${days}d ${hours}h`;
  else if (hours > 0) text = `Faltan ${hours}h ${minutes}m`;
  else text = `Faltan ${minutes}m`;

  return <span className="tag ember">⏳ {text}</span>;
}
