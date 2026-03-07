import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ensureRequiredTokenPrefixes,
  flattenTokens,
  loadTokenSources,
  resolveTokenReferences
} from "../packages/tokens/src/token-utils.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../packages/tokens/tokens");

const tokenTree = loadTokenSources(rootDir);
const flat = flattenTokens(tokenTree);
const resolved = resolveTokenReferences(flat);

ensureRequiredTokenPrefixes(resolved, [
  "chips.ref.",
  "chips.sys.",
  "chips.motion.",
  "chips.layout.",
  "chips.comp.button.",
  "chips.comp.input.",
  "chips.comp.checkbox.",
  "chips.comp.radio.",
  "chips.comp.switch.",
  "chips.comp.select.",
  "chips.comp.dialog.",
  "chips.comp.popover.",
  "chips.comp.tabs.",
  "chips.comp.menu.",
  "chips.comp.tooltip.",
  "chips.comp.form-field.",
  "chips.comp.form-group.",
  "chips.comp.virtual-list.",
  "chips.comp.data-grid.",
  "chips.comp.tree.",
  "chips.comp.date-time.",
  "chips.comp.command-palette.",
  "chips.comp.split-pane.",
  "chips.comp.dock-panel.",
  "chips.comp.inspector.",
  "chips.comp.panel-header.",
  "chips.comp.card-shell.",
  "chips.comp.tool-window.",
  "chips.comp.error-boundary.",
  "chips.comp.loading-boundary.",
  "chips.comp.notification.",
  "chips.comp.toast.",
  "chips.comp.empty-state.",
  "chips.comp.skeleton.",
  "chips.comp.card-cover-frame.",
  "chips.comp.composite-card-window."
]);

console.log(`[tokens] validated ${Object.keys(resolved).length} keys`);
