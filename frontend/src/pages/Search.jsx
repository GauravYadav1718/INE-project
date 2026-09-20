import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, Plus, Check, Loader2 } from 'lucide-react';

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [trackingIds, setTrackingIds] = useState(new Set());
  const navigate = useNavigate();

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
  const TARGET_URL = 'https://demo.inelabteamdev.com';

  useEffect(() => {
    const fetchExisting = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/products`);
        if (res.ok) {
          const existing = await res.json();
          setTrackingIds(new Set(existing.map(p => p.external_id)));
        }
      } catch (e) {
        console.error("Failed to fetch existing products", e);
      }
    };
    fetchExisting();
  }, [API_BASE]);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        }
      } catch (err) {
        console.error("Search error", err);
      } finally {
        setLoading(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [query, API_BASE]);

  const handleTrack = async (product) => {
    try {
      const res = await fetch(`${API_BASE}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: product.name,
          external_id: product.id.toString(),
          url: `${TARGET_URL}/product/${product.id}`,
          // mock api catalog doesn't return image_url, so we omit it or construct it
        })
      });
      
      if (res.ok) {
        const newProd = await res.json();
        setTrackingIds(new Set([...trackingIds, product.id.toString()]));
        // Navigate to the newly tracked product after a short delay
        setTimeout(() => navigate(`/product/${newProd.id}`), 1000);
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to track product');
      }
    } catch (e) {
      alert('Network error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Discover Products</h1>
        <p className="text-gray-500 max-w-xl mx-auto">Search the INE Lab mock store catalog to find products to track. Our scraper will fetch their prices on a schedule.</p>
      </div>

      <div className="relative mb-8 shadow-sm">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <SearchIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-4 border border-gray-300 rounded-xl focus:ring-brand-500 focus:border-brand-500 sm:text-lg bg-white"
          placeholder="Search for laptops, headphones, smart home..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {loading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <Loader2 className="h-5 w-5 text-brand-500 animate-spin" />
          </div>
        )}
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md border border-gray-200">
        <ul className="divide-y divide-gray-200">
          {results.map((product) => {
            const isTracked = trackingIds.has(product.id.toString());
            return (
              <li key={product.id}>
                <div className="px-4 py-4 flex items-center sm:px-6 hover:bg-gray-50 transition-colors">
                  <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                    <div className="truncate">
                      <div className="flex text-sm">
                        <p className="font-medium text-brand-600 truncate">{product.name}</p>
                        <p className="ml-1 flex-shrink-0 font-normal text-gray-500">
                          in {product.category}
                        </p>
                      </div>
                      <div className="mt-2 flex">
                        <div className="flex items-center text-sm text-gray-500">
                          <span>{product.brand}</span>
                          <span className="mx-2">&bull;</span>
                          <span>SKU: {product.sku}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="ml-5 flex-shrink-0">
                    {isTracked ? (
                      <span className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 cursor-default">
                        <Check className="w-4 h-4 mr-1" /> Tracked
                      </span>
                    ) : (
                      <button
                        onClick={() => handleTrack(product)}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
                      >
                        <Plus className="w-4 h-4 mr-1" /> Track Price
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
          
          {query.length >= 2 && !loading && results.length === 0 && (
            <li className="px-4 py-12 text-center text-gray-500">
              No products found matching "{query}"
            </li>
          )}
          
          {query.length < 2 && (
            <li className="px-4 py-12 text-center text-gray-400">
              Type at least 2 characters to search the store.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
