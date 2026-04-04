import { Platform } from "react-native";
import * as Device from "expo-device";
import { getAuthToken } from "./authSession";

const DEFAULT_API_URL = Platform.select({
  // Android Emulator: use 10.0.2.2 (maps to host machine localhost)
  // Android Physical: use the EXPO_PUBLIC_API_URL env var (must be configured for your network)
  android: "http://10.0.2.2:5001",
  ios: "http://localhost:5001",
  default: "http://localhost:5001",
});

// Allow override via environment variable for physical devices
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

async function request(path: string, init?: RequestInit) {
  try {
    const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        ...(await getHeaders()),
        ...(!isFormData && {
          "Content-Type": "application/json",
        }),
        ...(init?.headers || {}),
      },
    });

    if (!res.ok) {
      let payload: unknown = null;

      try {
        payload = await res.json();
      } catch {
        payload = await res.text();
      }

      const message = getPayloadMessage(payload, res.status);

      throw new ApiError(message, res.status, payload);
    }

    if (res.status === 204) return null;

    return res.json();
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        `Cannot reach backend at ${API_URL}. Confirm the API server is running and reachable from the device.`,
      );
    }

    throw error;
  }
}

export const api = {
  get: async (path: string) => request(path),

  post: async (path: string, body?: unknown) => {
    return request(path, {
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  },

  patch: async (path: string, body?: unknown) => {
    return request(path, {
      method: "PATCH",
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  },

  put: async (path: string, body?: unknown) => {
    return request(path, {
      method: "PUT",
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  },

  delete: async (path: string) => {
    return request(path, {
      method: "DELETE",
    });
  },
};
