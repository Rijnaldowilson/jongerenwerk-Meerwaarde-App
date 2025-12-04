// auth/context.tsx
import { Session, User } from "@supabase/supabase-js";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Alert } from "react-native";
import { supabase } from "../lib/supabase";
import { AppRole } from "./roles"; // als je die file hebt (auth/roles.ts)

type Profile = {
  id: string;
  display_name: string | null;
  username: string | null;
  role: AppRole | null;
  photo_url: string | null;
  bio: string | null;
  location: string | null;
  team: string | null;
};

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  isYouth: boolean;
  isWorker: boolean;
  isManager: boolean;
  isAdmin: boolean;
  ready: boolean;
  loadingProfile: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const loadProfile = useCallback(async (userId: string) => {
    setLoadingProfile(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, display_name, username, role, photo_url, bio, location, team"
        )
        .eq("id", userId)
        .single();

      if (error) throw error;
      setProfile(data as Profile);
    } catch (e) {
      console.log("Profiel laden mislukt", e);
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  // Init: sessie ophalen bij app-start
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (!isMounted) return;

        setSession(data.session ?? null);
        setUser(data.session?.user ?? null);

        if (data.session?.user) {
          await loadProfile(data.session.user.id);
        }
      } catch (e) {
        console.log("Auth init error", e);
      } finally {
        if (isMounted) setReady(true);
      }
    };

    init();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          await loadProfile(newSession.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        if (!data.session || !data.user) {
          throw new Error("Geen actieve sessie na inloggen.");
        }

        setSession(data.session);
        setUser(data.user);
        await loadProfile(data.user.id);
        setReady(true);
      } catch (e: any) {
        console.log("SignIn error", e);
        throw e; // login-scherm toont de fout
      }
    },
    [loadProfile]
  );

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setSession(null);
      setUser(null);
      setProfile(null);
      setReady(true);
    } catch (e: any) {
      console.log("SignOut error", e);
      Alert.alert("Uitloggen mislukt", "Probeer het later opnieuw.");
    }
  }, []);

  const role = profile?.role ?? null;
  const isYouth = role === "jongere";
  const isWorker = role === "jongerenwerker"
  const isManager = role === "manager";
  const isAdmin = role === "admin";

  const value: AuthContextValue = {
    user,
    session,
    profile,
    role,
    isYouth,
    isWorker,
    isManager,
    isAdmin,
    ready,
    loadingProfile,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth moet binnen een AuthProvider gebruikt worden");
  }
  return ctx;
}
