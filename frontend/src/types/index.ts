export interface User {
  id: string;
  email: string;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  category: string;
  stock: number;
  createdAt: string;
}

export interface ProductPage {
  items: Product[];
  nextCursor: number | null;
  hasMore: boolean;
  total: number;
}
