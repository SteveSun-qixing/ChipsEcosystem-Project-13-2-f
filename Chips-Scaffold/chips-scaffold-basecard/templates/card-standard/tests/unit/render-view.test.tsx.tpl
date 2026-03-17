import { describe, it, expect } from "vitest";
import { mountBasecardView } from "../../src/render/runtime";
import type { BasecardConfig } from "../../src/schema/card-config";

describe("mountBasecardView", () => {
  it("renders title and body through the React runtime", () => {
    const container = document.createElement("div");
    const config: BasecardConfig = {
      card_type: "{{ CARD_TYPE }}",
      title: "Hello",
      body: "World",
      locale: "zh-CN",
      theme: "",
    };

    const dispose = mountBasecardView({
      container,
      config,
    });
    const titleEl = container.querySelector(".chips-basecard__title");
    const bodyEl = container.querySelector(".chips-basecard__body");

    expect(titleEl?.textContent).toBe("Hello");
    expect(bodyEl?.textContent).toBe("World");

    dispose();
  });
});
