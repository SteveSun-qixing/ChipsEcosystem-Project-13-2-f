/**
 * 社区 API 客户端基础封装
 *
 * 与网页版差异：
 * - 服务器地址由客户端配置提供（可跨社区服务器切换）；
 * - 客户端无法读取 HttpOnly Cookie，登录 / 注册响应中的 refreshToken 由应用负责
 *   安全保存（Host credential），刷新会话时通过请求体提交；
 * - 其余统一请求头、token 刷新、错误格式化与网页版保持一致。
 */

let apiBaseUrl = "";

export function configureCommunityApiBaseUrl(baseUrl: string): void {
  apiBaseUrl = baseUrl.replace(/\/+$/, "");
}

export function getCommunityApiBaseUrl(): string {
  return apiBaseUrl;
}

function resolveApiUrl(path: string): string {
  return `${apiBaseUrl}/api/v1${path}`;
}

/** 内存中持有的 access token */
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

/** 由应用注入的 refreshToken 读取器（Host credential 链路） */
let refreshTokenReader: (() => Promise<string | null>) | null = null;

export function setRefreshTokenReader(reader: () => Promise<string | null>): void {
  refreshTokenReader = reader;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export class ApiRequestError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(status: number, error: ApiError) {
    super(error.message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = error.code;
    this.details = error.details;
  }
}

export function isNetworkError(error: unknown): boolean {
  return error instanceof ApiRequestError && error.code === "NETWORK_ERROR";
}

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

async function tryRefreshToken(): Promise<string | null> {
  if (isRefreshing) {
    return new Promise((resolve) => {
      refreshQueue.push(resolve);
    });
  }

  isRefreshing = true;

  try {
    const refreshToken = refreshTokenReader ? await refreshTokenReader() : null;
    if (!refreshToken) {
      accessToken = null;
      refreshQueue.forEach((cb) => cb(null));
      refreshQueue = [];
      return null;
    }

    const res = await fetch(resolveApiUrl("/auth/refresh"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (res.status === 204) {
      accessToken = null;
      refreshQueue.forEach((cb) => cb(null));
      refreshQueue = [];
      return null;
    }

    if (!res.ok) {
      accessToken = null;
      refreshQueue.forEach((cb) => cb(null));
      refreshQueue = [];
      return null;
    }

    const data = await res.json();
    const newToken = data.data?.accessToken as string | null;
    accessToken = newToken;
    refreshQueue.forEach((cb) => cb(newToken));
    refreshQueue = [];
    return newToken;
  } catch {
    accessToken = null;
    refreshQueue.forEach((cb) => cb(null));
    refreshQueue = [];
    return null;
  } finally {
    isRefreshing = false;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData) && options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  let res: Response;
  try {
    res = await fetch(resolveApiUrl(path), {
      ...options,
      headers,
    });
  } catch {
    throw new ApiRequestError(0, {
      code: "NETWORK_ERROR",
      message: "Cannot reach the community server.",
    });
  }

  if (res.status === 401 && retry) {
    const newToken = await tryRefreshToken();
    if (newToken) {
      return request<T>(path, options, false);
    }
    throw new ApiRequestError(401, {
      code: "AUTH_TOKEN_EXPIRED",
      message: "Session expired. Please log in again.",
    });
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const json = await res.json();

  if (!res.ok) {
    throw new ApiRequestError(res.status, json.error ?? { code: "UNKNOWN", message: "Request failed" });
  }

  return json as T;
}

export const apiClient = {
  get: <T>(path: string, params?: Record<string, string | number>) => {
    const url = params ? `${path}?${new URLSearchParams(params as Record<string, string>)}` : path;
    return request<T>(url);
  },
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body !== undefined ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, formData: FormData, onProgress?: (pct: number) => void): Promise<T> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", resolveApiUrl(path));

      if (accessToken) {
        xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
      }

      if (onProgress) {
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            onProgress(Math.round((e.loaded / e.total) * 100));
          }
        });
      }

      xhr.onload = () => {
        if (xhr.status === 204) {
          resolve(undefined as T);
          return;
        }
        const json = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(json as T);
        } else {
          reject(new ApiRequestError(xhr.status, json.error ?? { code: "UNKNOWN", message: "Upload failed" }));
        }
      };

      xhr.onerror = () => reject(new ApiRequestError(0, { code: "NETWORK_ERROR", message: "Network error" }));
      xhr.send(formData);
    });
  },
};
