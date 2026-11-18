// Where the game is running: inside 52in1 (the library's frame hands it window.AIHubSettings), or in a
// 52in1 session (window.AIHub.active, set by the session client before the game's own scripts run).
type HubWindow = { AIHubSettings?: unknown; AIHub?: { active?: boolean } };
const w = (): HubWindow | null => (typeof window !== 'undefined' ? (window as unknown as HubWindow) : null);

/** True in a 52in1 session: the hub starts and ends rounds, so there is no title, saving or quitting. */
export const inSession = () => !!w()?.AIHub?.active;
/** True anywhere inside 52in1, which owns the window: no Game Mode prompt of the game's own. */
export const inHub = () => !!w()?.AIHubSettings || inSession();
