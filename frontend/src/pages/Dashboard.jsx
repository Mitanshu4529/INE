import { useEffect, useState } from 'react';
import { getTrackedProducts } from '../api';
import { Link } from 'react-router-dom';
import { ArrowUpRight, PackageOpen, RefreshCw, TrendingUp } from 'lucide-react';

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getTrackedProducts().then(res => setProducts(res.data.data)).catch(() => setError('Unable to load your watchlist. Please refresh and try again.')).finally(() => setLoading(false));
  }, []);

  const priced = products.filter(product => product.current_price != null).length;
  const inStock = products.filter(product => product.current_stock > 0).length;

  return (
    <div className="dashboard-page">
      <div className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <span className="eyebrow">Portfolio overview</span>
          <h1>TRACKED<br /><em>with precision.</em></h1>
          <p>A live, focused view of the products you care about, with price and stock signals from the INE store.</p>
        </div>
        <div className="dashboard-hero-side">
          <span>MONITORING SYSTEM / 01</span>
          <p>Keep your watchlist close. Let the scraper handle the noise.</p>
          <Link to="/search" className="hero-link">Add a product <ArrowUpRight size={16} /></Link>
        </div>
      </div>
      <div className="metric-grid">
        <div className="metric-card"><span className="metric-icon navy"><PackageOpen size={18} /></span><div><span className="metric-label">Tracked products</span><strong>{products.length}</strong></div></div>
        <div className="metric-card"><span className="metric-icon coral"><TrendingUp size={18} /></span><div><span className="metric-label">With live price</span><strong>{priced}</strong></div></div>
        <div className="metric-card"><span className="metric-icon mint"><RefreshCw size={18} /></span><div><span className="metric-label">Currently in stock</span><strong>{inStock}</strong></div></div>
      </div>
      {error && <p className="inline-message error-message" role="alert">{error}</p>}
      <div className="list-heading"><div><span className="section-label">Tracked inventory</span><h2>Product watchlist</h2></div><span className="count-pill">{products.length} items</span></div>
      {loading ? <div className="empty-state"><strong>Loading your watchlist...</strong><span>Connecting to the live catalog.</span></div> : products.length === 0 ? <div className="empty-state"><strong>Your watchlist is empty</strong><span>Search the catalog to start tracking prices.</span></div> : <div className="product-grid">
        {products.map((product) => (
          <Link to={`/product/${product.id}`} key={product.id} className="product-card">
            <div className="product-card-top"><span className="product-code">ID {product.product_id}</span><ArrowUpRight size={17} /></div>
            <h3>{product.product_name}</h3>
            <span className="sku">{product.sku || 'Catalog item'}</span>
            <div className="product-stats"><div><span>Current price</span><strong>{product.current_price != null ? `₹${Number(product.current_price).toLocaleString('en-IN')}` : 'Pending'}</strong></div><div><span>Availability</span><strong className={product.current_stock > 0 ? 'stock-good' : ''}>{product.current_stock == null ? 'Pending' : product.current_stock > 0 ? `${product.current_stock} units` : 'Out of stock'}</strong></div></div>
          </Link>
        ))}
      </div>}
    </div>
  );
}
