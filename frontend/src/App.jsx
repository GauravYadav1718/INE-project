import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { LayoutDashboard, Search as SearchIcon } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import ProductDetail from './pages/ProductDetail';
import Search from './pages/Search';

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <Link to="/" className="flex items-center flex-shrink-0">
                  <div className="w-8 h-8 bg-brand-600 rounded flex items-center justify-center text-white font-bold text-xl mr-2">
                    PT
                  </div>
                  <span className="font-bold text-xl tracking-tight text-gray-900">PriceTracker</span>
                </Link>
                <nav className="ml-10 hidden md:flex space-x-8">
                  <Link to="/" className="inline-flex items-center px-1 pt-1 border-b-2 border-brand-500 text-sm font-medium text-gray-900">
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    Dashboard
                  </Link>
                  <Link to="/search" className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300">
                    <SearchIcon className="w-4 h-4 mr-2" />
                    Discover
                  </Link>
                </nav>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/search" element={<Search />} />
          </Routes>
        </main>
        
        <footer className="bg-white border-t border-gray-200 py-6">
          <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
            INE Price Tracker &copy; {new Date().getFullYear()}
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
