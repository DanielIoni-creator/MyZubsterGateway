import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';

const API_BASE = 'https://myzubstergateway-1.onrender.com/api';

function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');

  // Carica i prodotti
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API_BASE}/products`);
      setProducts(response.data);
      setLoading(false);
    } catch (err) {
      toast.error('Errore nel caricamento dei prodotti');
      setLoading(false);
    }
  };

  // Filtra i prodotti
  const filteredProducts = products.filter(p => {
    const matchCategory = category === 'all' || p.category === category;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                        p.description.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  // Aggiungi al carrello
  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    toast.success(`${product.name} aggiunto al carrello!`);
  };

  // Rimuovi dal carrello
  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId));
    toast.success('Prodotto rimosso dal carrello');
  };

  // Aggiorna quantità
  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev =>
      prev.map(item =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  };

  // Calcola totale
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Checkout
  const checkout = async () => {
    try {
      const response = await axios.post(`${API_BASE}/orders`, {
        items: cart,
        total
      });
      toast.success('Ordine completato!');
      setCart([]);
    } catch (err) {
      toast.error('Errore durante il checkout');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Caricamento prodotti...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="bg-green-600 text-white shadow-lg sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">🛒 Garden Products</h1>
            <div className="flex items-center gap-4">
              <button
                onClick={() => document.getElementById('cart-modal').showModal()}
                className="bg-green-700 hover:bg-green-800 px-4 py-2 rounded-lg flex items-center gap-2 transition"
              >
                🛒 Carrello
                {cart.length > 0 && (
                  <span className="bg-red-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center">
                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Filtri */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <input
              type="text"
              placeholder="Cerca prodotti..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">Tutte le categorie</option>
              <option value="seeds">🌱 Semi</option>
              <option value="plants">🌿 Piante</option>
              <option value="tools">🔧 Attrezzi</option>
              <option value="products">🥬 Prodotti</option>
            </select>
          </div>
        </div>

        {/* Prodotti */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <div key={product.id} className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition">
              <div className="h-48 bg-gray-200 flex items-center justify-center">
                {product.image ? (
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl">🌱</span>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-bold text-lg">{product.name}</h3>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{product.description}</p>
                <div className="mt-2 flex justify-between items-center">
                  <span className="text-lg font-bold text-green-600">{product.price} MYZ</span>
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">{product.category}</span>
                </div>
                <button
                  onClick={() => addToCart(product)}
                  className="mt-3 w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition"
                >
                  Aggiungi al carrello
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Modal Carrello */}
        <dialog id="cart-modal" className="rounded-lg shadow-xl max-w-md w-full p-0">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">🛒 Carrello</h2>
              <button
                onClick={() => document.getElementById('cart-modal').close()}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>
            {cart.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Il carrello è vuoto</p>
            ) : (
              <>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 border-b border-gray-100 pb-4">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-gray-500">{item.price} MYZ</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 bg-gray-100 rounded hover:bg-gray-200"
                        >
                          -
                        </button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 bg-gray-100 rounded hover:bg-gray-200"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Totale</span>
                    <span className="text-green-600">{total.toFixed(2)} MYZ</span>
                  </div>
                  <button
                    onClick={checkout}
                    className="mt-4 w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 transition font-semibold"
                  >
                    Procedi al pagamento
                  </button>
                </div>
              </>
            )}
          </div>
        </dialog>
      </div>
    </div>
  );
}

export default App;
