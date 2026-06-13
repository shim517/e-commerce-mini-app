import { Injectable } from '@nestjs/common';

interface AttemptRecord {
  count: number;
  lockedUntil: Date | null;
}

const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

@Injectable()
export class LoginAttemptsService {
  private readonly store = new Map<string, AttemptRecord>();

  isLocked(ip: string): boolean {
    const record = this.store.get(ip);
    if (!record?.lockedUntil) return false;
    if (record.lockedUntil > new Date()) return true;
    this.store.delete(ip);
    return false;
  }

  recordFailure(ip: string): void {
    const record = this.store.get(ip) ?? { count: 0, lockedUntil: null };
    record.count += 1;
    if (record.count >= MAX_ATTEMPTS) {
      record.lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
    }
    this.store.set(ip, record);
  }

  resetAttempts(ip: string): void {
    this.store.delete(ip);
  }

  getLockoutRemainingSeconds(ip: string): number {
    const record = this.store.get(ip);
    if (!record?.lockedUntil || record.lockedUntil <= new Date()) return 0;
    return Math.ceil((record.lockedUntil.getTime() - Date.now()) / 1000);
  }
}
