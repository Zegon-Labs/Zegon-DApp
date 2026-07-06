import { getAddress } from "viem";
import { getWalletAddress } from "./wallet.js";

export interface SiweAuth {
  message: string;
  signature: string;
}

export async function signSiweMessage(address: string): Promise<SiweAuth | null> {
  if (typeof window === "undefined" || !window.ethereum) return null;
  try {
    const res = await fetch(`/api/auth/nonce?address=${encodeURIComponent(address)}`);
    if (!res.ok) return null;
    const { message } = (await res.json()) as { message: string };
    const signature = (await window.ethereum.request({
      method: "personal_sign",
      params: [message, address],
    })) as string;
    return { message, signature };
  } catch {
    return null;
  }
}

export async function withSiweAuth<T extends Record<string, unknown>>(
  body: T,
): Promise<T & { auth?: SiweAuth }> {
  const address = getWalletAddress();
  if (!address) return body;
  const auth = await signSiweMessage(getAddress(address));
  return auth ? { ...body, auth } : body;
}
