import React from "react";
import { ManagedPluginPage } from "./ManagedPluginPage";

export function LayoutPluginsPage(): React.ReactElement {
  return <ManagedPluginPage type="layout" translationBaseKey="settingsPanel.layoutPlugins" />;
}
