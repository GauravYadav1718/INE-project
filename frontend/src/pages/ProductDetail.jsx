import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Clock, Activity, Settings2, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea } from 'recharts';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [product, setProduct] = useState(null);
  const [history, setHistory] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showLogs, setShowLogs] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, histRes, logsRes] = await Promise.all([
          fetch(`${API_BASE}/api/products`), // In a real app we'd have GET /products/:id, reusing list for now
          fetch(`${API_BASE}/api/products/${id}/history`),
          fetch(`${API_BASE}/api/products/${id}/logs`)
        ]);

        const products = await prodRes.json();
        const p = products.find(prod => prod.id === id);
        setProduct(p);
        setHistory(await histRes.json());
        setLogs(await logsRes.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, API_BASE]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to stop tracking this product and delete all its history?')) return;
    
    try {
      await fetch(`${API_BASE}/api/products/${id}`, { method: 'DELETE' });
      navigate('/');
    } catch (e) {
      alert('Failed to delete');
    }
  };

  const handleToggleActive = async () => {
    try {
      const newStatus = !product.is_active;
      await fetch(`${API_BASE}/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newStatus })
      });
      setProduct({ ...product, is_active: newStatus });
    } catch (e) {
      alert('Failed to update');
    }
  };

  const chartData = useMemo(() => {
    return history.map(h => ({
      ...h,
      dateFormatted: new Date(h.scraped_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      priceNum: parseFloat(h.price)
    }));
  }, [history]);

  if (loading) return <div className="p-12 text-center text-gray-500">Loading details...</div>;
  if (!product) return <div className="p-12 text-center text-red-500">Product not found</div>;

  return (
    <div>
      <button onClick={() => navigate(-1)} className="inline-flex items-center text-sm text-brand-600 hover:text-brand-800 mb-6 font-medium">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back
      </button>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h1>
          <div className="flex flex-wrap gap-2 text-sm text-gray-500">
            <a href={product.url} target="_blank" rel="noreferrer" className="hover:underline text-brand-600">View on Target Store ↗</a>
            <span>&bull;</span>
            <span>External ID: {product.external_id || 'N/A'}</span>
            <span>&bull;</span>
            <span>Added {new Date(product.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button onClick={handleToggleActive} className={`btn ${product.is_active ? 'btn-ghost' : 'btn-primary'} text-sm`}>
            {product.is_active ? 'Pause Tracking' : 'Resume Tracking'}
          </button>
          <button onClick={handleDelete} className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Delete">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setShowLogs(false)}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center ${!showLogs ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            <Activity className="w-4 h-4 mr-2" /> Price History
          </button>
          <button
            onClick={() => setShowLogs(true)}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center ${showLogs ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            <Settings2 className="w-4 h-4 mr-2" /> Scraper Logs
          </button>
        </nav>
      </div>

      {!showLogs ? (
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Price over time</h3>
          {chartData.length > 0 ? (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="dateFormatted" angle={-45} textAnchor="end" tick={{fontSize: 12}} height={60} stroke="#9ca3af" />
                  <YAxis 
                    domain={['auto', 'auto']} 
                    tickFormatter={(val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: product.currency || 'USD', maximumFractionDigits: 0 }).format(val)} 
                    tick={{fontSize: 12}}
                    stroke="#9ca3af"
                  />
                  <Tooltip 
                    formatter={(value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: product.currency || 'USD' }).format(value)}
                    labelStyle={{ color: '#374151' }}
                  />
                  <Line type="stepAfter" dataKey="priceNum" stroke="#16a34a" strokeWidth={3} dot={chartData.length < 20} activeDot={{ r: 6 }} />
                  {/* Highlight out of stock periods if requested, for now we just show the line */}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">No price history available yet.</div>
          )}
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Strategy</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attempts</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Error</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id} className={log.status === 'failed' ? 'bg-red-50/30' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {log.status === 'success' ? (
                      <span className="badge badge-success"><CheckCircle className="w-3 h-3 mr-1"/> Success</span>
                    ) : log.status === 'retried' ? (
                      <span className="badge badge-warning"><AlertTriangle className="w-3 h-3 mr-1"/> Retried</span>
                    ) : (
                      <span className="badge badge-error"><XCircle className="w-3 h-3 mr-1"/> Failed</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.strategy}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                    {log.attempts}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.duration_ms}ms
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={log.error_message}>
                    {log.error_message || '-'}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-500">No scrape logs available.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
