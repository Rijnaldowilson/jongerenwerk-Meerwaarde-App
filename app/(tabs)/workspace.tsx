// app/(tabs)/workspace.tsx
import { Feather } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ImageBackground,
  Linking,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../../auth/context";
import { supabase } from "../../lib/supabase";

const { width: W, height: H } = Dimensions.get("window");

/* -----------------------------
   MeerWaarde huisstijl (licht)
------------------------------ */
const MW = {
  bg: "#FFFFFF",
  surface: "#FFFFFF",
  soft: "#F6FBF2",
  border: "rgba(0,0,0,0.06)",
  text: "#0A0A0A",
  sub: "#5A6572",
  subtle: "#94A3B8",
  green: "#65B10A",
  blue: "#4C80C1",
  amber: "#F59E0B",
  red: "#EF4444",
};

type PillarKey =
  | "Weerbaarheid"
  | "Talentontwikkeling"
  | "Verbinding"
  | "Burgerschap"
  | "Zorg & Veiligheid"
  | "Werk & Inkomen";

const PILLAR_COLORS: Record<PillarKey, string> = {
  Weerbaarheid: "#16A34A",
  Talentontwikkeling: MW.blue,
  Verbinding: "#0EA5E9",
  Burgerschap: "#6366F1",
  "Zorg & Veiligheid": MW.amber,
  "Werk & Inkomen": "#F97316",
};

const SCHOOLS = [
  "HVC",
  "KSH",
  "Hoofddorp College",
  "Avantis College",
  "ISK Haarlemmermeer",
  "Haarlemmermeer Lyceum",
  "Haarlemmermeer Lyceum Dalton",
  "Kaj Munk College",
];

const AMBULANT_AREAS = [
  "Hoofddorp-Centrum",
  "Hoofddorp-Floriande",
  "Hoofddorp-Overbos",
  "Hoofddorp-Toolenburg",
  "Nieuw-Vennep",
  "Zwanenburg",
  "Badhoevedorp",
];

const METHODIEKEN = [
  "Min-Plus",
  "Straathoekwerk",
  "Presentiebenadering",
  "Motiverende gespreksvoering",
  "Positieve gezondheid",
  "Groepswerk",
  "Talentontwikkeling",
  "JWM",
  "Jongerenparticipatie",
  "Oplossingsgericht werken",
  "Herstelgericht werken",
];

// ✅ "Geen project" toegevoegd voor forms
const PROJECTEN = [
  "Geen project",
  "MENES",
  "Back to the Basic",
  "Friends Online",
  "Overig project",
];

/* -----------------------------
   Types volgens jouw schema
------------------------------ */
type CaseContact = {
  id: string;
  case_id: string;
  name: string;
  role?: string | null;
  relation?: string | null;
  organisation?: string | null;
  phone?: string | null;
  email?: string | null;
};

type CaseGoalStatus = "open" | "behaald" | "in_behandeling";

type CaseGoal = {
  id: string;
  case_id: string;
  title: string;
  date_label?: string | null; // start / afspraak datum
  duration_label?: string | null; // looptijd (tekst)
  status?: string | null;
  pillar?: string | null;
};

type CaseCommentRow = {
  id: string;
  case_id: string;
  user_id: string;
  text: string;
  created_at: string;
};

type CaseReactionRow = {
  id: string;
  case_id: string;
  user_id: string;
  created_at: string;
};

type CaseSaveRow = {
  id: string;
  case_id: string;
  user_id: string;
  created_at: string;
};

type CaseRow = {
  id: string;
  youth_name: string;
  worker_id: string;
  pillar: PillarKey;
  location: string | null;
  area: string | null;
  year_label: string | null;
  methodiek: string | null;
  project: string | null;
  school_or_area: string | null;
  note: string | null;
  created_at: string;

  // ✅ extra velden
  involved?: string | null;
  start_date?: string | null;
  end_date?: string | null;

  status?: "open" | "closed" | null;
  closed_at?: string | null;
  closed_by?: string | null;

  case_contacts?: CaseContact[] | null;
  case_goals?: CaseGoal[] | null;
  case_comments?: CaseCommentRow[] | null;
  case_reactions?: CaseReactionRow[] | null;
  case_saves?: CaseSaveRow[] | null;
};

type PublicUserRow = {
  id: string;
  display_name: string | null;
  photo_url: string | null;
  role: string | null;
};

type CaseItem = {
  id: string;
  youthName: string;
  workerName: string;
  workerRole: string;
  workerAvatar: string;
  pillar: PillarKey;
  location: string;
  area: string;
  yearLabel: string;
  methodiek: string;
  project: string;
  schoolOrArea: string;
  note: string;
  reactionsCount: number;
  commentsCount: number;
  savesCount: number;
  liked?: boolean;
  saved?: boolean;
  messages: { from: string; text: string }[];

  status?: "open" | "closed";
  closedAt?: string | null;

  involved?: string;
  startDate?: string | null;
  endDate?: string | null;

  contacts?: {
    id: string;
    name: string;
    role: string;
    relation: string;
    organisation?: string;
    phone?: string;
    email?: string;
  }[];
  goals?: {
    id: string;
    title: string;
    dateLabel: string;
    durationLabel: string;
    status: CaseGoalStatus;
    pillar?: PillarKey;
  }[];
};

type ReportRow = {
  id: string;
  title: string;
  worker_id: string;
  location: string | null;
  pillar: PillarKey;
  youth_count: number | null;
  note: string | null;
  area: string | null;
  project: string | null;
  methodiek: string | null;
  linked_case_id: string | null;
  created_at: string;
};

type ReportItem = {
  id: string;
  title: string;
  workerName: string;
  workerRole: string;
  workerAvatar: string;
  location: string;
  pillar: PillarKey;
  youthCount: number;
  note: string;
  area: string;
  project: string;
  methodiek: string;
  reactionsCount: number;
  commentsCount: number;
  createdAt: string;
  linkedCaseId?: string;
};

type AgendaItemType = "Casus" | "Rapportage" | "Overleg" | "Overig";

type AgendaRow = {
  id: string;
  worker_id: string | null;
  type: AgendaItemType;
  case_id: string | null;
  report_id: string | null;
  title: string | null;
  subtitle: string | null;
  location: string | null;
  time: string | null;
};

type AgendaItem = {
  id: string;
  time: string;
  title: string;
  subtitle: string;
  location: string;
  type: AgendaItemType;
  pillar?: PillarKey;
  relatedCaseId?: string;
  relatedReportId?: string;
};
/* -----------------------------
   Helpers
------------------------------ */
const toDateLabelNL = (iso: string | null | undefined) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("nl-NL", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
};

function mapCaseRowToItem(
  row: CaseRow,
  usersById: Record<string, PublicUserRow | undefined>,
  myUid?: string | null
): CaseItem {
  const user = usersById[row.worker_id];
  const comments = row.case_comments ?? [];
  const reactions = row.case_reactions ?? [];
  const contacts = row.case_contacts ?? [];
  const goals = row.case_goals ?? [];
  const saves = row.case_saves ?? [];

  const lastMessages = comments.slice(0, 2).map((c) => ({
    from: "Reactie",
    text: c.text,
  }));
  const savedByMe = myUid ? saves.some((s) => s.user_id === myUid) : false;

  return {
    id: row.id,
    youthName: row.youth_name,
    workerName: user?.display_name || "Jongerenwerker",
    workerRole: user?.role || "jongerenwerker",
    workerAvatar:
      user?.photo_url ||
      "https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=800",
    pillar: row.pillar,
    location: row.location || row.school_or_area || "Onbekende locatie",
    area: row.area || "",
    yearLabel: row.year_label || toDateLabelNL(row.created_at),
    methodiek: row.methodiek || "",
    project: row.project || "",
    schoolOrArea: row.school_or_area || "",
    note: row.note || "",
    reactionsCount: reactions.length,
    commentsCount: comments.length,
    savesCount: saves.length,
    liked: myUid ? reactions.some((r) => r.user_id === myUid) : false,
    saved: savedByMe,
    messages: lastMessages,

    status: (row.status as any) || "open",
    closedAt: row.closed_at || null,

    involved: row.involved || "",
    startDate: row.start_date || null,
    endDate: row.end_date || null,

    contacts: contacts.map((c) => ({
      id: c.id,
      name: c.name,
      role: c.role || "",
      relation: c.relation || "",
      organisation: c.organisation || undefined,
      phone: c.phone || undefined,
      email: c.email || undefined,
    })),
    goals: goals.map((g) => ({
      id: g.id,
      title: g.title,
      dateLabel: g.date_label || "",
      durationLabel: g.duration_label || "",
      status: (g.status as CaseGoalStatus) || "open",
      pillar: (g.pillar as PillarKey) || undefined,
    })),
  };
}

function mapReportRowToItem(
  row: ReportRow,
  usersById: Record<string, PublicUserRow | undefined>
): ReportItem {
  const user = usersById[row.worker_id];

  return {
    id: row.id,
    title: row.title,
    workerName: user?.display_name || "Jongerenwerker",
    workerRole: user?.role || "jongerenwerker",
    workerAvatar:
      user?.photo_url ||
      "https://images.pexels.com/photos/1704488/pexels-photo-1704488.jpeg?auto=compress&cs=tinysrgb&w=800",
    location: row.location || "Onbekende locatie",
    pillar: row.pillar,
    youthCount: row.youth_count || 0,
    note: row.note || "",
    area: row.area || "",
    project: row.project || "",
    methodiek: row.methodiek || "",
    reactionsCount: 0,
    commentsCount: 0,
    createdAt: toDateLabelNL(row.created_at),
    linkedCaseId: row.linked_case_id || undefined,
  };
}
/* -----------------------------
   Analyse helpers: Min-Plus / pijlers / gebieden
------------------------------ */

type MinPlusAgg = { plus: number; min: number; balance: number };

type PillarAgg = Record<
  PillarKey,
  {
    plus: number;
    min: number;
  }
>;

