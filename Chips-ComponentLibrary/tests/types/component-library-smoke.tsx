import { ChipsButton, ChipsThemeProvider, CompositeWindowMode, type CardDisplayAdapter, loadCompositeWindowData, toCardRuntimeStandardError, toComponentStandardError } from "@chips/component-library";

const adapter: CardDisplayAdapter = {
  async resolveCoverFrame(input) {
    return {
      cardId: input.cardId ?? "demo-card",
      title: "Demo Card",
      ratio: "3:4",
      coverUrl: "https://example.com/cover.html"
    };
  },
  async resolveCompositeWindow(input) {
    return {
      cardId: input.cardFile,
      frameUrl: "https://example.com/frame.html",
      nodeCount: input.mode === CompositeWindowMode.VIEW ? 1 : 2
    };
  }
};

void loadCompositeWindowData(adapter, {
  cardFile: "/cards/demo.card",
  mode: CompositeWindowMode.VIEW
});

void loadCompositeWindowData(adapter, {
  cardFile: "/cards/demo.card",
  // @ts-expect-error composite window mode must remain within the formal contract
  mode: "edit"
});

const componentError = toComponentStandardError(new Error("component"));
const runtimeError = toCardRuntimeStandardError(new Error("runtime"), "CARD_RUNTIME_SMOKE");

export const smokeTree = (
  <ChipsThemeProvider themeId="chips-official.default-theme" version="1.0.0">
    <ChipsButton
      variant="primary"
      onPress={() => {
        console.log(componentError.code, runtimeError.code);
      }}
    >
      Save
    </ChipsButton>
  </ChipsThemeProvider>
);
