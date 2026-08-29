import { describe, expect, it } from "vitest";
import { parseTelegramCommand, getStaticCommandReply } from "@/lib/telegram/commands";

describe("telegram commands", () => {
  it("parses supported commands", () => {
    expect(parseTelegramCommand("/start")).toEqual({
      command: "start",
      args: "",
    });
    expect(parseTelegramCommand("/link AB12CD")).toEqual({
      command: "link",
      args: "AB12CD",
    });
    expect(parseTelegramCommand("/help@MyBot")).toEqual({
      command: "help",
      args: "",
    });
  });

  it("returns null for non-commands", () => {
    expect(parseTelegramCommand("hello")).toBeNull();
    expect(parseTelegramCommand("/unknown")).toBeNull();
  });

  it("returns static help and web replies", () => {
    expect(getStaticCommandReply("help")).toContain("/start");
    expect(getStaticCommandReply("web", { webUrl: "https://example.com" })).toContain(
      "https://example.com",
    );
  });
});
