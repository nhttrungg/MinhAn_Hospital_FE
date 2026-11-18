export type ProblemBody = {
  title?: string;
  detail?: string;
  errors?: { field: string; message: string }[];
  code?: string;
  blockers?: { id: number; code: string; status: string }[];
  totalBlockers?: number;
};

export class ApiError extends Error {
  readonly status: number;
  readonly title: string;
  readonly problem: ProblemBody;

  constructor(status: number, title: string, detail: string, problem: ProblemBody = {}) {
    super(detail);
    this.status = status;
    this.title = title;
    this.problem = problem;
  }
}

function readCookie(name: string): string | null {
  const prefix = `${name}=`;
  const pair = document.cookie.split("; ").find((item) => item.startsWith(prefix));
  return pair ? decodeURIComponent(pair.slice(prefix.length)) : null;
}

async function ensureCsrf(signal?: AbortSignal | null): Promise<void> {
  if (readCookie("XSRF-TOKEN")) {
    return;
  }
  await fetch("/api/v1/auth/csrf", { credentials: "include", cache: "no-store", signal });
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  let response: Response;
  try {
    if (method !== "GET" && method !== "HEAD") {
      await ensureCsrf(init.signal);
      const token = readCookie("XSRF-TOKEN");
      if (token) {
        headers.set("X-XSRF-TOKEN", token);
      }
    }
    response = await fetch(path, {
      ...init,
      headers,
      credentials: "include",
      cache: "no-store",
    });
  } catch (error) {
    if (error && typeof error === "object" && "name" in error && error.name === "AbortError")
      throw error;
    throw new ApiError(0, "Lỗi kết nối", "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.");
  }
  if (
    response.ok &&
    typeof window !== "undefined" &&
    method === "POST" &&
    /^\/api\/v1\/auth\/(login|logout|change-password|mfa\/(verify|enable|disable))$/.test(path)
  ) {
    window.dispatchEvent(new Event("antam-auth-changed"));
  }
  if (response.status === 204) {
    return undefined as T;
  }
  const text = await response.text();
  let body: ProblemBody | T | null = null;
  if (text) {
    try {
      body = JSON.parse(text) as ProblemBody | T;
    } catch {
      throw new ApiError(
        response.status,
        "Phản hồi không hợp lệ",
        "Không đọc được phản hồi máy chủ. Vui lòng thử lại.",
      );
    }
  }
  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined")
      window.dispatchEvent(new CustomEvent("antam-session-expired", { detail: { path } }));
    const problem = (body ?? {}) as ProblemBody;
    const fieldErrors = problem.errors?.map((item) => item.message).join(" ") ?? "";
    throw new ApiError(
      response.status,
      problem.title ?? "Không thực hiện được",
      [problem.detail, fieldErrors].filter(Boolean).join(" "),
      problem,
    );
  }
  return body as T;
}

export function queryString(
  params: Record<string, string | number | boolean | null | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export async function allOptions<T>(path: string, init: RequestInit = {}): Promise<T[]> {
  const items: T[] = [];
  let page = 0;
  let totalPages = 1;
  do {
    const data = await api<{ content: T[]; totalPages: number }>(
      `${path}${path.includes("?") ? "&" : "?"}size=100&page=${page}`,
      init,
    );
    items.push(...data.content);
    totalPages = data.totalPages;
    page++;
  } while (page < totalPages);
  return items;
}
