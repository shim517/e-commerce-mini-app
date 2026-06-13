'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { productsApi, authApi } from '@/lib/api';
import ProductCard from './ProductCard';
import PageSizeSelector from './PageSizeSelector';
import type { ProductPage } from '@/types';

export default function ProductCatalog() {
  const router = useRouter();
  const [pageSize, setPageSize] = useState(20);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, refetch } =
    useInfiniteQuery<ProductPage>({
      queryKey: ['products', pageSize],
      queryFn: ({ pageParam }) =>
        productsApi.getPage(pageParam as number | undefined, pageSize),
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      initialPageParam: undefined,
    });

  // Intersection Observer — triggers next page when sentinel is visible
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Reset query when page size changes
  const handlePageSizeChange = useCallback(
    (size: number) => {
      setPageSize(size);
    },
    [],
  );

  async function handleLogout() {
    try {
      await authApi.logout();
    } finally {
      router.replace('/login');
    }
  }

  const allProducts = data?.pages.flatMap((p) => p.items) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Product Catalog</h1>
            {total > 0 && (
              <p className="text-xs text-gray-500 mt-0.5">
                {allProducts.length} of {total} products
              </p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <PageSizeSelector value={pageSize} onChange={handlePageSizeChange} />
            <button
              onClick={() => void handleLogout()}
              className="text-sm text-gray-500 hover:text-gray-900 transition"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: pageSize }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 h-64 animate-pulse" />
            ))}
          </div>
        )}

        {isError && (
          <div className="text-center py-20">
            <p className="text-gray-500 mb-4">Failed to load products.</p>
            <button
              onClick={() => void refetch()}
              className="text-sm text-blue-600 hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {!isLoading && !isError && allProducts.length === 0 && (
          <p className="text-center py-20 text-gray-500">No products found.</p>
        )}

        {allProducts.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {allProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} className="py-4 flex justify-center">
          {isFetchingNextPage && (
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          )}
          {!hasNextPage && allProducts.length > 0 && (
            <p className="text-xs text-gray-400">All {total} products loaded</p>
          )}
        </div>
      </main>
    </div>
  );
}
