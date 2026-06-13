import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  name: string;

  @Column('text')
  description: string;

  @Column('numeric', { precision: 10, scale: 2 })
  price: number;

  @Column({ name: 'image_url', type: 'varchar', nullable: true, length: 500 })
  imageUrl: string | null;

  @Column({ length: 100 })
  @Index()
  category: string;

  @Column({ default: 0 })
  stock: number;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt: Date;
}
