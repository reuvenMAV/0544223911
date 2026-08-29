/** New campaigns are saved paused. Going live is a separate PATCH / Go Live. */
export const NEW_CAMPAIGN_DEFAULT_IS_ACTIVE = false;

export function isActiveForCampaignSave(
  mode: "new" | "edit",
  currentIsActive: boolean
): boolean {
  return mode === "new" ? NEW_CAMPAIGN_DEFAULT_IS_ACTIVE : currentIsActive;
}
