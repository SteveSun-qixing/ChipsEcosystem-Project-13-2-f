import fs from "node:fs";
import path from "node:path";

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function walkJsonFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkJsonFiles(target));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(target);
    }
  }
  return files.sort();
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function flattenTokens(tokenTree) {
  const out = {};

  const walk = (value, keys) => {
    if (isObject(value)) {
      for (const [key, next] of Object.entries(value)) {
        walk(next, keys.concat(key));
      }
      return;
    }

    out[keys.join(".")] = value;
  };

  walk(tokenTree, []);
  return out;
}

export function validateComponentContract(contract, flatTokenMap) {
  if (!isObject(contract)) {
    throw new Error("THEME_CONTRACT_INVALID:object");
  }

  const requiredStringFields = ["component", "scope"];
  for (const field of requiredStringFields) {
    if (typeof contract[field] !== "string" || contract[field].length === 0) {
      throw new Error(`THEME_CONTRACT_INVALID:${field}`);
    }
  }

  const requiredArrayFields = ["parts", "states", "tokens"];
  for (const field of requiredArrayFields) {
    if (!Array.isArray(contract[field]) || contract[field].length === 0) {
      throw new Error(`THEME_CONTRACT_INVALID:${field}`);
    }
  }

  if (!isObject(contract.iframe) || contract.iframe.requiredSandbox !== true) {
    throw new Error("THEME_CONTRACT_INVALID:iframe.requiredSandbox");
  }

  for (const tokenKey of contract.tokens) {
    if (!Object.hasOwn(flatTokenMap, tokenKey)) {
      throw new Error(`THEME_CONTRACT_TOKEN_MISSING:${tokenKey}`);
    }
  }

  return true;
}

export function validateContractDirectory(contractDir, tokenTree) {
  const files = walkJsonFiles(contractDir);
  const flatTokenMap = flattenTokens(tokenTree);

  for (const filePath of files) {
    const contract = readJson(filePath);
    validateComponentContract(contract, flatTokenMap);
  }

  return files;
}
