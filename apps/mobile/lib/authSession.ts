import * as SecureStore from "expo-secure-store";

const AUTH_TOKEN_KEY = "elevatex_auth_token";

export async function getAuthToken() {
  return SecureStore.getItemAsync(AUTH_TOKEN_KEY);
}

export async function saveAuthToken(token: string) {
  return SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
}

export async function clearAuthToken() {
  return SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
}
