/**
 * Magic-link mail transport for Auth.js.
 *
 * Auth.js's built-in Resend provider does not log provider errors (status,
 * name, message id) and does not send a User-Agent. Resend documents that
 * requests without User-Agent are rejected with 403/1010 before they reach
 * the API. We wrap the same POST /emails call so failures are visible in
 * web logs without printing the magic-link URL or API key.
 */

export type SendVerificationRequestParams = {
  identifier: string;
  url: string;
  provider: {
    apiKey?: string;
    from?: string;
  };
};

export type ResendSendResult = {
  status: number;
  id?: string;
  name?: string;
  message?: string;
};

const TEST_SENDER_HOSTS = new Set(["resend.dev", "example.com"]);

export function parseSenderHost(from: string): string {
  const match = from.match(/@([^>\s]+)/);
  return (match?.[1] ?? "").trim().toLowerCase();
}

export function isTestOrPlaceholderSender(from: string): boolean {
  const host = parseSenderHost(from);
  if (!host) return true;
  if (TEST_SENDER_HOSTS.has(host)) return true;
  return host.endsWith(".resend.dev") || host.endsWith(".example.com");
}

export function recipientDomain(identifier: string): string {
  const at = identifier.lastIndexOf("@");
  return at === -1 ? "unknown" : identifier.slice(at + 1).toLowerCase();
}

export function buildSignInEmail(host: string, url: string): {
  subject: string;
  text: string;
  html: string;
} {
  const subject = `Sign in to ${host}`;
  const text = `Sign in to ${host}\n${url}\n\nIf you did not request this email you can ignore it.\n`;
  const html = `<body style="background:#f9f9f9">
  <table width="100%" cellpadding="0" cellspacing="20" style="max-width:600px;margin:auto;background:#fff;border-radius:10px">
    <tr><td align="center" style="padding:10px 0;font:22px Helvetica,Arial,sans-serif;color:#444">
      Sign in to <strong>${host.replace(/\./g, "&#8203;.")}</strong>
    </td></tr>
    <tr><td align="center" style="padding:20px 0">
      <a href="${url}" style="font:18px Helvetica,Arial,sans-serif;color:#fff;background:#346df1;text-decoration:none;border-radius:5px;padding:10px 20px;display:inline-block;font-weight:bold">Sign in</a>
    </td></tr>
    <tr><td align="center" style="padding:0 0 10px;font:16px/22px Helvetica,Arial,sans-serif;color:#444">
      If you did not request this email you can safely ignore it.
    </td></tr>
  </table>
</body>`;
  return { subject, text, html };
}

export function summarizeResendFailure(result: ResendSendResult): string {
  const parts = [`status=${result.status}`];
  if (result.name) parts.push(`name=${result.name}`);
  if (result.message) parts.push(`message=${result.message}`);
  return parts.join(" ");
}

export async function postResendEmail(input: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  fetchImpl?: typeof fetch;
}): Promise<ResendSendResult> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "openreply/1.0",
    },
    body: JSON.stringify({
      from: input.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  let payload: { id?: string; name?: string; message?: string } = {};
  try {
    payload = (await response.json()) as typeof payload;
  } catch {
    payload = {};
  }

  return {
    status: response.status,
    id: payload.id,
    name: payload.name,
    message: payload.message,
  };
}

export async function sendVerificationRequest(
  params: SendVerificationRequestParams
): Promise<void> {
  const to = params.identifier;
  const from = params.provider.from ?? "OpenReply <login@example.com>";
  const apiKey = params.provider.apiKey ?? "";
  const host = new URL(params.url).host;
  const email = buildSignInEmail(host, params.url);
  const requestId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`;

  if (!apiKey || apiKey === "missing-resend-api-key") {
    console.error("[auth][resend]", {
      requestId,
      error: "missing_api_key",
      toDomain: recipientDomain(to),
    });
    throw new Error("Email provider is not configured");
  }

  if (isTestOrPlaceholderSender(from)) {
    console.error("[auth][resend]", {
      requestId,
      error: "unverified_or_test_sender",
      fromHost: parseSenderHost(from),
      toDomain: recipientDomain(to),
    });
    throw new Error("Email sender is not a verified domain");
  }

  const result = await postResendEmail({
    apiKey,
    from,
    to,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });

  if (result.status < 200 || result.status >= 300) {
    console.error("[auth][resend]", {
      requestId,
      error: "send_failed",
      status: result.status,
      name: result.name,
      message: result.message,
      fromHost: parseSenderHost(from),
      toDomain: recipientDomain(to),
    });
    throw new Error(`Resend error: ${summarizeResendFailure(result)}`);
  }

  console.info("[auth][resend]", {
    requestId,
    status: result.status,
    id: result.id,
    fromHost: parseSenderHost(from),
    toDomain: recipientDomain(to),
    testSender: isTestOrPlaceholderSender(from),
  });
}
