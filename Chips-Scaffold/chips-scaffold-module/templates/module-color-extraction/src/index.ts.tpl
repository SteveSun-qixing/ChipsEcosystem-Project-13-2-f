export interface ColorPickInput {
  imagePath: string;
  options?: {
    sampleSize?: number;
  };
}

export interface ColorPickOutput {
  backgroundColor: string;
  accentColor: string;
  palette: Array<{
    color: string;
    role: "background" | "accent" | "representative";
    population: number;
    lightness: number;
    chroma: number;
  }>;
  metadata: {
    algorithm: "byte-sampling-template-v1";
    source?: {
      imagePath: string;
      sizeBytes?: number;
      mtimeMs?: number;
    };
    image: {
      width: number;
      height: number;
      animated: boolean;
      pageCount: number;
      hasAlpha: boolean;
    };
    sample: {
      width: number;
      height: number;
      sampleSize: number;
      visiblePixelRatio: number;
      transparentPixelRatio: number;
      clusterCount: number;
    };
  };
}

interface HostFileStat {
  isFile?: boolean;
  size?: number;
  mtimeMs?: number;
}

interface ModuleContext {
  host: {
    invoke<T = unknown>(action: string, payload?: unknown): Promise<T>;
  };
  job?: {
    reportProgress(payload: Record<string, unknown>): Promise<void>;
  };
}

class ColorExtractionError extends Error {
  code: string;
  details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ColorExtractionError";
    this.code = code;
    this.details = details;
  }
}

const toRecord = (value: unknown): Record<string, unknown> | undefined => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
};

const toFileStat = (value: unknown): HostFileStat | undefined => {
  const record = toRecord(value);
  if (!record) {
    return undefined;
  }
  return {
    isFile: typeof record.isFile === "boolean" ? record.isFile : undefined,
    size: typeof record.size === "number" ? record.size : undefined,
    mtimeMs: typeof record.mtimeMs === "number" ? record.mtimeMs : undefined,
  };
};

const toBytes = (value: unknown): Uint8Array => {
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  if (Array.isArray(value) && value.every((item) => Number.isInteger(item) && item >= 0 && item <= 255)) {
    return Uint8Array.from(value);
  }
  const record = toRecord(value);
  if (record?.type === "Buffer" && Array.isArray(record.data)) {
    return Uint8Array.from(record.data as number[]);
  }
  if (record && "data" in record) {
    return toBytes(record.data);
  }
  if (typeof value === "string") {
    const bytes = new Uint8Array(value.length);
    for (let index = 0; index < value.length; index += 1) {
      bytes[index] = value.charCodeAt(index) & 0xff;
    }
    return bytes;
  }
  throw new ColorExtractionError("COLOR_PICKER_IMAGE_SAMPLE_FAILED", "Host file.read did not return binary content.");
};

const requireImagePath = (value: unknown): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ColorExtractionError("COLOR_PICKER_INPUT_INVALID", "imagePath is required.");
  }
  if (/^[a-zA-Z]+:\/\//.test(value.trim()) && !value.trim().startsWith("file://")) {
    throw new ColorExtractionError("COLOR_PICKER_INPUT_INVALID", "Only local paths or file:// URLs are supported.", {
      imagePath: value,
    });
  }
  return value.trim();
};

const clampSampleSize = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 96;
  }
  return Math.max(48, Math.min(160, Math.round(value)));
};

const toHex = (value: number): string => {
  return Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0");
};

const colorFromBytes = (bytes: Uint8Array, offset: number, sampleSize: number): string => {
  if (bytes.byteLength === 0) {
    throw new ColorExtractionError("COLOR_PICKER_IMAGE_EMPTY", "Image file is empty.");
  }

  let r = 0;
  let g = 0;
  let b = 0;
  const count = Math.max(1, Math.min(sampleSize, bytes.byteLength));
  for (let index = 0; index < count; index += 1) {
    r += bytes[(offset + index * 3) % bytes.byteLength] ?? 0;
    g += bytes[(offset + index * 5 + 1) % bytes.byteLength] ?? 0;
    b += bytes[(offset + index * 7 + 2) % bytes.byteLength] ?? 0;
  }
  return `#${toHex(r / count)}${toHex(g / count)}${toHex(b / count)}`;
};

const pickColors = async (ctx: ModuleContext, input: ColorPickInput): Promise<ColorPickOutput> => {
  const imagePath = requireImagePath(input?.imagePath);
  const sampleSize = clampSampleSize(input.options?.sampleSize);

  await ctx.job?.reportProgress({
    stage: "prepare",
    percent: 10,
  });

  const statResult = await ctx.host.invoke<{ meta: unknown }>("file.stat", {
    path: imagePath,
  });
  const stat = toFileStat(statResult.meta);
  if (!stat?.isFile) {
    throw new ColorExtractionError("COLOR_PICKER_INPUT_NOT_FOUND", `Image file does not exist: ${imagePath}`, {
      imagePath,
    });
  }

  const readResult = await ctx.host.invoke<{ content?: unknown }>("file.read", {
    path: imagePath,
    options: {
      encoding: "binary",
    },
  });
  const bytes = toBytes(readResult.content);

  await ctx.job?.reportProgress({
    stage: "completed",
    percent: 100,
  });

  return {
    backgroundColor: colorFromBytes(bytes, 0, sampleSize),
    accentColor: colorFromBytes(bytes, Math.floor(sampleSize / 2), sampleSize),
    palette: [
      {
        color: colorFromBytes(bytes, 0, sampleSize),
        role: "background",
        population: 1,
        lightness: 0.5,
        chroma: 0,
      },
      {
        color: colorFromBytes(bytes, Math.floor(sampleSize / 2), sampleSize),
        role: "accent",
        population: 1,
        lightness: 0.75,
        chroma: 0,
      },
    ],
    metadata: {
      algorithm: "byte-sampling-template-v1",
      source: {
        imagePath,
        sizeBytes: stat.size,
        mtimeMs: stat.mtimeMs,
      },
      image: {
        width: 1,
        height: 1,
        animated: false,
        pageCount: 1,
        hasAlpha: false,
      },
      sample: {
        width: 1,
        height: 1,
        sampleSize,
        visiblePixelRatio: 1,
        transparentPixelRatio: 0,
        clusterCount: 2,
      },
    },
  };
};

const moduleDefinition = {
  providers: [
    {
      capability: "{{ MODULE_CAPABILITY }}",
      methods: {
        async pick(ctx: ModuleContext, input: ColorPickInput): Promise<ColorPickOutput> {
          return pickColors(ctx, input);
        },
      },
    },
  ],
};

export default moduleDefinition;
