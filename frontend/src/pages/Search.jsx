import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchProducts, trackProduct } from '../api';
import { ArrowRight, Search as SearchIcon, Sparkles } from 'lucide-react';

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [trackingId, setTrackingId] = useState(null);
  const [confirmation, setConfirmation] = useState('');
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query) return;
    setLoading(true);
    setSearched(true);
    setError('');
    try {
      const response = await searchProducts(query);
      const uniqueResults = Array.from(
        new Map(response.data.data.map(product => [product.id, product])).values(),
      );
      setResults(uniqueResults);
    } catch {
      setError('Unable to search the catalog. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTrack = async (productId) => {
    setTrackingId(productId);
    setError('');
    try {
      await trackProduct(productId);
      setConfirmation('Product added to your watchlist.');
      setTimeout(() => navigate('/dashboard'), 500);
    } catch (err) {
      setError(err?.response?.status === 400 ? 'This product is already being tracked.' : 'Unable to track this product. Please try again.');
    } finally {
      setTrackingId(null);
    }
  };

  return (
    <div className="search-page">
      <div className="page-intro search-intro">
        <div><span className="eyebrow"><Sparkles size={12} /> Catalog explorer</span><h1 className="page-title">Find your next<br /><em>smart buy.</em></h1><p className="page-subtitle">Search the live INE catalog, then add products to your watchlist for price and stock tracking.</p></div>
      </div>
      <form onSubmit={handleSearch} className="search-form surface">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products..."
          className="search-input"
        />
        <button type="submit" className="button button-primary" disabled={loading}><SearchIcon size={16} /> {loading ? 'Searching...' : 'Search catalog'}</button>
      </form>
      {error && <p className="inline-message error-message" role="alert">{error}</p>}
      {confirmation && <p className="inline-message success-message" role="status">{confirmation}</p>}
      <div className="search-meta"><span className="section-label">{searched ? `${results.length} matching products` : 'Start with a name, brand, SKU, or ID'}</span></div>
      <div className="search-results">
        {results.map((product) => (
          <div key={product.id} className="result-card">
            <div>
              <span className="product-code">ID {product.id}</span><h3>{product.name}</h3>
              <p>{product.brand || 'INE catalog'} <span>/</span> {product.sku || 'No SKU'}</p>
            </div>
            <button onClick={() => handleTrack(product.id)} className="icon-button" title="Track product" aria-label={`Track ${product.name}`} disabled={trackingId === product.id}><ArrowRight size={18} /></button>
          </div>
        ))}
      </div>
      {searched && !loading && results.length === 0 && <div className="empty-state"><strong>No products found</strong><span>Try a different name, brand, or product ID.</span></div>}
    </div>
  );
}
