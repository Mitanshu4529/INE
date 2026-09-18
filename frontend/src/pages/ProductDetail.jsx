import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProductDetail, getProductHistory, getProductLogs, triggerManualScrape } from '../api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
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

  const load = () => {
    getProductDetail(id).then(res => setProduct(res.data.data)).catch(() => setError('Failed to load product.'));
    getProductHistory(id).then(res => setHistory(res.data.data)).catch(() => {});
    getProductLogs(id).then(res => setLogs(res.data.data)).catch(() => {});
  };

  useEffect(() => { load(); }, [id]);

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

  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!product) return <div className="p-8 text-gray-500">Loading...</div>;

  const chartData = [...history]
    .reverse()
    .map(h => ({ date: new Date(h.scraped_at).toLocaleDateString('en-IN'), price: h.price, stock: h.stock }));

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-8">
      <div>
        <Link to="/dashboard" className="text-blue-600 text-sm hover:underline">← Back to Dashboard</Link>
        <h2 className="text-2xl font-bold mt-2">{product.product_name}</h2>
        <p className="text-gray-500 text-sm">SKU: {product.sku}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded p-4">
          <p className="text-sm text-gray-500">Current Price</p>
          <p className="text-3xl font-bold text-blue-700">{formatPrice(product.current_price)}</p>
        </div>
        <div className="border rounded p-4">
          <p className="text-sm text-gray-500">Stock</p>
          <p className={`text-3xl font-bold ${product.current_stock === 0 ? 'text-red-600' : 'text-green-600'}`}>
            {product.current_stock == null ? 'N/A' : product.current_stock === 0 ? 'Out of stock' : `${product.current_stock} units`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleScrape}
          disabled={scraping}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded font-medium"
        >
          {scraping ? 'Scraping…' : 'Manual Scrape Now'}
        </button>
        {scrapeResult && (
          <p className={`text-sm font-medium ${scrapeResult.ok ? 'text-green-700' : 'text-red-700'}`}>
            {scrapeResult.msg}
          </p>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Price History</h3>
        {chartData.length > 0 ? (
          <div className="h-56 border rounded p-2">
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
          <p className="text-gray-500 text-sm">No price history yet. Run a manual scrape to capture the first data point.</p>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Scrape Logs</h3>
        {logs.length > 0 ? (
          <table className="w-full text-sm border rounded overflow-hidden">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2 text-left">Status</th>
                <th className="border p-2 text-left">Attempt</th>
                <th className="border p-2 text-left">Duration</th>
                <th className="border p-2 text-left">Timestamp</th>
                <th className="border p-2 text-left">Note</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="border p-2"><StatusBadge status={log.status} /></td>
                  <td className="border p-2">{log.attempt_number}</td>
                  <td className="border p-2">{log.duration_ms != null ? `${log.duration_ms}ms` : '—'}</td>
                  <td className="border p-2">{formatDateTime(log.attempt_timestamp)}</td>
                  <td className="border p-2 text-gray-500 text-xs">{log.error_message || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-500 text-sm">No scrape logs yet.</p>
        )}
      </div>
    </div>
  );
}
