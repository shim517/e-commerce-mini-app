import { useInfiniteQuery } from '@tanstack/react-query';
import { productsApi } from '@/lib/api';
import type { Product, ProductFeed } from '@/domain/product';

export interface ProductCatalogViewModel {
  products: Product[];
  total: number;
  isLoading: boolean;
  isFetchingMore: boolean;
  isError: boolean;
  error: Error | null;
  hasMore: boolean;
  fetchMore: () => void;
  retry: () => void;
}

export function useProductCatalog(pageSize: number): ProductCatalogViewModel {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, error, refetch } =
    useInfiniteQuery<ProductFeed>({
      queryKey: ['products', pageSize],
      queryFn: ({ pageParam }) =>
        productsApi.getPage(pageParam as number | undefined, pageSize),
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      initialPageParam: undefined,
    });

  return {
    products: data?.pages.flatMap((p) => p.items) ?? [],
    total: data?.pages[0]?.total ?? 0,
    isLoading,
    isFetchingMore: isFetchingNextPage,
    isError,
    error: error as Error | null,
    hasMore: hasNextPage ?? false,
    fetchMore: () => { void fetchNextPage(); },
    retry: () => { void refetch(); },
  };
}
