export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  category: string;
  stock: number;
}

export interface ProductFeed {
  items: Product[];
  total: number;
  nextCursor: number | null;
  hasMore: boolean;
}
