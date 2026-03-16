import React, { useState, useEffect } from 'react';
import {
  Search,
  ShoppingCart,
  Heart,
  Star,
  MapPin,
  Truck,
  AlertCircle,
  Filter,
  X,
  ChevronDown,
  Plus,
  Minus,
  Check,
  Clock,
  Package,
  DollarSign,
  Download,
  Upload,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSupplies, Supply, CartItem } from '../hooks/useSupplies';
import { useToast } from '../hooks/useToast';

const SUPPLY_CATEGORIES = [
  'All',
  'Equipment',
  'Materials',
  'Tools',
  'Parts',
  'Safety Gear',
  'Consumables',
  'Other',
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
];

interface SupplyFormData {
  name: string;
  category: string;
  description: string;
  unit_price: string;
  stock_quantity: string;
  unit_type: string;
}

export default function Supplies() {
  const { user } = useAuth();
  const { success: showSuccess, error: showError } = useToast();
  const {
    supplies,
    filteredSupplies,
    loading,
    error,
    fetchSupplies,
    cartItems,
    fetchCart,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    createOrder,
    fetchUserOrders,
    toggleFavorite,
    saveSupply,
  } = useSupplies();

  const [activeTab, setActiveTab] = useState<'browse' | 'cart' | 'orders' | 'sell'>('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'rating' | 'price-low' | 'price-high'>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSupply, setSelectedSupply] = useState<Supply | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [userOrders, setUserOrders] = useState<any[]>([]);

  // Form state for Sell tab
  const [formData, setFormData] = useState<SupplyFormData>({
    name: '',
    category: 'Equipment',
    description: '',
    unit_price: '',
    stock_quantity: '',
    unit_type: 'Piece',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);

  // Initialize
  useEffect(() => {
    fetchSupplies({ category: selectedCategory, search: searchQuery, sortBy });
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchCart();
    }
  }, [user?.id]);

  // Handle search and filters
  useEffect(() => {
    fetchSupplies({
      category: selectedCategory,
      search: searchQuery,
      sortBy,
    });
  }, [searchQuery, selectedCategory, sortBy]);

  // Load user orders when orders tab is viewed
  useEffect(() => {
    if (activeTab === 'orders' && user?.id) {
      fetchUserOrders().then(orders => {
        setUserOrders(orders || []);
      });
    }
  }, [activeTab, user?.id, fetchUserOrders]);

  const handleAddToCart = async (supply: Supply) => {
    const success = await addToCart(supply.id);
    if (success) {
      showSuccess(`${supply.name} added to cart!`);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    setFormError(null);
    setFormSuccess(false);
  };

  const validateForm = (): boolean => {
    // Name validation
    if (!formData.name || !formData.name.trim()) {
      setFormError('Supply name is required');
      return false;
    }
    if (formData.name.trim().length < 3) {
      setFormError('Supply name must be at least 3 characters');
      return false;
    }

    // Category validation
    if (!formData.category || formData.category === '' || formData.category === 'Select Category') {
      setFormError('Please select a category');
      return false;
    }

    // Price validation
    if (!formData.unit_price) {
      setFormError('Please enter a price');
      return false;
    }
    const price = parseFloat(formData.unit_price);
    if (isNaN(price) || price <= 0) {
      setFormError('Please enter a valid price (must be greater than 0)');
      return false;
    }

    // Quantity validation
    if (!formData.stock_quantity) {
      setFormError('Please enter stock quantity');
      return false;
    }
    const qty = parseInt(formData.stock_quantity);
    if (isNaN(qty) || qty < 0) {
      setFormError('Please enter a valid stock quantity (cannot be negative)');
      return false;
    }

    // Unit type validation
    if (!formData.unit_type || formData.unit_type === '' || formData.unit_type === 'Unit Type (Piece, Box, Kg...)') {
      setFormError('Please select a unit type');
      return false;
    }

    return true;
  };

  const handleSubmitSupply = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    // Validate user is logged in
    if (!user?.id) {
      setFormError('You must be logged in to list supplies');
      showError('Please log in first');
      return;
    }

    if (!validateForm()) {
      showError(formError || 'Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('Submitting supply form with data:', {
        name: formData.name,
        category: formData.category,
        unit_price: formData.unit_price,
        stock_quantity: formData.stock_quantity,
      });

      const result = await saveSupply({
        name: formData.name.trim(),
        category: formData.category,
        description: formData.description.trim(),
        unit_price: parseFloat(formData.unit_price),
        stock_quantity: parseInt(formData.stock_quantity),
        unit_type: formData.unit_type,
        image_url: '',
        status: 'active',
        currency: 'UGX',
      });

      if (result?.id) {
        setFormSuccess(true);
        showSuccess(`✓ "${formData.name}" listed successfully!`);

        // Reset form
        setFormData({
          name: '',
          category: 'Equipment',
          description: '',
          unit_price: '',
          stock_quantity: '',
          unit_type: 'Piece',
        });

        // Refresh supplies list - wait for it to complete
        console.log('Refreshing supplies list...');
        await fetchSupplies({ category: 'All', search: '', sortBy: 'newest' });
        console.log('Supplies refreshed, switching to browse tab...');

        // Clear success message after 3 seconds
        setTimeout(() => {
          setFormSuccess(false);
        }, 3000);

        // Switch to browse tab AFTER supplies are loaded
        setActiveTab('browse');
      } else {
        const errorMsg = error || 'Failed to list supply. Please try again.';
        setFormError(errorMsg);
        showError(errorMsg);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
      setFormError(errorMsg);
      showError(errorMsg);
      console.error('Supply submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const cartTotal = cartItems.reduce((sum, item) => {
    return sum + ((item.supplies?.unit_price || 0) * item.quantity);
  }, 0);

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2">Supplies Marketplace</h1>
          <p className="text-lg opacity-90">Find equipment, materials, tools, and supplies for your projects</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-20 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-8 overflow-x-auto">
            {['browse', 'cart', 'orders', 'sell'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-4 py-4 font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab === 'browse' && 'Browse Supplies'}
                {tab === 'cart' && `Shopping Cart (${cartItems.length})`}
                {tab === 'orders' && 'My Orders'}
                {tab === 'sell' && 'List Supplies'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* BROWSE TAB */}
        {activeTab === 'browse' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Filters Sidebar */}
            <div className={`${showFilters ? 'block' : 'hidden'} lg:block lg:col-span-1`}>
              <div className="bg-white rounded-lg shadow p-6 sticky top-32">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-lg">Filters</h3>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="lg:hidden text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Category Filter */}
                <div className="mb-6">
                  <h4 className="font-medium text-sm text-gray-900 mb-3">Category</h4>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {SUPPLY_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort Filter */}
                <div>
                  <h4 className="font-medium text-sm text-gray-900 mb-3">Sort By</h4>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {/* Search Bar */}
              <div className="mb-8">
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search supplies, equipment, materials..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="lg:hidden px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Filter className="w-5 h-5" />
                    Filters
                  </button>
                </div>
              </div>

              {/* Results Count */}
              <div className="mb-6 text-sm text-gray-600">
                Showing {filteredSupplies.length} supplies
              </div>

              {/* Supplies Grid */}
              {loading ? (
                <div className="text-center py-12">
                  <div className="text-gray-500">Loading supplies...</div>
                </div>
              ) : filteredSupplies.length === 0 ? (
                <div className="bg-white rounded-lg p-12 text-center">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No supplies found</h3>
                  <p className="text-gray-600 mt-2">Try adjusting your search or filters</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredSupplies.map((supply) => (
                    <SupplyCard
                      key={supply.id}
                      supply={supply}
                      onAddToCart={() => handleAddToCart(supply)}
                      onViewDetails={() => {
                        setSelectedSupply(supply);
                        setShowDetails(true);
                      }}
                      onFavorite={() => toggleFavorite(supply.id, false)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* CART TAB */}
        {activeTab === 'cart' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              {cartItems.length === 0 ? (
                <div className="bg-white rounded-lg p-12 text-center">
                  <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">Your cart is empty</h3>
                  <p className="text-gray-600 mt-2">Add supplies to get started</p>
                  <button
                    onClick={() => setActiveTab('browse')}
                    className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Continue Shopping
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {cartItems.map((item) => (
                    <CartItemRow
                      key={item.id}
                      item={item}
                      onRemove={() => removeFromCart(item.id)}
                      onUpdateQuantity={(qty) => updateCartQuantity(item.id, qty)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Cart Summary */}
            {cartItems.length > 0 && (
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow p-6 sticky top-32">
                  <h3 className="font-semibold text-lg mb-4">Order Summary</h3>
                  <div className="space-y-3 pb-4 border-b">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-medium">UGX {cartTotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Shipping</span>
                      <span className="font-medium">UGX 0</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tax</span>
                      <span className="font-medium">UGX 0</span>
                    </div>
                  </div>
                  <div className="flex justify-between font-semibold text-lg mt-4 mb-6">
                    <span>Total</span>
                    <span>UGX {cartTotal.toLocaleString()}</span>
                  </div>
                  <button
                    onClick={() => setShowCheckout(true)}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Proceed to Checkout
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ORDERS TAB */}
        {activeTab === 'orders' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">My Orders</h2>
            {userOrders.length === 0 ? (
              <div className="bg-white rounded-lg p-12 text-center">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No orders yet</h3>
                <p className="text-gray-600 mt-2">Start shopping to place your first order</p>
              </div>
            ) : (
              <div className="space-y-4">
                {userOrders.map((order) => (
                  <div key={order.id} className="bg-white rounded-lg shadow p-6 border border-gray-200">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-4">
                      {/* Order Number & Date */}
                      <div>
                        <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Order Number</p>
                        <p className="font-semibold text-gray-900">{order.order_number}</p>
                        <p className="text-sm text-gray-600">{new Date(order.created_at).toLocaleDateString()}</p>
                      </div>

                      {/* Status */}
                      <div>
                        <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Status</p>
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                          order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                          order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </div>

                      {/* Delivery Address */}
                      <div>
                        <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Delivery To</p>
                        <p className="font-semibold text-gray-900">{order.delivery_city}</p>
                        <p className="text-sm text-gray-600">{order.delivery_country}</p>
                      </div>

                      {/* Amount */}
                      <div>
                        <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Amount</p>
                        <p className="text-lg font-bold text-blue-600">UGX {order.total_amount.toLocaleString()}</p>
                        <p className="text-xs text-gray-600">{order.payment_status || 'pending'}</p>
                      </div>
                    </div>

                    {/* Order Items */}
                    {order.items && order.items.length > 0 && (
                      <div className="border-t pt-4">
                        <p className="text-sm font-semibold text-gray-900 mb-3">Items:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {order.items.map((item: any) => (
                            <div key={item.id} className="flex justify-between text-sm text-gray-700 bg-gray-50 p-2 rounded">
                              <span>{item.supply_name} ×{item.quantity}</span>
                              <span>UGX {item.line_total.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Order Details Summary */}
                    <div className="border-t mt-4 pt-4 grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Subtotal</p>
                        <p className="font-semibold">UGX {(order.subtotal || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Shipping</p>
                        <p className="font-semibold">UGX {(order.shipping_cost || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Payment Method</p>
                        <p className="font-semibold capitalize">{(order.payment_method || 'pending').replace('_', ' ')}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SELL TAB */}
        {activeTab === 'sell' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">List Your Supplies</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white rounded-lg shadow p-8">
                <h3 className="text-lg font-semibold mb-6">Add New Supply</h3>

                {/* Success Message */}
                {formSuccess && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-green-900">Success!</h4>
                      <p className="text-sm text-green-700">Your supply has been listed. Switching to browse view...</p>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {formError && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-red-900">Error</h4>
                      <p className="text-sm text-red-700">{formError}</p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmitSupply} className="space-y-4">
                  {/* Supply Name & Category */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Supply Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleFormChange}
                        placeholder="e.g., Steel Pipes, Cement Bags, Construction Nails..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        maxLength={200}
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">{formData.name.length}/200 characters</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleFormChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">Select Category</option>
                        {SUPPLY_CATEGORIES.slice(1).map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleFormChange}
                      placeholder="Describe your supply, specifications, quality, etc..."
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Price, Quantity, Unit Type */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (UGX) <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-gray-500">₦</span>
                        <input
                          type="number"
                          name="unit_price"
                          value={formData.unit_price}
                          onChange={handleFormChange}
                          placeholder="5000"
                          min="0"
                          step="100"
                          className="w-full px-4 py-2 pl-6 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      {formData.unit_price && (
                        <p className="text-xs text-gray-500 mt-1">Price: UGX {parseInt(formData.unit_price).toLocaleString()}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity <span className="text-red-500">*</span></label>
                      <input
                        type="number"
                        name="stock_quantity"
                        value={formData.stock_quantity}
                        onChange={handleFormChange}
                        placeholder="100"
                        min="0"
                        step="1"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">Available units for sale</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Unit Type <span className="text-red-500">*</span></label>
                      <select
                        name="unit_type"
                        value={formData.unit_type}
                        onChange={handleFormChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">Select unit type</option>
                        <option value="Piece">Piece (Individual items)</option>
                        <option value="Box">Box (Packed sets)</option>
                        <option value="Kg">Kilogram (Kg)</option>
                        <option value="Liter">Liter (L)</option>
                        <option value="Meter">Meter (M)</option>
                        <option value="Bag">Bag (Bags)</option>
                        <option value="Gallon">Gallon (Gal)</option>
                        <option value="Roll">Roll (Rolls)</option>
                      </select>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          Listing Supply...
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5" />
                          List Supply
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-xs text-gray-600 mt-2">* Required fields</p>
                </form>
              </div>

              {/* Info Card */}
              <div className="lg:col-span-1">
                <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                  <h4 className="font-semibold text-gray-900 mb-4">Tips for Listing</h4>
                  <ul className="space-y-3 text-sm text-gray-700">
                    <li className="flex gap-2">
                      <Check className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <span>Use clear, descriptive names</span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <span>Provide detailed descriptions</span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <span>Price competitively</span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <span>Keep stock updated</span>
                    </li>
                    <li className="flex gap-2">
                      <Check className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <span>Respond to inquiries quickly</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Supply Details Modal */}
      {showDetails && selectedSupply && (
        <SupplyDetailsModal
          supply={selectedSupply}
          onClose={() => setShowDetails(false)}
          onAddToCart={() => handleAddToCart(selectedSupply)}
        />
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <CheckoutModal
          cartItems={cartItems}
          cartTotal={cartTotal}
          onClose={() => setShowCheckout(false)}
          onSubmit={async (orderData) => {
            const result = await createOrder(orderData);
            if (result) {
              showSuccess('Order placed successfully!');
              setShowCheckout(false);
              setActiveTab('orders');
              // Refresh orders list
              const orders = await fetchUserOrders();
            } else {
              showError('Failed to place order. Please try again.');
            }
          }}
        />
      )}
    </div>
  );
}

// Supply Card Component
function SupplyCard({
  supply,
  onAddToCart,
  onViewDetails,
  onFavorite,
}: {
  supply: Supply;
  onAddToCart: () => void;
  onViewDetails: () => void;
  onFavorite: () => void;
}) {
  const inStock = supply.stock_quantity > 0;

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden">
      {/* Image */}
      <div className="relative h-48 bg-gray-200 overflow-hidden">
        {supply.image_url ? (
          <img src={supply.image_url} alt={supply.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-600">
            <Package className="w-12 h-12" />
          </div>
        )}
        {supply.is_featured && (
          <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-semibold">
            Featured
          </div>
        )}
        {!inStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white font-semibold">Out of Stock</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-xs text-gray-500 mb-1">{supply.category}</p>
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{supply.name}</h3>

        {/* Rating */}
        {supply.review_count > 0 && (
          <div className="flex items-center gap-1 mb-3">
            <div className="flex text-yellow-400">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3 h-3 ${i < Math.floor(supply.average_rating) ? 'fill-current' : ''}`}
                />
              ))}
            </div>
            <span className="text-xs text-gray-600">({supply.review_count})</span>
          </div>
        )}

        {/* Price */}
        <div className="mb-4">
          <p className="text-lg font-bold text-gray-900">
            UGX {supply.unit_price.toLocaleString()}
          </p>
          <p className="text-xs text-gray-600">per {supply.unit_type || 'unit'}</p>
        </div>

        {/* Stock Info */}
        <div className="mb-4">
          <p className={`text-xs font-medium ${inStock ? 'text-green-600' : 'text-red-600'}`}>
            {inStock ? `${supply.stock_quantity} in stock` : 'Out of stock'}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onAddToCart}
            disabled={!inStock}
            className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 text-sm font-medium flex items-center justify-center gap-1"
          >
            <ShoppingCart className="w-4 h-4" />
            Add
          </button>
          <button
            onClick={onViewDetails}
            className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-sm font-medium"
          >
            Details
          </button>
          <button
            onClick={onFavorite}
            className="px-3 py-2 border border-gray-300 text-gray-600 rounded hover:bg-gray-50"
          >
            <Heart className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Cart Item Row Component
function CartItemRow({
  item,
  onRemove,
  onUpdateQuantity,
}: {
  item: CartItem;
  onRemove: () => void;
  onUpdateQuantity: (qty: number) => void;
}) {
  if (!item.supplies) return null;

  const lineTotal = item.supplies.unit_price * item.quantity;

  return (
    <div className="bg-white rounded-lg shadow p-4 flex gap-4">
      {/* Image */}
      <div className="w-20 h-20 bg-gray-200 rounded flex-shrink-0">
        {item.supplies.image_url ? (
          <img src={item.supplies.image_url} alt={item.supplies.name} className="w-full h-full object-cover rounded" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-300">
            <Package className="w-6 h-6 text-gray-600" />
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1">
        <h4 className="font-semibold text-gray-900">{item.supplies.name}</h4>
        <p className="text-sm text-gray-600 mb-2">UGX {item.supplies.unit_price.toLocaleString()} each</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onUpdateQuantity(Math.max(1, item.quantity - 1))}
            className="p-1 border border-gray-300 rounded hover:bg-gray-50"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="px-3 font-medium">{item.quantity}</span>
          <button
            onClick={() => onUpdateQuantity(item.quantity + 1)}
            className="p-1 border border-gray-300 rounded hover:bg-gray-50"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Price & Remove */}
      <div className="text-right">
        <p className="font-semibold text-gray-900 mb-2">UGX {lineTotal.toLocaleString()}</p>
        <button
          onClick={onRemove}
          className="text-red-600 hover:text-red-700 text-sm font-medium"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

// Checkout Modal Component
function CheckoutModal({
  cartItems,
  cartTotal,
  onClose,
  onSubmit,
}: {
  cartItems: CartItem[];
  cartTotal: number;
  onClose: () => void;
  onSubmit: (orderData: any) => Promise<void>;
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    deliveryAddress: '',
    deliveryCity: '',
    deliveryCountry: 'Uganda',
    deliveryPostalCode: '',
    shippingMethod: 'standard',
    paymentMethod: 'mobile_money',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setError(null);
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.deliveryAddress.trim()) {
      setError('Delivery address is required');
      return false;
    }
    if (!formData.deliveryCity.trim()) {
      setError('City is required');
      return false;
    }
    if (!formData.deliveryCountry) {
      setError('Country is required');
      return false;
    }
    if (!formData.paymentMethod) {
      setError('Payment method is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsProcessing(true);
    try {
      const shippingCost = formData.shippingMethod === 'express' ? 50000 : 15000;
      await onSubmit({
        delivery_address: formData.deliveryAddress,
        delivery_city: formData.deliveryCity,
        delivery_country: formData.deliveryCountry,
        delivery_postal_code: formData.deliveryPostalCode,
        shipping_method: formData.shippingMethod,
        shipping_cost: shippingCost,
        payment_method: formData.paymentMethod,
        subtotal: cartTotal,
        total_amount: cartTotal + shippingCost,
        currency: 'UGX',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process order');
    } finally {
      setIsProcessing(false);
    }
  };

  const shippingCost = formData.shippingMethod === 'express' ? 50000 : 15000;
  const total = cartTotal + shippingCost;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-4xl w-full my-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-8">
          {/* Left: Form */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Checkout</h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Delivery Address Section */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Delivery Address</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Street Address *</label>
                    <input
                      type="text"
                      name="deliveryAddress"
                      value={formData.deliveryAddress}
                      onChange={handleChange}
                      placeholder="e.g., 123 Main Street, Building A"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                      <input
                        type="text"
                        name="deliveryCity"
                        value={formData.deliveryCity}
                        onChange={handleChange}
                        placeholder="e.g., Kampala"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                      <input
                        type="text"
                        name="deliveryPostalCode"
                        value={formData.deliveryPostalCode}
                        onChange={handleChange}
                        placeholder="Optional"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
                    <select
                      name="deliveryCountry"
                      value={formData.deliveryCountry}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="Uganda">Uganda</option>
                      <option value="Kenya">Kenya</option>
                      <option value="Tanzania">Tanzania</option>
                      <option value="Rwanda">Rwanda</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Shipping Method */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Shipping Method</h3>
                <div className="space-y-3">
                  <label className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50" style={{borderColor: formData.shippingMethod === 'standard' ? '#2563eb' : undefined, backgroundColor: formData.shippingMethod === 'standard' ? '#eff6ff' : undefined}}>
                    <input
                      type="radio"
                      name="shippingMethod"
                      value="standard"
                      checked={formData.shippingMethod === 'standard'}
                      onChange={handleChange}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div className="ml-3 flex-1">
                      <p className="font-medium text-gray-900">Standard Delivery</p>
                      <p className="text-sm text-gray-600">5-7 business days</p>
                    </div>
                    <p className="font-semibold text-gray-900">UGX 15,000</p>
                  </label>

                  <label className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50" style={{borderColor: formData.shippingMethod === 'express' ? '#2563eb' : undefined, backgroundColor: formData.shippingMethod === 'express' ? '#eff6ff' : undefined}}>
                    <input
                      type="radio"
                      name="shippingMethod"
                      value="express"
                      checked={formData.shippingMethod === 'express'}
                      onChange={handleChange}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div className="ml-3 flex-1">
                      <p className="font-medium text-gray-900">Express Delivery</p>
                      <p className="text-sm text-gray-600">2-3 business days</p>
                    </div>
                    <p className="font-semibold text-gray-900">UGX 50,000</p>
                  </label>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Payment Method</h3>
                <div className="space-y-3">
                  <label className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50" style={{borderColor: formData.paymentMethod === 'mobile_money' ? '#2563eb' : undefined, backgroundColor: formData.paymentMethod === 'mobile_money' ? '#eff6ff' : undefined}}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="mobile_money"
                      checked={formData.paymentMethod === 'mobile_money'}
                      onChange={handleChange}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div className="ml-3">
                      <p className="font-medium text-gray-900">Mobile Money (MTN, Airtel)</p>
                      <p className="text-sm text-gray-600">Fast and secure</p>
                    </div>
                  </label>

                  <label className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50" style={{borderColor: formData.paymentMethod === 'card' ? '#2563eb' : undefined, backgroundColor: formData.paymentMethod === 'card' ? '#eff6ff' : undefined}}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="card"
                      checked={formData.paymentMethod === 'card'}
                      onChange={handleChange}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div className="ml-3">
                      <p className="font-medium text-gray-900">Debit/Credit Card</p>
                      <p className="text-sm text-gray-600">Visa, Mastercard</p>
                    </div>
                  </label>

                  <label className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50" style={{borderColor: formData.paymentMethod === 'bank' ? '#2563eb' : undefined, backgroundColor: formData.paymentMethod === 'bank' ? '#eff6ff' : undefined}}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="bank"
                      checked={formData.paymentMethod === 'bank'}
                      onChange={handleChange}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div className="ml-3">
                      <p className="font-medium text-gray-900">Bank Transfer</p>
                      <p className="text-sm text-gray-600">Direct bank deposit</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Complete Order
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right: Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-gray-50 rounded-lg p-6 sticky top-8">
              <h3 className="text-lg font-semibold mb-6">Order Summary</h3>

              {/* Items */}
              <div className="space-y-3 mb-6 pb-6 border-b">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <div>
                      <p className="font-medium text-gray-900">{item.supplies?.name}</p>
                      <p className="text-gray-600">×{item.quantity}</p>
                    </div>
                    <p className="font-medium text-gray-900">
                      UGX {((item.supplies?.unit_price || 0) * item.quantity).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">UGX {cartTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">UGX {shippingCost.toLocaleString()}</span>
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="text-lg font-bold text-blue-600">UGX {total.toLocaleString()}</span>
                </div>
              </div>

              {/* Security Info */}
              <div className="bg-blue-50 rounded p-3 text-center">
                <p className="text-xs text-blue-700">
                  <Lock className="w-4 h-4 inline mr-1" />
                  Your payment is secure and encrypted
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Supply Details Modal Component
function SupplyDetailsModal({
  supply,
  onClose,
  onAddToCart,
}: {
  supply: Supply;
  onClose: () => void;
  onAddToCart: () => void;
}) {
  const [quantity, setQuantity] = useState(1);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Image */}
            <div>
              <div className="h-96 bg-gray-200 rounded-lg overflow-hidden">
                {supply.image_url ? (
                  <img src={supply.image_url} alt={supply.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-300">
                    <Package className="w-20 h-20 text-gray-600" />
                  </div>
                )}
              </div>
            </div>

            {/* Details */}
            <div>
              <p className="text-sm text-gray-600 mb-2">{supply.category}</p>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{supply.name}</h2>

              {/* Rating */}
              {supply.review_count > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${i < Math.floor(supply.average_rating) ? 'fill-current' : ''}`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">({supply.review_count} reviews)</span>
                </div>
              )}

              {/* Price */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-3xl font-bold text-gray-900">
                  UGX {supply.unit_price.toLocaleString()}
                </p>
                <p className="text-gray-600">per {supply.unit_type || 'unit'}</p>
              </div>

              {/* Description */}
              {supply.description && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-600">{supply.description}</p>
                </div>
              )}

              {/* Stock */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <p className={`font-semibold ${supply.stock_quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {supply.stock_quantity > 0 ? `${supply.stock_quantity} in stock` : 'Out of stock'}
                </p>
              </div>

              {/* Delivery Info */}
              {supply.delivery_time_days && (
                <div className="mb-6 flex items-center gap-2 text-gray-700">
                  <Truck className="w-5 h-5 text-blue-600" />
                  <span>Estimated delivery: {supply.delivery_time_days} days</span>
                </div>
              )}

              {/* Quantity Selector */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-900 mb-2">Quantity</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity(Math.max(supply.minimum_order_quantity || 1, quantity - 1))}
                    className="p-2 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min={supply.minimum_order_quantity || 1}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(supply.minimum_order_quantity || 1, parseInt(e.target.value) || 1))}
                    className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                  />
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-2 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {supply.minimum_order_quantity && (
                  <p className="text-xs text-gray-600 mt-1">Minimum order: {supply.minimum_order_quantity}</p>
                )}
              </div>

              {/* Add to Cart Button */}
              <button
                onClick={onAddToCart}
                disabled={supply.stock_quantity === 0}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 font-semibold flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-5 h-5" />
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
