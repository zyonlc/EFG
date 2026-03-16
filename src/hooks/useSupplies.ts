import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export interface Supply {
  id: string;
  contractor_id: string;
  user_id: string;
  name: string;
  description: string;
  category: string;
  sku: string;
  unit_price: number;
  currency: string;
  stock_quantity: number;
  image_url: string;
  additional_images: string[];
  specifications: Record<string, any>;
  unit_type: string;
  status: string;
  is_featured: boolean;
  views_count: number;
  likes_count: number;
  orders_count: number;
  average_rating: number;
  review_count: number;
  minimum_order_quantity: number;
  bulk_discount_percentage: number;
  delivery_time_days: number;
  is_returnable: boolean;
  return_policy: string;
  created_at: string;
  updated_at: string;
  contractor_name?: string;
}

export interface SupplyOrder {
  id: string;
  order_number: string;
  buyer_id: string;
  supplier_id: string;
  status: string;
  subtotal: number;
  tax_amount: number;
  shipping_cost: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  delivery_address: string;
  delivery_city: string;
  delivery_country: string;
  delivery_postal_code: string;
  shipping_method: string;
  tracking_number: string;
  estimated_delivery_date: string;
  actual_delivery_date: string;
  payment_status: string;
  payment_method: string;
  transaction_id: string;
  notes: string;
  created_at: string;
  updated_at: string;
  items?: SupplyOrderItem[];
}

export interface SupplyOrderItem {
  id: string;
  order_id: string;
  supply_id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  supply_name: string;
  supply_sku: string;
}

export interface CartItem {
  id: string;
  supply_id: string;
  quantity: number;
  supply?: Supply;
}

export interface SupplyReview {
  id: string;
  order_id: string;
  reviewer_id: string;
  supply_id: string;
  supplier_id: string;
  rating: number;
  title: string;
  comment: string;
  quality_rating: number;
  delivery_rating: number;
  communication_rating: number;
  is_verified_purchase: boolean;
  created_at: string;
}

