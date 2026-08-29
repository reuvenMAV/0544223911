"use client";

import { useState } from "react";

type Props = {
  disabled?: boolean;
  onSubmit: (text: string) => void;
  onCancel: () => void;
};

export function OtherInput({ disabled, onSubmit, onCancel }: Props) {
  const [value, setValue] = useState("");

  return (
    <form
      className="flex w-full flex-col gap-3 rounded-2xl border border-teal-900/10 bg-white/80 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = value.trim();
        if (!trimmed) return;
        onSubmit(trimmed);
        setValue("");
      }}
    >
      <label htmlFor="other-input" className="text-sm font-medium text-teal-950">
        כתבו חופשי
      </label>
      <textarea
        id="other-input"
        value={value}
        disabled={disabled}
        onChange={(event) => setValue(event.target.value)}
        rows={3}
        className="w-full resize-none rounded-xl border border-teal-900/15 bg-white px-3 py-2 text-base text-teal-950 outline-none ring-teal-700 focus:ring-2"
        placeholder="התשובה או ההערה שלכם..."
        dir="auto"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="min-h-11 flex-1 rounded-xl bg-teal-950 px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          שליחה
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onCancel}
          className="min-h-11 rounded-xl border border-teal-900/20 px-4 text-sm font-medium text-teal-950"
        >
          ביטול
        </button>
      </div>
    </form>
  );
}
