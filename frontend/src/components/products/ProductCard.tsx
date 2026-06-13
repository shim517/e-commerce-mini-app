import type { Product } from '@/domain/product';

const CATEGORY_COLORS: Record<string, string> = {
  Electronics: 'bg-blue-100 text-blue-700',
  Furniture: 'bg-amber-100 text-amber-700',
  Sports: 'bg-green-100 text-green-700',
  Kitchen: 'bg-orange-100 text-orange-700',
  Home: 'bg-purple-100 text-purple-700',
  Art: 'bg-pink-100 text-pink-700',
  Games: 'bg-indigo-100 text-indigo-700',
};

function categoryColor(cat: string) {
  return CATEGORY_COLORS[cat] ?? 'bg-gray-100 text-gray-600';
}

export default function ProductCard({ product }: { product: Product }) {
  return (
    <article className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      <div className="bg-gradient-to-br from-gray-100 to-gray-200 h-40 flex items-center justify-center shrink-0">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-4xl select-none">🛍️</span>
        )}
      </div>

      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">
            {product.name}
          </h3>
          <span
            className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${categoryColor(product.category)}`}
          >
            {product.category}
          </span>
        </div>

        <p className="text-xs text-gray-500 line-clamp-2 flex-1">{product.description}</p>

        <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-50">
          <span className="text-base font-bold text-gray-900">
            ${Number(product.price).toFixed(2)}
          </span>
          <span
            className={`text-xs ${product.stock > 0 ? 'text-green-600' : 'text-red-500'}`}
          >
            {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
          </span>
        </div>
      </div>
    </article>
  );
}
