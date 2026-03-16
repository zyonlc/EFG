-- Supplies Marketplace Tables

-- 1. SUPPLIES TABLE - For contractors to list supplies/equipment/materials
CREATE TABLE IF NOT EXISTS public.supplies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contractor_id UUID NOT NULL REFERENCES public.contractor_profiles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Product Information
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL, -- Equipment, Materials, Tools, Parts, Other
    sku TEXT UNIQUE,
    
    -- Pricing & Inventory
    unit_price NUMERIC(12, 2) NOT NULL,
    currency TEXT DEFAULT 'UGX' NOT NULL,
    stock_quantity INTEGER DEFAULT 0 NOT NULL,
    low_stock_threshold INTEGER DEFAULT 10,
    
    -- Media
    image_url TEXT,
    additional_images JSONB DEFAULT '[]'::jsonb,
    
    -- Specifications
    specifications JSONB DEFAULT '{}'::jsonb, -- e.g., {dimensions, weight, material, etc.}
    unit_type TEXT, -- Piece, Box, Kg, Liter, etc.
    
    -- Visibility & Status
    status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'inactive', 'discontinued')),
    is_featured BOOLEAN DEFAULT false,
    
    -- Stats
    views_count INTEGER DEFAULT 0 NOT NULL,
    likes_count INTEGER DEFAULT 0 NOT NULL,
    orders_count INTEGER DEFAULT 0 NOT NULL,
    average_rating NUMERIC(3, 1) DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    
    -- Business Terms
    minimum_order_quantity INTEGER DEFAULT 1,
    bulk_discount_percentage NUMERIC(5, 2), -- Discount for bulk orders
    delivery_time_days INTEGER, -- Estimated delivery time
    is_returnable BOOLEAN DEFAULT true,
    return_policy TEXT, -- Days, conditions, etc.
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. SUPPLY_ORDERS TABLE - For purchase orders
CREATE TABLE IF NOT EXISTS public.supply_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES public.contractor_profiles(id) ON DELETE CASCADE,
    
    -- Order Details
    order_number TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned')),
    
    -- Amounts
    subtotal NUMERIC(12, 2) NOT NULL,
    tax_amount NUMERIC(12, 2) DEFAULT 0,
    shipping_cost NUMERIC(12, 2) DEFAULT 0,
    discount_amount NUMERIC(12, 2) DEFAULT 0,
    total_amount NUMERIC(12, 2) NOT NULL,
    currency TEXT DEFAULT 'UGX' NOT NULL,
    
    -- Delivery
    delivery_address TEXT NOT NULL,
    delivery_city TEXT,
    delivery_country TEXT,
    delivery_postal_code TEXT,
    
    -- Shipping & Tracking
    shipping_method TEXT, -- Standard, Express, etc.
    tracking_number TEXT,
    estimated_delivery_date DATE,
    actual_delivery_date DATE,
    
    -- Payment
    payment_status TEXT DEFAULT 'pending' NOT NULL CHECK (payment_status IN ('pending', 'paid', 'partial', 'failed', 'refunded')),
    payment_method TEXT,
    transaction_id TEXT,
    
    -- Communication
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    shipped_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE
);

-- 3. SUPPLY_ORDER_ITEMS TABLE - Individual items in orders
CREATE TABLE IF NOT EXISTS public.supply_order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.supply_orders(id) ON DELETE CASCADE,
    supply_id UUID NOT NULL REFERENCES public.supplies(id) ON DELETE RESTRICT,
    
    -- Item Details
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL,
    line_total NUMERIC(12, 2) NOT NULL, -- quantity * unit_price
    
    -- Supply Info at time of order (snapshot)
    supply_name TEXT NOT NULL,
    supply_sku TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 4. SUPPLY_REVIEWS TABLE - Reviews for supplies and suppliers
CREATE TABLE IF NOT EXISTS public.supply_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.supply_orders(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    supply_id UUID NOT NULL REFERENCES public.supplies(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES public.contractor_profiles(id) ON DELETE CASCADE,
    
    -- Review Details
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title TEXT,
    comment TEXT,
    
    -- Aspects
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    delivery_rating INTEGER CHECK (delivery_rating >= 1 AND delivery_rating <= 5),
    communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
    
    -- Interaction
    is_verified_purchase BOOLEAN DEFAULT true,
    helpful_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 5. SUPPLY_CART_ITEMS TABLE - Shopping cart
CREATE TABLE IF NOT EXISTS public.supply_cart_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    supply_id UUID NOT NULL REFERENCES public.supplies(id) ON DELETE CASCADE,
    
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    UNIQUE(user_id, supply_id)
);

-- 6. SUPPLY_LIKES TABLE - For liking supplies
CREATE TABLE IF NOT EXISTS public.supply_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    supply_id UUID NOT NULL REFERENCES public.supplies(id) ON DELETE CASCADE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, supply_id)
);

-- 7. SUPPLY_FAVORITES TABLE - For saving supplies
CREATE TABLE IF NOT EXISTS public.supply_favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    supply_id UUID NOT NULL REFERENCES public.supplies(id) ON DELETE CASCADE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, supply_id)
);

