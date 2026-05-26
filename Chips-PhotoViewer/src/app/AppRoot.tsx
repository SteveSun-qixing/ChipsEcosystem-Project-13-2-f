import React from "react";
import { AppProviders } from "./AppProviders";
import { AppShell } from "./AppShell";

export function AppRoot(): React.ReactElement {
  return (
    <AppProviders>
      <AppShell />
    </AppProviders>
  );
}
