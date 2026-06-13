import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const exists = await this.repo.existsBy({ email: 'admin@example.com' });
    if (!exists) {
      await this.create('admin@example.com', 'Password123!');
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  async create(email: string, plainPassword: string): Promise<User> {
    const passwordHash = await bcrypt.hash(plainPassword, 12);
    const user = this.repo.create({ email, passwordHash });
    return this.repo.save(user);
  }

  async validatePassword(
    plainPassword: string,
    hash: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hash);
  }
}
