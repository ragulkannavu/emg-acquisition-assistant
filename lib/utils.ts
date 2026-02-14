import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function nanoid(): string {
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
}

export function formatDuration(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min > 0) return `${min}m ${sec}s`;
  return `${sec}s`;
}

export function formatMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(min)}:${pad(sec)}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}
