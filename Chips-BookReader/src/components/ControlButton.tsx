import React from "react";
import { ChipsIcon } from "@chips/component-library";
import type { IconDescriptor } from "chips-sdk";

export interface ControlButtonProps {
  label: string;
  icon: IconDescriptor;
  onClick: () => void | Promise<void>;
  disabled?: boolean;
  active?: boolean;
  variant?: "default" | "nav" | "close";
}

export function ControlButton(props: ControlButtonProps): React.ReactElement {
  const { label, icon, onClick, disabled = false, active = false, variant = "default" } = props;

  return (
    <button
      type="button"
      className={[
        "book-reader-controlButton",
        active ? "book-reader-controlButton--active" : "",
        variant === "nav" ? "book-reader-controlButton--nav" : "",
        variant === "close" ? "book-reader-controlButton--close" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={() => void onClick()}
    >
      <ChipsIcon descriptor={icon} />
    </button>
  );
}
