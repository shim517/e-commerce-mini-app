import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';
import ProductCatalog from './ProductCatalog';
import type { ProductCatalogViewModel } from '@/hooks/useProductCatalog';
import type { Product } from '@/domain/product';

const PRODUCT: Product = {
  id: 1,
  name: 'Widget',
  description: 'A fine widget',
  price: 9.99,
  imageUrl: null,
  category: 'Gadgets',
  stock: 5,
};

function makeViewModel(overrides: Partial<ProductCatalogViewModel> = {}): ProductCatalogViewModel {
  return {
    products: [],
    total: 0,
    isLoading: false,
    isFetchingMore: false,
    isError: false,
    hasMore: false,
    fetchMore: vi.fn(),
    retry: vi.fn(),
    ...overrides,
  };
}

function renderCatalog(viewModel: ProductCatalogViewModel, { pageSize = 4, onLogout = vi.fn() } = {}) {
  render(
    <ProductCatalog
      viewModel={viewModel}
      pageSize={pageSize}
      onPageSizeChange={vi.fn()}
      onLogout={onLogout}
    />,
  );
}

describe('ProductCatalog', () => {
  it('shows skeleton placeholders while loading', () => {
    renderCatalog(makeViewModel({ isLoading: true }), { pageSize: 4 });
    expect(document.querySelectorAll('.animate-pulse')).toHaveLength(4);
  });

  it('shows error message when fetch fails', () => {
    renderCatalog(makeViewModel({ isError: true }));
    expect(screen.getByText('Failed to load products.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('shows empty state when there are no products', () => {
    renderCatalog(makeViewModel());
    expect(screen.getByText('No products found.')).toBeInTheDocument();
  });

  it('renders product names from the view model', () => {
    renderCatalog(makeViewModel({ products: [PRODUCT], total: 1 }));
    expect(screen.getByText('Widget')).toBeInTheDocument();
    expect(screen.getByText('1 of 1 products')).toBeInTheDocument();
  });

  it('calls onLogout when sign out is clicked', async () => {
    const onLogout = vi.fn();
    renderCatalog(makeViewModel(), { onLogout });
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(onLogout).toHaveBeenCalledOnce();
  });
});
