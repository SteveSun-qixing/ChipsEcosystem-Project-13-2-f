import React from "react";
import { ChipsIcon } from "@chips/component-library";
import type { IconDescriptor } from "chips-sdk";

export interface RuntimeIconProps extends Omit<React.ComponentProps<typeof ChipsIcon>, "descriptor"> {
  icon?: IconDescriptor | null;
  fallbackIcon?: IconDescriptor;
}

function toDescriptor(icon: IconDescriptor) {
  return {
    ...icon,
    decorative: icon.decorative ?? true,
  };
}

export function RuntimeIcon({
  icon,
  fallbackIcon,
  ...rest
}: RuntimeIconProps): React.ReactElement | null {
  const resolved = icon ?? fallbackIcon;
  if (!resolved) {
    return null;
  }

  return <ChipsIcon descriptor={toDescriptor(resolved)} {...rest} />;
}
