import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./context"; // jouw bestaande AuthContext

export type Profile = {
  id: string;
  display_name: string | null;
  username: string | null;
  role: string | null;
  photo_url: string | null;
  bio: string | null;
  location: string | null;
  team: string | null;
};

type ProfileCtx = {
  profile: Profile | null;
  loadingProfile: boolean;
  refreshProfile: () => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<{ error?: string }>;
};

const Ctx = createContext<ProfileCtx | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth(); // ga ik vanuit dat je dit hebt
  const userId = session?.user?.id;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(true);

  const fetchProfile = async () => {
    if (!userId) {
      setProfile(null);
      setLoadingProfile(false);
      return;
    }
    setLoadingProfile(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, username, role, photo_url, bio, location, team")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.log("fetchProfile error", error);
      setProfile(null);
    } else {
      setProfile(data ?? null);
    }
    setLoadingProfile(false);
  };

  useEffect(() => {
    fetchProfile();
    // wanneer session wisselt (login/logout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const refreshProfile = async () => {
    await fetchProfile();
  };

  const updateProfile = async (patch: Partial<Profile>) => {
    if (!userId) return { error: "No user" };

    const { data, error } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", userId)
      .select("id, display_name, username, role, photo_url, bio, location, team")
      .single();

    if (error) {
      console.log("updateProfile error", error);
      return { error: error.message };
    }
    setProfile(data);
    return {};
  };

  const value = useMemo(
    () => ({ profile, loadingProfile, refreshProfile, updateProfile }),
    [profile, loadingProfile]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProfile() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useProfile must be used inside ProfileProvider");
  return v;
}
