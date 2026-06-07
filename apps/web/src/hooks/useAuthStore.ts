import { useState } from "react";

interface AuthState {
  token: string | null;
  user: { id: string; email: string; fullName: string; roles: string[] } | null;
}

// Simple localStorage-backed auth store (swap for Zustand/Redux in production)
function getInitial(): AuthState {
  try {
    const raw = localStorage.getItem("auth");
    return raw ? JSON.parse(raw) : { token: null, user: null };
  } catch {
    return { token: null, user: null };
  }
}

let _state = getInitial();
const _listeners = new Set<() => void>();

function notify() {
  _listeners.forEach((fn) => fn());
}

export function useAuthStore() {
  const [, rerender] = useState(0);

  const subscribe = () => {
    const fn = () => rerender((n) => n + 1);
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  };

  // Subscribe on first call
  useState(subscribe);

  return {
    ..._state,
    login(token: string, user: AuthState["user"]) {
      _state = { token, user };
      localStorage.setItem("auth", JSON.stringify(_state));
      notify();
    },
    logout() {
      _state = { token: null, user: null };
      localStorage.removeItem("auth");
      notify();
    },
  };
}
