// lib/supabase/workspace.ts (of src/lib/supabase/workspace.ts)
import { supabase } from "../../lib/supabase";


// Typing voor createCase input (optioneel maar sterk aan te raden)
export type CreateCaseInput = {
  youth_name: string;
  worker_id: string;
  pillar: string;
  location?: string | null;
  area?: string | null;
  year_label?: string | null;
  methodiek?: string | null;
  project?: string | null;
  school_or_area?: string | null;
  note?: string | null;
};

export async function getCases() {
  const { data, error } = await supabase
    .from("cases")
    .select(`
      *,
      case_contacts(*),
      case_goals(*),
      reports!reports_linked_case_id_fkey(*)
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createCase(input: CreateCaseInput) {
  const { data, error } = await supabase
    .from("cases")
    .insert(input)
    .select(`
      *,
      case_contacts(*),
      case_goals(*),
      case_comments(*),
      case_reactions(*)
    `)
    .single();

  if (error) throw error;
  return data;
}

export async function linkReportToCase(reportId: string, caseId: string) {
  const { data, error } = await supabase
    .from("reports")
    .update({ linked_case_id: caseId }) // ✅ juiste kolom
    .eq("id", reportId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
