import { describe, it, expect } from "vitest";
import { createBasecardViewRoot } from "../../src/render/view";
import type { BasecardConfig } from "../../src/schema/card-config";

describe("createBasecardViewRoot", () => {
  it("renders title and body", () => {
    const config: BasecardConfig = {
      id: "test",
      title: "Hello",
      body: "World",
      locale: "zh-CN",
    };

    const root = createBasecardViewRoot(config);
    const titleEl = root.querySelector(".chips-basecard__title");
    const bodyEl = root.querySelector(".chips-basecard__body");

    expect(titleEl?.textContent).toBe("Hello");
    expect(bodyEl?.textContent).toBe("World");
  });
});
