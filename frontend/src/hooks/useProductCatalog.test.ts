import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { productsApi } from '@/lib/api';
import { useProductCatalog } from './useProductCatalog';
import type { ProductFeed } from '@/domain/product';

vi.mock('@/lib/api', () => ({
  productsApi: { getPage: vi.fn() },
  default: {},
}));

const mockGetPage = vi.mocked(productsApi.getPage);

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return createElement(QueryClientProvider, { client }, children);
}

const PAGE_1: ProductFeed = {
  items: [{ id: 1, name: 'Widget', description: 'A widget', price: 9.99, imageUrl: null, category: 'Gadgets', stock: 5 }],
  total: 2,
  nextCursor: 2,
  hasMore: true,
};

const PAGE_2: ProductFeed = {
  items: [{ id: 2, name: 'Gadget', description: 'A gadget', price: 19.99, imageUrl: null, category: 'Gadgets', stock: 3 }],
  total: 2,
  nextCursor: null,
  hasMore: false,
};

describe('useProductCatalog', () => {
  beforeEach(() => {
    mockGetPage.mockReset();
  });

  it('starts in loading state with no products', () => {
    mockGetPage.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useProductCatalog(20), { wrapper });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.products).toEqual([]);
  });

  it('exposes products, total and hasMore after data loads', async () => {
    mockGetPage.mockResolvedValue(PAGE_1);
    const { result } = renderHook(() => useProductCatalog(20), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.products).toEqual(PAGE_1.items);
    expect(result.current.total).toBe(2);
    expect(result.current.hasMore).toBe(true);
  });

  it('sets isError and returns empty products when the API fails', async () => {
    mockGetPage.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useProductCatalog(20), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.products).toEqual([]);
  });

  it('appends next page when fetchMore is called', async () => {
    mockGetPage.mockResolvedValueOnce(PAGE_1).mockResolvedValueOnce(PAGE_2);
    const { result } = renderHook(() => useProductCatalog(20), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    result.current.fetchMore();
    await waitFor(() => expect(result.current.products).toHaveLength(2));

    expect(result.current.products.map((p) => p.id)).toEqual([1, 2]);
    expect(result.current.hasMore).toBe(false);
  });
});
