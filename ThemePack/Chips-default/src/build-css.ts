import fs from "node:fs/promises";
import path from "node:path";

const fileIfExists = async (filePath: string): Promise<string> => {
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch (error: unknown) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      return "";
    }
    throw error;
  }
};

const main = async (): Promise<void> => {
  const projectRoot = process.cwd();
  const stylesDir = path.join(projectRoot, "styles");

  const baseCss = await fileIfExists(path.join(stylesDir, "base.css"));

  let componentsCss = "";
  try {
    const componentsDir = path.join(stylesDir, "components");
    const entries = await fs.readdir(componentsDir);
    for (const name of entries) {
      if (!name.endsWith(".css")) {
        continue;
      }
      const fullPath = path.join(componentsDir, name);
      componentsCss += "\n" + (await fs.readFile(fullPath, "utf-8"));
    }
  } catch (error: unknown) {
    const err = error as NodeJS.ErrnoException;
    if (err.code !== "ENOENT") {
      throw error;
    }
  }

  const motionsCss = await fileIfExists(path.join(stylesDir, "motions.css"));

  const finalCss = [baseCss, componentsCss, motionsCss].join("\n");

  const distDir = path.join(projectRoot, "dist");
  await fs.mkdir(distDir, { recursive: true });
  const outputPath = path.join(distDir, "theme.css");
  await fs.writeFile(outputPath, finalCss, "utf-8");
  // eslint-disable-next-line no-console
  console.log(`Theme CSS written to ${outputPath}`);
};

void main();

