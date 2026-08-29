import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChoiceButtons } from "@/components/ChoiceButtons";
import { OtherInput } from "@/components/OtherInput";

describe("accessibility basics", () => {
  it("exposes RTL-friendly choice group with keyboard focusable buttons", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <div dir="rtl" lang="he">
        <ChoiceButtons
          choices={[
            { id: "1", label: "מוזיקה" },
            { id: "other", label: "אחר / הערות", opensTextInput: true },
          ]}
          onSelect={onSelect}
        />
      </div>,
    );

    const group = screen.getByRole("group", { name: "בחירות" });
    expect(group).toBeInTheDocument();

    const first = screen.getByRole("button", { name: /מוזיקה/ });
    first.focus();
    expect(first).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalled();
  });

  it("labels free-text area for screen readers", () => {
    render(
      <div dir="rtl" lang="he">
        <OtherInput onSubmit={vi.fn()} onCancel={vi.fn()} />
      </div>,
    );
    expect(screen.getByLabelText("כתבו חופשי")).toBeInTheDocument();
  });

  it("uses mobile-friendly large touch targets", () => {
    render(
      <ChoiceButtons
        choices={[{ id: "1", label: "ספורט" }]}
        onSelect={vi.fn()}
      />,
    );
    const button = screen.getByRole("button", { name: /ספורט/ });
    expect(button.className).toMatch(/min-h-14/);
  });
});
