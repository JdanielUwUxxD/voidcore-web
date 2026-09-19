"use client";

import Nav from "./Nav";
import DiscordGate from "./DiscordGate";
import Loader from "./Loader";
import { useAuth } from "../lib/AuthContext";

export default function AppShell({ children }) {
  const { loading } = useAuth() || {};

  if (loading) {
    return (
      <>
        <Nav />
        <Loader />
      </>
    );
  }

  return (
    <>
      <Nav />
      <DiscordGate>{children}</DiscordGate>
    </>
  );
}
