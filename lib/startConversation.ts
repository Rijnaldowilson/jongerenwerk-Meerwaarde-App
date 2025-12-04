// lib/startConversation.ts
import { router } from "expo-router";
import { Alert } from "react-native";

import { useAuth } from "../auth/context";
import { supabase } from "./supabase";

export type AppRole = "jongere" | "jongerenwerker" | "manager" | "admin" | null;

type TargetUser = {
  id: string;
  display_name?: string | null;
  role?: AppRole;
};

/**
 * Hook om een DM/gesprek te starten met een andere gebruiker.
 * Zorgt dat er precies één conversation bestaat per jongere <-> jongerenwerker.
 */
export function useStartConversation() {
  const { user, profile } = useAuth() as any;

  const myRole: AppRole =
    profile?.role ?? profile?.app_role ?? profile?.role_name ?? null;

  const isYouth = myRole === "jongere";
  const isWorker = myRole === "jongerenwerker";

  async function startConversationWith(target: TargetUser) {
    if (!user?.id) {
      Alert.alert("Niet ingelogd", "Log opnieuw in om een gesprek te starten.");
      return;
    }

    if (!target?.id) {
      Alert.alert("Fout", "Geen geldig profiel gevonden om te berichten.");
      return;
    }

    // managers/admins -> geen DM
    if (!isYouth && !isWorker) {
      Alert.alert(
        "Geen toegang",
        "Alleen jongeren en jongerenwerkers kunnen privéberichten sturen."
      );
      return;
    }

    // bepaal wie de jongere en wie de jongerenwerker is
    const youthId = isYouth ? user.id : target.id;
    const workerId = isWorker ? user.id : target.id;

    if (!youthId || !workerId) {
      Alert.alert(
        "Fout",
        "Kon niet bepalen wie de jongere of jongerenwerker is in dit gesprek."
      );
      return;
    }

    try {
      // 1) check of er al een conversation bestaat
      const { data: existing, error: selErr } = await supabase
        .from("conversations")
        .select("id")
        .match({ youth_id: youthId, worker_id: workerId })
        .maybeSingle();

      if (selErr) throw selErr;

      let conversationId: string;

      if (existing?.id) {
        conversationId = existing.id;
      } else {
        // 2) zo niet: maak een nieuwe conversation aan
        const { data: inserted, error: insErr } = await supabase
          .from("conversations")
          .insert({
            youth_id: youthId,
            worker_id: workerId,
          })
          .select("id")
          .maybeSingle();

        if (insErr) throw insErr;
        if (!inserted?.id) {
          throw new Error("Kon geen nieuw gesprek aanmaken.");
        }

        conversationId = inserted.id;
      }

      const title = target.display_name || "Gesprek";

      // 3) navigeer naar het gesprek
      router.push({
        pathname: "/messages/[id]" as const,
        params: { id: conversationId, title },
      });
    } catch (e: any) {
      console.log("startConversationWith error", e);
      Alert.alert(
        "Fout",
        e?.message || "Kon geen gesprek starten met deze gebruiker."
      );
    }
  }

  return { startConversationWith };
}
