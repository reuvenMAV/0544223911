"use client";

import type { Choice } from "@/lib/types";

type Props = {
  choices: Choice[];
  disabled?: boolean;
  onSelect: (choice: Choice) => void;
};

export function ChoiceButtons({ choices, disabled, onSelect }: Props) {
  return (
    <div className="flex w-full flex-col gap-3" role="group" aria-label="בחירות">
      {choices.map((choice, index) => {
        const isOther = choice.id === "other" || choice.opensTextInput;
        return (
          <button
            key={`${choice.id}-${index}`}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(choice)}
            className={`min-h-14 w-full rounded-2xl border px-4 py-3 text-right text-base font-medium transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 ${
              isOther
                ? "border-dashed border-teal-700/40 bg-white/70 text-teal-950"
                : "border-teal-900/10 bg-teal-950 text-teal-50 shadow-sm hover:bg-teal-900"
            }`}
          >
            <span className="ml-2 inline-block text-sm opacity-70">{index + 1}.</span>
            {choice.label}
          </button>
        );
      })}
    </div>
  );
}
