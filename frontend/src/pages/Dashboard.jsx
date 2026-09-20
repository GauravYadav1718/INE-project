import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Use VITE_API_BASE_URL if it exists, otherwise assume local backend on 3001
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/products`);
        if (!res.ok) throw new Error('Failed to fetch tracked products');
        const data = await res.json();
        setProducts(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [API_BASE]);

  const formatPrice = (price, currency) => {
    if (price == null) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(price);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="w-8 h-8 text-brand-500 animate-spin" />
        <span className="ml-3 text-gray-500">Waking backend...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
        <h3 className="font-semibold flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2" />
          Error Loading Dashboard
        </h3>
        <p className="mt-1">{error}</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-2">No products tracked yet</h3>
        <p className="text-gray-500 mb-6">Start by discovering products from the mock store.</p>
        <Link to="/search" className="btn btn-primary">Discover Products</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Tracked Products</h1>
        <Link to="/search" className="btn btn-primary text-sm">Add New</Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map(product => (
          <Link key={product.id} to={`/product/${product.id}`} className="card hover:shadow-md transition-shadow flex flex-col">
            <div className="p-5 flex-1">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg font-semibold text-gray-900 line-clamp-2" title={product.name}>
                  {product.name}
                </h2>
                {product.lastScrapeStatus === 'failed' && (
                  <span title="Last scrape failed" className="text-red-500"><AlertTriangle className="w-5 h-5" /></span>
                )}
              </div>
              
              <div className="flex items-end justify-between mb-2">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Current Price</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatPrice(product.latestPrice, product.currency)}
                  </p>
                </div>
                
                {product.change24h != null && (
                  <div className={`flex items-center text-sm font-medium ${product.change24h > 0 ? 'text-red-600' : product.change24h < 0 ? 'text-green-600' : 'text-gray-500'}`}>
                    {product.change24h > 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : product.change24h < 0 ? <TrendingDown className="w-4 h-4 mr-1" /> : null}
                    {Math.abs(product.change24h).toFixed(1)}%
                  </div>
                )}
              </div>
              
              <div className="mt-4 flex flex-wrap gap-2">
                {product.inStock === true ? (
                  <span className="badge badge-success">In Stock</span>
                ) : product.inStock === false ? (
                  <span className="badge badge-error">Out of Stock</span>
                ) : null}
                <span className={`badge ${product.is_active ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                  {product.is_active ? 'Active' : 'Paused'}
                </span>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 text-xs text-gray-500 flex justify-between">
              <span>Scrape Interval: {product.scrape_interval_minutes}m</span>
              <span>
                {product.lastScrapeTime 
                  ? `Updated ${new Date(product.lastScrapeTime).toLocaleTimeString()}` 
                  : 'Pending first scrape'}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
