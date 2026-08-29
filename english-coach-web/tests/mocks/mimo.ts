import { vi } from "vitest";

export const MIMO_MODEL = "mimo-v2.5-pro";
export const MIMO_BASE_URL = "https://api.xiaomimimo.com/v1";

export function mockMimoChatCompletion(content: string) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      choices: [{ message: { content } }],
    }),
  });
}

export function fixtureMimoJsonResponse(replyText: string) {
  return JSON.stringify({
    replyText,
    choices: [
      { id: "1", label: "א" },
      { id: "other", label: "אחר / הערות", opensTextInput: true },
    ],
    phase: "onboarding",
    progressSaved: true,
    meta: {},
  });
}
