// auth/roles.ts

// Officiële rollen in jouw app
export type AppRole =
  | "jongere"
  | "jongerenwerker"
  | "manager"
  | "admin"
  | null;

// Standaard tab names in je app
export type TabName =
  | "index"
  | "friends"
  | "upload"
  | "workspace"
  | "kennisHub"
  | "inbox"
  | "profiel";

/**
 * Role-based tab permissions
 * Dit bepaalt welke TAB zichtbaar is voor welke rol.
 * _layout.tsx gebruikt dit om tabs wel/niet te tonen.
 */
export function canSeeTab(role: AppRole, tabName: TabName): boolean {
  if (!role) return false;

  // ------------------------
  // ADMIN → mag alles
  // ------------------------
  if (role === "admin") return true;

  // ------------------------
  // JONGERE
  // TikTok style: Feed, Friends, Upload, Inbox, Profiel
  // ------------------------
  if (role === "jongere") {
    return (
      tabName === "index" ||
      tabName === "friends" ||
      tabName === "upload" ||
      tabName === "inbox" ||
      tabName === "profiel"
    );
  }

  // ------------------------
  // MANAGER
  // - Geen Inbox (AVG)
  // - Geen Upload / Friends
  // - Heeft toegang tot Workspace + KennisHub
  // ------------------------
  if (role === "manager") {
    return (
      tabName === "index" ||
      tabName === "workspace" ||
      tabName === "kennisHub" ||
      tabName === "profiel"
    );
  }

  // ------------------------
  // JONGERENWERKER
  // - Feed
  // - Workspace
  // - KennisHub
  // - Inbox
  // - Profiel
  // ------------------------
  if (role === "jongerenwerker") {
    return (
      tabName === "index" ||
      tabName === "workspace" ||
      tabName === "kennisHub" ||
      tabName === "inbox" ||
      tabName === "profiel"
    );
  }

  return false;
}