export function useSupplies() {
  const { user } = useAuth();
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [filteredSupplies, setFilteredSupplies] = useState<Supply[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartLoading, setCartLoading] = useState(false);

  // Fetch all active supplies
  const fetchSupplies = useCallback(async (filters?: {
    category?: string;
    search?: string;
    sortBy?: 'newest' | 'popular' | 'rating' | 'price-low' | 'price-high';
  }) => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('supplies')
        .select(`
          *,
          contractor_profiles:contractor_id(company_name)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (filters?.category && filters.category.toLowerCase() !== 'all') {
        query = query.eq('category', filters.category);
      }

      const { data, error: err } = await query;

      if (err) {
        console.error('Supabase query error:', err);
        throw err;
      }

      console.log('Fetched supplies from database:', data?.length || 0, 'items');
      if (data && data.length > 0) {
        console.log('First supply:', data[0]);
      }

      let processed = data || [];

      // Client-side filtering for search
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        processed = processed.filter(s =>
          s.name.toLowerCase().includes(q) ||
          s.description?.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q)
        );
      }

      // Client-side sorting
      if (filters?.sortBy) {
        processed.sort((a, b) => {
          switch (filters.sortBy) {
            case 'popular':
              return b.orders_count - a.orders_count;
            case 'rating':
              return b.average_rating - a.average_rating;
            case 'price-low':
              return a.unit_price - b.unit_price;
            case 'price-high':
              return b.unit_price - a.unit_price;
            default:
              return 0;
          }
        });
      }

      console.log('Final processed supplies:', processed.length, 'items');
      setSupplies(processed);
      setFilteredSupplies(processed);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch supplies';
      console.error('Fetch supplies error:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch user's cart
  const fetchCart = useCallback(async () => {
    if (!user?.id) return;
    
    setCartLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('supply_cart_items')
        .select(`
          *,
          supplies:supply_id(*)
        `)
        .eq('user_id', user.id);

      if (err) throw err;
      setCartItems(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch cart');
    } finally {
      setCartLoading(false);
    }
  }, [user?.id]);

  // Add to cart
  const addToCart = useCallback(async (supplyId: string, quantity: number = 1) => {
    if (!user?.id) {
      setError('Must be logged in to add to cart');
      return false;
    }

    try {
      const { error: err } = await supabase
        .from('supply_cart_items')
        .upsert([
          {
            user_id: user.id,
            supply_id: supplyId,
            quantity,
          }
        ]);

      if (err) throw err;
      await fetchCart();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to cart');
      return false;
    }
  }, [user?.id, fetchCart]);

  // Remove from cart
  const removeFromCart = useCallback(async (cartItemId: string) => {
    try {
      const { error: err } = await supabase
        .from('supply_cart_items')
        .delete()
        .eq('id', cartItemId);

      if (err) throw err;
      await fetchCart();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove from cart');
      return false;
    }
  }, [fetchCart]);

  // Update cart item quantity
  const updateCartQuantity = useCallback(async (cartItemId: string, quantity: number) => {
    try {
      const { error: err } = await supabase
        .from('supply_cart_items')
        .update({ quantity })
        .eq('id', cartItemId);

      if (err) throw err;
      await fetchCart();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update cart');
      return false;
    }
  }, [fetchCart]);

  // Create order from cart
  const createOrder = useCallback(async (orderData: Partial<SupplyOrder>) => {
    if (!user?.id) {
      setError('Must be logged in to create order');
      return null;
    }

    try {
      // Generate order number
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create order
      const { data: order, error: orderErr } = await supabase
        .from('supply_orders')
        .insert([{
          order_number: orderNumber,
          buyer_id: user.id,
          supplier_id: orderData.supplier_id,
          subtotal: orderData.subtotal || 0,
          tax_amount: orderData.tax_amount || 0,
          shipping_cost: orderData.shipping_cost || 0,
          discount_amount: orderData.discount_amount || 0,
          total_amount: orderData.total_amount || 0,
          currency: orderData.currency || 'UGX',
          delivery_address: orderData.delivery_address || '',
          delivery_city: orderData.delivery_city || '',
          delivery_country: orderData.delivery_country || '',
          delivery_postal_code: orderData.delivery_postal_code || '',
          shipping_method: orderData.shipping_method || 'Standard',
          notes: orderData.notes || '',
          payment_status: 'pending',
        }])
        .select()
        .single();

      if (orderErr) throw orderErr;

      // Create order items
      if (cartItems.length > 0) {
        const orderItems = cartItems.map(item => ({
          order_id: order.id,
          supply_id: item.supply_id,
          quantity: item.quantity,
          unit_price: item.supplies?.unit_price || 0,
          line_total: (item.supplies?.unit_price || 0) * item.quantity,
          supply_name: item.supplies?.name || '',
          supply_sku: item.supplies?.sku || '',
        }));

        const { error: itemsErr } = await supabase
          .from('supply_order_items')
          .insert(orderItems);

        if (itemsErr) throw itemsErr;
      }

      // Clear cart
      await supabase
        .from('supply_cart_items')
        .delete()
        .eq('user_id', user.id);

      await fetchCart();
      return order;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order');
      return null;
    }
  }, [user?.id, cartItems, fetchCart]);

  // Fetch user's orders
  const fetchUserOrders = useCallback(async () => {
    if (!user?.id) return [];

    try {
      const { data, error: err } = await supabase
        .from('supply_orders')
        .select(`
          *,
          items:supply_order_items(*)
        `)
        .or(`buyer_id.eq.${user.id},supplier_id.in(${user.id})`)
        .order('created_at', { ascending: false });

      if (err) throw err;
      return data || [];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
      return [];
    }
  }, [user?.id]);

  // Create review
  const createReview = useCallback(async (reviewData: Partial<SupplyReview>) => {
    if (!user?.id) {
      setError('Must be logged in to create review');
      return false;
    }

    try {
      const { error: err } = await supabase
        .from('supply_reviews')
        .insert([{
          reviewer_id: user.id,
          order_id: reviewData.order_id,
          supply_id: reviewData.supply_id,
          supplier_id: reviewData.supplier_id,
          rating: reviewData.rating || 5,
          title: reviewData.title || '',
          comment: reviewData.comment || '',
          quality_rating: reviewData.quality_rating,
          delivery_rating: reviewData.delivery_rating,
          communication_rating: reviewData.communication_rating,
          is_verified_purchase: true,
        }]);

      if (err) throw err;
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create review');
      return false;
    }
  }, [user?.id]);

  // Toggle favorite
  const toggleFavorite = useCallback(async (supplyId: string, isFavorited: boolean) => {
    if (!user?.id) {
      setError('Must be logged in to favorite');
      return false;
    }

    try {
      if (isFavorited) {
        const { error: err } = await supabase
          .from('supply_favorites')
          .delete()
          .match({ user_id: user.id, supply_id: supplyId });
        if (err) throw err;
      } else {
        const { error: err } = await supabase
          .from('supply_favorites')
          .insert([{ user_id: user.id, supply_id: supplyId }]);
        if (err) throw err;
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle favorite');
      return false;
    }
  }, [user?.id]);

  // Toggle like
  const toggleLike = useCallback(async (supplyId: string, isLiked: boolean) => {
    if (!user?.id) {
      setError('Must be logged in to like');
      return false;
    }

    try {
      if (isLiked) {
        const { error: err } = await supabase
          .from('supply_likes')
          .delete()
          .match({ user_id: user.id, supply_id: supplyId });
        if (err) throw err;
      } else {
        const { error: err } = await supabase
          .from('supply_likes')
          .insert([{ user_id: user.id, supply_id: supplyId }]);
        if (err) throw err;
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle like');
      return false;
    }
  }, [user?.id]);

  // Create or update supply
  const saveSupply = useCallback(async (supplyData: Partial<Supply>, supplyId?: string) => {
    if (!user?.id) {
      setError('Must be logged in to list supplies');
      return null;
    }

    try {
      // Get or create contractor profile
      let contractor;

      const { data: existingContractor, error: fetchErr } = await supabase
        .from('contractor_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchErr && fetchErr.code !== 'PGRST116') {
        throw new Error(`Failed to fetch contractor profile: ${fetchErr.message}`);
      }

      if (existingContractor) {
        contractor = existingContractor;
      } else {
        // Create a default contractor profile if none exists
        const { data: newContractor, error: createErr } = await supabase
          .from('contractor_profiles')
          .insert([{
            user_id: user.id,
            company_name: `${user.email?.split('@')[0] || 'User'}'s Supplies`,
            registration_number: 'N/A',
            market_code: 'UGX',
            is_verified: false,
          }])
          .select('id')
          .single();

        if (createErr) {
          throw new Error(`Failed to create contractor profile: ${createErr.message}`);
        }

        if (!newContractor) {
          throw new Error('Failed to create contractor profile - no data returned');
        }

        contractor = newContractor;
      }

      if (!contractor?.id) {
        throw new Error('Contractor profile ID is missing');
      }

      const payload = {
        ...supplyData,
        user_id: user.id,
        contractor_id: contractor.id,
        currency: supplyData.currency || 'UGX',
      };

      let result;
      if (supplyId) {
        const { data, error: err } = await supabase
          .from('supplies')
          .update(payload)
          .eq('id', supplyId)
          .select()
          .single();
        if (err) throw err;
        result = data;
      } else {
        const { data, error: err } = await supabase
          .from('supplies')
          .insert([payload])
          .select()
          .single();
        if (err) {
          // More detailed error message
          if (err.code === 'PGRST001') {
            throw new Error('You do not have permission to create supplies. Please check your account type.');
          }
          throw new Error(`Database error: ${err.message}`);
        }
        result = data;
      }

      if (!result) {
        throw new Error('Supply was not created - no data returned from database');
      }

      // Clear any previous errors on success
      setError(null);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save supply. Please try again.';
      setError(errorMessage);
      console.error('Supply save error:', errorMessage);
      return null;
    }
  }, [user?.id]);

  return {
    // Supplies
    supplies,
    filteredSupplies,
    loading,
    error,
    fetchSupplies,
    saveSupply,

    // Cart
    cartItems,
    cartLoading,
    fetchCart,
    addToCart,
    removeFromCart,
    updateCartQuantity,

    // Orders
    createOrder,
    fetchUserOrders,

    // Reviews & Interaction
    createReview,
    toggleFavorite,
    toggleLike,
  };
}
