import {
  ChipsButton,
  ChipsEnvironmentProvider,
  ChipsStack,
  ChipsThemeProvider,
  ChipsView,
  CompositeWindowMode,
  type CardDisplayAdapter,
  type ChipsClientLike,
  type ChipsEnvironmentValue,
  loadCompositeWindowData,
  toCardRuntimeStandardError,
  toComponentStandardError,
  useChipsClient,
  useChipsDiagnostics,
  useChipsEnvironment,
  useChipsI18n,
  useChipsPermission,
  useChipsSurface,
  useChipsTheme
} from "@chips/component-library";

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
const mockClient: ChipsClientLike = {
  events: {
    on() {
      return () => undefined;
    }
  },
  theme: {
    async getCurrent() {
      return { themeId: "chips-official.default-theme", displayName: "Default", version: "1.0.0" };
    },
    async apply() {
      return undefined;
    }
  },
  i18n: {
    async getCurrent() {
      return "zh-CN";
    },
    async setCurrent() {
      return undefined;
    },
    async translate(key) {
      return key;
    }
  }
};

function EnvironmentSmoke(): null {
  const environment: ChipsEnvironmentValue = useChipsEnvironment();
  const client = useChipsClient();
  const theme = useChipsTheme();
  const i18n = useChipsI18n();
  const surface = useChipsSurface();
  const permission = useChipsPermission();
  const diagnostics = useChipsDiagnostics();

  void environment.refresh();
  void client;
  void theme.refresh();
  void i18n.t("demo.title");
  void surface.refresh();
  void permission.hasPermission("theme.read");
  void diagnostics.clear();
  return null;
}

export const smokeTree = (
  <ChipsEnvironmentProvider client={mockClient}>
    <ChipsThemeProvider themeId="chips-official.default-theme" version="1.0.0">
      <ChipsView title="Demo" aria-label="Demo view">
        <ChipsStack gap="8px">
          <EnvironmentSmoke />
          <ChipsButton
            variant="primary"
            onPress={() => {
              console.log(componentError.code, runtimeError.code);
            }}
          >
            Save
          </ChipsButton>
        </ChipsStack>
      </ChipsView>
    </ChipsThemeProvider>
  </ChipsEnvironmentProvider>
);
