import React from "react";
import { ManagedPluginPage } from "./ManagedPluginPage";

export function CardPluginsPage(): React.ReactElement {
  return <ManagedPluginPage type="card" translationBaseKey="settingsPanel.cardPlugins" />;
}
