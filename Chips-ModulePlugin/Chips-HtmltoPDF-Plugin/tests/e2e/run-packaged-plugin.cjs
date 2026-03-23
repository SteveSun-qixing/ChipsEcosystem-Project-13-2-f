const childProcess = require("node:child_process");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const pluginRoot = path.resolve(__dirname, "../..");
const ecosystemRoot = path.resolve(pluginRoot, "../..");
const chipsdevCliPath = path.join(ecosystemRoot, "Chips-SDK", "cli", "index.js");
const hostApplicationPath = path.join(ecosystemRoot, "Chips-Host", "dist", "src", "main", "core", "host-application.js");
const runtimeClientPath = path.join(ecosystemRoot, "Chips-Host", "dist", "src", "renderer", "runtime-client.js");
const pluginId = "chips.module.chips.htmltopdf.plugin";
const packageVersion = require(path.join(pluginRoot, "package.json")).version;
const packageFileName = `${pluginId}-${packageVersion}.cpk`;
const ELECTRON_MOCK_KEY = "__chipsElectronMock";

const parseArgs = (argv) => {
  const args = {
    htmlDir: undefined,
    outputFile: undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (item === "--html-dir") {
      args.htmlDir = argv[index + 1];
      index += 1;
      continue;
    }
    if (item === "--output-file") {
      args.outputFile = argv[index + 1];
      index += 1;
      continue;
    }
  }

  return args;
};

const runNodeCli = async (scriptPath, args, cwd, extraEnv = {}) => {
  await new Promise((resolve, reject) => {
    const child = childProcess.spawn(process.execPath, [scriptPath, ...args], {
      cwd,
      stdio: "inherit",
      env: {
        ...process.env,
        ...extraEnv,
      },
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve(undefined);
        return;
      }

      reject(new Error(`Command failed: ${path.basename(scriptPath)} ${args.join(" ")} (code=${code ?? "null"}, signal=${signal ?? "null"})`));
    });
  });
};

const installElectronMock = () => {
  global[ELECTRON_MOCK_KEY] = {
    BrowserWindow: class MockBrowserWindow {
      constructor() {
        this.id = 1;
        this.destroyed = false;
        this.webContents = {
          id: 1,
          send: () => undefined,
          executeJavaScript: async (code) => {
            if (typeof code === "string" && code.includes("width: Math.max(")) {
              return { width: 1280, height: 960 };
            }
            return true;
          },
          printToPDF: async () =>
            Buffer.from(
              "%PDF-1.7\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF",
              "latin1",
            ),
        };
      }

      focus() {}
      setSize() {}
      getBounds() {
        return { width: 1280, height: 960 };
      }
      setTitle() {}
      isFocused() {
        return false;
      }
      isMinimized() {
        return false;
      }
      isMaximized() {
        return false;
      }
      isFullScreen() {
        return false;
      }
      minimize() {}
      maximize() {}
      setFullScreen() {}
      restore() {}
      close() {
        this.destroyed = true;
      }
      isDestroyed() {
        return this.destroyed;
      }
      on() {}
      async loadURL() {}
      async loadFile() {}
    },
  };
};

const removeElectronMock = () => {
  delete global[ELECTRON_MOCK_KEY];
};

const createHtmlFixture = async (baseDir) => {
  const htmlDir = path.join(baseDir, "html-input");
  await fsp.mkdir(htmlDir, { recursive: true });
  await fsp.writeFile(
    path.join(htmlDir, "index.html"),
    "<!doctype html><html><head><meta charset=\"utf-8\"><title>HTML to PDF E2E</title></head><body><main><h1>HTML to PDF</h1><p>Packaged module verification fixture.</p></main></body></html>",
    "utf-8",
  );
  return htmlDir;
};

const waitForJob = async (runtime, jobId) => {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const snapshot = await runtime.invoke("module.job.get", { jobId });
    if (snapshot.job.status === "completed" || snapshot.job.status === "failed" || snapshot.job.status === "cancelled") {
      return snapshot.job;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`Timed out waiting for module job: ${jobId}`);
};

