import { Platform } from "react-native";
import * as Device from "expo-device";
import { getAuthToken } from "./authSession";

const DEFAULT_API_URL = "https://elevatexco.up.railway.app";

// For development: use emulator/localhost addresses
// For production: use EXPO_PUBLIC_API_URL environment variable
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "") || DEFAULT_API_URL;

console.log(
  `[API] Using backend URL: ${API_URL} (Device: ${Device.isDevice ? "Physical" : "Emulator"}, Platform: ${Platform.OS})`
);

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

export function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;

  if (typeof error === "object" && error !== null) {
    if ("error" in error && typeof error.error === "string") return error.error;
    if ("message" in error && typeof error.message === "string") return error.message;
  }

  return "Something went wrong. Please try again.";
}

function getPayloadMessage(payload: unknown, status: number) {
  if (typeof payload === "object" && payload !== null) {
    if ("error" in payload && typeof payload.error === "string") {
      return payload.error;
    }

    if ("message" in payload && typeof payload.message === "string") {
      return payload.message;
    }

    if ("errors" in payload && Array.isArray(payload.errors)) {
      const validationErrors = payload.errors
        .map((item) => {
          if (typeof item === "string") return item;
          if (
            typeof item === "object" &&
            item !== null &&
            "message" in item &&
            typeof item.message === "string"
          ) {
            return item.message;
          }
          return null;
        })
        .filter((item): item is string => Boolean(item));

      if (validationErrors.length > 0) {
        return validationErrors.join("\n");
      }
    }
  }

  return `Request failed with status ${status}`;
}

async function getHeaders() {
  const token = await getAuthToken();
  return {
    ...(token && {
      Authorization: `Bearer ${token}`,
    }),
  };
}

function isFormDataBody(body: unknown): body is FormData {
  return body instanceof FormData;
}

async function request(path: string, init?: RequestInit) {
  // If the caller already provides a signal (e.g. auth hydration), use it.
  // Otherwise apply a 30-second default so Render cold-starts don't hang forever.
  const ownController = !init?.signal ? new AbortController() : null;
  const ownTimeout = ownController
    ? setTimeout(() => ownController.abort(), 30_000)
    : null;
  const signal = init?.signal ?? ownController!.signal;

  try {
    const isFormData = init?.body && isFormDataBody(init.body);
    console.log(`[API] ${init?.method || 'GET'} ${path} - FormData: ${isFormData}`);
    
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      signal,
      headers: {
        ...(await getHeaders()),
        ...(!isFormData && {
          "Content-Type": "application/json",
        }),
        ...(init?.headers || {}),
      },
    });

    console.log(`[API] Response: ${res.status} ${res.statusText}`);

    if (!res.ok) {
      let payload: unknown = null;

      try {
        payload = await res.json();
      } catch {
        payload = await res.text();
      }

      const message = getPayloadMessage(payload, res.status);
      console.log(`[API] Error: ${message}`);

      throw new ApiError(message, res.status, payload);
    }

    if (res.status === 204) {
      if (ownTimeout) clearTimeout(ownTimeout);
      return null;
    }

    const data = await res.json();
    if (ownTimeout) clearTimeout(ownTimeout);
    return data;
  } catch (error) {
    if (ownTimeout) clearTimeout(ownTimeout);
    console.error(`[API] Exception:`, error);
    
    if (error instanceof TypeError && error.message === 'Network request failed') {
      throw new Error(
        `Cannot reach backend at ${API_URL}. Confirm the API server is running and reachable from the device.`,
      );
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        `Request to ${path} timed out. The server may be starting up — please try again in a moment.`,
      );
    }

    throw error;
  }
}

export const api = {
  get: async (path: string, init?: RequestInit) => request(path, init),

  post: async (path: string, body?: unknown) => {
    return request(path, {
      method: "POST",
      body: isFormDataBody(body) ? body : JSON.stringify(body),
    });
  },

  patch: async (path: string, body?: unknown) => {
    return request(path, {
      method: "PATCH",
      body: isFormDataBody(body) ? body : JSON.stringify(body),
    });
  },

  put: async (path: string, body?: unknown) => {
    return request(path, {
      method: "PUT",
      body: isFormDataBody(body) ? body : JSON.stringify(body),
    });
  },

  delete: async (path: string) => {
    return request(path, {
      method: "DELETE",
    });
  },
};
