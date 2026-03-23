const childProcess = require("node:child_process");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const pluginRoot = path.resolve(__dirname, "../..");
const ecosystemRoot = path.resolve(pluginRoot, "../..");
const chipsdevCliPath = path.join(ecosystemRoot, "Chips-SDK", "cli", "index.js");
const hostRoot = path.join(ecosystemRoot, "Chips-Host");
const hostApplicationPath = path.join(hostRoot, "dist", "src", "main", "core", "host-application.js");
const runtimeClientPath = path.join(hostRoot, "dist", "src", "renderer", "runtime-client.js");
const pluginRuntimePath = path.join(hostRoot, "dist", "src", "runtime", "index.js");
const htmlToImagePluginRoot = pluginRoot;
const cardToHtmlPluginRoot = path.join(ecosystemRoot, "Chips-ModulePlugin", "Chips-CardtoHTML-Plugin");
const ELECTRON_MOCK_KEY = "__chipsElectronMock";
const VALID_PNG_BUFFER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z0ioAAAAASUVORK5CYII=",
  "base64",
);
const VALID_JPEG_BUFFER = Buffer.from(
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxAQEBAQEA8QDw8PDw8PDw8QEA8QFREWFhURFRUYHSggGBolGxUVITEhJSkrLi4uFx8zODMsNygtLisBCgoKDg0OGhAQGzclHyUtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLf/AABEIAAEAAQMBEQACEQEDEQH/xAAXAAEBAQEAAAAAAAAAAAAAAAAAAQID/8QAFhEBAQEAAAAAAAAAAAAAAAAAABEB/9oADAMBAAIQAxAAAAHhAH//xAAVEAEBAAAAAAAAAAAAAAAAAAAAEf/aAAgBAQABBQKf/8QAFBEBAAAAAAAAAAAAAAAAAAAAEP/aAAgBAwEBPwEf/8QAFBEBAAAAAAAAAAAAAAAAAAAAEP/aAAgBAgEBPwEf/8QAFBABAAAAAAAAAAAAAAAAAAAAEP/aAAgBAQAGPwJf/8QAFBABAAAAAAAAAAAAAAAAAAAAEP/aAAgBAQABPyFf/9k=",
  "base64",
);
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const runCommand = async (command, args, cwd, extraEnv = {}) => {
  await new Promise((resolve, reject) => {
    const child = childProcess.spawn(command, args, {
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
        resolve();
        return;
      }

      reject(
        new Error(
          `Command failed: ${command} ${args.join(" ")} (code=${code ?? "null"}, signal=${signal ?? "null"})`,
        ),
      );
    });
  });
};

const ensureHostBuild = async () => {
  if (fs.existsSync(hostApplicationPath) && fs.existsSync(runtimeClientPath) && fs.existsSync(pluginRuntimePath)) {
    return;
  }

  await runCommand("npm", ["run", "build"], hostRoot);
};

const readPackageMeta = async (projectRoot) => {
  const packageJson = JSON.parse(await fsp.readFile(path.join(projectRoot, "package.json"), "utf-8"));
  return {
    pluginId: packageJson.name,
    packageFile: path.join(projectRoot, "dist", `${packageJson.name}-${packageJson.version}.cpk`),
  };
};

const installPackagedPlugin = async (workspacePath, projectRoot) => {
  await runCommand(process.execPath, [chipsdevCliPath, "build"], projectRoot);
  await runCommand(process.execPath, [chipsdevCliPath, "package"], projectRoot);

  const { pluginId, packageFile } = await readPackageMeta(projectRoot);
  const cliEnv = {
    CHIPS_HOME: workspacePath,
    CHIPS_WORKSPACE_KIND: "dev",
  };

  await runCommand(process.execPath, [chipsdevCliPath, "plugin", "install", packageFile], projectRoot, cliEnv);
  await runCommand(process.execPath, [chipsdevCliPath, "plugin", "enable", pluginId], projectRoot, cliEnv);

  return { pluginId };
};

const waitForJob = async (runtime, jobId) => {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const snapshot = await runtime.invoke("module.job.get", { jobId });
    if (snapshot.job.status === "completed" || snapshot.job.status === "failed" || snapshot.job.status === "cancelled") {
      return snapshot.job;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`Timed out waiting for module job: ${jobId}`);
};

