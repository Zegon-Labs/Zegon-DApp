import { getAddress, isAddress } from "viem";

const STORAGE_KEY = "zegon-wallet";

type WalletListener = (address: string | null) => void;

let cachedAddress: string | null = loadStored();

const listeners = new Set<WalletListener>();

function loadStored(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  const stored = sessionStorage.getItem(STORAGE_KEY);
  if (stored && isAddress(stored)) {
    return getAddress(stored);
  }
  return null;
}

function notify(): void {
  for (const listener of listeners) {
    listener(cachedAddress);
  }
}

export function getWalletAddress(): string | null {
  return cachedAddress;
}

export function onWalletChange(listener: WalletListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function hasEthereumProvider(): boolean {
  return typeof window !== "undefined" && Boolean(window.ethereum);
}

export async function connectWallet(): Promise<string> {
  if (!window.ethereum) {
    throw new Error("NO_WALLET");
  }

  const accounts = (await window.ethereum.request({
    method: "eth_requestAccounts",
  })) as string[];

  const raw = accounts[0];
  if (!raw || !isAddress(raw)) {
    throw new Error("INVALID_ADDRESS");
  }

  cachedAddress = getAddress(raw);
  sessionStorage.setItem(STORAGE_KEY, cachedAddress);
  notify();
  return cachedAddress;
}

export function disconnectWallet(): void {
  cachedAddress = null;
  sessionStorage.removeItem(STORAGE_KEY);
  notify();
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}
