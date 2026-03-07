import React, { useState } from "react";
import { ChipsThemeProvider, ChipsButton } from "@chips/component-library";
import { CardViewerShell } from "./components/CardViewerShell";
import { DropZone } from "./components/DropZone";
import { CardWindow } from "./components/CardWindow";

export function App() {
  const [cardFile, setCardFile] = useState<string | null>(null);

  const toolbar = (
    <div style={{ display: "flex", gap: 8 }}>
      <ChipsButton
        variant="secondary"
        onClick={() => {
          const bridge = (window as any).chips;
          if (bridge && typeof bridge.invoke === "function") {
            bridge
              .invoke("cardViewer", "pickCard", {})
              .then((result: { cardFile?: string }) => {
                if (result && result.cardFile) {
                  setCardFile(result.cardFile);
                }
              })
              .catch(() => {
                // 错误由 Host 日志与统一错误处理负责，这里不吞错误，只保持 UI 稳定
              });
          }
        }}
      >
        打开卡片
      </ChipsButton>
    </div>
  );

  const content =
    cardFile === null ? (
      <DropZone onCardFile={setCardFile} />
    ) : (
      <CardWindow cardFile={cardFile} />
    );

  return (
    <ChipsThemeProvider themeId="chips-official.default-theme" version="1.0.0">
      <CardViewerShell toolbar={toolbar} content={content} />
    </ChipsThemeProvider>
  );
}