type AreaAggItem = {
  key: string;
  label: string;
  plus: number;
  min: number;
};
/* -----------------------------
   Header
------------------------------ */
function WorkspaceHeader({
  title,
  onPressSearch,
  onPressBell,
}: {
  title: string;
  onPressSearch: () => void;
  onPressBell: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
      <Text style={styles.headerTitle}>{title}</Text>

      <View style={styles.headerRight}>
        <TouchableOpacity onPress={onPressSearch} hitSlop={10} activeOpacity={0.9}>
          <Feather name="search" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onPressBell} hitSlop={10} activeOpacity={0.9}>
          <Feather name="bell" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* -----------------------------
   Filter chips
------------------------------ */
const FILTER_CHIPS = [
  { id: "all", label: "Alle" },
  { id: "schools", label: "Scholen" },
  { id: "ambulant", label: "Ambulant" },
];

function FilterRow({
  activeFilter,
  setActiveFilter,
}: {
  activeFilter: string;
  setActiveFilter: (id: string) => void;
}) {
  return (
    <View style={styles.filterRow}>
      {FILTER_CHIPS.map((chip) => {
        const active = chip.id === activeFilter;
        return (
          <TouchableOpacity
            key={chip.id}
            onPress={() => setActiveFilter(chip.id)}
            style={[styles.filterChip, active && styles.filterChipActive]}
            activeOpacity={0.9}
          >
            <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
              {chip.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/* -----------------------------
   Casus status chips
------------------------------ */
const CASE_STATUS_FILTERS = [
  { id: "all", label: "Alles" },
  { id: "open", label: "Open" },
  { id: "closed", label: "Afgesloten" },
];

function CaseStatusRow({
  active,
  setActive,
}: {
  active: "all" | "open" | "closed";
  setActive: (id: "all" | "open" | "closed") => void;
}) {
  return (
    <View style={styles.statusRow}>
      {CASE_STATUS_FILTERS.map((chip) => {
        const isActive = chip.id === active;
        return (
          <TouchableOpacity
            key={chip.id}
            onPress={() => setActive(chip.id as any)}
            style={[styles.statusChip, isActive && styles.statusChipActive]}
            activeOpacity={0.9}
          >
            <Text style={[styles.statusChipText, isActive && styles.statusChipTextActive]}>
              {chip.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/* -----------------------------
   Location mini-chips
------------------------------ */
function LocationMiniRow({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (value: string | null) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.locationMiniScroll}
    >
      <TouchableOpacity
        onPress={() => onSelect(null)}
        style={[styles.locationMiniChip, !selected && styles.locationMiniChipActive]}
        activeOpacity={0.9}
      >
        <Text style={[styles.locationMiniText, !selected && styles.locationMiniTextActive]}>
          Alle locaties
        </Text>
      </TouchableOpacity>

      {SCHOOLS.map((s) => (
        <TouchableOpacity
          key={s}
          onPress={() => onSelect(selected === s ? null : s)}
          style={[
            styles.locationMiniChip,
            selected === s && styles.locationMiniChipActive,
          ]}
          activeOpacity={0.9}
        >
          <Text
            style={[
              styles.locationMiniText,
              selected === s && styles.locationMiniTextActive,
            ]}
          >
            {s}
          </Text>
        </TouchableOpacity>
      ))}

      {AMBULANT_AREAS.map((a) => (
        <TouchableOpacity
          key={a}
          onPress={() => onSelect(selected === a ? null : a)}
          style={[
            styles.locationMiniChip,
            selected === a && styles.locationMiniChipActive,
          ]}
          activeOpacity={0.9}
        >
          <Text
            style={[
              styles.locationMiniText,
              selected === a && styles.locationMiniTextActive,
            ]}
          >
            {a}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
/* -----------------------------
   KPI
------------------------------ */
function KpiRow({ cases, reports }: { cases: CaseItem[]; reports: ReportItem[] }) {
  const openCases = cases.filter((c) => c.status === "open").length;
  const closedCases = cases.filter((c) => c.status === "closed").length;
  const yearTotal = closedCases;

  return (
    <View style={styles.kpiRow}>
      <View style={styles.kpiItem}>
        <Text style={styles.kpiValue}>{yearTotal}</Text>
        <Text style={styles.kpiLabel}>Casussen afgesloten</Text>
        <View style={styles.kpiBarTrack}>
          <View
            style={[
              styles.kpiBarFill,
              { width: cases.length ? `${(closedCases / cases.length) * 100}%` : "0%" },
            ]}
          />
        </View>
      </View>
      <View style={styles.kpiItem}>
        <Text style={styles.kpiValue}>{openCases}</Text>
        <Text style={styles.kpiLabel}>Casussen open</Text>
        <View style={styles.kpiBarTrack}>
          <View
            style={[
              styles.kpiBarFill,
              { width: cases.length ? `${(openCases / cases.length) * 100}%` : "0%" },
            ]}
          />
        </View>
      </View>
      <View style={styles.kpiItem}>
        <Text style={styles.kpiValue}>{reports.length}</Text>
        <Text style={styles.kpiLabel}>Rapportages</Text>
        <View style={styles.kpiBarTrack}>
          <View style={[styles.kpiBarFill, { width: "62%" }]} />
        </View>
      </View>
    </View>
  );
}

/* -----------------------------
   Pillar chip
------------------------------ */
function PillarChip({ pillar }: { pillar: PillarKey }) {
  const color = PILLAR_COLORS[pillar];
  return (
    <View
      style={[
        styles.pillarChip,
        { backgroundColor: `${color}12`, borderColor: `${color}55` },
      ]}
    >
      <Text style={[styles.pillarChipText, { color }]} numberOfLines={1}>
        {pillar}
      </Text>
    </View>
  );
}

/* -----------------------------
   Agenda Section
------------------------------ */
const AGENDA_FILTERS = [
  { id: "all", label: "Alles" },
  { id: "casus", label: "Casussen" },
  { id: "rapportages", label: "Rapportages" },
  { id: "overig", label: "Overig" },
];

function AgendaSection({
  items,
  activeFilter,
  setActiveFilter,
  onPressItem,
}: {
  items: AgendaItem[];
  activeFilter: "all" | "casus" | "rapportages" | "overig";
  setActiveFilter: (v: "all" | "casus" | "rapportages" | "overig") => void;
  onPressItem: (item: AgendaItem) => void;
}) {
  return (
    <View style={styles.agendaCard}>
      <View style={styles.agendaHeaderRow}>
        <View>
          <Text style={styles.agendaTitle}>Jouw agenda</Text>
          <Text style={styles.agendaSubtitle}>Vandaag</Text>
        </View>
        <View style={styles.agendaLegend}>
          <View style={styles.agendaLegendDot} />
          <Text style={styles.agendaLegendText}>Belangrijk</Text>
        </View>
      </View>

      <View style={styles.agendaFilterRow}>
        {AGENDA_FILTERS.map((f) => {
          const active = activeFilter === f.id;
          return (
            <TouchableOpacity
              key={f.id}
              onPress={() => setActiveFilter(f.id as any)}
              style={[
                styles.agendaFilterChip,
                active && styles.agendaFilterChipActive,
              ]}
              activeOpacity={0.9}
            >
              <Text
                style={[
                  styles.agendaFilterText,
                  active && styles.agendaFilterTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {items.length === 0 ? (
        <Text style={styles.agendaEmptyText}>
          Geen activiteiten voor deze filter.
        </Text>
      ) : (
        <View style={{ marginTop: 8 }}>
          {items.map((it) => {
            let badgeColor = MW.subtle;
            if (it.pillar) badgeColor = PILLAR_COLORS[it.pillar];
            return (
              <TouchableOpacity
                key={it.id}
                onPress={() => onPressItem(it)}
                style={styles.agendaItemRow}
                activeOpacity={0.85}
              >
                <View style={styles.agendaTimeCol}>
                  <Text style={styles.agendaTimeText}>{it.time}</Text>
                  <View style={styles.agendaTimeDotLineWrapper}>
                    <View
                      style={[
                        styles.agendaTimeDot,
                        { backgroundColor: badgeColor },
                      ]}
                    />
                    <View style={styles.agendaTimeLine} />
                  </View>
                </View>

                <View style={styles.agendaContentCol}>
                  <View style={styles.agendaItemHeaderRow}>
                    <Text style={styles.agendaItemTitle} numberOfLines={1}>
                      {it.title}
                    </Text>
                    <View
                      style={[
                        styles.agendaTypePill,
                        it.type === "Casus" && { backgroundColor: "#ECFDF3" },
                        it.type === "Rapportage" && { backgroundColor: "#EFF6FF" },
                        it.type === "Overleg" && { backgroundColor: "#FEF9C3" },
                        it.type === "Overig" && { backgroundColor: "#F9FAFB" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.agendaTypeText,
                          it.type === "Casus" && { color: "#15803D" },
                          it.type === "Rapportage" && { color: MW.blue },
                          it.type === "Overleg" && { color: "#854D0E" },
                        ]}
                      >
                        {it.type}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.agendaItemSubtitle} numberOfLines={1}>
                    {it.subtitle}
                  </Text>
                  <Text style={styles.agendaItemLocation} numberOfLines={1}>
                    <Feather name="map-pin" size={11} color={MW.subtle} />{" "}
                    {it.location}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

function AnalyseSubPage({ cases, reports }: { cases: CaseItem[]; reports: ReportItem[] }) {
  const { plus, min, balance } = buildMinPlusFromItems(cases, reports);
  const pillarAgg = buildPillarAggFromItems(cases, reports);
  const areas = buildAreaAggFromItems(cases, reports).slice(0, 5);
  const totalCases = cases.length;
  const openCases = cases.filter((c) => c.status === "open").length;
  const closedCases = cases.filter((c) => c.status === "closed").length;
  const totalReports = reports.length;
  const totalYouth = reports.reduce((sum, r) => sum + (r.youthCount || 0), 0);

  const totalMinPlus = plus + min || 1;
  const plusPct = Math.round((plus / totalMinPlus) * 100);
  const minPct = 100 - plusPct;

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 24 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Min-Plus blok */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>Min-Plus analyse</Text>
          <Text style={styles.cardSubtitle}>Pilot – snelle balans</Text>
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
          <View style={styles.smallStat}>
            <Text style={styles.smallStatValue}>{plus}</Text>
            <Text style={styles.smallStatLabel}>Plus (rapportages)</Text>
          </View>
          <View style={styles.smallStat}>
            <Text style={styles.smallStatValue}>{min}</Text>
            <Text style={styles.smallStatLabel}>Min (open casussen)</Text>
          </View>
          <View style={styles.smallStat}>
            <Text style={styles.smallStatValue}>
              {balance >= 0 ? `+${balance}` : balance}
            </Text>
            <Text style={styles.smallStatLabel}>Balans</Text>
          </View>
        </View>

        <View style={{ marginTop: 12 }}>
          <View style={styles.minPlusBarTrack}>
            <View style={[styles.minPlusBarFillPlus, { flex: plusPct || 1 }]} />
            <View style={[styles.minPlusBarFillMin, { flex: minPct || 1 }]} />
          </View>
          <View style={styles.minPlusLegendRow}>
            <Text style={styles.legendText}>Plus {plusPct}%</Text>
            <Text style={styles.legendText}>Min {minPct}%</Text>
          </View>
        </View>
      </View>

      {/* Pijlers */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>Pijlers / leefgebieden</Text>
        </View>
        <Text style={styles.cardSubtitle}>
          Waar zit nu het meeste werk? (pilot-balkjes)
        </Text>

        {(Object.keys(pillarAgg) as PillarKey[]).map((pillar) => {
          const { plus: p, min: m } = pillarAgg[pillar];
          if (!p && !m) return null;
          const total = p + m || 1;
          const pPct = (p / total) * 100;
          const mPct = 100 - pPct;
          return (
            <View key={pillar} style={{ marginTop: 8 }}>
              <Text style={styles.pillarName}>{pillar}</Text>
              <View style={styles.pillarBarTrack}>
                <View
                  style={[
                    styles.pillarBarPlus,
                    { flex: pPct || 1, backgroundColor: PILLAR_COLORS[pillar] },
                  ]}
                />
                <View
                  style={[
                    styles.pillarBarMin,
                    { flex: mPct || 1 },
                  ]}
                />
              </View>
              <Text style={styles.pillarValue}>
                +{p} / -{m}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Gebieden */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>Gebiedsanalyse</Text>
        </View>
        <Text style={styles.cardSubtitle}>
          Top gebieden met plus/min-signalen.
        </Text>

        {areas.length === 0 ? (
          <Text style={styles.emptyText}>
            Nog geen data om gebieden te tonen.
          </Text>
        ) : (
          areas.map((a) => {
            const bal = a.plus - a.min;
            return (
              <View key={a.key} style={styles.areaRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.areaLabel}>{a.label}</Text>
                  <Text style={styles.areaSub}>
                    +{a.plus} rapportages • -{a.min} open casussen
                  </Text>
                </View>
                <Text style={styles.smallStatValue}>
                  {bal >= 0 ? `+${bal}` : bal}
                </Text>
              </View>
            );
          })
        )}
      </View>

      {/* KPI blok */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>Kerncijfers jongerenwerk</Text>
        </View>
        <View style={styles.kpiGrid}>
          <View style={styles.smallStat}>
            <Text style={styles.smallStatValue}>{totalCases}</Text>
            <Text style={styles.smallStatLabel}>Casussen totaal</Text>
          </View>
          <View style={styles.smallStat}>
            <Text style={styles.smallStatValue}>{openCases}</Text>
            <Text style={styles.smallStatLabel}>Open casussen</Text>
          </View>
          <View style={styles.smallStat}>
            <Text style={styles.smallStatValue}>{closedCases}</Text>
            <Text style={styles.smallStatLabel}>Afgesloten casussen</Text>
          </View>
          <View style={styles.smallStat}>
            <Text style={styles.smallStatValue}>{totalReports}</Text>
            <Text style={styles.smallStatLabel}>Rapportages</Text>
          </View>
          <View style={styles.smallStat}>
            <Text style={styles.smallStatValue}>{totalYouth}</Text>
            <Text style={styles.smallStatLabel}>Jongeren (rapports)</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

/* -----------------------------
   Cards
------------------------------ */
function CaseCard({
  item,
  onOpenDetail,
  onToggleLike,
  onToggleSave,
  onAddComment,
}: any) {
  const isClosed = item.status === "closed";

  return (
    <TouchableOpacity
      onPress={() => onOpenDetail(item)}
      activeOpacity={0.9}
      style={styles.feedCardWrapper}
    >
      <ImageBackground
        source={{ uri: item.workerAvatar }}
        style={styles.feedCardBg}
        imageStyle={{ borderRadius: 24 }}
      >
        <View style={styles.feedOverlay} />

        {isClosed && (
          <View style={styles.closedBadge}>
            <Text style={styles.closedBadgeTxt}>Afgesloten</Text>
          </View>
        )}

        <View style={styles.feedTopRow}>
          <View style={styles.feedWorkerRow}>
            <Image source={{ uri: item.workerAvatar }} style={styles.workerAvatar} />
            <View>
              <Text style={styles.workerName}>{item.workerName}</Text>
              <Text style={styles.workerRole}>{item.workerRole}</Text>
            </View>
          </View>
          <Text style={styles.yearLabel}>{item.yearLabel}</Text>
        </View>

        <View style={{ marginTop: 16, width: "75%", paddingHorizontal: 16 }}>
          <Text style={styles.youthName}>{item.youthName}</Text>
          <View style={{ marginTop: 8 }}>
            <PillarChip pillar={item.pillar} />
          </View>
          <Text style={styles.locationText}>{item.location}</Text>
        </View>

        <View style={styles.feedBottomRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.reactionsLine}>💚 {item.reactionsCount} reacties</Text>
            {(item.messages ?? []).map((m: any, i: number) => (
              <Text key={i} style={styles.messageLine} numberOfLines={1}>
                {m.text}
              </Text>
            ))}
          </View>

          <View style={styles.actionBar}>
            <TouchableOpacity onPress={() => onToggleLike(item.id)} style={styles.actionBtn}>
              <Feather name="heart" size={20} color={item.liked ? "#F97373" : "#FFFFFF"} />
              <Text style={styles.actionCount}>{item.reactionsCount}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => onAddComment(item.id)} style={styles.actionBtn}>
              <Feather name="message-circle" size={20} color="#FFFFFF" />
              <Text style={styles.actionCount}>{item.commentsCount}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => onToggleSave(item.id)} style={styles.actionBtn}>
              <Feather name="bookmark" size={20} color={item.saved ? "#FACC15" : "#FFFFFF"} />
              <Text style={styles.actionCount}>{item.savesCount}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
}

function ReportCard({ item, onLike, onComment, onOpen }: any) {
  return (
    <TouchableOpacity onPress={onOpen} activeOpacity={0.9} style={styles.feedCardWrapper}>
      <View style={styles.reportCard}>
        <View style={styles.feedTopRow}>
          <View style={styles.feedWorkerRow}>
            <Image source={{ uri: item.workerAvatar }} style={styles.workerAvatar} />
            <View>
              <Text style={[styles.workerName, { color: MW.text }]}>{item.workerName}</Text>
              <Text style={[styles.workerRole, { color: MW.subtle }]}>
                {item.workerRole || "Jongerenwerker"}
              </Text>
            </View>
          </View>
          <Text style={styles.reportPill}>{item.youthCount} jongeren</Text>
        </View>

        <View style={{ paddingHorizontal: 4, marginTop: 4 }}>
          <Text style={[styles.youthName, { fontSize: 18, color: MW.text }]}>{item.title}</Text>
          <Text style={[styles.locationText, { color: MW.sub }]}>{item.location}</Text>

          <View style={{ marginTop: 8 }}>
            <PillarChip pillar={item.pillar} />
          </View>

          <Text
            style={[styles.messageLine, { marginTop: 10, color: MW.sub, fontSize: 13 }]}
            numberOfLines={3}
          >
            {item.note}
          </Text>
        </View>

        <View style={styles.reportBottomRow}>
          <Text style={[styles.reactionsLine, { color: MW.subtle }]}>
            {item.area} • {item.reactionsCount} reacties
          </Text>
          <View style={{ flexDirection: "row", gap: 16 }}>
            <TouchableOpacity onPress={onLike}>
              <Feather name="heart" size={18} color={MW.blue} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onComment}>
              <Feather name="message-circle" size={18} color={MW.blue} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

/* -----------------------------
   Chip Selector
------------------------------ */
function ChipSelector({
  options,
  value,
  onChange,
}: {
  options: string[] | any[];
  value: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.chipSelectorRow}>
      {options.map((opt) => {
        const key = String(opt);
        const active = value === opt;
        return (
          <TouchableOpacity
            key={key}
            onPress={() => onChange(opt)}
            style={[styles.formChip, active && styles.formChipActive]}
            activeOpacity={0.9}
          >
            <Text style={[styles.formChipText, active && styles.formChipTextActive]}>
              {opt}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/* -----------------------------
   Case Form Modal
------------------------------ */
function CaseFormModal(props: any) {
  const {
    visible,
    onClose,
    onSave,
    formYouthName,
    setFormYouthName,
    formSchool,
    setFormSchool,
    formArea,
    setFormArea,
    formPillar,
    setFormPillar,
    formMethodiek,
    setFormMethodiek,
    formProject,
    setFormProject,
    formNote,
    setFormNote,
    formInvolved,
    setFormInvolved,
    formStartDate,
    setFormStartDate,
    formEndDate,
    setFormEndDate,
  } = props;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.formContainer}>
        <View style={styles.formHeader}>
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
            <Feather name="x" size={22} color={MW.sub} />
          </TouchableOpacity>
          <Text style={styles.formTitle}>Nieuwe casus</Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }}>
          <Text style={styles.formLabel}>Naam jongere</Text>
          <TextInput
            value={formYouthName}
            onChangeText={setFormYouthName}
            placeholder="Bijv. Ahmed A."
            style={styles.input}
          />

          <Text style={styles.formLabel}>School</Text>
          <ChipSelector
            options={SCHOOLS}
            value={formSchool}
            onChange={(v: string) => {
              setFormSchool(v);
              setFormArea(null);
            }}
          />

          <Text style={styles.formLabel}>Ambulant gebied</Text>
          <ChipSelector
            options={AMBULANT_AREAS}
            value={formArea}
            onChange={(v: string) => {
              setFormArea(v);
              setFormSchool(null);
            }}
          />

          <Text style={styles.formLabel}>Pijler</Text>
          <ChipSelector
            options={Object.keys(PILLAR_COLORS)}
            value={formPillar}
            onChange={setFormPillar}
          />

          <Text style={styles.formLabel}>Methodiek</Text>
          <ChipSelector
            options={METHODIEKEN}
            value={formMethodiek}
            onChange={setFormMethodiek}
          />

          <Text style={styles.formLabel}>Project</Text>
          <ChipSelector
            options={PROJECTEN}
            value={formProject}
            onChange={setFormProject}
          />

          <Text style={styles.formLabel}>Toelichting</Text>
          <TextInput
            value={formNote}
            onChangeText={setFormNote}
            placeholder="Korte toelichting..."
            style={[styles.input, styles.textArea]}
            multiline
          />

          <Text style={styles.formLabel}>Betrokkenen (kort)</Text>
          <TextInput
            value={formInvolved}
            onChangeText={setFormInvolved}
            placeholder="Bijv. ouders, mentor, wijkagent..."
            style={[styles.input, styles.textArea]}
            multiline
          />

          <Text style={styles.formLabel}>Startdatum</Text>
          <TextInput
            value={formStartDate}
            onChangeText={setFormStartDate}
            placeholder="JJJJ-MM-DD"
            style={styles.input}
          />

          <Text style={styles.formLabel}>Einddatum</Text>
          <TextInput
            value={formEndDate}
            onChangeText={setFormEndDate}
            placeholder="JJJJ-MM-DD"
            style={styles.input}
          />

          <TouchableOpacity onPress={onSave} style={styles.formPrimaryBtn}>
            <Feather name="save" size={18} color="#FFFFFF" />
            <Text style={styles.formPrimaryTxt}>Casus opslaan</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}
/* -----------------------------
   Report Form Modal
------------------------------ */
function ReportFormModal(props: any) {
  const {
    visible,
    onClose,
    onSave,
    formRepTitle,
    setFormRepTitle,
    formRepLocation,
    setFormRepLocation,
    formRepPillar,
    setFormRepPillar,
    formRepYouthCount,
    setFormRepYouthCount,
    formRepArea,
    setFormRepArea,
    formRepMethodiek,
    setFormRepMethodiek,
    formRepProject,
    setFormRepProject,
    formRepNote,
    setFormRepNote,
  } = props;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.formContainer}>
        <View style={styles.formHeader}>
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
            <Feather name="x" size={22} color={MW.sub} />
          </TouchableOpacity>
          <Text style={styles.formTitle}>Nieuwe rapportage</Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }}>
          <Text style={styles.formLabel}>Titel</Text>
          <TextInput
            value={formRepTitle}
            onChangeText={setFormRepTitle}
            placeholder="Bijv. Groepswerk Floriande"
            style={styles.input}
          />

          <Text style={styles.formLabel}>Locatie</Text>
          <TextInput
            value={formRepLocation}
            onChangeText={setFormRepLocation}
            placeholder="Bijv. HVC / Floriande"
            style={styles.input}
          />

          <Text style={styles.formLabel}>Pijler</Text>
          <ChipSelector
            options={Object.keys(PILLAR_COLORS)}
            value={formRepPillar}
            onChange={setFormRepPillar}
          />

          <Text style={styles.formLabel}>Aantal jongeren</Text>
          <TextInput
            value={formRepYouthCount}
            onChangeText={setFormRepYouthCount}
            keyboardType="number-pad"
            placeholder="0"
            style={styles.input}
          />

          <Text style={styles.formLabel}>Gebied / school</Text>
          <ChipSelector
            options={[...SCHOOLS, ...AMBULANT_AREAS]}
            value={formRepArea}
            onChange={setFormRepArea}
          />

          <Text style={styles.formLabel}>Methodiek</Text>
          <ChipSelector
            options={METHODIEKEN}
            value={formRepMethodiek}
            onChange={setFormRepMethodiek}
          />

          <Text style={styles.formLabel}>Project</Text>
          <ChipSelector
            options={PROJECTEN}
            value={formRepProject}
            onChange={setFormRepProject}
          />

          <Text style={styles.formLabel}>Toelichting</Text>
          <TextInput
            value={formRepNote}
            onChangeText={setFormRepNote}
            placeholder="Korte toelichting..."
            style={[styles.input, styles.textArea]}
            multiline
          />

          <TouchableOpacity onPress={onSave} style={styles.formPrimaryBtn}>
            <Feather name="save" size={18} color="#FFFFFF" />
            <Text style={styles.formPrimaryTxt}>Rapportage opslaan</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

/* -----------------------------
   Agenda Form Modal
------------------------------ */
function AgendaFormModal(props: any) {
  const {
    visible,
    onClose,
    onSave,
    formAgType,
    setFormAgType,
    formAgTime,
    setFormAgTime,
    formAgTitle,
    setFormAgTitle,
    formAgSubtitle,
    setFormAgSubtitle,
    formAgLocation,
    setFormAgLocation,
    formAgCaseId,
    setFormAgCaseId,
    formAgReportId,
    setFormAgReportId,
    cases,
    reports,
  } = props;

  const types: AgendaItemType[] = ["Casus", "Rapportage", "Overleg", "Overig"];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.formContainer}>
        <View style={styles.formHeader}>
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
            <Feather name="x" size={22} color={MW.sub} />
          </TouchableOpacity>
          <Text style={styles.formTitle}>Nieuwe planning</Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }}>
          <Text style={styles.formLabel}>Type</Text>
          <ChipSelector
            options={types}
            value={formAgType}
            onChange={(v: any) => {
              setFormAgType(v);
              if (v !== "Casus") setFormAgCaseId(null);
              if (v !== "Rapportage") setFormAgReportId(null);
            }}
          />

          <Text style={styles.formLabel}>Tijd (HH:MM)</Text>
          <TextInput
            value={formAgTime}
            onChangeText={setFormAgTime}
            placeholder="15:30"
            style={styles.input}
          />

          <Text style={styles.formLabel}>Titel</Text>
          <TextInput
            value={formAgTitle}
            onChangeText={setFormAgTitle}
            placeholder="Bijv. Huisbezoek / Teamoverleg"
            style={styles.input}
          />

          <Text style={styles.formLabel}>Subtitel / notitie</Text>
          <TextInput
            value={formAgSubtitle}
            onChangeText={setFormAgSubtitle}
            placeholder="Korte toelichting"
            style={styles.input}
          />

          <Text style={styles.formLabel}>Locatie</Text>
          <TextInput
            value={formAgLocation}
            onChangeText={setFormAgLocation}
            placeholder="Bijv. HVC / Floriande / Kantoor"
            style={styles.input}
          />

          {formAgType === "Casus" && (
            <>
              <Text style={styles.formLabel}>Koppel aan casus (optioneel)</Text>
              {(cases ?? []).map((c: CaseItem) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() =>
                    setFormAgCaseId(formAgCaseId === c.id ? null : c.id)
                  }
                  style={[
                    styles.linkCaseRow,
                    { paddingVertical: 6 },
                    formAgCaseId === c.id && {
                      backgroundColor: "#E0ECFF",
                      borderRadius: 10,
                    },
                  ]}
                >
                  <Text style={{ fontWeight: "700", color: MW.text }}>
                    {c.youthName}
                  </Text>
                  <Text style={{ fontSize: 11, color: MW.subtle }}>
                    {c.project} • {c.location}
                  </Text>
                </TouchableOpacity>
              ))}
            </>
          )}

          {formAgType === "Rapportage" && (
            <>
              <Text style={styles.formLabel}>Koppel aan rapportage (optioneel)</Text>
              {(reports ?? []).map((r: ReportItem) => (
                <TouchableOpacity
                  key={r.id}
                  onPress={() =>
                    setFormAgReportId(formAgReportId === r.id ? null : r.id)
                  }
                  style={[
                    styles.linkCaseRow,
                    { paddingVertical: 6 },
                    formAgReportId === r.id && {
                      backgroundColor: "#E0ECFF",
                      borderRadius: 10,
                    },
                  ]}
                >
                  <Text style={{ fontWeight: "700", color: MW.text }}>
                    {r.title}
                  </Text>
                  <Text style={{ fontSize: 11, color: MW.subtle }}>
                    {r.location} • {r.createdAt}
                  </Text>
                </TouchableOpacity>
              ))}
            </>
          )}

          <TouchableOpacity onPress={onSave} style={styles.formPrimaryBtn}>
            <Feather name="save" size={18} color="#FFFFFF" />
            <Text style={styles.formPrimaryTxt}>Planning opslaan</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

/* -----------------------------
   Search Modal
------------------------------ */
function SearchModal({
  visible,
  onClose,
  value,
  onChangeValue,
  onSubmit,
}: any) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Zoeken</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Feather name="x" size={20} color={MW.sub} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchInputWrap}>
            <Feather name="search" size={18} color={MW.subtle} />
            <TextInput
              value={value}
              onChangeText={onChangeValue}
              placeholder="Zoek op jongere, locatie, project..."
              placeholderTextColor={MW.subtle}
              style={styles.searchInput}
              returnKeyType="search"
              onSubmitEditing={onSubmit}
              autoFocus
            />
          </View>

          <TouchableOpacity onPress={onSubmit} style={styles.formPrimaryBtn}>
            <Feather name="search" size={18} color="#FFF" />
            <Text style={styles.formPrimaryTxt}>Toepassen</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

/* -----------------------------
   Bell Modal
------------------------------ */
function BellModal({ visible, onClose, cases, reports }: any) {
  const caseAlerts = (cases ?? []).slice(0, 5).map((c: CaseItem) => ({
    id: `c-${c.id}`,
    title: `Nieuwe casus: ${c.youthName}`,
    sub: `${c.location} • ${c.yearLabel}`,
  }));

  const reportAlerts = (reports ?? []).slice(0, 5).map((r: ReportItem) => ({
    id: `r-${r.id}`,
    title: `Nieuwe rapportage: ${r.title}`,
    sub: `${r.location} • ${r.createdAt}`,
  }));

  const items = [...caseAlerts, ...reportAlerts].slice(0, 8);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Meldingen</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Feather name="x" size={20} color={MW.sub} />
            </TouchableOpacity>
          </View>

          {items.length === 0 ? (
            <Text style={styles.modalEmpty}>Geen nieuwe meldingen.</Text>
          ) : (
            <ScrollView contentContainerStyle={{ paddingBottom: 8 }}>
              {items.map((it: any) => (
                <View key={it.id} style={styles.notifyRow}>
                  <View style={styles.notifyDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.notifyTitle} numberOfLines={1}>
                      {it.title}
                    </Text>
                    <Text style={styles.notifySub} numberOfLines={1}>
                      {it.sub}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          <TouchableOpacity onPress={onClose} style={[styles.formPrimaryBtn, { marginTop: 10 }]}>
            <Text style={styles.formPrimaryTxt}>Sluiten</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

/* -----------------------------
   Comment Modal
------------------------------ */
function CommentModal({
  visible,
  onClose,
  onSubmit,
  value,
  setValue,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: () => void;
  value: string;
  setValue: (v: string) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Reactie toevoegen</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Feather name="x" size={20} color={MW.sub} />
            </TouchableOpacity>
          </View>

          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder="Typ je reactie..."
            placeholderTextColor={MW.subtle}
            style={[styles.input, { marginTop: 0 }]}
            multiline
          />

          <TouchableOpacity onPress={onSubmit} style={styles.formPrimaryBtn}>
            <Feather name="send" size={18} color="#FFF" />
            <Text style={styles.formPrimaryTxt}>Plaatsen</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
/* -----------------------------
   Betrokkene Modal
------------------------------ */
function AddContactModal({
  visible,
  onClose,
  onSave,
  name,
  setName,
  role,
  setRole,
  relation,
  setRelation,
  organisation,
  setOrganisation,
  phone,
  setPhone,
  email,
  setEmail,
}: any) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.formContainer}>
        <View style={styles.formHeader}>
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
            <Feather name="x" size={22} color={MW.sub} />
          </TouchableOpacity>
          <Text style={styles.formTitle}>Betrokkene toevoegen</Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }}>
          <Text style={styles.formLabel}>Naam</Text>
          <TextInput value={name} onChangeText={setName} style={styles.input} placeholder="Naam" />

          <Text style={styles.formLabel}>Rol</Text>
          <TextInput
            value={role}
            onChangeText={setRole}
            style={styles.input}
            placeholder="Bijv. ouder / mentor"
          />

          <Text style={styles.formLabel}>Relatie</Text>
          <TextInput
            value={relation}
            onChangeText={setRelation}
            style={styles.input}
            placeholder="Bijv. moeder / vriend"
          />

          <Text style={styles.formLabel}>Organisatie</Text>
          <TextInput
            value={organisation}
            onChangeText={setOrganisation}
            style={styles.input}
            placeholder="Optioneel"
          />

          <Text style={styles.formLabel}>Telefoon</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            style={styles.input}
            placeholder="06..."
            keyboardType="phone-pad"
          />

          <Text style={styles.formLabel}>E-mail</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            placeholder="mail@..."
            keyboardType="email-address"
          />

          <TouchableOpacity onPress={onSave} style={styles.formPrimaryBtn}>
            <Feather name="save" size={18} color="#FFFFFF" />
            <Text style={styles.formPrimaryTxt}>Opslaan</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

/* -----------------------------
   Doel / Tijdslijn Modal
------------------------------ */
function AddGoalModal({
  visible,
  onClose,
  onSave,
  title,
  setTitle,
  dateLabel,
  setDateLabel,
  durationLabel,
  setDurationLabel,
  status,
  setStatus,
  pillar,
  setPillar,
}: any) {
  const statusOpts: CaseGoalStatus[] = ["open", "in_behandeling", "behaald"];
  const pillarOpts = Object.keys(PILLAR_COLORS) as PillarKey[];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.formContainer}>
        <View style={styles.formHeader}>
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
            <Feather name="x" size={22} color={MW.sub} />
          </TouchableOpacity>
          <Text style={styles.formTitle}>Tijdslijn / doel toevoegen</Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }}>
          <Text style={styles.formLabel}>Titel</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            style={styles.input}
            placeholder="Bijv. start traject"
          />

          <Text style={styles.formLabel}>Datum (label)</Text>
          <TextInput
            value={dateLabel}
            onChangeText={setDateLabel}
            style={styles.input}
            placeholder="Bijv. 12 dec 2025"
          />

          <Text style={styles.formLabel}>Looptijd</Text>
          <TextInput
            value={durationLabel}
            onChangeText={setDurationLabel}
            style={styles.input}
            placeholder="Bijv. 6 weken / 3 maanden"
          />

          <Text style={styles.formLabel}>Status</Text>
          <ChipSelector options={statusOpts} value={status} onChange={setStatus} />

          <Text style={styles.formLabel}>Pijler (optioneel)</Text>
          <ChipSelector
            options={pillarOpts as any}
            value={pillar}
            onChange={setPillar}
          />

          <TouchableOpacity onPress={onSave} style={styles.formPrimaryBtn}>
            <Feather name="save" size={18} color="#FFFFFF" />
            <Text style={styles.formPrimaryTxt}>Opslaan</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

/* -----------------------------
   Emergency Modal (noodmodus)
------------------------------ */
type EmergencyModalProps = {
  visible: boolean;
  onClose: () => void;
  recordingActive: boolean;
  starting: boolean;
  onStart: () => void;
  onStop: () => void;
  onMarkSafe: () => void;
  onOpenMeldcode: () => void;
};

function EmergencyModal({
  visible,
  onClose,
  recordingActive,
  starting,
  onStart,
  onStop,
  onMarkSafe,
  onOpenMeldcode,
}: EmergencyModalProps) {
  const handleCall112 = () => Linking.openURL("tel:112");
  const handleCallVeiligThuis = () => Linking.openURL("tel:08002000");
  const handleCallTeam = () =>
    Alert.alert(
      "Team bellen",
      "Koppel later telefoonnummers van teamleden aan profielen."
    );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>🚨 Noodmodus</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Feather name="x" size={20} color={MW.sub} />
            </TouchableOpacity>
          </View>

          <Text style={{ color: MW.sub, fontWeight: "700", marginBottom: 10 }}>
            Gebruik dit alleen bij (vermoeden van) onveiligheid voor jou of de jongere.
          </Text>

          <View
            style={{
              padding: 10,
              borderRadius: 12,
              backgroundColor: "rgba(239,68,68,0.08)",
              borderWidth: 1,
              borderColor: "rgba(239,68,68,0.35)",
              marginBottom: 12,
            }}
          >
            <Text style={{ color: MW.red, fontWeight: "900", fontSize: 13 }}>
              {recordingActive
                ? "Opname loopt, je bent in noodmodus."
                : "Start een opname om de situatie vast te leggen."}
            </Text>
            <Text style={{ color: MW.subtle, fontWeight: "700", fontSize: 11, marginTop: 4 }}>
              Opnames zijn alleen zichtbaar voor jou en (indien nodig) manager / veiligheidsteam.
            </Text>
          </View>

          {recordingActive ? (
            <TouchableOpacity
              onPress={onStop}
              style={[styles.formPrimaryBtn, { backgroundColor: MW.red }]}
            >
              <Feather name="square" size={18} color="#FFF" />
              <Text style={styles.formPrimaryTxt}>Opname stoppen</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={onStart}
              style={[styles.formPrimaryBtn, { backgroundColor: MW.red }]}
              disabled={starting}
            >
              <Feather name="mic" size={18} color="#FFF" />
              <Text style={styles.formPrimaryTxt}>
                {starting ? "Starten..." : "Opname starten"}
              </Text>
            </TouchableOpacity>
          )}

          <View style={{ marginTop: 14, gap: 8 }}>
            <TouchableOpacity onPress={handleCall112} style={styles.emergencyButton}>
              <View style={styles.emergencyContent}>
                <Feather name="alert-triangle" size={20} color="#FFF" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.emergencyTitle}>Bel 112</Text>
                  <Text style={styles.emergencySubtitle}>
                    Direct levensgevaar of acute noodsituatie.
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleCallVeiligThuis}
              style={[styles.emergencyButton, { backgroundColor: "#0f766e" }]}
            >
              <View style={styles.emergencyContent}>
                <Feather name="phone-call" size={20} color="#FFF" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.emergencyTitle}>Bel Veilig Thuis</Text>
                  <Text style={styles.emergencySubtitle}>
                    Bij zorgen over huiselijk geweld of kindermishandeling.
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleCallTeam}
              style={[styles.emergencyButton, { backgroundColor: MW.blue }]}
            >
              <View style={styles.emergencyContent}>
                <Feather name="users" size={20} color="#FFF" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.emergencyTitle}>Bel collega / manager</Text>
                  <Text style={styles.emergencySubtitle}>
                    Overleg met je team bij onveilige situaties.
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={onMarkSafe}
            style={[styles.formPrimaryBtn, { marginTop: 14, backgroundColor: MW.green }]}
          >
            <Feather name="check-circle" size={18} color="#FFF" />
            <Text style={styles.formPrimaryTxt}>Ik ben veilig</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onOpenMeldcode}
            style={[styles.formPrimaryBtn, { marginTop: 10, backgroundColor: "#0F172A" }]}
          >
            <Feather name="file-text" size={18} color="#FFF" />
            <Text style={styles.formPrimaryTxt}>Bekijk stappen meldcode</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

/* -----------------------------
   Case Detail Modal
------------------------------ */
function CaseDetailModal({
  visible,
  onClose,
  item,
  linkedReports,
  onToggleStatus,
  isManager,
  onReassign,
  onOpenAddContact,
  onOpenAddGoal,
}: any) {
  if (!item) return null;

  const isClosed = item.status === "closed";

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.detailContainer}>
        <View style={styles.detailHeader}>
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
            <Feather name="x" size={22} color={MW.sub} />
          </TouchableOpacity>
          <Text style={styles.detailTitle}>Casusdetail</Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }}>
          <View style={styles.detailTopCard}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Image source={{ uri: item.workerAvatar }} style={styles.detailAvatar} />
              <View style={{ flex: 1 }}>
                <Text style={styles.detailYouthName}>{item.youthName}</Text>
                <Text style={styles.detailWorkerLine}>
                  {item.workerName} • {item.workerRole}
                </Text>
                <Text style={styles.detailMetaLine}>{item.location}</Text>
                <View style={{ marginTop: 6 }}>
                  <PillarChip pillar={item.pillar} />
                </View>

                <View style={{ marginTop: 8 }}>
                  <Text style={{ fontWeight: "900", color: isClosed ? MW.subtle : MW.green }}>
                    {isClosed ? "Afgesloten" : "Open"}
                  </Text>
                  {isClosed && !!item.closedAt && (
                    <Text style={{ color: MW.subtle, fontWeight: "700", marginTop: 2 }}>
                      Afgesloten op {toDateLabelNL(item.closedAt)}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </View>

          <Text style={[styles.formLabel, { marginTop: 14 }]}>Toelichting</Text>
          <Text style={{ color: MW.text, fontWeight: "700", marginTop: 4 }}>
            {item.note || "Geen toelichting."}
          </Text>

          <Text style={[styles.formLabel, { marginTop: 14 }]}>Betrokkenen (kort)</Text>
          <Text style={{ color: MW.text, fontWeight: "700", marginTop: 4 }}>
            {item.involved ? item.involved : "Nog niet ingevuld."}
          </Text>

          <Text style={[styles.formLabel, { marginTop: 14 }]}>Periode</Text>
          <Text style={{ color: MW.text, fontWeight: "700", marginTop: 4 }}>
            {item.startDate && item.endDate
              ? `${toDateLabelNL(item.startDate)} t/m ${toDateLabelNL(item.endDate)}`
              : item.startDate
              ? `Vanaf ${toDateLabelNL(item.startDate)}`
              : "Nog niet ingevuld."}
          </Text>

          {/* Betrokkenen */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 14,
            }}
          >
            <Text style={styles.formLabel}>Betrokkenen (details)</Text>
            <TouchableOpacity onPress={onOpenAddContact} style={styles.smallAddBtn}>
              <Feather name="plus" size={14} color="#FFF" />
              <Text style={styles.smallAddTxt}>Toevoegen</Text>
            </TouchableOpacity>
          </View>

          {(item.contacts ?? []).length === 0 ? (
            <Text style={{ color: MW.subtle, fontWeight: "700", marginTop: 6 }}>
              Geen betrokkenen toegevoegd.
            </Text>
          ) : (
            item.contacts.map((ct: any) => (
              <View key={ct.id} style={[styles.reportCard, { marginTop: 8 }]}>
                <Text style={{ fontWeight: "900", color: MW.text }}>{ct.name}</Text>
                {!!ct.role && (
                  <Text style={{ color: MW.subtle, fontWeight: "700" }}>{ct.role}</Text>
                )}
                {!!ct.relation && (
                  <Text style={{ color: MW.sub, fontWeight: "700", marginTop: 2 }}>
                    {ct.relation}
                  </Text>
                )}
                {!!ct.organisation && (
                  <Text style={{ color: MW.subtle, fontWeight: "700", marginTop: 2 }}>
                    {ct.organisation}
                  </Text>
                )}
                {!!ct.phone && (
                  <Text style={{ color: MW.subtle, fontWeight: "700", marginTop: 2 }}>
                    📞 {ct.phone}
                  </Text>
                )}
                {!!ct.email && (
                  <Text style={{ color: MW.subtle, fontWeight: "700", marginTop: 2 }}>
                    ✉️ {ct.email}
                  </Text>
                )}
              </View>
            ))
          )}

          {/* Tijdslijn / doelen */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 14,
            }}
          >
            <Text style={styles.formLabel}>Tijdslijn / doelen</Text>
            <TouchableOpacity onPress={onOpenAddGoal} style={styles.smallAddBtn}>
              <Feather name="plus" size={14} color="#FFF" />
              <Text style={styles.smallAddTxt}>Toevoegen</Text>
            </TouchableOpacity>
          </View>

          {(item.goals ?? []).length === 0 ? (
            <Text style={{ color: MW.subtle, fontWeight: "700", marginTop: 6 }}>
              Nog geen tijdslijn items.
            </Text>
          ) : (
            item.goals.map((g: any) => (
              <View key={g.id} style={[styles.reportCard, { marginTop: 8 }]}>
                <Text style={{ fontWeight: "900", color: MW.text }}>{g.title}</Text>
                <Text style={{ color: MW.subtle, fontWeight: "700", marginTop: 2 }}>
                  {g.status} • {g.dateLabel || "—"}{" "}
                  {g.durationLabel ? `• ${g.durationLabel}` : ""}
                </Text>
                {g.pillar && (
                  <View style={{ marginTop: 6 }}>
                    <PillarChip pillar={g.pillar} />
                  </View>
                )}
              </View>
            ))
          )}

          {/* Afsluiten/heropenen */}
          <TouchableOpacity
            onPress={() => onToggleStatus(item.id, isClosed ? "open" : "closed")}
            style={[
              styles.formPrimaryBtn,
              isClosed && { backgroundColor: MW.subtle },
            ]}
          >
            <Feather
              name={isClosed ? "refresh-ccw" : "check-circle"}
              size={18}
              color="#FFFFFF"
            />
            <Text style={styles.formPrimaryTxt}>
              {isClosed ? "Casus heropenen" : "Casus afsluiten"}
            </Text>
          </TouchableOpacity>

          {/* Manager-only acties */}
          {isManager && (
            <View style={styles.managerBox}>
              <Text style={styles.managerTitle}>Manager acties</Text>
              <TouchableOpacity onPress={() => onReassign(item)} style={styles.managerBtn}>
                <Feather name="user-check" size={16} color="#FFF" />
                <Text style={styles.managerBtnTxt}>Casus her-toewijzen</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Gekoppelde rapportages */}
          <Text style={[styles.formLabel, { marginTop: 14 }]}>Gekoppelde rapportages</Text>
          {(linkedReports ?? []).length === 0 ? (
            <Text style={{ color: MW.subtle, fontWeight: "700", marginTop: 4 }}>
              Geen gekoppelde rapportages.
            </Text>
          ) : (
            (linkedReports ?? []).map((r: ReportItem) => (
              <View key={r.id} style={[styles.reportCard, { marginTop: 8 }]}>
                <Text style={{ fontWeight: "900", color: MW.text }}>{r.title}</Text>
                <Text style={{ fontWeight: "700", color: MW.subtle, marginTop: 2 }}>
                  {r.location} • {r.createdAt}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
/* -----------------------------
   Report Detail Modal + Link Sheet
------------------------------ */
function ReportDetailModal({ visible, onClose, item, linkedCase, onOpenLinkSheet }: any) {
  if (!item) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.detailContainer}>
        <View style={styles.detailHeader}>
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
            <Feather name="x" size={22} color={MW.sub} />
          </TouchableOpacity>
          <Text style={styles.detailTitle}>Rapportage</Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }}>
          <View style={styles.detailTopCard}>
            <Text style={{ fontSize: 18, fontWeight: "900", color: MW.text }}>
              {item.title}
            </Text>
            <Text style={{ marginTop: 6, color: MW.subtle, fontWeight: "800" }}>
              {item.location} • {item.createdAt}
            </Text>
            <View style={{ marginTop: 8 }}>
              <PillarChip pillar={item.pillar} />
            </View>
            <Text style={{ marginTop: 10, color: MW.text, fontWeight: "700" }}>
              {item.note || "Geen toelichting."}
            </Text>
          </View>

          <Text style={[styles.formLabel, { marginTop: 14 }]}>Gekoppelde casus</Text>
          {linkedCase ? (
            <TouchableOpacity
              style={[styles.linkCaseRow, { marginTop: 6 }]}
              activeOpacity={0.9}
            >
              <Image source={{ uri: linkedCase.workerAvatar }} style={styles.linkCaseAvatar} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "900", color: MW.text }}>
                  {linkedCase.youthName}
                </Text>
                <Text style={{ color: MW.subtle, fontWeight: "700", marginTop: 2 }}>
                  {linkedCase.location}
                </Text>
              </View>
              <PillarChip pillar={linkedCase.pillar} />
            </TouchableOpacity>
          ) : (
            <Text style={{ color: MW.subtle, fontWeight: "700", marginTop: 4 }}>
              Nog niet gekoppeld.
            </Text>
          )}

          <TouchableOpacity onPress={onOpenLinkSheet} style={styles.formPrimaryBtn}>
            <Feather name="link" size={18} color="#FFFFFF" />
            <Text style={styles.formPrimaryTxt}>Koppel aan casus</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

function LinkReportToCaseModal({ visible, onClose, report, cases, onLink, onCreateNew }: any) {
  if (!report) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.linkSheetBackdrop}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={styles.linkSheet}>
          <View style={styles.linkSheetHandle} />
          <Text style={styles.linkSheetTitle}>Koppel aan casus</Text>
          <Text style={styles.linkSheetSubtitle}>{report.title}</Text>

          <ScrollView style={{ maxHeight: H * 0.45, marginTop: 8 }}>
            {(cases ?? []).length === 0 ? (
              <Text style={styles.agendaEmptyText}>Nog geen casussen beschikbaar.</Text>
            ) : (
              (cases ?? []).map((c: CaseItem) => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.linkCaseRow}
                  onPress={() => onLink(c.id)}
                  activeOpacity={0.9}
                >
                  <View style={styles.linkCaseAvatarWrapper}>
                    <Image source={{ uri: c.workerAvatar }} style={styles.linkCaseAvatar} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.linkCaseName}>{c.youthName}</Text>
                    <Text style={styles.linkCaseMeta}>
                      {c.project || "Geen project"} • {c.yearLabel}
                    </Text>
                    <Text style={styles.linkCaseSubMeta} numberOfLines={1}>
                      {c.location}
                    </Text>
                  </View>
                  <PillarChip pillar={c.pillar} />
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          <TouchableOpacity onPress={onCreateNew} style={[styles.formPrimaryBtn, { marginTop: 8 }]}>
            <Feather name="plus-circle" size={18} color="#FFFFFF" />
            <Text style={styles.formPrimaryTxt}>
              Nieuwe casus starten met deze rapportage
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

}
// 🔍 Simpele analyse helpers op basis van bestaande CaseItem / ReportItem

function buildMinPlusFromItems(cases: CaseItem[], reports: ReportItem[]) {
  const plus = reports.length;
  const min = cases.filter((c) => c.status === "open").length;
  const balance = plus - min;
  return { plus, min, balance };
}

function buildPillarAggFromItems(cases: CaseItem[], reports: ReportItem[]) {
  const base: Record<PillarKey, { plus: number; min: number }> = {
    Weerbaarheid: { plus: 0, min: 0 },
    Talentontwikkeling: { plus: 0, min: 0 },
    Verbinding: { plus: 0, min: 0 },
    Burgerschap: { plus: 0, min: 0 },
    "Zorg & Veiligheid": { plus: 0, min: 0 },
    "Werk & Inkomen": { plus: 0, min: 0 },
  };

  reports.forEach((r) => {
    base[r.pillar].plus += 1;
  });
  cases.forEach((c) => {
    if (c.status === "open") base[c.pillar].min += 1;
  });

  return base;
}

function buildAreaAggFromItems(cases: CaseItem[], reports: ReportItem[]) {
  type AreaAgg = { key: string; label: string; plus: number; min: number };
  const map = new Map<string, AreaAgg>();

  for (const r of reports) {
    const key = (r.area || r.location || "Onbekend").trim() || "Onbekend";
    const ex = map.get(key) || { key, label: key, plus: 0, min: 0 };
    ex.plus += 1;
    map.set(key, ex);
  }

  for (const c of cases) {
    const key = (c.area || c.schoolOrArea || "Onbekend").trim() || "Onbekend";
    const ex = map.get(key) || { key, label: key, plus: 0, min: 0 };
    if (c.status === "open") ex.min += 1;
    map.set(key, ex);
  }

  const list = Array.from(map.values());
  list.sort((a, b) => (b.plus + b.min) - (a.plus + a.min));
  return list;
}


/* -----------------------------
   Hoofdcomponent
------------------------------ */
export default function WorkspaceTab() {

  
  // 🔍 Simpele analyse helpers op basis van bestaande CaseItem / ReportItem

function AnalyseSubPage({
  cases,
  reports,
}: {
  cases: CaseItem[];
  reports: ReportItem[];
}) {
  const { plus, min, balance } = buildMinPlusFromItems(cases, reports);
  const pillarAgg = buildPillarAggFromItems(cases, reports);
  const areas = buildAreaAggFromItems(cases, reports).slice(0, 4);

  const totalCases = cases.length;
  const openCases = cases.filter((c) => c.status === "open").length;
  const closedCases = cases.filter((c) => c.status === "closed").length;

  const totalReports = reports.length;
  const totalYouth = reports.reduce((sum: number, r: any) => {
    // probeer beide varianten, zodat je geen crash krijgt
    return sum + (r.youthCount ?? r.youth_count ?? 0);
  }, 0);

  const minPlusTotal = plus + min || 1;
  const plusPct = Math.round((plus / minPlusTotal) * 100);
  const minPct = 100 - plusPct;

  const completionPct =
    totalCases > 0 ? Math.round((closedCases / totalCases) * 100) : 0;

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 110 }}
      showsVerticalScrollIndicator={false}
    >
      {/* HERO – grote topkaart zoals KennisHub */}
      <ImageBackground
        source={{
          uri:
            "https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=1200",
        }}
        style={styles.analysisHero}
        imageStyle={{ borderRadius: 24 }}
      >
        <View style={styles.analysisHeroOverlay} />
        <View style={styles.analysisHeroContent}>
          <View>
            <Text style={styles.analysisHeroTitle}>Analyse jongerenwerk</Text>
            <Text style={styles.analysisHeroSub}>
              Snelle blik op casussen en rapportages
            </Text>
          </View>

          {/* kleine stats in hero */}
          <View style={styles.analysisHeroStatsRow}>
            <View style={styles.analysisHeroStatBox}>
              <Text style={styles.analysisHeroStatLabel}>Balans Min/Plus</Text>
              <Text style={styles.analysisHeroStatValue}>
                {balance >= 0 ? `+${balance}` : balance}
              </Text>
              <Text style={styles.legendText}>
                {plus} plus • {min} min
              </Text>
            </View>
            <View style={styles.analysisHeroStatBox}>
              <Text style={styles.analysisHeroStatLabel}>Casus afronding</Text>
              <Text style={styles.analysisHeroStatValue}>
                {completionPct}%
              </Text>
              <Text style={styles.legendText}>
                {closedCases} afgesloten • {openCases} open
              </Text>
            </View>
          </View>
        </View>
      </ImageBackground>

      {/* MIN–PLUS + KPI cirkel – feed-achtig blok */}
      <View style={{ paddingHorizontal: 14, marginTop: 12 }}>
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.cardTitle}>Min–Plus overzicht</Text>
              <Text style={styles.cardSubtitle}>
                Pilotbalans op basis van casussen en rapportages
              </Text>
            </View>

            {/* fake “progress circle” zoals een dashboard widget */}
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                borderWidth: 5,
                borderColor: MW.green,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "#F8FAFC",
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: "900", color: MW.text }}>
                {plusPct}%
              </Text>
              <Text
                style={{ fontSize: 9, fontWeight: "700", color: MW.subtle }}
              >
                plus
              </Text>
            </View>
          </View>

          {/* horizontale min/plus bar – grafiekstijl */}
          <View style={styles.minPlusBarTrack}>
            <View
              style={[styles.minPlusBarFillPlus, { flex: plusPct || 1 }]}
            />
            <View style={[styles.minPlusBarFillMin, { flex: minPct || 1 }]} />
          </View>
          <View style={styles.minPlusLegendRow}>
            <Text style={styles.legendText}>Plus {plusPct}%</Text>
            <Text style={styles.legendText}>Min {minPct}%</Text>
          </View>

          {/* kleine tegels onder de bar */}
          <View
            style={{
              flexDirection: "row",
              gap: 10,
              marginTop: 12,
            }}
          >
            <View style={styles.smallStat}>
              <Text style={styles.smallStatValue}>{plus}</Text>
              <Text style={styles.smallStatLabel}>Plus (rapportages)</Text>
            </View>
            <View style={styles.smallStat}>
              <Text style={styles.smallStatValue}>{min}</Text>
              <Text style={styles.smallStatLabel}>Min (open casussen)</Text>
            </View>
            <View style={styles.smallStat}>
              <Text style={styles.smallStatValue}>
                {balance >= 0 ? `+${balance}` : balance}
              </Text>
              <Text style={styles.smallStatLabel}>Balans</Text>
            </View>
          </View>
        </View>

        {/* KPI rij – lijkt op “cards” uit KennisHub */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiItem}>
            <Text style={styles.kpiValue}>{totalCases}</Text>
            <Text style={styles.kpiLabel}>Casussen totaal</Text>
            <View style={styles.kpiBarTrack}>
              <View
                style={[
                  styles.kpiBarFill,
                  { width: `${completionPct || 5}%` },
                ]}
              />
            </View>
          </View>
          <View style={styles.kpiItem}>
            <Text style={styles.kpiValue}>{totalReports}</Text>
            <Text style={styles.kpiLabel}>Rapportages</Text>
            <View style={styles.kpiBarTrack}>
              <View
                style={[
                  styles.kpiBarFill,
                  { width: `${Math.min(totalReports * 5, 100)}%` },
                ]}
              />
            </View>
          </View>
        </View>

        <View style={styles.kpiRow}>
          <View style={styles.kpiItem}>
            <Text style={styles.kpiValue}>{totalYouth}</Text>
            <Text style={styles.kpiLabel}>Bereikte jongeren (rapports)</Text>
            <View style={styles.kpiBarTrack}>
              <View
                style={[
                  styles.kpiBarFill,
                  { width: `${Math.min(totalYouth * 3, 100)}%` },
                ]}
              />
            </View>
          </View>
          <View style={styles.kpiItem}>
            <Text style={styles.kpiValue}>{openCases}</Text>
            <Text style={styles.kpiLabel}>Open casussen</Text>
            <View style={styles.kpiBarTrack}>
              <View
                style={[
                  styles.kpiBarFill,
                  {
                    width: `${
                      totalCases
                        ? Math.min((openCases / totalCases) * 100, 100)
                        : 0
                    }%`,
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Pijlers – grid met mini grafiek look */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Pijlers / leefgebieden</Text>
            <Text style={styles.cardSubtitle}>Waar zit nu het meeste werk?</Text>
          </View>

          <View style={styles.pillarGrid}>
            {(Object.keys(pillarAgg) as PillarKey[]).map((pillar) => {
              const { plus: p, min: m } = pillarAgg[pillar];
              if (!p && !m) return null;
              const total = p + m || 1;
              const pRatio = (p / total) * 100;
              const mRatio = 100 - pRatio;

              return (
                <View key={pillar} style={styles.pillarTile}>
                  <View style={styles.pillarTileHeader}>
                    <View
                      style={[
                        styles.pillarIconDot,
                        { backgroundColor: PILLAR_COLORS[pillar] },
                      ]}
                    />
                    <Text style={styles.pillarTileTitle} numberOfLines={1}>
                      {pillar}
                    </Text>
                  </View>

                  {/* mini stacked bar */}
                  <View style={{ marginTop: 8 }}>
                    <View style={styles.pillarBarTrack}>
                      <View
                        style={[
                          styles.pillarBarPlus,
                          { flex: pRatio || 1, backgroundColor: PILLAR_COLORS[pillar] },
                        ]}
                      />
                      <View
                        style={[
                          styles.pillarBarMin,
                          { flex: mRatio || 1 },
                        ]}
                      />
                    </View>
                  </View>

                  <Text style={styles.pillarTileRatio}>
                    +{p} plus • -{m} min
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Gebieden – lijst met “badges”, feed-stijl */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Gebiedsanalyse</Text>
            <Text style={styles.cardSubtitle}>
              Topgebieden met signalen in jouw pilot
            </Text>
          </View>

          {areas.length === 0 ? (
            <Text style={styles.emptyText}>
              Nog geen data om gebieden te tonen.
            </Text>
          ) : (
            areas.map((a) => {
              const bal = a.plus - a.min;
              return (
                <View key={a.key} style={styles.areaRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.areaLabel}>{a.label}</Text>
                    <Text style={styles.areaSub}>
                      +{a.plus} rapportages • -{a.min} open casussen
                    </Text>
                  </View>
                  <View style={styles.areaBadge}>
                    <Text style={styles.areaBadgeText}>
                      {bal >= 0 ? `+${bal}` : bal}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </View>
    </ScrollView>
  );
}



  const router = useRouter();
  const { user } = useAuth();
  const myUid = user?.id ?? null;

  const [myProfile, setMyProfile] = React.useState<PublicUserRow | null>(null);
  const isManager = myProfile?.role === "manager";

  const [mode, setMode] =
  React.useState<"casussen" | "rapportages" | "agenda" | "analyse">("casussen");


  const [cases, setCases] = React.useState<CaseItem[]>([]);
  const [reports, setReports] = React.useState<ReportItem[]>([]);
  const [agendaItems, setAgendaItems] = React.useState<AgendaItem[]>([]);

  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const [activeFilter, setActiveFilter] = React.useState<string>("all");
  const [selectedLocation, setSelectedLocation] = React.useState<string | null>(null);

  const [caseStatusFilter, setCaseStatusFilter] =
    React.useState<"all" | "open" | "closed">("all");

  const [detailVisible, setDetailVisible] = React.useState(false);
  const [selectedCase, setSelectedCase] = React.useState<CaseItem | null>(null);

  const [reportDetailVisible, setReportDetailVisible] = React.useState(false);
  const [selectedReport, setSelectedReport] = React.useState<ReportItem | null>(null);

  const [linkSheetVisible, setLinkSheetVisible] = React.useState(false);

  const [caseFormOpen, setCaseFormOpen] = React.useState(false);
  const [reportFormOpen, setReportFormOpen] = React.useState(false);
  const [agendaFormOpen, setAgendaFormOpen] = React.useState(false);

  const [searchOpen, setSearchOpen] = React.useState(false);
  const [bellOpen, setBellOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  // comment modal state
  const [commentOpen, setCommentOpen] = React.useState(false);
  const [commentCaseId, setCommentCaseId] = React.useState<string | null>(null);
  const [commentText, setCommentText] = React.useState("");

  // betrokkene modal state
  const [contactOpen, setContactOpen] = React.useState(false);
  const [ctName, setCtName] = React.useState("");
  const [ctRole, setCtRole] = React.useState("");
  const [ctRelation, setCtRelation] = React.useState("");
  const [ctOrg, setCtOrg] = React.useState("");
  const [ctPhone, setCtPhone] = React.useState("");
  const [ctEmail, setCtEmail] = React.useState("");

  // goal modal state
  const [goalOpen, setGoalOpen] = React.useState(false);
  const [gTitle, setGTitle] = React.useState("");
  const [gDateLabel, setGDateLabel] = React.useState("");
  const [gDurationLabel, setGDurationLabel] = React.useState("");
  const [gStatus, setGStatus] = React.useState<CaseGoalStatus>("open");
  const [gPillar, setGPillar] = React.useState<string | null>(null);

  // formulier state casus
  const [formYouthName, setFormYouthName] = React.useState("");
  const [formSchool, setFormSchool] = React.useState<string | null>(null);
  const [formArea, setFormArea] = React.useState<string | null>(null);
  const [formPillar, setFormPillar] = React.useState<PillarKey>("Weerbaarheid");
  const [formMethodiek, setFormMethodiek] = React.useState<string>("Min-Plus");
  const [formProject, setFormProject] = React.useState<string>("Geen project");
  const [formNote, setFormNote] = React.useState("");
  const [formInvolved, setFormInvolved] = React.useState("");
  const [formStartDate, setFormStartDate] = React.useState("");
  const [formEndDate, setFormEndDate] = React.useState("");

  // formulier state rapportage
  const [formRepTitle, setFormRepTitle] = React.useState("");
  const [formRepLocation, setFormRepLocation] = React.useState("");
  const [formRepPillar, setFormRepPillar] = React.useState<PillarKey>("Weerbaarheid");
  const [formRepYouthCount, setFormRepYouthCount] = React.useState<string>("0");
  const [formRepArea, setFormRepArea] = React.useState<string | null>(null);
  const [formRepMethodiek, setFormRepMethodiek] =
    React.useState<string>("Straathoekwerk");
  const [formRepProject, setFormRepProject] = React.useState<string>("Geen project");
  const [formRepNote, setFormRepNote] = React.useState("");

  // formulier state agenda
  const [formAgType, setFormAgType] = React.useState<AgendaItemType>("Casus");
  const [formAgTime, setFormAgTime] = React.useState("15:00");
  const [formAgTitle, setFormAgTitle] = React.useState("");
  const [formAgSubtitle, setFormAgSubtitle] = React.useState("");
  const [formAgLocation, setFormAgLocation] = React.useState("");
  const [formAgCaseId, setFormAgCaseId] = React.useState<string | null>(null);
  const [formAgReportId, setFormAgReportId] = React.useState<string | null>(null);

  const pagerRef = React.useRef<ScrollView | null>(null);
  const [pagerIndex, setPagerIndex] = React.useState(0);

  const [agendaFilter, setAgendaFilter] =
    React.useState<"all" | "casus" | "rapportages" | "overig">("all");

  // ✅ Noodmodus state (enige versie, geen emergencyActive meer)
  const [emergencyOpen, setEmergencyOpen] = React.useState(false);
  const [emergencyRecording, setEmergencyRecording] =
    React.useState<Audio.Recording | null>(null);
  const [emergencyStarting, setEmergencyStarting] = React.useState(false);
  const [emergencyLogId, setEmergencyLogId] = React.useState<string | null>(null);

 const handlePagerScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
  const x = e.nativeEvent.contentOffset.x;
  const index = Math.round(x / W);
  if (index !== pagerIndex) {
    setPagerIndex(index);
    if (index === 0) setMode("casussen");
    else if (index === 1) setMode("rapportages");
    else if (index === 2) setMode("agenda");
    else setMode("analyse");
  }
};

  const goToPage = (index: number) => {
    pagerRef.current?.scrollTo({ x: index * W, animated: true });
    setPagerIndex(index);
    if (index === 0) setMode("casussen");
else if (index === 1) setMode("rapportages");
else if (index === 2) setMode("agenda");
else setMode("analyse");

  };

  const handleAdd = () => {
    if (mode === "casussen") setCaseFormOpen(true);
    else if (mode === "rapportages") setReportFormOpen(true);
    else setAgendaFormOpen(true);
  };

  /* -----------------------------
     Noodmodus: audio + log
  ------------------------------ */
  const startEmergencyRecording = React.useCallback(async () => {
    if (!myUid) {
      Alert.alert("Niet ingelogd", "Log opnieuw in om de noodfunctie te gebruiken.");
      return;
    }

    try {
      setEmergencyStarting(true);

      // 1) Supabase log aanmaken
      const { data: log, error: logErr } = await supabase
        .from("emergency_logs")
        .insert({
          user_id: myUid,
          status: "open",
          description: "Noodmodus gestart in Workspace",
        })
        .select("id")
        .single();

      if (logErr) {
        console.log("emergency_logs insert error", logErr);
      } else if (log?.id) {
        setEmergencyLogId(log.id);
      }

      // 2) Microfoon permissie + audio
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Geen microfoonrechten",
          "Geef microfoonrechten om een opname te kunnen maken."
        );
        setEmergencyStarting(false);
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      await recording.startAsync();

      setEmergencyRecording(recording);
    } catch (e: any) {
      console.log("startEmergencyRecording error", e);
      Alert.alert("Noodopname mislukt", e?.message || "Onbekende fout");
    } finally {
      setEmergencyStarting(false);
    }
  }, [myUid]);

    const stopEmergencyRecording = React.useCallback(async () => {
    if (!emergencyRecording) return;

    try {
      // 1) Opname stoppen
      await emergencyRecording.stopAndUnloadAsync();
      const uri = emergencyRecording.getURI();

      if (uri && myUid) {
        try {
          // 2) Bestandsdata ophalen als Blob
          const res = await fetch(uri);
          const blob = await res.blob();

          // 3) Bestandsnaam + pad opbouwen
          const fileName = `user-${myUid}/recording-${Date.now()}.m4a`;

          // 4) Uploaden naar Supabase Storage (zorg dat je bucket 'emergency-audio' hebt)
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("emergency-audio")
            .upload(fileName, blob, {
              contentType: "audio/m4a",
              upsert: false,
            });

          if (uploadError) {
            console.log("Emergency upload error:", uploadError);
            Alert.alert(
              "Upload mislukt",
              "De noodopname is gemaakt, maar uploaden naar de server is niet gelukt."
            );
          } else {
            console.log("Emergency upload OK:", uploadData);

            // 5) Koppel het bestand aan de nood-log (optioneel: kolom 'audio_path' in emergency_logs)
            if (emergencyLogId && uploadData?.path) {
              const { error: logUpdateError } = await supabase
                .from("emergency_logs")
                .update({ audio_path: uploadData.path })
                .eq("id", emergencyLogId);

              if (logUpdateError) {
                console.log("emergency_logs audio_path update error", logUpdateError);
              }
            }
          }
        } catch (uploadCatch: any) {
          console.log("Emergency upload exception:", uploadCatch);
        }
      }
    } catch (e: any) {
      console.log("stopEmergencyRecording error", e);
    } finally {
      setEmergencyRecording(null);
    }
  }, [emergencyRecording, myUid, emergencyLogId]);


  const markEmergencySafe = React.useCallback(async () => {
    if (emergencyRecording) {
      await stopEmergencyRecording();
    }

    if (emergencyLogId) {
      const { error } = await supabase
        .from("emergency_logs")
        .update({ status: "resolved" })
        .eq("id", emergencyLogId);

      if (error) {
        console.log("emergency_logs update error", error);
      }
    }

    setEmergencyOpen(false);
    setEmergencyLogId(null);
    Alert.alert("Veilig", "Je noodmodus is afgesloten.");
  }, [emergencyRecording, emergencyLogId, stopEmergencyRecording]);

  const handleOpenMeldcodeFromEmergency = () => {
    setEmergencyOpen(false);
    router.push("/meldcode");
  };

  const handleNoodknopPress = () => {
    setEmergencyOpen(true);
  };

  /* -----------------------------
     LOAD MY PROFILE
  ------------------------------ */
  const loadMyProfile = React.useCallback(async () => {
    if (!myUid) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, photo_url, role")
      .eq("id", myUid)
      .maybeSingle();

    if (error) {
      console.log("loadMyProfile error", error);
      return;
    }
    if (data) setMyProfile(data as PublicUserRow);
  }, [myUid]);

  /* -----------------------------
     LOAD WORKSPACE FROM SUPABASE
  ------------------------------ */
  const loadWorkspace = React.useCallback(async () => {
    if (!myUid) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data: caseRows, error: caseErr } = await supabase
        .from("cases")
        .select(
          `*, case_contacts(*), case_goals(*), case_comments(*), case_reactions(*), case_saves(*)`
        )
        .order("created_at", { ascending: false });
      if (caseErr) throw caseErr;

      const { data: reportRows, error: repErr } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });
      if (repErr) throw repErr;

      const { data: agendaRows, error: agErr } = await supabase
        .from("agenda")
        .select("*")
        .eq("worker_id", myUid)
        .order("time", { ascending: true });
      if (agErr) throw agErr;

      const workerIds = Array.from(
        new Set([
          ...(caseRows ?? []).map((c: any) => c.worker_id),
          ...(reportRows ?? []).map((r: any) => r.worker_id),
        ])
      ).filter(Boolean);

      let usersById: Record<string, PublicUserRow | undefined> = {};

      if (myProfile?.id) usersById[myProfile.id] = myProfile;

      if (workerIds.length > 0) {
        const { data: users, error: uErr } = await supabase
          .from("profiles")
          .select("id, display_name, photo_url, role")
          .in("id", workerIds);
        if (uErr) throw uErr;
        usersById = {
          ...usersById,
          ...Object.fromEntries((users ?? []).map((u) => [u.id, u])),
        };
      }

      const mappedCases: CaseItem[] = (caseRows as CaseRow[]).map((c) =>
        mapCaseRowToItem(c, usersById, myUid)
      );

      const mappedReports: ReportItem[] = (reportRows as ReportRow[]).map((r) =>
        mapReportRowToItem(r, usersById)
      );

      const casesById = Object.fromEntries(mappedCases.map((c) => [c.id, c]));
      const reportsById = Object.fromEntries(mappedReports.map((r) => [r.id, r]));

      const mappedAgenda: AgendaItem[] = (agendaRows as AgendaRow[]).map((a) => {
        const relatedCase = a.case_id ? casesById[a.case_id] : undefined;
        const relatedReport = a.report_id ? reportsById[a.report_id] : undefined;
        return {
          id: a.id,
          time: a.time || "",
          title: a.title || "",
          subtitle: a.subtitle || "",
          location: a.location || "",
          type: a.type,
          pillar: relatedCase?.pillar || relatedReport?.pillar,
          relatedCaseId: a.case_id || undefined,
          relatedReportId: a.report_id || undefined,
        };
      });

      setCases(mappedCases);
      setReports(mappedReports);
      setAgendaItems(mappedAgenda);
    } catch (e: any) {
      console.log("loadWorkspace error", e);
      Alert.alert("Laden mislukt", e?.message || "Onbekende error");
    } finally {
      setLoading(false);
    }
  }, [myUid, myProfile]);

  React.useEffect(() => {
    loadMyProfile();
  }, [loadMyProfile]);

  React.useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadMyProfile();
    await loadWorkspace();
    setRefreshing(false);
  }, [loadMyProfile, loadWorkspace]);

  /* -----------------------------
     FILTERS
  ------------------------------ */
  const filteredCases = React.useMemo(() => {
    let list = [...cases];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) =>
        [c.youthName, c.location, c.project, c.workerName].some((v) =>
          (v || "").toLowerCase().includes(q)
        )
      );
    }

    if (selectedLocation) {
      const s = selectedLocation.toLowerCase();
      list = list.filter(
        (c) =>
          (c.location || "").toLowerCase().includes(s) ||
          (c.schoolOrArea || "").toLowerCase().includes(s)
      );
    }

    if (activeFilter === "schools") {
      list = list.filter((c) => SCHOOLS.includes(c.schoolOrArea));
    } else if (activeFilter === "ambulant") {
      list = list.filter((c) => AMBULANT_AREAS.includes(c.schoolOrArea));
    }

    if (caseStatusFilter === "open") list = list.filter((c) => c.status === "open");
    if (caseStatusFilter === "closed") list = list.filter((c) => c.status === "closed");

    return list;
  }, [cases, selectedLocation, activeFilter, searchQuery, caseStatusFilter]);

  const filteredReports = React.useMemo(() => {
    let list = [...reports];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((r) =>
        [r.title, r.location, r.project, r.workerName].some((v) =>
          (v || "").toLowerCase().includes(q)
        )
      );
    }

    if (selectedLocation) {
      const s = selectedLocation.toLowerCase();
      list = list.filter(
        (r) =>
          (r.location || "").toLowerCase().includes(s) ||
          (r.area || "").toLowerCase().includes(s)
      );
    }

    if (activeFilter === "schools") {
      list = list.filter((r) =>
        SCHOOLS.some((school) =>
          (r.location || "").toLowerCase().includes(school.toLowerCase())
        )
      );
    } else if (activeFilter === "ambulant") {
      list = list.filter((r) =>
        AMBULANT_AREAS.some((a) =>
          (r.area || "").toLowerCase().includes(a.toLowerCase())
        )
      );
    }
    return list;
  }, [reports, selectedLocation, activeFilter, searchQuery]);

  const filteredAgenda = React.useMemo(() => {
    if (agendaFilter === "all") return agendaItems;
    if (agendaFilter === "casus") return agendaItems.filter((a) => a.type === "Casus");
    if (agendaFilter === "rapportages")
      return agendaItems.filter((a) => a.type === "Rapportage");
    return agendaItems.filter((a) => a.type === "Overig" || a.type === "Overleg");
  }, [agendaItems, agendaFilter]);

  /* -----------------------------
     INTERACTIES (Supabase)
  ------------------------------ */
  const handleToggleLike = async (caseId: string) => {
    if (!myUid) return;
    const current = cases.find((c) => c.id === caseId);
    if (!current) return;
    const willLike = !current.liked;

    setCases((prev) =>
      prev.map((c) =>
        c.id === caseId
          ? {
              ...c,
              liked: willLike,
              reactionsCount: Math.max(0, c.reactionsCount + (willLike ? 1 : -1)),
            }
          : c
      )
    );

    try {
      if (willLike) {
        const { error } = await supabase
          .from("case_reactions")
          .upsert({ case_id: caseId, user_id: myUid }, { onConflict: "case_id,user_id" });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("case_reactions")
          .delete()
          .eq("case_id", caseId)
          .eq("user_id", myUid);
        if (error) throw error;
      }
    } catch (e: any) {
      Alert.alert("Like mislukt", e?.message);
      loadWorkspace();
    }
  };

  const openCommentForCase = (caseId: string) => {
    setCommentCaseId(caseId);
    setCommentText("");
    setCommentOpen(true);
  };

  const submitComment = async () => {
    if (!myUid || !commentCaseId) return;
    const text = commentText.trim();
    if (!text) return;

    setCases((prev) =>
      prev.map((c) =>
        c.id === commentCaseId
          ? {
              ...c,
              commentsCount: c.commentsCount + 1,
              messages: [{ from: "Jij", text }, ...c.messages].slice(0, 2),
            }
          : c
      )
    );

    const { error } = await supabase.from("case_comments").insert({
      case_id: commentCaseId,
      user_id: myUid,
      text,
    });

    if (error) {
      Alert.alert("Reactie mislukt", error.message);
      loadWorkspace();
    }

    setCommentOpen(false);
    setCommentCaseId(null);
    setCommentText("");
  };

  const handleToggleSave = async (caseId: string) => {
    if (!myUid) return;
    const current = cases.find((c) => c.id === caseId);
    if (!current) return;
    const willSave = !current.saved;

    setCases((prev) =>
      prev.map((c) =>
        c.id === caseId
          ? {
              ...c,
              saved: willSave,
              savesCount: Math.max(0, c.savesCount + (willSave ? 1 : -1)),
            }
          : c
      )
    );

    try {
      if (willSave) {
        const { error } = await supabase
          .from("case_saves")
          .upsert({ case_id: caseId, user_id: myUid }, { onConflict: "case_id,user_id" });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("case_saves")
          .delete()
          .eq("case_id", caseId)
          .eq("user_id", myUid);
        if (error) throw error;
      }
    } catch (e: any) {
      Alert.alert("Opslaan mislukt", e?.message);
      loadWorkspace();
    }
  };

  // afsluiten/heropenen
  const handleToggleCaseStatus = async (
    caseId: string,
    next: "open" | "closed"
  ) => {
    if (!myUid) return;

    setCases((prev) =>
      prev.map((c) =>
        c.id === caseId
          ? {
              ...c,
              status: next,
              closedAt: next === "closed" ? new Date().toISOString() : null,
            }
          : c
      )
    );

    const payload =
      next === "closed"
        ? { status: "closed", closed_at: new Date().toISOString(), closed_by: myUid }
        : { status: "open", closed_at: null, closed_by: null };

    const { error } = await supabase.from("cases").update(payload).eq("id", caseId);

    if (error) {
      Alert.alert("Status wijzigen mislukt", error.message);
      loadWorkspace();
    }
  };

  const handleLikeReport = () =>
    Alert.alert("Nog niet", "Report likes hebben nog geen tabel.");
  const handleCommentReport = () =>
    Alert.alert("Nog niet", "Report comments hebben nog geen tabel.");

  const handleOpenReport = (item: ReportItem) => {
    setSelectedReport(item);
    setReportDetailVisible(true);
  };

  const handleOpenCase = (item: CaseItem) => {
    setSelectedCase(item);
    setDetailVisible(true);
  };

  const handleOpenAgendaItem = (item: AgendaItem) => {
    if (item.relatedCaseId) {
      const c = cases.find((x) => x.id === item.relatedCaseId);
      if (c) {
        handleOpenCase(c);
        return;
      }
    }
    if (item.relatedReportId) {
      const r = reports.find((x) => x.id === item.relatedReportId);
      if (r) {
        handleOpenReport(r);
        return;
      }
    }
    Alert.alert(item.title, item.subtitle || "Geen extra details.");
  };

  // manager-only: reassign placeholder (pilot)
  const handleReassignCase = (item: CaseItem) => {
    Alert.alert(
      "Manager actie",
      "Hier komt straks een lijst met jongerenwerkers om de casus aan toe te wijzen."
    );
  };

  /* -----------------------------
     SAVE CASUS / REPORT / AGENDA
  ------------------------------ */
  const handleSaveCaseForm = async () => {
    if (!myUid) return;
    if (!formYouthName.trim()) {
      Alert.alert("Naam nodig", "Vul minimaal de naam van de jongere in.");
      return;
    }

    const schoolOrArea = formSchool || formArea || "Onbekend";
    const location = formSchool ?? formArea ?? "Onbekende locatie";

    try {
      const payload = {
        youth_name: formYouthName.trim(),
        worker_id: myUid,
        pillar: formPillar,
        location,
        area: formArea || "",
        year_label: "2025",
        methodiek: formMethodiek,
        project: formProject === "Geen project" ? null : formProject,
        school_or_area: schoolOrArea,
        note: formNote.trim() || "",
        status: "open",
        involved: formInvolved.trim() || null,
        start_date: formStartDate || null,
        end_date: formEndDate || null,
      };

      const { data, error } = await supabase
        .from("cases")
        .insert(payload)
        .select(
          `*, case_contacts(*), case_goals(*), case_comments(*), case_reactions(*), case_saves(*)`
        )
        .single();

      if (error) throw error;

      const usersById = myProfile ? { [myProfile.id]: myProfile } : {};
      const mapped = mapCaseRowToItem(data as CaseRow, usersById, myUid);

      setCases((prev) => [mapped, ...prev]);

      setCaseFormOpen(false);
      setFormYouthName("");
      setFormNote("");
      setFormSchool(null);
      setFormArea(null);
      setFormProject("Geen project");
      setFormInvolved("");
      setFormStartDate("");
      setFormEndDate("");
    } catch (e: any) {
      Alert.alert("Opslaan mislukt", e?.message || "Onbekende error");
    }
  };

  const handleSaveReportForm = async () => {
    if (!myUid) return;
    if (!formRepTitle.trim()) {
      Alert.alert("Titel nodig", "Vul minimaal een titel in.");
      return;
    }

    try {
      const payload = {
        title: formRepTitle.trim(),
        worker_id: myUid,
        location: formRepLocation.trim() || "Onbekende locatie",
        pillar: formRepPillar,
        youth_count: Number(formRepYouthCount || 0),
        note: formRepNote.trim() || "",
        area: formRepArea || "",
        project: formRepProject === "Geen project" ? null : formRepProject,
        methodiek: formRepMethodiek,
        linked_case_id: null,
      };

      const { data, error } = await supabase
        .from("reports")
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;

      const usersById = myProfile ? { [myProfile.id]: myProfile } : {};
      const mapped = mapReportRowToItem(data as ReportRow, usersById);

      setReports((prev) => [mapped, ...prev]);

      setReportFormOpen(false);
      setFormRepTitle("");
      setFormRepLocation("");
      setFormRepNote("");
      setFormRepArea(null);
      setFormRepProject("Geen project");
    } catch (e: any) {
      Alert.alert("Opslaan mislukt", e?.message || "Onbekende error");
    }
  };

  const handleSaveAgendaForm = async () => {
    if (!myUid) return;
    if (!formAgTime.trim() || !formAgTitle.trim()) {
      Alert.alert("Incompleet", "Vul minimaal tijd en titel in.");
      return;
    }

    try {
      const payload = {
        worker_id: myUid,
        type: formAgType,
        time: formAgTime.trim(),
        title: formAgTitle.trim(),
        subtitle: formAgSubtitle.trim() || "",
        location: formAgLocation.trim() || "",
        case_id: formAgType === "Casus" ? formAgCaseId : null,
        report_id: formAgType === "Rapportage" ? formAgReportId : null,
      };

      const { data, error } = await supabase
        .from("agenda")
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;

      const relatedCase = data.case_id
        ? cases.find((c) => c.id === data.case_id)
        : undefined;
      const relatedReport = data.report_id
        ? reports.find((r) => r.id === data.report_id)
        : undefined;

      const mapped: AgendaItem = {
        id: data.id,
        time: data.time || "",
        title: data.title || "",
        subtitle: data.subtitle || "",
        location: data.location || "",
        type: data.type,
        pillar: relatedCase?.pillar || relatedReport?.pillar,
        relatedCaseId: data.case_id || undefined,
        relatedReportId: data.report_id || undefined,
      };

      setAgendaItems((prev) => [...prev, mapped].sort((a, b) => a.time.localeCompare(b.time)));

      setAgendaFormOpen(false);
      setFormAgTitle("");
      setFormAgSubtitle("");
      setFormAgLocation("");
      setFormAgTime("15:00");
      setFormAgType("Casus");
      setFormAgCaseId(null);
      setFormAgReportId(null);
    } catch (e: any) {
      Alert.alert("Opslaan mislukt", e?.message || "Onbekende error");
    }
  };

  // Betrokkene opslaan
  const handleSaveContact = async () => {
    if (!myUid || !selectedCase) return;
    if (!ctName.trim()) {
      Alert.alert("Naam nodig", "Vul minimaal een naam in.");
      return;
    }

    try {
      const payload = {
        case_id: selectedCase.id,
        name: ctName.trim(),
        role: ctRole.trim() || null,
        relation: ctRelation.trim() || null,
        organisation: ctOrg.trim() || null,
        phone: ctPhone.trim() || null,
        email: ctEmail.trim() || null,
      };

      const { data, error } = await supabase
        .from("case_contacts")
        .insert(payload)
        .select("*")
        .single();

      if (error) throw error;

      setCases((prev) =>
        prev.map((c) =>
          c.id === selectedCase.id
            ? {
                ...c,
                contacts: [
                  ...(c.contacts || []),
                  {
                    id: data.id,
                    name: data.name,
                    role: data.role || "",
                    relation: data.relation || "",
                    organisation: data.organisation || undefined,
                    phone: data.phone || undefined,
                    email: data.email || undefined,
                  },
                ],
              }
            : c
        )
      );

      setSelectedCase((prev) =>
        prev
          ? {
              ...prev,
              contacts: [
                ...(prev.contacts || []),
                {
                  id: data.id,
                  name: data.name,
                  role: data.role || "",
                  relation: data.relation || "",
                  organisation: data.organisation || undefined,
                  phone: data.phone || undefined,
                  email: data.email || undefined,
                },
              ],
            }
          : prev
      );

      setContactOpen(false);
      setCtName("");
      setCtRole("");
      setCtRelation("");
      setCtOrg("");
      setCtPhone("");
      setCtEmail("");
    } catch (e: any) {
      Alert.alert("Opslaan mislukt", e?.message || "Onbekende error");
    }
  };

  // Tijdslijn / doel opslaan
  const handleSaveGoal = async () => {
    if (!myUid || !selectedCase) return;
    if (!gTitle.trim()) {
      Alert.alert("Titel nodig", "Vul minimaal een titel in.");
      return;
    }

    try {
      const payload = {
        case_id: selectedCase.id,
        title: gTitle.trim(),
        date_label: gDateLabel.trim() || null,
        duration_label: gDurationLabel.trim() || null,
        status: gStatus,
        pillar: gPillar || null,
      };

      const { data, error } = await supabase
        .from("case_goals")
        .insert(payload)
        .select("*")
        .single();

      if (error) throw error;

      const mappedGoal = {
        id: data.id,
        title: data.title,
        dateLabel: data.date_label || "",
        durationLabel: data.duration_label || "",
        status: (data.status as CaseGoalStatus) || "open",
        pillar: (data.pillar as PillarKey) || undefined,
      };

      setCases((prev) =>
        prev.map((c) =>
          c.id === selectedCase.id ? { ...c, goals: [...(c.goals || []), mappedGoal] } : c
        )
      );

      setSelectedCase((prev) =>
        prev ? { ...prev, goals: [...(prev.goals || []), mappedGoal] } : prev
      );

      setGoalOpen(false);
      setGTitle("");
      setGDateLabel("");
      setGDurationLabel("");
      setGStatus("open");
      setGPillar(null);
    } catch (e: any) {
      Alert.alert("Opslaan mislukt", e?.message || "Onbekende error");
    }
  };

  const linkedReportsForSelectedCase = React.useMemo(() => {
    if (!selectedCase) return [];
    return reports.filter((r) => r.linkedCaseId === selectedCase.id);
  }, [reports, selectedCase]);

  const linkedCaseForSelectedReport = React.useMemo(() => {
    if (!selectedReport?.linkedCaseId) return null;
    return cases.find((c) => c.id === selectedReport.linkedCaseId) || null;
  }, [selectedReport, cases]);
  return (
    <View style={{ flex: 1, backgroundColor: MW.bg }}>
      <StatusBar barStyle="light-content" />

      <WorkspaceHeader
        title="Workspace"
        onPressSearch={() => setSearchOpen(true)}
        onPressBell={() => setBellOpen(true)}
      />

      {loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={MW.green} />
          <Text style={{ marginTop: 8, color: MW.subtle }}>Workspace laden...</Text>
        </View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingBottom: 30 }}
        >
          {/* Noodknop bovenaan */}
          <View style={{ paddingHorizontal: 14, marginTop: 10 }}>
            <TouchableOpacity
              onPress={handleNoodknopPress}
              activeOpacity={0.85}
              style={styles.emergencyButton}
            >
              <View style={styles.emergencyContent}>
                <Feather name="alert-triangle" size={22} color="#FFF" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.emergencyTitle}>Meldcode / Noodsituatie</Text>
                  <Text style={styles.emergencySubtitle}>
                    Start noodmodus bij onveilige situaties (ambulant of op school).
                  </Text>
                </View>
                <Feather name="chevron-right" size={22} color="#FFF" />
              </View>
            </TouchableOpacity>
          </View>

          <KpiRow cases={cases} reports={reports} />

          {isManager && (
            <View style={styles.managerSummary}>
              <Text style={styles.managerTitle}>Team KPI (manager)</Text>
              <Text style={styles.managerSubtitle}>
                Open casussen: {cases.filter((c) => c.status === "open").length} • Afgesloten:{" "}
                {cases.filter((c) => c.status === "closed").length}
              </Text>
            </View>
          )}

          <FilterRow activeFilter={activeFilter} setActiveFilter={setActiveFilter} />

          {/* Locatiekaart */}
          <View style={styles.locationCard}>
            <Text style={styles.locationCardTitle}>Locaties & gebieden</Text>
            <Text style={styles.locationCardSub}>
              Filter de lijst op school of ambulant gebied.
            </Text>
            <LocationMiniRow
              selected={selectedLocation}
              onSelect={setSelectedLocation}
            />
          </View>

          <View style={styles.tabRow}>
  {["Casussen", "Rapportages", "Agenda", "Analyse"].map((label, i) => {
    const active = pagerIndex === i;
    return (
      <TouchableOpacity
        key={label}
        onPress={() => goToPage(i)}
        style={[styles.tabChip, active && styles.tabChipActive]}
        activeOpacity={0.9}
      >
        <Text style={[styles.tabChipTxt, active && styles.tabChipTxtActive]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  })}
</View>


          <ScrollView
            ref={pagerRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handlePagerScroll}
            scrollEventThrottle={16}
          >
            {/* CASUSSEN */}
            <View style={{ width: W, paddingHorizontal: 14 }}>
              <CaseStatusRow
                active={caseStatusFilter}
                setActive={setCaseStatusFilter}
              />

              {filteredCases.length === 0 ? (
                <Text style={styles.emptyText}>
                  Nog geen casussen. Klik op + om te starten.
                </Text>
              ) : (
                filteredCases.map((c) => (
                  <CaseCard
                    key={c.id}
                    item={c}
                    onOpenDetail={handleOpenCase}
                    onToggleLike={handleToggleLike}
                    onToggleSave={handleToggleSave}
                    onAddComment={openCommentForCase}
                  />
                ))
              )}
            </View>

            {/* RAPPORTAGES */}
            <View style={{ width: W, paddingHorizontal: 14 }}>
              {filteredReports.length === 0 ? (
                <Text style={styles.emptyText}>Nog geen rapportages. Klik op +.</Text>
              ) : (
                filteredReports.map((r) => (
                  <ReportCard
                    key={r.id}
                    item={r}
                    onOpen={() => handleOpenReport(r)}
                    onLike={handleLikeReport}
                    onComment={handleCommentReport}
                  />
                ))
              )}
            </View>

             {/* AGENDA */}
  <View style={{ width: W, paddingHorizontal: 14 }}>
    <AgendaSection
      items={filteredAgenda}
      activeFilter={agendaFilter}
      setActiveFilter={setAgendaFilter}
      onPressItem={handleOpenAgendaItem}
    />
  </View>

  {/* ANALYSE (subtab) */}
  <View style={{ width: W, paddingHorizontal: 14 }}>
    <AnalyseSubPage cases={cases} reports={reports} />
  </View>
</ScrollView>

        </ScrollView>
      )}

      <TouchableOpacity style={styles.fab} onPress={handleAdd} activeOpacity={0.9}>
        <Feather name="plus" size={22} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Detail modals */}
      <CaseDetailModal
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        item={selectedCase}
        linkedReports={linkedReportsForSelectedCase}
        onToggleStatus={handleToggleCaseStatus}
        isManager={isManager}
        onReassign={handleReassignCase}
        onOpenAddContact={() => setContactOpen(true)}
        onOpenAddGoal={() => setGoalOpen(true)}
      />

      <ReportDetailModal
        visible={reportDetailVisible}
        onClose={() => setReportDetailVisible(false)}
        item={selectedReport}
        linkedCase={linkedCaseForSelectedReport}
        onOpenLinkSheet={() => setLinkSheetVisible(true)}
      />

      <LinkReportToCaseModal
        visible={linkSheetVisible}
        onClose={() => setLinkSheetVisible(false)}
        report={selectedReport}
        cases={cases}
        onLink={async (caseId: string) => {
          if (!selectedReport) return;
          await supabase
            .from("reports")
            .update({ linked_case_id: caseId })
            .eq("id", selectedReport.id);
          setReports((prev) =>
            prev.map((r) =>
              r.id === selectedReport.id ? { ...r, linkedCaseId: caseId } : r
            )
          );
          setLinkSheetVisible(false);
        }}
        onCreateNew={() => {
          setLinkSheetVisible(false);
          setReportDetailVisible(false);
          setCaseFormOpen(true);
          setFormYouthName("");
          setFormNote(`Rapportage "${selectedReport?.title}" gekoppeld.`);
        }}
      />

      {/* Form modals */}
      <CaseFormModal
        visible={caseFormOpen}
        onClose={() => setCaseFormOpen(false)}
        onSave={handleSaveCaseForm}
        formYouthName={formYouthName}
        setFormYouthName={setFormYouthName}
        formSchool={formSchool}
        setFormSchool={setFormSchool}
        formArea={formArea}
        setFormArea={setFormArea}
        formPillar={formPillar}
        setFormPillar={setFormPillar}
        formMethodiek={formMethodiek}
        setFormMethodiek={setFormMethodiek}
        formProject={formProject}
        setFormProject={setFormProject}
        formNote={formNote}
        setFormNote={setFormNote}
        formInvolved={formInvolved}
        setFormInvolved={setFormInvolved}
        formStartDate={formStartDate}
        setFormStartDate={setFormStartDate}
        formEndDate={formEndDate}
        setFormEndDate={setFormEndDate}
      />

      <ReportFormModal
        visible={reportFormOpen}
        onClose={() => setReportFormOpen(false)}
        onSave={handleSaveReportForm}
        formRepTitle={formRepTitle}
        setFormRepTitle={setFormRepTitle}
        formRepLocation={formRepLocation}
        setFormRepLocation={setFormRepLocation}
        formRepPillar={formRepPillar}
        setFormRepPillar={setFormRepPillar}
        formRepYouthCount={formRepYouthCount}
        setFormRepYouthCount={setFormRepYouthCount}
        formRepArea={formRepArea}
        setFormRepArea={setFormRepArea}
        formRepMethodiek={formRepMethodiek}
        setFormRepMethodiek={setFormRepMethodiek}
        formRepProject={formRepProject}
        setFormRepProject={setFormRepProject}
        formRepNote={formRepNote}
        setFormRepNote={setFormRepNote}
      />

      <AgendaFormModal
        visible={agendaFormOpen}
        onClose={() => setAgendaFormOpen(false)}
        onSave={handleSaveAgendaForm}
        formAgType={formAgType}
        setFormAgType={setFormAgType}
        formAgTime={formAgTime}
        setFormAgTime={setFormAgTime}
        formAgTitle={formAgTitle}
        setFormAgTitle={setFormAgTitle}
        formAgSubtitle={formAgSubtitle}
        setFormAgSubtitle={setFormAgSubtitle}
        formAgLocation={formAgLocation}
        setFormAgLocation={setFormAgLocation}
        formAgCaseId={formAgCaseId}
        setFormAgCaseId={setFormAgCaseId}
        formAgReportId={formAgReportId}
        setFormAgReportId={setFormAgReportId}
        cases={cases}
        reports={reports}
      />

      {/* Search + Bell */}
      <SearchModal
        visible={searchOpen}
        onClose={() => setSearchOpen(false)}
        value={searchQuery}
        onChangeValue={setSearchQuery}
        onSubmit={() => setSearchOpen(false)}
      />

      <BellModal
        visible={bellOpen}
        onClose={() => setBellOpen(false)}
        cases={cases}
        reports={reports}
      />

      {/* Comments modal */}
      <CommentModal
        visible={commentOpen}
        onClose={() => setCommentOpen(false)}
        onSubmit={submitComment}
        value={commentText}
        setValue={setCommentText}
      />

      {/* Betrokkene modal */}
      <AddContactModal
        visible={contactOpen}
        onClose={() => setContactOpen(false)}
        onSave={handleSaveContact}
        name={ctName}
        setName={setCtName}
        role={ctRole}
        setRole={setCtRole}
        relation={ctRelation}
        setRelation={setCtRelation}
        organisation={ctOrg}
        setOrganisation={setCtOrg}
        phone={ctPhone}
        setPhone={setCtPhone}
        email={ctEmail}
        setEmail={setCtEmail}
      />

      {/* Tijdslijn / doel modal */}
      <AddGoalModal
        visible={goalOpen}
        onClose={() => setGoalOpen(false)}
        onSave={handleSaveGoal}
        title={gTitle}
        setTitle={setGTitle}
        dateLabel={gDateLabel}
        setDateLabel={setGDateLabel}
        durationLabel={gDurationLabel}
        setDurationLabel={setGDurationLabel}
        status={gStatus}
        setStatus={setGStatus}
        pillar={gPillar}
        setPillar={setGPillar}
      />

      {/* Emergency modal */}
      <EmergencyModal
        visible={emergencyOpen}
        onClose={() => setEmergencyOpen(false)}
        recordingActive={!!emergencyRecording}
        starting={emergencyStarting}
        onStart={startEmergencyRecording}
        onStop={stopEmergencyRecording}
        onMarkSafe={markEmergencySafe}
        onOpenMeldcode={handleOpenMeldcodeFromEmergency}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: MW.green,
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  headerRight: { flexDirection: "row", gap: 14 },

  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center" },

  filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 14, marginTop: 8 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#F1F5F9",
  },
  filterChipActive: { backgroundColor: MW.blue },
  filterChipText: { color: MW.sub, fontWeight: "700", fontSize: 12 },
  filterChipTextActive: { color: "#FFF" },

  statusRow: { flexDirection: "row", gap: 8, paddingHorizontal: 2, marginTop: 10 },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#F1F5F9",
  },
  statusChipActive: { backgroundColor: MW.green },
  statusChipText: { color: MW.sub, fontWeight: "800", fontSize: 12 },
  statusChipTextActive: { color: "#FFF" },

  locationMiniScroll: {
    paddingVertical: 4,
    paddingRight: 4,
  },
  locationMiniChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#F8FAFC",
    marginRight: 6,
    borderWidth: 1,
    borderColor: MW.border,
  },
  locationMiniChipActive: { backgroundColor: MW.soft, borderColor: MW.green },
  locationMiniText: { fontSize: 12, color: MW.subtle, fontWeight: "700" },
  locationMiniTextActive: { color: MW.text },

  locationCard: {
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 6,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: MW.border,
  },
  locationCardTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: MW.text,
  },
  locationCardSub: {
    fontSize: 11,
    fontWeight: "700",
    color: MW.subtle,
    marginTop: 2,
    marginBottom: 4,
  },

  kpiRow: { flexDirection: "row", gap: 8, padding: 14 },
  kpiItem: {
    flex: 1,
    backgroundColor: MW.surface,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: MW.border,
  },
  kpiValue: { fontWeight: "900", fontSize: 18, color: MW.text },
  kpiLabel: { fontSize: 11, color: MW.subtle, marginTop: 2, fontWeight: "700" },
  kpiBarTrack: { height: 6, borderRadius: 999, backgroundColor: "#EEF2F7", marginTop: 8 },
  kpiBarFill: { height: 6, borderRadius: 999, backgroundColor: MW.green },

  managerSummary: {
    marginHorizontal: 14,
    marginTop: 10,
    backgroundColor: "#0F172A",
    borderRadius: 16,
    padding: 12,
  },
  managerBox: {
    marginTop: 14,
    backgroundColor: "#0F172A",
    borderRadius: 16,
    padding: 12,
  },
  managerTitle: { color: "#FFF", fontWeight: "900", fontSize: 14 },
  managerSubtitle: { color: "#CBD5E1", fontWeight: "700", marginTop: 4, fontSize: 12 },
  managerBtn: {
    marginTop: 10,
    backgroundColor: MW.blue,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  managerBtnTxt: { color: "#FFF", fontWeight: "900" },

  smallAddBtn: {
    backgroundColor: MW.green,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  smallAddTxt: { color: "#FFF", fontWeight: "900", fontSize: 11 },

  pillarChip: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillarChipText: { fontWeight: "800", fontSize: 11 },

  feedCardWrapper: { marginTop: 12 },
  feedCardBg: { height: 210, borderRadius: 24, overflow: "hidden" },
  feedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  closedBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    zIndex: 3,
  },
  closedBadgeTxt: { color: "#FFF", fontSize: 11, fontWeight: "900" },

  feedTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 12,
    alignItems: "center",
  },
  feedWorkerRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  workerAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: "#FFF" },
  workerName: { color: "#FFF", fontWeight: "900", fontSize: 13 },
  workerRole: { color: "#E2E8F0", fontSize: 11, fontWeight: "700" },
  yearLabel: { color: "#FFF", fontWeight: "800", fontSize: 12 },

  youthName: { color: "#FFF", fontSize: 20, fontWeight: "900" },
  locationText: { color: "#E2E8F0", marginTop: 6, fontSize: 12, fontWeight: "700" },

  feedBottomRow: {
    position: "absolute",
    bottom: 10,
    left: 14,
    right: 14,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  reactionsLine: { color: "#FFF", fontWeight: "800", fontSize: 12 },
  messageLine: { color: "#E2E8F0", fontSize: 12, marginTop: 3 },
  actionBar: { flexDirection: "row", gap: 10 },
  actionBtn: { alignItems: "center" },
  actionCount: { color: "#FFF", fontSize: 10, marginTop: 2, fontWeight: "800" },

  reportCard: {
    backgroundColor: MW.surface,
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: MW.border,
  },
  reportBottomRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reportPill: {
    backgroundColor: "#ECFDF3",
    color: "#15803D",
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 11,
  },

  tabRow: { flexDirection: "row", gap: 8, paddingHorizontal: 14, marginTop: 12 },
  tabChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
  },
  tabChipActive: { backgroundColor: MW.green },
  tabChipTxt: { fontSize: 12, fontWeight: "800", color: MW.subtle },
  tabChipTxtActive: { color: "#FFF" },

  emptyText: { padding: 18, textAlign: "center", color: MW.subtle, fontWeight: "700" },

  agendaCard: {
    marginTop: 12,
    backgroundColor: MW.surface,
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: MW.border,
  },
  agendaHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  agendaTitle: { fontSize: 16, fontWeight: "900", color: MW.text },
  agendaSubtitle: { fontSize: 12, fontWeight: "700", color: MW.subtle, marginTop: 2 },
  agendaLegend: { flexDirection: "row", gap: 6, alignItems: "center" },
  agendaLegendDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: MW.red },
  agendaLegendText: { fontSize: 11, fontWeight: "800", color: MW.subtle },

  agendaFilterRow: { flexDirection: "row", gap: 6, marginTop: 8, flexWrap: "wrap" },
  agendaFilterChip: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  agendaFilterChipActive: { backgroundColor: MW.blue },
  agendaFilterText: { fontSize: 11, fontWeight: "800", color: MW.subtle },
  agendaFilterTextActive: { color: "#FFF" },

  agendaItemRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  agendaTimeCol: { width: 56, alignItems: "center" },
  agendaTimeText: { fontWeight: "900", color: MW.text, fontSize: 12 },
  agendaTimeDotLineWrapper: { alignItems: "center" },
  agendaTimeDot: { width: 9, height: 9, borderRadius: 4.5, marginTop: 6 },
  agendaTimeLine: { width: 2, height: 40, backgroundColor: "#E2E8F0", marginTop: 4 },

  agendaContentCol: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 14,
  },
  agendaItemHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  agendaItemTitle: { fontWeight: "900", color: MW.text, fontSize: 13, flex: 1 },
  agendaTypePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginLeft: 6,
  },
  agendaTypeText: { fontSize: 10, fontWeight: "900", color: MW.subtle },
  agendaItemSubtitle: { fontSize: 12, color: MW.sub, marginTop: 4, fontWeight: "700" },
  agendaItemLocation: { fontSize: 11, color: MW.subtle, marginTop: 6 },

  agendaEmptyText: { color: MW.subtle, fontWeight: "700", marginTop: 8 },

  fab: {
    position: "absolute",
    right: 16,
    bottom: 22,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: MW.green,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },

  formContainer: { flex: 1, backgroundColor: MW.bg },
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: MW.border,
  },
  formTitle: { fontSize: 16, fontWeight: "900", color: MW.text },

  formLabel: { fontSize: 12, fontWeight: "800", color: MW.subtle, marginTop: 12 },
  input: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 6,
    fontWeight: "700",
    color: MW.text,
  },
  textArea: { minHeight: 90, textAlignVertical: "top" },

  chipSelectorRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 6 },
  formChip: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 999,
  },
  formChipActive: { backgroundColor: MW.green },
  formChipText: { fontSize: 11, fontWeight: "800", color: MW.subtle },
  formChipTextActive: { color: "#FFF" },

  formPrimaryBtn: {
    marginTop: 18,
    backgroundColor: MW.green,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  formPrimaryTxt: { color: "#FFF", fontWeight: "900" },

  detailContainer: { flex: 1, backgroundColor: MW.bg },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: MW.border,
  },
  detailTitle: { fontSize: 16, fontWeight: "900", color: MW.text },

  detailTopCard: {
    marginTop: 14,
    backgroundColor: MW.surface,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: MW.border,
  },
  detailAvatar: { width: 52, height: 52, borderRadius: 26 },
  detailYouthName: { fontSize: 18, fontWeight: "900", color: MW.text },
  detailWorkerLine: { fontSize: 12, color: MW.subtle, fontWeight: "800", marginTop: 2 },
  detailMetaLine: { fontSize: 12, color: MW.sub, fontWeight: "700", marginTop: 2 },

  linkSheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.4)",
    justifyContent: "flex-end",
  },
  linkSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  linkSheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    marginBottom: 8,
  },
  linkSheetTitle: { fontSize: 16, fontWeight: "800", color: MW.text },
  linkSheetSubtitle: { fontSize: 12, color: MW.subtle, marginTop: 2 },
  linkCaseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: MW.border,
  },
  linkCaseAvatarWrapper: { width: 38, height: 38, borderRadius: 19, overflow: "hidden" },
  linkCaseAvatar: { width: "100%", height: "100%" },
  linkCaseName: { fontSize: 13, fontWeight: "700", color: MW.text },
  linkCaseMeta: { fontSize: 11, color: MW.subtle, marginTop: 2 },
  linkCaseSubMeta: { fontSize: 11, color: MW.subtle },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalSheet: {
    width: "90%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: MW.border,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: MW.text,
  },
  modalEmpty: {
    textAlign: "center",
    color: MW.subtle,
    fontWeight: "800",
    paddingVertical: 10,
  },

  searchInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: MW.border,
  },
  searchInput: {
    flex: 1,
    fontWeight: "700",
    color: MW.text,
    paddingVertical: 6,
  },

  notifyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: MW.border,
  },
  notifyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: MW.red,
  },
  notifyTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: MW.text,
  },
  notifySub: {
    fontSize: 11,
    color: MW.subtle,
    fontWeight: "700",
    marginTop: 2,
  },

  // Noodknop / meldcode
  emergencyButton: {
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#F97316",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  emergencyContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  emergencyTitle: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "900",
  },
  emergencySubtitle: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 12,
    marginTop: 2,
    fontWeight: "600",
  },

  /* ---------- Analyse / kaarten (Analyse-subtab) ---------- */
  card: {
    marginTop: 12,
    backgroundColor: MW.surface,
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: MW.border,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: MW.text,
  },
  cardSubtitle: {
    fontSize: 11,
    fontWeight: "700",
    color: MW.subtle,
    marginTop: 2,
  },

  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  smallStat: {
    flexBasis: (W - 14 * 2 - 8 * 2) / 2,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: MW.border,
  },
  smallStatValue: {
    fontSize: 16,
    fontWeight: "900",
    color: MW.text,
  },
  smallStatLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: MW.subtle,
    marginTop: 2,
  },

  minPlusBarTrack: {
    flexDirection: "row",
    height: 10,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(15,23,42,0.35)",
    marginTop: 12,
  },
  minPlusBarFillPlus: {
    backgroundColor: MW.green,
  },
  minPlusBarFillMin: {
    backgroundColor: MW.red,
  },
  minPlusLegendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  legendText: {
    color: "#E2E8F0",
    fontSize: 11,
    fontWeight: "700",
  },

  pillarName: {
    fontSize: 12,
    fontWeight: "800",
    color: MW.text,
    marginBottom: 4,
  },
  pillarBarTrack: {
    flexDirection: "row",
    height: 7,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
    marginTop: 6,
  },
  pillarBarPlus: {
    backgroundColor: MW.green,
  },
  pillarBarMin: {
    backgroundColor: "#FCA5A5",
  },
  pillarValue: {
    marginTop: 4,
    fontSize: 11,
    color: MW.sub,
    fontWeight: "700",
  },

  areaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: MW.border,
  },
  areaLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: MW.text,
  },
  areaSub: {
    fontSize: 11,
    color: MW.subtle,
    marginTop: 2,
    fontWeight: "700",
  },
  areaBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#0F172A",
  },
  areaBadgeText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "800",
  },

     // === Analyse sectie / dashboard ===
  analysisSection: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 30,
  },

  // HERO card
  analysisHeroCard: {
    backgroundColor: MW.blue,
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  analysisHeroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  analysisHeroTitle: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "900",
  },
  analysisHeroSub: {
    color: "rgba(241,245,249,0.9)",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  analysisHeroChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.45)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.8)",
  },
  analysisHeroChipText: {
    color: "#E5E7EB",
    fontSize: 11,
    fontWeight: "800",
  },
  analysisHeroStatsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  analysisHeroStatBox: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  analysisHeroStatLabel: {
    color: "rgba(226,232,240,0.9)",
    fontSize: 11,
    fontWeight: "700",
  },
  analysisHeroStatValue: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "900",
    marginTop: 2,
  },
  analysisHeroStatSub: {
    color: "rgba(148,163,184,0.9)",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  analysisChartTrack: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    backgroundColor: "rgba(15,23,42,0.35)",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 4,
  },
  analysisChartBar: {
    width: 6,
    borderRadius: 999,
    backgroundColor: "#BBF7D0",
  },

  // Cards algemeen
  analysisCard: {
    backgroundColor: MW.surface,
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: MW.border,
    marginTop: 12,
  },
  analysisCardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  analysisCardTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: MW.text,
  },
  analysisCardSub: {
    fontSize: 11,
    fontWeight: "700",
    color: MW.subtle,
    marginTop: 2,
  },
  analysisSmallBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: MW.subtle,
  },

  analysisMutedText: {
    fontSize: 11,
    fontWeight: "700",
    color: MW.subtle,
  },

  // Circles / balans
  analysisCircleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
  },
  analysisCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  analysisCircleInnerPlus: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 3,
    borderColor: MW.green + "CC",
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  analysisCircleInnerMin: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 3,
    borderColor: MW.red + "CC",
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
  },
  analysisCircleValue: {
    fontSize: 18,
    fontWeight: "900",
    color: MW.text,
  },
  analysisCircleLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: MW.subtle,
  },
  analysisCircleLegend: {
    flex: 1,
    marginLeft: 4,
  },

  // Pijlers
  analysisPillarRow: {
    marginTop: 10,
  },
  analysisPillarHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  pillarIconDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pillarTileTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: MW.text,
    flex: 1,
  },
 

  // Kerncijfers grid
  analysisKpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },


});

