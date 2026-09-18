import { useEffect, useState } from 'react';
import { getTrackedProducts } from '../api';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    getTrackedProducts().then(res => setProducts(res.data.data));
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Tracked Products</h2>
      <div className="grid gap-4">
        {products.map((product) => (
          <Link to={`/product/${product.id}`} key={product.id} className="border p-4 rounded block hover:bg-gray-50">
            <h3 className="font-semibold">{product.product_name}</h3>
            <p>Price: {product.current_price || 'N/A'}</p>
            <p>Stock: {product.current_stock ?? 'N/A'}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
