'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useProductCatalog } from '@/hooks/useProductCatalog';
import ProductCatalog from '@/components/products/ProductCatalog';

export default function ProductsClient() {
  const router = useRouter();
  const [pageSize, setPageSize] = useState(20);
  const viewModel = useProductCatalog(pageSize);

  async function handleLogout() {
    try {
      await authApi.logout();
    } finally {
      router.replace('/login');
    }
  }

  return (
    <ProductCatalog
      viewModel={viewModel}
      pageSize={pageSize}
      onPageSizeChange={setPageSize}
      onLogout={() => void handleLogout()}
    />
  );
}
