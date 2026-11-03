"use client";

import { isFirebaseConfigured, getFirebaseAuth } from "@/lib/firebase";
import { getDemoUser, setDemoUser, type DemoUser } from "@/lib/demo-store";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type AppUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  mode: "firebase" | "demo";
};

type AuthContextValue = {
  user: AppUser | null;
  loading: boolean;
  firebaseReady: boolean;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (email: string, password: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  continueDemo: () => void;
  updateDisplayName: (name: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function toAppUser(user: User): AppUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    mode: "firebase",
  };
}

function demoToApp(user: DemoUser): AppUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    mode: "demo",
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const firebaseReady = isFirebaseConfigured();
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseReady) {
      const demo = getDemoUser();
      setUser(demo ? demoToApp(demo) : null);
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(getFirebaseAuth(), (u) => {
      setUser(u ? toAppUser(u) : null);
      setLoading(false);
    });
    return () => unsub();
  }, [firebaseReady]);

  const signInEmail = useCallback(async (email: string, password: string) => {
    if (!firebaseReady) throw new Error("Configure Firebase to use email login");
    await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  }, [firebaseReady]);

  const signUpEmail = useCallback(async (email: string, password: string) => {
    if (!firebaseReady) throw new Error("Configure Firebase to use email signup");
    await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
  }, [firebaseReady]);

  const signInGoogle = useCallback(async () => {
    if (!firebaseReady) throw new Error("Configure Firebase to use Google login");
    await signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider());
  }, [firebaseReady]);

  const continueDemo = useCallback(() => {
    const demo: DemoUser = {
      uid: "demo-user",
      email: "demo@local.dev",
      displayName: "Demo",
    };
    setDemoUser(demo);
    setUser(demoToApp(demo));
  }, []);

  const updateDisplayName = useCallback(
    async (name: string) => {
      const trimmed = name.trim() || "You";
      if (user?.mode === "demo" || !firebaseReady) {
        const demo = getDemoUser() ?? {
          uid: user?.uid ?? "demo-user",
          email: user?.email ?? "demo@local.dev",
          displayName: trimmed,
        };
        const next = { ...demo, displayName: trimmed };
        setDemoUser(next);
        setUser(demoToApp(next));
        return;
      }
      // Firebase profile update lands with Auth later; keep local name for now
      setUser((u) => (u ? { ...u, displayName: trimmed } : u));
    },
    [firebaseReady, user?.email, user?.mode, user?.uid],
  );

  const logout = useCallback(async () => {
    if (firebaseReady && user?.mode === "firebase") {
      await signOut(getFirebaseAuth());
    }
    setDemoUser(null);
    setUser(null);
  }, [firebaseReady, user?.mode]);

  const value = useMemo(
    () => ({
      user,
      loading,
      firebaseReady,
      signInEmail,
      signUpEmail,
      signInGoogle,
      continueDemo,
      updateDisplayName,
      logout,
    }),
    [
      user,
      loading,
      firebaseReady,
      signInEmail,
      signUpEmail,
      signInGoogle,
      continueDemo,
      updateDisplayName,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
