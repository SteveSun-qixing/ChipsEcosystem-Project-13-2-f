import test from "node:test";
import assert from "node:assert/strict";
import {
  assertAriaProps,
  buildAriaDescribedBy,
  createAriaStatusProps,
  getFocusableElements,
  getKeyboardIntent,
  isFocusableElement,
  isKeyboardActivationKey,
  isKeyboardNavigationKey,
  moveFocus,
  validateAriaProps
} from "../src/index.js";

test("isKeyboardActivationKey supports Enter and Space", () => {
  assert.equal(isKeyboardActivationKey("Enter"), true);
  assert.equal(isKeyboardActivationKey(" "), true);
  assert.equal(isKeyboardActivationKey("Escape"), false);
});

test("createAriaStatusProps returns aria-live polite", () => {
  const props = createAriaStatusProps();
  assert.equal(props["aria-live"], "polite");
  assert.equal(props["aria-atomic"], "true");
});

test("keyboard intent maps activation, navigation and dismiss", () => {
  assert.equal(getKeyboardIntent("Enter"), "activate");
  assert.equal(getKeyboardIntent("ArrowUp"), "navigate");
  assert.equal(getKeyboardIntent("Escape"), "dismiss");
  assert.equal(getKeyboardIntent("a"), "unknown");
  assert.equal(isKeyboardNavigationKey("ArrowDown"), true);
});

test("buildAriaDescribedBy removes duplicates and empties", () => {
  assert.equal(buildAriaDescribedBy(["a", "", "b", "a"]), "a b");
});

test("validateAriaProps and assertAriaProps enforce rules", () => {
  const issues = validateAriaProps(
    {
      role: "button",
      "aria-expanded": "true"
    },
    {
      requireLabel: true,
      role: "button",
      requireControlsWhenExpanded: true
    }
  );

  assert.equal(issues.length, 2);
  assert.throws(
    () =>
      assertAriaProps(
        {
          role: "button",
          "aria-expanded": "true"
        },
        {
          requireLabel: true,
          role: "button",
          requireControlsWhenExpanded: true
        }
      ),
    (error) => error.code === "A11Y_LABEL_MISSING"
  );
});

test("isFocusableElement filters disabled and hidden nodes", () => {
  const focusable = {
    tabIndex: 0,
    focus() {}
  };
  const disabled = {
    tabIndex: 0,
    disabled: true,
    focus() {}
  };

  assert.equal(isFocusableElement(focusable), true);
  assert.equal(isFocusableElement(disabled), false);
});

test("getFocusableElements and moveFocus navigate focus list", () => {
  const focused = [];
  const makeNode = (id) => ({
    tabIndex: 0,
    focus() {
      focused.push(id);
    }
  });

  const nodes = [makeNode("a"), makeNode("b"), makeNode("c")];
  const focusables = getFocusableElements(nodes);
  assert.equal(focusables.length, 3);

  const nextIndex = moveFocus(focusables, {
    fromIndex: 0,
    direction: "next"
  });
  assert.equal(nextIndex, 1);

  const prevIndex = moveFocus(focusables, {
    fromIndex: 1,
    direction: "prev"
  });
  assert.equal(prevIndex, 0);
  assert.deepEqual(focused, ["b", "a"]);
});
