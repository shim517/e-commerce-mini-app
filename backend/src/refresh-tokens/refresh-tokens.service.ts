import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { RefreshToken } from './entities/refresh-token.entity';

@Injectable()
export class RefreshTokensService {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly repo: Repository<RefreshToken>,
  ) {}

  async create(
    userId: string,
    rawToken: string,
    expiryDays: number,
  ): Promise<RefreshToken> {
    const tokenHash = this.hash(rawToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    const token = this.repo.create({
      userId,
      tokenHash,
      lastActivityAt: new Date(),
      expiresAt,
    });
    return this.repo.save(token);
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.repo.findOne({ where: { tokenHash } });
  }

  async updateLastActivity(id: string): Promise<void> {
    await this.repo.update(id, { lastActivityAt: new Date() });
  }

  async updateLastActivityByHash(tokenHash: string): Promise<void> {
    await this.repo.update({ tokenHash }, { lastActivityAt: new Date() });
  }

  async deleteById(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async deleteByTokenHash(tokenHash: string): Promise<void> {
    await this.repo.delete({ tokenHash });
  }

  async deleteAllForUser(userId: string): Promise<void> {
    await this.repo.delete({ userId });
  }

  hash(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }
}
