import React from "react";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NotificationStack } from "../../src/shared/ui/NotificationStack";

function readSettingsStyles(): string {
  const stylesPath = fileURLToPath(new URL("../../src/app/styles.css", import.meta.url));
  return readFileSync(stylesPath, "utf-8");
}

describe("NotificationStack", () => {
  it("renders feedback as a top-center toast instead of a list notification banner", () => {
    const markup = renderToStaticMarkup(
      <NotificationStack
        ariaLabel="Runtime feedback"
        closeButtonLabel="Close"
        items={[
          {
            id: "theme-updated",
            tone: "success",
            title: "Theme updated",
            message: "The active theme was updated successfully.",
          },
        ]}
      />,
    );

    expect(markup).toContain("settings-feedback-toast");
    expect(markup).toContain('data-scope="toast"');
    expect(markup).toContain('data-placement="top-center"');
    expect(markup).not.toContain('data-scope="notification"');
  });

  it("styles each toast item as its own pill instead of styling the whole stack as one pill", () => {
    const styles = readSettingsStyles();
    const rootSelector = '.settings-feedback-toast [data-scope="toast"][data-part="root"]';
    const itemSelector = '.settings-feedback-toast [data-scope="toast"][data-part="item"]';
    const rootRuleStart = styles.indexOf(`${rootSelector} {`);
    const itemRuleStart = styles.indexOf(`${itemSelector} {`);
    const rootRule = styles.slice(rootRuleStart, styles.indexOf("}", rootRuleStart));
    const itemRule = styles.slice(itemRuleStart, styles.indexOf("}", itemRuleStart));

    expect(rootRuleStart).toBeGreaterThanOrEqual(0);
    expect(itemRuleStart).toBeGreaterThanOrEqual(0);
    expect(rootRule).toContain("background-color: transparent");
    expect(rootRule).toContain("box-shadow: none");
    expect(itemRule).toContain("border-radius: var(--chips-base-radius-pill, 999px)");
    expect(itemRule).toContain("background-color:");
    expect(itemRule).toContain("box-shadow:");
  });
});
