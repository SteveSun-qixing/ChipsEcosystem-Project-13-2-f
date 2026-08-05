import { describe, expect, it } from "vitest";
import { createClient } from "../src/core/client";

describe("communityCardTransfer API", () => {
  it("invokes the official transfer module capability for upload and download", async () => {
    const calls: Array<{ action: string; payload: unknown }> = [];
    const client = createClient({
      environment: "node",
      transport: async (action, payload) => {
        calls.push({ action, payload });
        if (action === "module.invoke") {
          return { mode: "job", jobId: "job-1" };
        }
        throw new Error("Unexpected action: " + action);
      },
    });

    await client.communityCardTransfer.upload({
      cardFile: "/tmp/demo.card",
      server: {
        baseUrl: "https://community.example",
        accessToken: "token",
      },
    });
    await client.communityCardTransfer.download({
      cardId: "card-1",
      outputPath: "/tmp/restored.card",
      server: {
        baseUrl: "https://community.example",
        accessToken: "token",
      },
    });

    expect(calls).toEqual([
      {
        action: "module.invoke",
        payload: {
          capability: "community.card.transfer",
          method: "upload",
          input: {
            cardFile: "/tmp/demo.card",
            server: {
              baseUrl: "https://community.example",
              accessToken: "token",
            },
          },
        },
      },
      {
        action: "module.invoke",
        payload: {
          capability: "community.card.transfer",
          method: "download",
          input: {
            cardId: "card-1",
            outputPath: "/tmp/restored.card",
            server: {
              baseUrl: "https://community.example",
              accessToken: "token",
            },
          },
        },
      },
    ]);
  });
});
