import type { TelegramCommand } from "@/lib/telegram/types";

const COMMAND_HELP: Record<TelegramCommand, string> = {
  start:
    "שלום! אני מורה אישי לאנגלית. שלחו /start כדי להתחיל, בחרו כפתור או כתבו הערה חופשית.",
  help:
    "פקודות:\n/start — התחלה\n/progress — התקדמות\n/web — קישור לאתר\n/link <קוד> — קישור לחשבון מהאתר\n/stop — עצירת הודעות לימודיות",
  progress: "",
  stop: "עצרתי הודעות לימודיות. שלחו /start כדי לחזור.",
  web: "",
  link: "",
};

export function parseTelegramCommand(
  text: string | undefined,
): { command: TelegramCommand; args: string } | null {
  if (!text?.startsWith("/")) return null;
  const [rawCommand, ...rest] = text.trim().split(/\s+/);
  const commandName = rawCommand.slice(1).split("@")[0]?.toLowerCase();
  if (!commandName) return null;

  const allowed: TelegramCommand[] = [
    "start",
    "help",
    "progress",
    "stop",
    "web",
    "link",
  ];
  if (!allowed.includes(commandName as TelegramCommand)) return null;

  return {
    command: commandName as TelegramCommand,
    args: rest.join(" ").trim(),
  };
}

export function getStaticCommandReply(
  command: TelegramCommand,
  options?: { webUrl?: string; progressSummary?: string },
): string | null {
  switch (command) {
    case "help":
      return COMMAND_HELP.help;
    case "stop":
      return COMMAND_HELP.stop;
    case "web":
      return options?.webUrl
        ? `האתר שלנו: ${options.webUrl}`
        : "האתר עדיין לא מוגדר. פנו למנהל המערכת.";
    case "progress":
      return (
        options?.progressSummary ??
        "עדיין אין מספיק נתוני התקדמות. שלחו /start כדי להמשיך ללמוד."
      );
    case "start":
    case "link":
      return null;
    default:
      return null;
  }
}
