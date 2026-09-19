import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProductDetail, getProductHistory, getProductLogs, triggerManualScrape } from '../api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowLeft, RefreshCw, ShieldCheck } from 'lucide-react';

function formatPrice(p) {
  if (p == null) return 'N/A';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(p);
}

function formatDateTime(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function StatusBadge({ status }) {
  const colors = {
    SUCCESS: 'bg-green-100 text-green-800',
    FAILED: 'bg-red-100 text-red-800',
    RETRYING: 'bg-yellow-100 text-yellow-800',
  };
  return (
    <span className={`status-badge ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [history, setHistory] = useState([]);
  const [logs, setLogs] = useState([]);
  const [scraping, setScraping] = useState(false);
  const [error, setError] = useState(null);
  const [scrapeResult, setScrapeResult] = useState(null);

  const load = useCallback(() => {
    getProductDetail(id).then(res => setProduct(res.data.data)).catch(() => setError('Failed to load product.'));
    getProductHistory(id).then(res => setHistory(res.data.data)).catch(() => {});
    getProductLogs(id).then(res => setLogs(res.data.data)).catch(() => {});
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleScrape = async () => {
    setScraping(true);
    setScrapeResult(null);
    setError(null);
    try {
      const res = await triggerManualScrape(id);
      if (res.data.success) {
        setScrapeResult({ ok: true, msg: `Price scraped: ${formatPrice(res.data.data.price)}, Stock: ${res.data.data.stock}` });
      } else {
        setScrapeResult({ ok: false, msg: res.data.error?.message || 'Scrape failed' });
      }
      load();
    } catch (err) {
      setScrapeResult({ ok: false, msg: err?.response?.data?.error?.message || err.message || 'Scrape failed' });
    } finally {
      setScraping(false);
    }
  };

  if (error) return <div className="empty-state"><strong>{error}</strong><span>Return to your dashboard and try again.</span></div>;
  if (!product) return <div className="empty-state"><strong>Loading product intelligence...</strong></div>;

  const chartData = [...history]
    .reverse()
    .map(h => ({ date: new Date(h.scraped_at).toLocaleDateString('en-IN'), price: h.price, stock: h.stock }));

  return (
    <div className="detail-page">
      <Link to="/dashboard" className="back-link"><ArrowLeft size={15} /> Back to watchlist</Link>
      <div className="detail-heading">
        <div><span className="eyebrow">Product intelligence / {product.product_id}</span><h1 className="page-title">{product.product_name}</h1><p className="page-subtitle">SKU {product.sku || 'Not supplied'} · Live signals from the INE store</p></div>
        <span className="verified-badge"><ShieldCheck size={15} /> Source verified</span>
      </div>

      <div className="detail-stats">
        <div className="detail-stat price-stat"><span>Current price</span><strong>{formatPrice(product.current_price)}</strong><small>Latest successful scrape</small>
        </div>
        <div className="detail-stat"><span>Stock signal</span><strong className={product.current_stock > 0 ? 'stock-good' : ''}>
            {product.current_stock == null ? 'N/A' : product.current_stock === 0 ? 'Out of stock' : `${product.current_stock} units`}
          </strong><small>Captured from product page</small>
        </div>
      </div>

      <div className="detail-actions">
        <button
          onClick={handleScrape}
          disabled={scraping}
          className="button button-primary"
        >
          <RefreshCw size={16} className={scraping ? 'spin' : ''} /> {scraping ? 'Scraping…' : 'Refresh live data'}
        </button>
        {scrapeResult && (
          <p className={`text-sm font-medium ${scrapeResult.ok ? 'text-green-700' : 'text-red-700'}`}>
            {scrapeResult.msg}
          </p>
        )}
      </div>

      <div className="detail-section surface">
        <div className="section-title"><div><span className="section-label">Historical signal</span><h3>Price history</h3></div><span className="count-pill">{chartData.length} points</span></div>
        {chartData.length > 0 ? (
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `₹${(v/1000).toFixed(1)}k`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatPrice(v)} />
                <Line type="monotone" dataKey="price" stroke="#3b82f6" dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="muted-note">No price history yet. Run a refresh to capture the first data point.</p>
        )}
      </div>

      <div className="detail-section surface">
        <div className="section-title"><div><span className="section-label">Audit trail</span><h3>Scrape activity</h3></div></div>
        {logs.length > 0 ? (
          <table className="logs-table">
            <thead>
              <tr>
                <th>Status</th><th>Attempt</th><th>Duration</th><th>Timestamp</th><th>Note</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td><StatusBadge status={log.status} /></td><td>{log.attempt_number}</td><td>{log.duration_ms != null ? `${log.duration_ms}ms` : '—'}</td><td>{formatDateTime(log.attempt_timestamp)}</td><td className="log-note">{log.error_message || 'Completed successfully'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted-note">No scrape logs yet.</p>
        )}
      </div>
    </div>
  );
}