-- INDEXES for performance
CREATE INDEX idx_supplies_contractor_id ON public.supplies(contractor_id);
CREATE INDEX idx_supplies_category ON public.supplies(category);
CREATE INDEX idx_supplies_status ON public.supplies(status);
CREATE INDEX idx_supplies_created_at ON public.supplies(created_at DESC);
CREATE INDEX idx_supply_orders_buyer_id ON public.supply_orders(buyer_id);
CREATE INDEX idx_supply_orders_supplier_id ON public.supply_orders(supplier_id);
CREATE INDEX idx_supply_orders_status ON public.supply_orders(status);
CREATE INDEX idx_supply_order_items_order_id ON public.supply_order_items(order_id);
CREATE INDEX idx_supply_reviews_supply_id ON public.supply_reviews(supply_id);
CREATE INDEX idx_supply_reviews_supplier_id ON public.supply_reviews(supplier_id);
CREATE INDEX idx_supply_cart_items_user_id ON public.supply_cart_items(user_id);
CREATE INDEX idx_supply_likes_supply_id ON public.supply_likes(supply_id);
CREATE INDEX idx_supply_favorites_user_id ON public.supply_favorites(user_id);

-- TRIGGERS for updated_at
CREATE OR REPLACE FUNCTION update_supplies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER supplies_update_timestamp
BEFORE UPDATE ON public.supplies
FOR EACH ROW
EXECUTE FUNCTION update_supplies_updated_at();

CREATE OR REPLACE FUNCTION update_supply_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER supply_orders_update_timestamp
BEFORE UPDATE ON public.supply_orders
FOR EACH ROW
EXECUTE FUNCTION update_supply_orders_updated_at();

-- TRIGGER: Update supply stats when review is added/deleted
CREATE OR REPLACE FUNCTION update_supply_stats_from_reviews()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.supplies
        SET average_rating = (
            SELECT COALESCE(AVG(rating)::NUMERIC(3,1), 0)
            FROM public.supply_reviews
            WHERE supply_id = NEW.supply_id
        ),
        review_count = (
            SELECT COUNT(*)
            FROM public.supply_reviews
            WHERE supply_id = NEW.supply_id
        )
        WHERE id = NEW.supply_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.supplies
        SET average_rating = (
            SELECT COALESCE(AVG(rating)::NUMERIC(3,1), 0)
            FROM public.supply_reviews
            WHERE supply_id = OLD.supply_id
        ),
        review_count = (
            SELECT COUNT(*)
            FROM public.supply_reviews
            WHERE supply_id = OLD.supply_id
        )
        WHERE id = OLD.supply_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER supply_reviews_update_stats
AFTER INSERT OR DELETE ON public.supply_reviews
FOR EACH ROW
EXECUTE FUNCTION update_supply_stats_from_reviews();

-- TRIGGER: Update order counts
CREATE OR REPLACE FUNCTION update_supply_order_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.supplies
        SET orders_count = orders_count + 1
        WHERE id IN (SELECT supply_id FROM public.supply_order_items WHERE order_id = NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER supply_order_count_update
AFTER INSERT ON public.supply_orders
FOR EACH ROW
EXECUTE FUNCTION update_supply_order_count();

-- RLS (Row Level Security) Policies

ALTER TABLE public.supplies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supply_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supply_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supply_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supply_cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supply_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supply_favorites ENABLE ROW LEVEL SECURITY;

-- Supplies policies
CREATE POLICY "Anyone can view active supplies" ON public.supplies FOR SELECT USING (status = 'active');
CREATE POLICY "Contractors can create supplies" ON public.supplies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Contractors can update own supplies" ON public.supplies FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Contractors can delete own supplies" ON public.supplies FOR DELETE USING (auth.uid() = user_id);

-- Supply orders policies
CREATE POLICY "Users can view own orders" ON public.supply_orders FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() IN (SELECT user_id FROM public.contractor_profiles WHERE id = supplier_id));
CREATE POLICY "Users can create orders" ON public.supply_orders FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Users can update own orders" ON public.supply_orders FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() IN (SELECT user_id FROM public.contractor_profiles WHERE id = supplier_id));

-- Supply order items policies
CREATE POLICY "Users can view order items" ON public.supply_order_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.supply_orders WHERE id = order_id AND (buyer_id = auth.uid() OR supplier_id IN (SELECT id FROM public.contractor_profiles WHERE user_id = auth.uid()))));

-- Supply reviews policies
CREATE POLICY "Anyone can view reviews" ON public.supply_reviews FOR SELECT USING (true);
CREATE POLICY "Users can create reviews" ON public.supply_reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);
CREATE POLICY "Users can update own reviews" ON public.supply_reviews FOR UPDATE USING (auth.uid() = reviewer_id);
CREATE POLICY "Users can delete own reviews" ON public.supply_reviews FOR DELETE USING (auth.uid() = reviewer_id);

-- Cart items policies
CREATE POLICY "Users can manage own cart" ON public.supply_cart_items USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Likes and favorites policies
CREATE POLICY "Users can like supplies" ON public.supply_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike supplies" ON public.supply_likes FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view likes" ON public.supply_likes FOR SELECT USING (true);

CREATE POLICY "Users can favorite supplies" ON public.supply_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove favorites" ON public.supply_favorites FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view favorites" ON public.supply_favorites FOR SELECT USING (true);

-- Grant permissions
GRANT ALL ON public.supplies TO authenticated;
GRANT ALL ON public.supply_orders TO authenticated;
GRANT ALL ON public.supply_order_items TO authenticated;
GRANT ALL ON public.supply_reviews TO authenticated;
GRANT ALL ON public.supply_cart_items TO authenticated;
GRANT ALL ON public.supply_likes TO authenticated;
GRANT ALL ON public.supply_favorites TO authenticated;

GRANT SELECT ON public.supplies TO anon;
GRANT SELECT ON public.supply_reviews TO anon;
