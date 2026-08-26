import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildSignInEmail,
  isTestOrPlaceholderSender,
  parseSenderHost,
  postResendEmail,
  recipientDomain,
  sendVerificationRequest,
  summarizeResendFailure,
} from "../lib/auth-email";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("email sender helpers", () => {
  it("detects Resend test and placeholder from addresses", () => {
    expect(parseSenderHost("OpenReply <onboarding@resend.dev>")).toBe(
      "resend.dev"
    );
    expect(isTestOrPlaceholderSender("OpenReply <onboarding@resend.dev>")).toBe(
      true
    );
    expect(isTestOrPlaceholderSender("OpenReply <login@example.com>")).toBe(
      true
    );
    expect(
      isTestOrPlaceholderSender("OpenReply <noreply@mavash.net>")
    ).toBe(false);
  });

  it("builds a sign-in payload with the public host and the magic-link URL", () => {
    const url =
      "https://openreply.mavash.net/api/auth/callback/resend?callbackUrl=%2Fsettings&token=abc&email=user%40example.com";
    const email = buildSignInEmail("openreply.mavash.net", url);
    expect(email.subject).toBe("Sign in to openreply.mavash.net");
    expect(email.text).toContain("https://openreply.mavash.net/api/auth/callback/resend");
    expect(email.html).toContain(url);
    expect(email.html).not.toContain("localhost");
    expect(recipientDomain("bitreuven@gmail.com")).toBe("gmail.com");
  });
});

describe("postResendEmail", () => {
  it("POSTs to Resend with a User-Agent and returns the message id", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({ id: "msg_123" }),
    });

    const result = await postResendEmail({
      apiKey: "re_test",
      from: "OpenReply <noreply@mavash.net>",
      to: "bitreuven@gmail.com",
      subject: "Sign in to openreply.mavash.net",
      html: "<p>link</p>",
      text: "link",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result).toEqual({ status: 200, id: "msg_123" });
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [, init] = fetchImpl.mock.calls[0];
    expect(init.headers["User-Agent"]).toBe("openreply/1.0");
    expect(init.headers.Authorization).toBe("Bearer re_test");
    const payload = JSON.parse(init.body as string);
    expect(payload.from).toBe("OpenReply <noreply@mavash.net>");
    expect(payload.to).toBe("bitreuven@gmail.com");
    expect(payload.subject).toBe("Sign in to openreply.mavash.net");
  });
});

describe("sendVerificationRequest", () => {
  it("throws a provider error without putting the magic-link URL in the log", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 403,
        json: async () => ({
          name: "validation_error",
          message: "The mavash.net domain is not verified.",
        }),
      })
    );

    const url =
      "https://openreply.mavash.net/api/auth/callback/resend?token=super-secret-token";

    await expect(
      sendVerificationRequest({
        identifier: "bitreuven@gmail.com",
        url,
        provider: {
          apiKey: "re_test",
          from: "OpenReply <noreply@mavash.net>",
        },
      })
    ).rejects.toThrow(/validation_error/);

    const logged = JSON.stringify(errorSpy.mock.calls);
    expect(logged).not.toContain("super-secret-token");
    expect(logged).not.toContain("re_test");
    expect(logged).toContain("gmail.com");
    expect(summarizeResendFailure({ status: 403, name: "validation_error" })).toContain(
      "status=403"
    );
  });

  it("fails closed when the API key is missing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      sendVerificationRequest({
        identifier: "bitreuven@gmail.com",
        url: "https://openreply.mavash.net/api/auth/callback/resend?token=x",
        provider: { apiKey: "missing-resend-api-key", from: "a@b.com" },
      })
    ).rejects.toThrow("Email provider is not configured");
  });
});
