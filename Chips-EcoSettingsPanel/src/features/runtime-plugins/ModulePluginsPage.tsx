import React from "react";
import { ManagedPluginPage } from "./ManagedPluginPage";

export function ModulePluginsPage(): React.ReactElement {
  return <ManagedPluginPage type="module" translationBaseKey="settingsPanel.modulePlugins" />;
}
