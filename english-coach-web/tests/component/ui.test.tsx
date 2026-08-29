import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import HomePage from "@/app/page";
import { ChoiceButtons } from "@/components/ChoiceButtons";
import { ErrorBanner } from "@/components/ErrorBanner";
import { MessageList } from "@/components/MessageList";
import { OtherInput } from "@/components/OtherInput";

describe("HomePage", () => {
  it("renders landing copy and CTA", () => {
    render(<HomePage />);
    expect(screen.getByText("מורה אישי לאנגלית")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "התחל ללמוד" })).toHaveAttribute(
      "href",
      "/chat",
    );
  });
});

describe("MessageList", () => {
  it("shows assistant and user messages with loading state", () => {
    render(
      <MessageList
        loading
        messages={[
          {
            id: "1",
            role: "assistant",
            text: "שלום",
            createdAt: new Date().toISOString(),
          },
          {
            id: "2",
            role: "user",
            text: "היי",
            createdAt: new Date().toISOString(),
          },
        ]}
      />,
    );
    expect(screen.getByText("שלום")).toBeInTheDocument();
    expect(screen.getByText("היי")).toBeInTheDocument();
    expect(screen.getByText(/חושב על השאלה הבאה/)).toBeInTheDocument();
  });
});

describe("ChoiceButtons", () => {
  it("renders numbered choices and calls onSelect", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <ChoiceButtons
        choices={[
          { id: "1", label: "סדרות" },
          { id: "other", label: "אחר / הערות", opensTextInput: true },
        ]}
        onSelect={onSelect}
      />,
    );
    await user.click(screen.getByRole("button", { name: /סדרות/ }));
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: "1", label: "סדרות" }),
    );
  });

  it("disables buttons when disabled", () => {
    const { container } = render(
      <ChoiceButtons
        disabled
        choices={[{ id: "1", label: "בחירה א" }]}
        onSelect={vi.fn()}
      />,
    );
    const button = container.querySelector("button");
    expect(button).toBeDisabled();
  });
});

describe("OtherInput", () => {
  it("submits trimmed text and supports cancel", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    render(<OtherInput onSubmit={onSubmit} onCancel={onCancel} />);

    const textarea = screen.getByLabelText("כתבו חופשי");
    await user.type(textarea, "  תשובה שלי  ");
    await user.click(screen.getByRole("button", { name: "שליחה" }));
    expect(onSubmit).toHaveBeenCalledWith("תשובה שלי");

    await user.click(screen.getByRole("button", { name: "ביטול" }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("keeps submit disabled until text exists", () => {
    const { getByRole } = render(
      <OtherInput onSubmit={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(getByRole("button", { name: "שליחה" })).toBeDisabled();
  });
});

describe("ErrorBanner", () => {
  it("shows retry action", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorBanner message="שגיאה" onRetry={onRetry} />);
    await user.click(screen.getByRole("button", { name: "ניסיון חוזר" }));
    expect(onRetry).toHaveBeenCalled();
  });
});
