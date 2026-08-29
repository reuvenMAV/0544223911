import { describe, expect, it } from "vitest";
import {
  createAutomationSchema,
  isActiveForCampaignSave,
  NEW_CAMPAIGN_DEFAULT_IS_ACTIVE,
  updateAutomationSchema,
} from "../lib/campaigns/schema";

const validCreateBody = {
  name: "Paused draft",
  instagramAccountId: "ig_acct_1",
  postId: "17991735437798494",
  postUrl: "https://www.instagram.com/p/DVGtPlEDWXr/",
  keywords: ["צאט"],
  dmMessage: "Hello {username}",
  isActive: false,
};

describe("new campaign save defaults", () => {
  it("saves new campaigns paused and leaves edit saves on the current flag", () => {
    expect(NEW_CAMPAIGN_DEFAULT_IS_ACTIVE).toBe(false);
    expect(isActiveForCampaignSave("new", true)).toBe(false);
    expect(isActiveForCampaignSave("new", false)).toBe(false);
    expect(isActiveForCampaignSave("edit", false)).toBe(false);
    expect(isActiveForCampaignSave("edit", true)).toBe(true);
  });
});

describe("POST /api/automations create payload", () => {
  it("accepts isActive: false and returns a paused campaign", () => {
    const parsed = createAutomationSchema.safeParse(validCreateBody);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.isActive).toBe(false);
    }
  });

  it("defaults omitted isActive to paused so POST cannot go live by accident", () => {
    const withoutFlag = {
      name: validCreateBody.name,
      instagramAccountId: validCreateBody.instagramAccountId,
      postId: validCreateBody.postId,
      postUrl: validCreateBody.postUrl,
      keywords: validCreateBody.keywords,
      dmMessage: validCreateBody.dmMessage,
    };
    const parsed = createAutomationSchema.safeParse(withoutFlag);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.isActive).toBe(false);
    }
  });

  it("still allows an explicit live create for callers that pass true", () => {
    const parsed = createAutomationSchema.safeParse({
      ...validCreateBody,
      isActive: true,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.isActive).toBe(true);
    }
  });
});

describe("PATCH /api/automations is the only activation path", () => {
  it("does not default PATCH to live; isActive true must be sent explicitly", () => {
    const parsed = updateAutomationSchema.safeParse({ name: "Keep paused" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.isActive).toBeUndefined();
    }
  });

  it("accepts isActive true on PATCH", () => {
    const parsed = updateAutomationSchema.safeParse({ isActive: true });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.isActive).toBe(true);
    }
  });
});
