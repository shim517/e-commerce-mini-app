import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';
import { GetProductsDto } from './dto/get-products.dto';

const makeProduct = (id: number): Product =>
  ({ id, name: `Product ${id}` }) as Product;

describe('ProductsService', () => {
  let service: ProductsService;

  const mockQb = {
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  const mockRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQb),
    count: jest.fn().mockResolvedValue(1), // > 0 prevents seeding
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRepo.createQueryBuilder.mockReturnValue(mockQb);
    mockRepo.count.mockResolvedValue(1);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getRepositoryToken(Product), useValue: mockRepo },
      ],
    }).compile();

    service = module.get(ProductsService);
  });

  describe('findPage', () => {
    it.each([
      {
        scenario: 'fewer items than limit — last page',
        limit: 5,
        returnedItems: [1, 2, 3].map(makeProduct),
        expected: { hasMore: false, nextCursor: null, count: 3 },
      },
      {
        scenario: 'exactly limit+1 items returned — has next page',
        limit: 3,
        returnedItems: [1, 2, 3, 4].map(makeProduct),
        expected: { hasMore: true, nextCursor: 3, count: 3 },
      },
      {
        scenario: 'empty result set',
        limit: 10,
        returnedItems: [],
        expected: { hasMore: false, nextCursor: null, count: 0 },
      },
    ])('$scenario', async ({ limit, returnedItems, expected }) => {
      mockQb.getMany.mockResolvedValue([...returnedItems]);
      mockRepo.count.mockResolvedValue(50);

      const result = await service.findPage({ limit } as GetProductsDto);

      expect(result.hasMore).toBe(expected.hasMore);
      expect(result.nextCursor).toBe(expected.nextCursor);
      expect(result.items).toHaveLength(expected.count);
      expect(result.total).toBe(50);
    });

    it('does not add a WHERE clause when no cursor is given', async () => {
      mockQb.getMany.mockResolvedValue([]);
      mockRepo.count.mockResolvedValue(0);

      await service.findPage({ limit: 10 } as GetProductsDto);

      expect(mockQb.where).not.toHaveBeenCalled();
    });

    it('adds a WHERE clause with the cursor value when cursor is provided', async () => {
      mockQb.getMany.mockResolvedValue([]);
      mockRepo.count.mockResolvedValue(0);

      await service.findPage({ cursor: 42, limit: 10 } as GetProductsDto);

      expect(mockQb.where).toHaveBeenCalledWith('p.id > :cursor', {
        cursor: 42,
      });
    });
  });
});
