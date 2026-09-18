import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchProducts, trackProduct } from '../api';

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query) return;
    setLoading(true);
    try {
      const response = await searchProducts(query);
      setResults(response.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTrack = async (productId) => {
    try {
      await trackProduct(productId);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Search Products</h2>
      <form onSubmit={handleSearch} className="mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products..."
          className="border p-2 rounded w-full md:w-1/2"
        />
        <button type="submit" className="bg-blue-500 text-white p-2 rounded ml-2">Search</button>
      </form>
      {loading && <p>Loading...</p>}
      <div className="grid gap-4">
        {results.map((product) => (
          <div key={product.id} className="border p-4 rounded flex justify-between items-center">
            <div>
              <h3 className="font-semibold">{product.name}</h3>
              <p className="text-sm text-gray-600">{product.brand}</p>
            </div>
            <button onClick={() => handleTrack(product.id)} className="bg-green-500 text-white p-2 rounded">Track</button>
          </div>
        ))}
      </div>
    </div>
  );
}