const installElectronMock = () => {
  global[ELECTRON_MOCK_KEY] = {
    BrowserWindow: class MockBrowserWindow {
      constructor() {
        this.destroyed = false;
        this.webContents = {
          id: 1,
          send: () => undefined,
          executeJavaScript: async () => ({ width: 960, height: 540 }),
          capturePage: async () => ({
            toPNG: () => VALID_PNG_BUFFER,
            toJPEG: () => VALID_JPEG_BUFFER,
            getSize: () => ({ width: 960, height: 540 }),
          }),
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

const createCardFixture = async (workspacePath) => {
  const cardSourceDir = path.join(workspacePath, "card-source");
  await fsp.mkdir(path.join(cardSourceDir, ".card"), { recursive: true });
  await fsp.mkdir(path.join(cardSourceDir, "content"), { recursive: true });
  await fsp.writeFile(
    path.join(cardSourceDir, ".card", "metadata.yaml"),
    'card_id: htmltoimage.integration.demo\nname: HtmltoImage Integration Demo\n',
    "utf-8",
  );
  await fsp.writeFile(
    path.join(cardSourceDir, ".card", "structure.yaml"),
    'structure:\n  - id: "intro"\n    type: "RichTextCard"\n',
    "utf-8",
  );
  await fsp.writeFile(path.join(cardSourceDir, ".card", "cover.html"), "<h1>cover</h1>", "utf-8");
  await fsp.writeFile(
    path.join(cardSourceDir, "content", "intro.yaml"),
    'card_type: "RichTextCard"\ncontent_source: "inline"\ncontent_text: |\n  <h1>HTML to Image</h1>\n  <p>Packaged module integration verification.</p>\n',
    "utf-8",
  );
  return cardSourceDir;
};

const main = async () => {
  const tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), "chips-htmltoimage-e2e-"));
  const workspacePath = path.join(tempRoot, "workspace");
  let app;

  try {
    await ensureHostBuild();
    await fsp.mkdir(workspacePath, { recursive: true });

    const { PluginRuntime } = require(pluginRuntimePath);
    const bootstrapRuntime = new PluginRuntime(workspacePath, {
      locale: "zh-CN",
      themeId: "chips-official.default-theme",
    });
    await bootstrapRuntime.load();

    const defaultTheme = await bootstrapRuntime.install(path.join(ecosystemRoot, "ThemePack", "Chips-default", "manifest.yaml"));
    await bootstrapRuntime.enable(defaultTheme.manifest.id);

    const richTextPlugin = await bootstrapRuntime.install(
      path.join(ecosystemRoot, "Chips-BaseCardPlugin", "richtext-BCP", "manifest.yaml"),
    );
    await bootstrapRuntime.enable(richTextPlugin.manifest.id);

    const htmlToImageInstall = await installPackagedPlugin(workspacePath, htmlToImagePluginRoot);
    const cardToHtmlInstall = await installPackagedPlugin(workspacePath, cardToHtmlPluginRoot);

    installElectronMock();

    const { HostApplication } = require(hostApplicationPath);
    const { RuntimeClient } = require(runtimeClientPath);

    app = new HostApplication({ workspacePath });
    await app.start();

    const runtime = new RuntimeClient(app.createBridge(), {
      defaultTimeout: 60_000,
      maxRetries: 1,
      retryDelay: 10,
      retryBackoff: 2,
      enableRetry: true,
    });

    const imageProviders = await runtime.invoke("module.listProviders", {
      capability: "converter.html.to-image",
    });
    if (!Array.isArray(imageProviders.providers) || imageProviders.providers.length === 0) {
      throw new Error("converter.html.to-image provider was not registered");
    }

    const htmlProviders = await runtime.invoke("module.listProviders", {
      capability: "converter.card.to-html",
    });
    if (!Array.isArray(htmlProviders.providers) || htmlProviders.providers.length === 0) {
      throw new Error("converter.card.to-html provider was not registered");
    }

    const cardSourceDir = await createCardFixture(workspacePath);
    const cardFile = path.join(workspacePath, "integration-demo.card");
    await runtime.invoke("card.pack", {
      cardDir: cardSourceDir,
      outputPath: cardFile,
    });

    const htmlOutputDir = path.join(workspacePath, "converted-html");
    const cardToHtmlStarted = await runtime.invoke("module.invoke", {
      capability: "converter.card.to-html",
      method: "convert",
      input: {
        cardFile,
        output: {
          path: htmlOutputDir,
          packageMode: "directory",
          overwrite: true,
        },
        options: {
          includeAssets: true,
          includeManifest: true,
        },
      },
    });

    const cardToHtmlJob = await waitForJob(runtime, cardToHtmlStarted.jobId);
    if (cardToHtmlJob.status !== "completed") {
      throw new Error(`card -> html job failed: ${JSON.stringify(cardToHtmlJob.error ?? cardToHtmlJob, null, 2)}`);
    }

    const imageOutputFile = path.join(workspacePath, "converted-image.png");
    const htmlToImageStarted = await runtime.invoke("module.invoke", {
      capability: "converter.html.to-image",
      method: "convert",
      input: {
        htmlDir: htmlOutputDir,
        outputFile: imageOutputFile,
        options: {
          format: "png",
          width: 960,
          height: 540,
          background: "theme",
        },
      },
    });

    const htmlToImageJob = await waitForJob(runtime, htmlToImageStarted.jobId);
    if (htmlToImageJob.status !== "completed") {
      throw new Error(`html -> image job failed: ${JSON.stringify(htmlToImageJob.error ?? htmlToImageJob, null, 2)}`);
    }

    const written = await fsp.readFile(imageOutputFile);
    if (!written.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
      throw new Error("Unexpected image output payload: generated file is not a valid PNG signature");
    }

    process.stdout.write(
      JSON.stringify({
        ok: true,
        htmlProviderPluginId: cardToHtmlInstall.pluginId,
        imageProviderPluginId: htmlToImageInstall.pluginId,
        outputFile: imageOutputFile,
        outputSize: (await fsp.stat(imageOutputFile)).size,
        width: htmlToImageJob.output?.width,
        height: htmlToImageJob.output?.height,
        format: htmlToImageJob.output?.format,
      }) + "\n",
    );
  } finally {
    if (app) {
      await app.stop();
    }
    removeElectronMock();
    await fsp.rm(tempRoot, { recursive: true, force: true });
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
