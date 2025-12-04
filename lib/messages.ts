// lib/messages.ts
import { supabase } from "./supabase";

export type ConversationRow = {
  id: string;
  youth_id: string;
  worker_id: string;
  created_at: string;
  last_message: string | null;
  last_message_at: string | null;
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_by: string[] | null;
};

// Helpers
export function isValidUUID(id?: string | null): id is string {
  return !!id && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(id);
}

/**
 * Haal alle gesprekken voor gebruiker op (jongere of jongerenwerker).
 * Manager policies blokkeren toch, maar we filteren extra in UI.
 */
export async function fetchMyConversations(meId: string) {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .or(`youth_id.eq.${meId},worker_id.eq.${meId}`)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (error) throw error;
  return (data || []) as ConversationRow[];
}

/**
 * Laat deelnemers-profielen ophalen voor avatar + naam
 */
export async function fetchProfiles(ids: string[]) {
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, photo_url, role")
    .in("id", ids);

  if (error) throw error;
  return data || [];
}

/**
 * Haal messages van één gesprek
 */
export async function fetchMessages(conversationId: string, limit = 200) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data || []) as MessageRow[];
}

/**
 * Maak (of vind) gesprek tussen jongere en jongerenwerker.
 * Jij hebt 1-op-1 structuur (youth_id + worker_id).
 */
export async function ensureConversation(params: {
  youthId: string;
  workerId: string;
}) {
  const { youthId, workerId } = params;
  if (!isValidUUID(youthId) || !isValidUUID(workerId)) {
    throw new Error("Ongeldige user ids voor gesprek.");
  }

  // 1) Bestaat al?
  const { data: existing, error: exErr } = await supabase
    .from("conversations")
    .select("*")
    .eq("youth_id", youthId)
    .eq("worker_id", workerId)
    .maybeSingle();

  if (exErr) throw exErr;
  if (existing) return existing as ConversationRow;

  // 2) Maak nieuw
  const { data: created, error: crErr } = await supabase
    .from("conversations")
    .insert({
      youth_id: youthId,
      worker_id: workerId,
      last_message: null,
      last_message_at: null,
    })
    .select("*")
    .single();

  if (crErr) throw crErr;
  return created as ConversationRow;
}

/**
 * Stuur bericht
 * - insert in messages
 * - update conversations.last_message(_at)
 */
export async function sendMessage(params: {
  conversationId: string;
  senderId: string;
  body: string;
}) {
  const { conversationId, senderId, body } = params;
  const clean = body.trim();
  if (!clean) return;

  const { data: msg, error: mErr } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      body: clean,
      read_by: [senderId],
    })
    .select("*")
    .single();

  if (mErr) throw mErr;

  const nowIso = new Date().toISOString();
  await supabase
    .from("conversations")
    .update({
      last_message: clean,
      last_message_at: nowIso,
    })
    .eq("id", conversationId);

  return msg as MessageRow;
}

/**
 * Realtime subscription voor messages in 1 gesprek
 */
export function subscribeMessages(conversationId: string, onInsert: (m: MessageRow) => void) {
  return supabase
    .channel(`messages:${conversationId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
      (payload) => {
        onInsert(payload.new as MessageRow);
      }
    )
    .subscribe();
}

/**
 * Realtime subscription voor gesprekken-lijst
 */
export function subscribeConversations(meId: string, onChange: () => void) {
  return supabase
    .channel(`conversations:${meId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "conversations" },
      () => onChange()
    )
    .subscribe();
}