const main = async () => {
  const { htmlDir: inputHtmlDir, outputFile: inputOutputFile } = parseArgs(process.argv.slice(2));
  const tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "chips-htmltopdf-e2e-"));
  const workspacePath = path.join(tempRoot, "workspace");
  await fsp.mkdir(workspacePath, { recursive: true });

  const htmlDir = inputHtmlDir ? path.resolve(pluginRoot, inputHtmlDir) : await createHtmlFixture(tempRoot);
  const outputFile = inputOutputFile
    ? path.resolve(pluginRoot, inputOutputFile)
    : path.join(tempRoot, "packaged-output.pdf");

  try {
    await fsp.mkdir(path.dirname(outputFile), { recursive: true });
    await runNodeCli(chipsdevCliPath, ["build"], pluginRoot);
    await runNodeCli(chipsdevCliPath, ["package"], pluginRoot);
    await runNodeCli(chipsdevCliPath, ["plugin", "install", path.join(pluginRoot, "dist", packageFileName)], pluginRoot, {
      CHIPS_HOME: workspacePath,
      CHIPS_WORKSPACE_KIND: "dev",
    });
    await runNodeCli(chipsdevCliPath, ["plugin", "enable", pluginId], pluginRoot, {
      CHIPS_HOME: workspacePath,
      CHIPS_WORKSPACE_KIND: "dev",
    });

    installElectronMock();
    const { HostApplication } = require(hostApplicationPath);
    const { RuntimeClient } = require(runtimeClientPath);

    const app = new HostApplication({ workspacePath });
    await app.start();
    const runtime = new RuntimeClient(app.createBridge(), {
      defaultTimeout: 30_000,
      maxRetries: 1,
      retryDelay: 10,
      retryBackoff: 2,
      enableRetry: true,
    });

    try {
      const providers = await runtime.invoke("module.listProviders", {
        capability: "converter.html.to-pdf",
      });

      const started = await runtime.invoke("module.invoke", {
        capability: "converter.html.to-pdf",
        method: "convert",
        input: {
          htmlDir,
          entryFile: "index.html",
          outputFile,
          options: {
            pageSize: "A4",
            printBackground: true,
            marginMm: {
              top: 12,
              right: 12,
              bottom: 12,
              left: 12,
            },
          },
        },
      });

      if (!started || started.mode !== "job" || typeof started.jobId !== "string") {
        throw new Error("Module invoke did not return a job result.");
      }

      const finalJob = await waitForJob(runtime, started.jobId);
      if (finalJob.status !== "completed") {
        throw new Error(`Module job failed: ${JSON.stringify(finalJob.error ?? finalJob, null, 2)}`);
      }

      if (!fs.existsSync(outputFile)) {
        throw new Error(`Expected output file was not written: ${outputFile}`);
      }

      const pdfHeader = await fsp.readFile(outputFile, "latin1");
      if (!pdfHeader.startsWith("%PDF-1.7")) {
        throw new Error(`Output file does not look like a PDF: ${outputFile}`);
      }

      process.stdout.write(
        JSON.stringify(
          {
            ok: true,
            providerCount: Array.isArray(providers.providers) ? providers.providers.length : 0,
            outputFile,
            outputSize: (await fsp.stat(outputFile)).size,
            pageCount: finalJob.output?.pageCount,
            workspacePath,
          },
          null,
          2,
        ) + "\n",
      );
    } finally {
      await app.stop();
      removeElectronMock();
    }
  } finally {
    if (!inputOutputFile) {
      await fsp.rm(tempRoot, { recursive: true, force: true });
    } else {
      await fsp.rm(workspacePath, { recursive: true, force: true });
    }
  }
};

main().catch((error) => {
  removeElectronMock();
  process.stderr.write(
    JSON.stringify(
      {
        ok: false,
        message: error?.message,
        stack: error?.stack,
      },
      null,
      2,
    ) + "\n",
  );
  process.exitCode = 1;
});
