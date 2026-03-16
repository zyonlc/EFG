import { supabase } from './supabase';

// Zoho Books API configuration
const ZOHO_BOOKS_API_BASE = 'https://www.zohoapis.com/books/v3';
const ZOHO_OAUTH_AUTH_URL = 'https://accounts.zoho.com/oauth/v2/auth';
const ZOHO_OAUTH_TOKEN_URL = 'https://accounts.zoho.com/oauth/v2/token';

// Client ID and Secret should be in environment variables
const ZOHO_CLIENT_ID = import.meta.env.VITE_ZOHO_CLIENT_ID;
const ZOHO_CLIENT_SECRET = import.meta.env.VITE_ZOHO_CLIENT_SECRET;

// Get the correct redirect URI - use environment variable if available, otherwise construct it
// In Builder environments, window.location.origin may be incorrect, so we explicitly set it
const getRedirectURI = () => {
  // If set as environment variable, use that (most reliable)
  if (import.meta.env.VITE_ZOHO_REDIRECT_URI) {
    return import.meta.env.VITE_ZOHO_REDIRECT_URI;
  }
  // Otherwise construct from current origin
  return `${window.location.origin}/books/callback`;
};

const ZOHO_REDIRECT_URI = getRedirectURI();

// Debug: Log environment variable status
if (!ZOHO_CLIENT_ID || !ZOHO_CLIENT_SECRET) {
  console.error('🔴 Zoho Books environment variables not set!');
  console.error('VITE_ZOHO_CLIENT_ID:', ZOHO_CLIENT_ID ? 'SET' : 'MISSING');
  console.error('VITE_ZOHO_CLIENT_SECRET:', ZOHO_CLIENT_SECRET ? 'SET' : 'MISSING');
} else {
  console.log('✅ Zoho Books credentials loaded');
}

// ============================================================================
// OAUTH AUTHENTICATION
// ============================================================================

/**
 * Get OAuth authorization URL for Zoho Books
 */
export const getZohoBooksAuthUrl = (): string => {
  if (!ZOHO_CLIENT_ID) {
    throw new Error('Zoho Books Client ID not configured. Check VITE_ZOHO_CLIENT_ID environment variable.');
  }

  console.log('🔵 Generating OAuth URL with:', {
    clientId: ZOHO_CLIENT_ID,
    redirectUri: ZOHO_REDIRECT_URI,
  });

  const params = new URLSearchParams({
    client_id: ZOHO_CLIENT_ID,
    redirect_uri: ZOHO_REDIRECT_URI,
    response_type: 'code',
    access_type: 'offline',
    scope: 'ZohoBooks.fullaccess.ALL',
    state: generateState(),
  });

  const authUrl = `${ZOHO_OAUTH_AUTH_URL}?${params.toString()}`;
  console.log('🔵 OAuth URL:', authUrl);

  return authUrl;
};

/**
 * Generate random state for OAuth security
 */
function generateState(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * DEPRECATED: Token exchange now handled by Supabase Edge Function
 * This function is kept for backward compatibility but should not be used
 */
export const exchangeCodeForToken = async (code: string, userId: string) => {
  console.warn('⚠️ exchangeCodeForToken is deprecated. Use Supabase Edge Function instead.');
  throw new Error('Use Supabase Edge Function zoho-oauth-exchange instead');
};

/**
 * Refresh access token if expired using Supabase Edge Function
 */
export const refreshZohoBooksToken = async (userId: string) => {
  try {
    console.log('🔵 Refreshing Zoho Books token via Edge Function...');

    const { data, error: functionError } = await supabase.functions.invoke(
      'zoho-token-refresh',
      {
        body: { userId },
      }
    );

    if (functionError) {
      console.error('🔴 Edge Function error:', functionError);
      throw functionError;
    }

    if (!data?.success || !data?.accessToken) {
      console.error('🔴 Token refresh failed:', data?.error);
      throw new Error(data?.error || 'Token refresh failed');
    }

    console.log('✅ Token refreshed successfully');
    return data.accessToken;
  } catch (error) {
    console.error('🔴 Error refreshing Zoho Books token:', error);
    throw error;
  }
};

// ============================================================================
// API HELPERS
// ============================================================================

/**
 * Get valid access token, refreshing if necessary
 */
export const getValidAccessToken = async (userId: string): Promise<string> => {
  const { data: integration, error: fetchError } = await supabase
    .from('zoho_books_integrations')
    .select('access_token, token_expires_at')
    .eq('user_id', userId)
    .single();

  if (fetchError || !integration?.access_token) {
    throw new Error('No Zoho Books integration found');
  }

  const expiresAt = new Date(integration.token_expires_at);
  if (expiresAt < new Date()) {
    return refreshZohoBooksToken(userId);
  }

  return integration.access_token;
};

/**
 * Make authenticated request to Zoho Books API via Edge Function
 */
export const zohoBooksApiCall = async (
  userId: string,
  organizationId: string,
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any
) => {
  try {
    console.log(`🔵 Calling Zoho API: ${method} ${endpoint}`);
    console.log(`🔵 Parameters: userId=${userId}, organizationId=${organizationId}`);

    const { data, error: functionError } = await supabase.functions.invoke(
      'zoho-api-call',
      {
        body: {
          userId,
          organizationId,
          endpoint,
          method,
          body,
        },
      }
    );

    console.log(`🔵 Edge Function response:`, {
      hasError: !!functionError,
      hasData: !!data,
      dataSuccess: data?.success,
      dataError: data?.error,
    });

    if (functionError) {
      console.error('🔴 Edge Function invocation error:', functionError);
      console.error('🔴 Error message:', functionError.message);
      console.error('🔴 Full error:', JSON.stringify(functionError, null, 2));
      // Try to extract error message from the response
      const errorMsg = functionError?.message || 'Edge Function invocation failed';
      console.error('🔴 Error details:', errorMsg);
      throw new Error(errorMsg);
    }

    if (!data?.success) {
      let errorMsg = data?.error || 'API call failed';
      const errorStatus = data?.status || data?.httpStatus || 500;
      const details = data?.details || '';

      // Provide specific error messages based on status code
      if (errorStatus === 403) {
        errorMsg = 'Permission denied. This item may be linked to active transactions and cannot be deleted.';
      } else if (errorStatus === 404) {
        errorMsg = 'Item not found in Zoho Books. It may have already been deleted.';
      } else if (errorStatus === 400) {
        errorMsg = 'Invalid request. Please check the item details.';
      } else if (errorStatus === 401) {
        errorMsg = 'Authorization failed. Please reconnect to Zoho Books.';
      }

      // Try to parse the error message if it's a JSON string
      try {
        const parsedError = JSON.parse(errorMsg);
        if (parsedError.message) {
          errorMsg = parsedError.message;
          console.error('🔴 Parsed error:', parsedError);
        }
      } catch (e) {
        // Not JSON, use as-is
      }

      console.error('🔴 API call not successful:', errorMsg);
      console.error('🔴 Status:', errorStatus);
      if (details) {
        console.error('🔴 Details:', typeof details === 'string' ? details : JSON.stringify(details, null, 2));
      }
      throw new Error(errorMsg);
    }

    console.log('✅ API call successful');
    return data.data;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('🔴 Zoho Books API error:', errorMsg);
    console.error('🔴 Full error object:', error);
    throw error;
  }
};

/**
 * Get user's organization ID and cache it using Edge Function
 */
export const getOrganizationId = async (userId: string): Promise<string> => {
  try {
    console.log('🔵 Fetching organization ID via Edge Function...');
    console.log(`🔵 User ID: ${userId}`);

    const { data, error: functionError } = await supabase.functions.invoke(
      'zoho-get-organization',
      {
        body: { userId },
      }
    );

    if (functionError) {
      console.error('🔴 Edge Function error:', functionError);
      console.error('🔴 Error message:', functionError.message);
      console.error('🔴 Full error:', JSON.stringify(functionError, null, 2));
      throw functionError;
    }

    if (!data?.success || !data?.organizationId) {
      console.error('🔴 Failed to fetch organization ID:', data?.error);
      console.error('🔴 Full response:', JSON.stringify(data, null, 2));
      throw new Error(data?.error || 'Failed to fetch organization');
    }

    console.log('✅ Organization ID fetched:', data.organizationId);
    return data.organizationId;
  } catch (error) {
    console.error('🔴 Error getting organization ID:', error);
    throw error;
  }
};

/**
 * Get organization details including currency
 */
export const getOrganizationDetails = async (
  userId: string,
  organizationId: string
): Promise<{ currency_code: string; currency_symbol: string }> => {
  try {
    console.log('🔵 Fetching organization details...');

    const data = await zohoBooksApiCall(
      userId,
      organizationId,
      '/organizations',
      'GET'
    );

    const currencyCode = data?.organization?.currency_code || 'USD';
    const currencySymbol = data?.organization?.currency_symbol || '$';

    console.log('✅ Organization currency:', { currencyCode, currencySymbol });
    return { currency_code: currencyCode, currency_symbol: currencySymbol };
  } catch (error) {
    console.error('🔴 Error fetching organization details:', error);
    // Return default USD if fetch fails
    return { currency_code: 'USD', currency_symbol: '$' };
  }
};

// ============================================================================
// INVOICES API
// ============================================================================

export const getInvoices = async (
  userId: string,
  organizationId: string,
  filters?: {
    status?: 'draft' | 'sent' | 'viewed' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
    limit?: number;
    offset?: number;
  }
) => {
  const endpoint = '/invoices';
  const params = new URLSearchParams();
  
  if (filters?.status) {
    params.set('status', filters.status);
  }
  if (filters?.limit) {
    params.set('limit', filters.limit.toString());
  }
  if (filters?.offset) {
    params.set('offset', filters.offset.toString());
  }

  return zohoBooksApiCall(
    userId,
    organizationId,
    `${endpoint}${params.toString() ? '?' + params.toString() : ''}`,
    'GET'
  );
};

export const getInvoice = async (userId: string, organizationId: string, invoiceId: string) => {
  return zohoBooksApiCall(
    userId,
    organizationId,
    `/invoices/${invoiceId}`,
    'GET'
  );
};

export const createInvoice = async (
  userId: string,
  organizationId: string,
  invoiceData: {
    customer_id: string;
    invoice_number?: string;
    reference_number?: string;
    invoice_date?: string;
    due_date?: string;
    due_days?: number;
    line_items: Array<{
      item_id?: string;
      quantity?: number;
      rate?: number;
      description?: string;
    }>;
    notes?: string;
    terms?: string;
    is_emailed?: boolean;
  }
) => {
  return zohoBooksApiCall(
    userId,
    organizationId,
    '/invoices',
    'POST',
    invoiceData
  );
};

export const updateInvoice = async (
  userId: string,
  organizationId: string,
  invoiceId: string,
  invoiceData: any
) => {
  return zohoBooksApiCall(
    userId,
    organizationId,
    `/invoices/${invoiceId}`,
    'PUT',
    invoiceData
  );
};

export const deleteInvoice = async (userId: string, organizationId: string, invoiceId: string) => {
  return zohoBooksApiCall(
    userId,
    organizationId,
    `/invoices/${invoiceId}`,
    'DELETE'
  );
};

// ============================================================================
// CUSTOMERS API
// ============================================================================

export const getCustomers = async (
  userId: string,
  organizationId: string,
  filters?: {
    limit?: number;
    offset?: number;
    status?: 'active' | 'inactive';
  }
) => {
  const endpoint = '/contacts';
  const params = new URLSearchParams();

  if (filters?.limit) {
    params.set('limit', filters.limit.toString());
  }
  if (filters?.offset) {
    params.set('offset', filters.offset.toString());
  }
  if (filters?.status) {
    params.set('status', filters.status);
  }

  // Filter for customers (contacts with contact_type = 'customer')
  params.set('contact_type', 'customer');

  const data = await zohoBooksApiCall(
    userId,
    organizationId,
    `${endpoint}${params.toString() ? '?' + params.toString() : ''}`,
    'GET'
  );

  // Ensure we only get customer contacts
  let contacts = data?.contacts || [];

  if (!Array.isArray(contacts)) {
    console.warn('⚠️ Contacts is not an array:', typeof contacts);
    contacts = [];
  }

  return {
    ...data,
    contacts: contacts,
  };
};

export const getCustomer = async (userId: string, organizationId: string, customerId: string) => {
  return zohoBooksApiCall(
    userId,
    organizationId,
    `/contacts/${customerId}`,
    'GET'
  );
};

export const createCustomer = async (
  userId: string,
  organizationId: string,
  customerData: {
    contact_name: string;
    company_name?: string;
    email?: string;
    phone?: string;
    mobile?: string;
    fax?: string;
    website?: string;
    billing_address?: {
      address?: string;
      street2?: string;
      city?: string;
      state?: string;
      zip?: string;
      country?: string;
    };
    shipping_address?: {
      address?: string;
      street2?: string;
      city?: string;
      state?: string;
      zip?: string;
      country?: string;
    };
    notes?: string;
  }
) => {
  const payload: any = {
    contact_name: customerData.contact_name,
    contact_type: 'customer',
  };

  if (customerData.company_name) payload.company_name = customerData.company_name;
  if (customerData.website) payload.website = customerData.website;
  if (customerData.billing_address) payload.billing_address = customerData.billing_address;
  if (customerData.shipping_address) payload.shipping_address = customerData.shipping_address;
  if (customerData.notes) payload.notes = customerData.notes;

  // Email and phone must be nested in contact_persons array for Zoho UI to display them
  if (customerData.email || customerData.phone || customerData.mobile || customerData.fax) {
    payload.contact_persons = [
      {
        email: customerData.email,
        phone: customerData.phone,
        mobile: customerData.mobile,
        fax: customerData.fax,
        is_primary_contact: true,
      },
    ];
  }

  return zohoBooksApiCall(
    userId,
    organizationId,
    '/contacts',
    'POST',
    payload
  );
};

export const updateCustomer = async (
  userId: string,
  organizationId: string,
  customerId: string,
  customerData: any
) => {
  const payload: any = {};

  if (customerData.contact_name) payload.contact_name = customerData.contact_name;
  if (customerData.company_name) payload.company_name = customerData.company_name;
  if (customerData.website) payload.website = customerData.website;
  if (customerData.billing_address) payload.billing_address = customerData.billing_address;
  if (customerData.shipping_address) payload.shipping_address = customerData.shipping_address;
  if (customerData.notes) payload.notes = customerData.notes;

  // Email and phone must be nested in contact_persons array for Zoho UI to display them
  if (customerData.email || customerData.phone || customerData.mobile || customerData.fax) {
    payload.contact_persons = [
      {
        email: customerData.email,
        phone: customerData.phone,
        mobile: customerData.mobile,
        fax: customerData.fax,
        is_primary_contact: true,
      },
    ];
  }

  return zohoBooksApiCall(
    userId,
    organizationId,
    `/contacts/${customerId}`,
    'PUT',
    payload
  );
};

export const deleteCustomer = async (userId: string, organizationId: string, customerId: string) => {
  return zohoBooksApiCall(
    userId,
    organizationId,
    `/contacts/${customerId}`,
    'DELETE'
  );
};

// ============================================================================
// VENDORS API
// ============================================================================

export const getVendors = async (
  userId: string,
  organizationId: string,
  filters?: {
    limit?: number;
    offset?: number;
    status?: 'active' | 'inactive';
  }
) => {
  const endpoint = '/contacts';
  const params = new URLSearchParams();

  if (filters?.limit) {
    params.set('limit', filters.limit.toString());
  }
  if (filters?.offset) {
    params.set('offset', filters.offset.toString());
  }
  if (filters?.status) {
    params.set('status', filters.status);
  }

  // Add filter for vendors (contacts with contact_type = 'vendor')
  params.set('contact_type', 'vendor');

  const data = await zohoBooksApiCall(
    userId,
    organizationId,
    `${endpoint}${params.toString() ? '?' + params.toString() : ''}`,
    'GET'
  );

  // Normalize vendor data
  let vendors = data?.contacts || [];

  if (!Array.isArray(vendors)) {
    console.warn('⚠️ Vendors is not an array:', typeof vendors);
    vendors = [];
  }

  return {
    ...data,
    contacts: vendors,
  };
};

export const getVendor = async (userId: string, organizationId: string, vendorId: string) => {
  return zohoBooksApiCall(
    userId,
    organizationId,
    `/contacts/${vendorId}`,
    'GET'
  );
};

export const createVendor = async (
  userId: string,
  organizationId: string,
  vendorData: {
    contact_name: string;
    company_name?: string;
    email?: string;
    phone?: string;
    mobile?: string;
    fax?: string;
    website?: string;
    billing_address?: {
      address?: string;
      street2?: string;
      city?: string;
      state?: string;
      zip?: string;
      country?: string;
    };
    notes?: string;
  }
) => {
  const payload: any = {
    contact_name: vendorData.contact_name,
    contact_type: 'vendor',
  };

  if (vendorData.company_name) payload.company_name = vendorData.company_name;
  if (vendorData.website) payload.website = vendorData.website;
  if (vendorData.billing_address) payload.billing_address = vendorData.billing_address;
  if (vendorData.notes) payload.notes = vendorData.notes;

  // Email and phone must be nested in contact_persons array for Zoho UI to display them
  if (vendorData.email || vendorData.phone || vendorData.mobile || vendorData.fax) {
    payload.contact_persons = [
      {
        email: vendorData.email,
        phone: vendorData.phone,
        mobile: vendorData.mobile,
        fax: vendorData.fax,
        is_primary_contact: true,
      },
    ];
  }

  return zohoBooksApiCall(
    userId,
    organizationId,
    '/contacts',
    'POST',
    payload
  );
};

export const updateVendor = async (
  userId: string,
  organizationId: string,
  vendorId: string,
  vendorData: any
) => {
  const payload: any = {};

  if (vendorData.contact_name) payload.contact_name = vendorData.contact_name;
  if (vendorData.company_name) payload.company_name = vendorData.company_name;
  if (vendorData.website) payload.website = vendorData.website;
  if (vendorData.billing_address) payload.billing_address = vendorData.billing_address;
  if (vendorData.notes) payload.notes = vendorData.notes;

  // Email and phone must be nested in contact_persons array for Zoho UI to display them
  if (vendorData.email || vendorData.phone || vendorData.mobile || vendorData.fax) {
    payload.contact_persons = [
      {
        email: vendorData.email,
        phone: vendorData.phone,
        mobile: vendorData.mobile,
        fax: vendorData.fax,
        is_primary_contact: true,
      },
    ];
  }

  return zohoBooksApiCall(
    userId,
    organizationId,
    `/contacts/${vendorId}`,
    'PUT',
    payload
  );
};

export const deleteVendor = async (userId: string, organizationId: string, vendorId: string) => {
  return zohoBooksApiCall(
    userId,
    organizationId,
    `/contacts/${vendorId}`,
    'DELETE'
  );
};

// ============================================================================
// CHART OF ACCOUNTS API
// ============================================================================

export const getChartOfAccounts = async (
  userId: string,
  organizationId: string
) => {
  try {
    console.log('🔵 Fetching Chart of Accounts...');
    const data = await zohoBooksApiCall(
      userId,
      organizationId,
      '/chartofaccounts',
      'GET'
    );
    console.log('📊 Chart of Accounts:', data);
    return data;
  } catch (error) {
    console.error('🔴 Error fetching Chart of Accounts:', error);
    throw error;
  }
};

/**
 * Get expense accounts from the chart of accounts
 * Returns only accounts that are classified as expense accounts
 */
export const getExpenseAccounts = async (
  userId: string,
  organizationId: string
): Promise<Array<{ account_id: string; account_name: string; account_type: string }>> => {
  try {
    console.log('🔵 Fetching Expense Accounts...');
    const data = await zohoBooksApiCall(
      userId,
      organizationId,
      '/chartofaccounts',
      'GET'
    );

    // Filter for expense accounts
    let expenseAccounts: Array<{ account_id: string; account_name: string; account_type: string }> = [];

    if (data?.chartofaccounts && Array.isArray(data.chartofaccounts)) {
      expenseAccounts = data.chartofaccounts
        .filter((acc: any) => acc.account_type === 'expense')
        .map((acc: any) => ({
          account_id: acc.account_id,
          account_name: acc.account_name,
          account_type: acc.account_type,
        }));
    }

    console.log('✅ Found expense accounts:', expenseAccounts);
    return expenseAccounts;
  } catch (error) {
    console.error('🔴 Error fetching expense accounts:', error);
    throw error;
  }
};

// ============================================================================
// EXPENSES API
// ============================================================================

export const getExpenses = async (
  userId: string,
  organizationId: string,
  filters?: {
    limit?: number;
    offset?: number;
    status?: 'draft' | 'submitted' | 'approved' | 'paid' | 'reimbursed';
  }
) => {
  const endpoint = '/expenses';
  const params = new URLSearchParams();

  if (filters?.limit) {
    params.set('limit', filters.limit.toString());
  }
  if (filters?.offset) {
    params.set('offset', filters.offset.toString());
  }
  if (filters?.status) {
    params.set('status', filters.status);
  }

  const data = await zohoBooksApiCall(
    userId,
    organizationId,
    `${endpoint}${params.toString() ? '?' + params.toString() : ''}`,
    'GET'
  );

  console.log('📊 Raw Zoho API Response for Expenses:', JSON.stringify(data, null, 2));

  // Normalize the response - ensure expenses are properly formatted
  // The Zoho API returns expenses in various formats, we need to standardize them
  let expenses = data?.expenses || [];

  if (!Array.isArray(expenses)) {
    console.warn('⚠️ Expenses is not an array:', typeof expenses, expenses);
    expenses = [];
  }

  console.log(`📋 Processing ${expenses.length} expenses from Zoho API`);

  // Transform expense objects to ensure all expected fields are present with correct types
  const normalizedExpenses = expenses.map((expense: any, index: number) => {
    console.log(`🔍 Expense ${index} raw data:`, JSON.stringify(expense, null, 2));

    // Extract vendor_name - try multiple possible field names
    let vendor_name = '';
    let vendor_id = '';
    if (expense.vendor_name) {
      vendor_name = String(expense.vendor_name).trim();
    } else if (expense.vendor) {
      vendor_name = String(expense.vendor).trim();
    }
    if (expense.vendor_id) {
      vendor_id = String(expense.vendor_id).trim();
    }

    // Extract amount - try multiple possible field names and ensure it's a number
    let amount = 0;
    if (typeof expense.amount === 'number' && expense.amount > 0) {
      amount = expense.amount;
    } else if (typeof expense.total === 'number' && expense.total > 0) {
      amount = expense.total;
    } else if (expense.amount) {
      const parsed = parseFloat(String(expense.amount));
      amount = isNaN(parsed) ? 0 : parsed;
    } else if (expense.total) {
      const parsed = parseFloat(String(expense.total));
      amount = isNaN(parsed) ? 0 : parsed;
    }

    // Extract expense_date - try multiple possible field names
    let expense_date = new Date().toISOString().split('T')[0];
    if (expense.expense_date && String(expense.expense_date).trim()) {
      expense_date = String(expense.expense_date).trim();
    } else if (expense.date && String(expense.date).trim()) {
      expense_date = String(expense.date).trim();
    }

    // Extract status - try multiple possible field names
    let status = expense.status || expense.payment_status || 'nonbillable';
    status = String(status).toLowerCase().trim();

    // Extract expense_id - try multiple possible field names
    let expense_id = expense.expense_id || expense.id || `expense-${index}-${Date.now()}`;

    // Extract reference_number
    const reference_number = expense.reference_number || '';

    // Extract customer_name
    const customer_name = expense.customer_name || '';

    // Extract paid_through (payment method)
    const paid_through = expense.paid_through || '';

    // Extract account information
    let account_name = expense.account_name ? String(expense.account_name).trim() : '';
    let account_id = expense.account_id ? String(expense.account_id).trim() : '';

    // Fallback to account object if present (for other API response formats)
    if (!account_name && expense.account) {
      if (typeof expense.account === 'object') {
        account_name = expense.account.account_name || '';
        account_id = expense.account.account_id || account_id;
      } else {
        account_name = String(expense.account).trim();
      }
    }

    // Extract currency
    const currency = expense.currency_code || expense.currency || '';

    const normalized = {
      expense_id: String(expense_id),
      vendor_name: vendor_name || 'Unknown Vendor',
      vendor_id: vendor_id,
      amount: amount,
      status: status,
      expense_date: expense_date,
      reference_number: reference_number,
      customer_name: customer_name,
      paid_through: paid_through,
      account_name: account_name,
      account_id: account_id,
      currency: currency,
    };

    console.log(`✅ Expense ${index} normalized:`, normalized);
    return normalized;
  });

  console.log('✅ All expenses normalized:', JSON.stringify(normalizedExpenses, null, 2));

  return {
    ...data,
    expenses: normalizedExpenses,
  };
};

export const getExpense = async (userId: string, organizationId: string, expenseId: string) => {
  return zohoBooksApiCall(
    userId,
    organizationId,
    `/expenses/${expenseId}`,
    'GET'
  );
};

export const updateExpense = async (
  userId: string,
  organizationId: string,
  expenseId: string,
  expenseData: any
) => {
  return zohoBooksApiCall(
    userId,
    organizationId,
    `/expenses/${expenseId}`,
    'PUT',
    expenseData
  );
};

export const deleteExpense = async (userId: string, organizationId: string, expenseId: string) => {
  return zohoBooksApiCall(
    userId,
    organizationId,
    `/expenses/${expenseId}`,
    'DELETE'
  );
};

export const createExpense = async (
  userId: string,
  organizationId: string,
  expenseData: {
    vendor_id?: string;
    vendor_name?: string;
    reference_number?: string;
    account_id?: string;
    expense_date: string;
    total: number;
    notes?: string;
    attachments?: Array<{
      file_name: string;
      file_type: string;
      file_content: string; // base64 encoded
    }>;
  }
) => {
  try {
    // If no account_id provided, get available expense accounts and use first one
    let accountId = expenseData.account_id;

    if (!accountId) {
      console.log('🔵 No account specified, fetching expense accounts for automatic selection...');
      const expenseAccounts = await getExpenseAccounts(userId, organizationId);

      if (expenseAccounts.length === 0) {
        throw new Error('No expense accounts found in your Zoho Books chart of accounts. Please create an expense account first.');
      }

      const selectedAccount = expenseAccounts[0];
      accountId = selectedAccount.account_id;
      console.log(`✅ Auto-selected expense account: ${selectedAccount.account_name} (ID: ${selectedAccount.account_id})`);
    }

    // Create the expense with the specified account
    // Zoho Books expects the amount field, not total
    const expensePayload: any = {
      vendor_name: expenseData.vendor_name || 'Expense',
      account_id: accountId,
      expense_date: expenseData.expense_date,
      amount: expenseData.total, // Zoho uses 'amount' instead of 'total'
    };

    // Add optional fields if provided
    if (expenseData.vendor_id) {
      expensePayload.vendor_id = expenseData.vendor_id;
    }
    if (expenseData.reference_number) {
      expensePayload.reference_number = expenseData.reference_number;
    }
    if (expenseData.notes) {
      expensePayload.notes = expenseData.notes;
    }
    if (expenseData.attachments && expenseData.attachments.length > 0) {
      expensePayload.attachments = expenseData.attachments;
    }

    console.log('📝 Final expense payload:', JSON.stringify(expensePayload, null, 2));

    const result = await zohoBooksApiCall(
      userId,
      organizationId,
      '/expenses',
      'POST',
      expensePayload
    );

    console.log('📊 Zoho API response for expense creation:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('🔴 Error creating expense:', error);
    throw error;
  }
};

// ============================================================================
// REPORTS API
// ============================================================================

export const getProfitAndLoss = async (userId: string, organizationId: string) => {
  try {
    console.log('🔵 Fetching Profit & Loss report...');
    const data = await zohoBooksApiCall(
      userId,
      organizationId,
      '/reports/profitandloss',
      'GET'
    );
    console.log('📊 P&L Report data:', data);

    // Transform the API response to match our UI expectations
    let transformedData = {
      total_income: 0,
      total_expenses: 0,
      net_profit: 0,
    };

    if (data) {
      // The Zoho API returns the report with various fields
      // Try to sum up the values based on typical response structure
      if (data.profit_and_loss) {
        const report = data.profit_and_loss;
        transformedData.total_income = report.total_income || 0;
        transformedData.total_expenses = report.total_expenses || 0;
        transformedData.net_profit = report.net_profit || (report.total_income - report.total_expenses) || 0;
      } else {
        // If structure is different, log it for debugging
        console.log('⚠️ Unexpected P&L report structure:', data);
        transformedData = data;
      }
    }

    return transformedData;
  } catch (error) {
    console.error('🔴 Error fetching P&L report:', error);
    throw error;
  }
};

export const getBalance = async (userId: string, organizationId: string) => {
  try {
    console.log('🔵 Fetching Balance Sheet report...');
    const data = await zohoBooksApiCall(
      userId,
      organizationId,
      '/reports/balancesheet',
      'GET'
    );
    console.log('📊 Balance Sheet data:', data);

    // Transform the API response to match our UI expectations
    let transformedData = {
      total_assets: 0,
      total_liabilities: 0,
    };

    if (data) {
      if (data.balance_sheet) {
        const report = data.balance_sheet;
        transformedData.total_assets = report.total_assets || 0;
        transformedData.total_liabilities = report.total_liabilities || 0;
      } else {
        console.log('⚠️ Unexpected Balance Sheet structure:', data);
        transformedData = data;
      }
    }

    return transformedData;
  } catch (error) {
    console.error('🔴 Error fetching Balance Sheet report:', error);
    throw error;
  }
};

export const getCashFlow = async (userId: string, organizationId: string) => {
  try {
    console.log('🔵 Fetching Cash Flow report...');
    const data = await zohoBooksApiCall(
      userId,
      organizationId,
      '/reports/cashflow',
      'GET'
    );
    console.log('📊 Cash Flow data:', data);
    return data;
  } catch (error) {
    console.error('🔴 Error fetching Cash Flow report:', error);
    throw error;
  }
};

export const getExpenseReport = async (userId: string, organizationId: string) => {
  try {
    console.log('🔵 Fetching Expense report...');
    const data = await zohoBooksApiCall(
      userId,
      organizationId,
      '/reports/expenses',
      'GET'
    );
    console.log('📊 Expense report data:', data);
    return data;
  } catch (error) {
    console.error('🔴 Error fetching Expense report:', error);
    throw error;
  }
};

// ============================================================================
// DISCONNECT
// ============================================================================

export const disconnectZohoBooks = async (userId: string) => {
  const { error } = await supabase
    .from('zoho_books_integrations')
    .update({
      is_connected: false,
      access_token: null,
      refresh_token: null,
      disconnected_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) throw error;
  return { success: true };
};

// ============================================================================
// CONNECTION STATUS
// ============================================================================

export const getZohoBooksStatus = async (userId: string) => {
  try {
    console.log(`🔵 Fetching Zoho Books status for user: ${userId}`);

    const { data, error } = await supabase
      .from('zoho_books_integrations')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // It's normal to not have a record if the user hasn't connected yet
      if (error.code === 'PGRST116') { // No rows found
        console.log(`ℹ️ No Zoho Books integration found for user ${userId}. User has not connected yet.`);
      } else {
        console.error(`🔴 Error fetching Zoho Books status:`, error);
        console.error(`🔴 Error code: ${error.code}`);
        console.error(`🔴 Error message: ${error.message}`);
      }

      return {
        is_connected: false,
        organization_id: null,
        connected_at: null,
        disconnected_at: null,
      };
    }

    if (!data) {
      console.log(`ℹ️ No Zoho Books integration found for user ${userId}`);
      return {
        is_connected: false,
        organization_id: null,
        connected_at: null,
        disconnected_at: null,
      };
    }

    console.log(`✅ Zoho Books status fetched:`, {
      is_connected: data?.is_connected,
      organization_id: data?.organization_id,
      connected_at: data?.connected_at,
    });

    return {
      is_connected: data?.is_connected || false,
      organization_id: data?.organization_id,
      connected_at: data?.connected_at,
      disconnected_at: data?.disconnected_at,
    };
  } catch (error) {
    console.error(`🔴 Unexpected error fetching Zoho Books status:`, error);
    return {
      is_connected: false,
      organization_id: null,
      connected_at: null,
      disconnected_at: null,
    };
  }
};

// ============================================================================
// TAX CALCULATIONS & COMPLIANCE
// ============================================================================

export interface TaxCalculationData {
  total_income: number;
  total_expenses: number;
  taxable_income: number;
  withholding_tax_rate: number;
  withholding_tax_owed: number;
  vat_rate: number;
  vat_owed: number;
  net_profit: number;
  tax_liability: number;
  estimated_tax_due: number;
}

/**
 * Calculate taxes based on income and expenses (Uganda-focused)
 * Supports multiple markets with configurable tax rates
 */
export const calculateTaxLiability = (
  totalIncome: number,
  totalExpenses: number,
  market: 'UGX' | 'KES' | 'NGN' = 'UGX'
): TaxCalculationData => {
  // Tax rates by market
  const TAX_RATES = {
    UGX: {
      withholding_tax: 0.06, // 6% for government contracts in Uganda
      professional_withholding: 0.15, // 15% for professional services
      vat: 0.18, // 18% VAT
    },
    KES: {
      withholding_tax: 0.05, // 5% in Kenya
      professional_withholding: 0.15, // 15%
      vat: 0.16, // 16% VAT
    },
    NGN: {
      withholding_tax: 0.05, // 5% in Nigeria
      professional_withholding: 0.10, // 10%
      vat: 0.07, // 7.5% VAT
    },
  };

  const rates = TAX_RATES[market];
  const taxableIncome = Math.max(0, totalIncome - totalExpenses);
  const netProfit = taxableIncome;

  // Calculate withholding tax (6% for Uganda government contracts)
  const withholdingTaxOwed = totalIncome * rates.withholding_tax;

  // Calculate VAT (18% in Uganda, applicable on supplies)
  const vatOwed = totalExpenses * rates.vat;

  // Total tax liability
  const totalTaxLiability = withholdingTaxOwed + vatOwed;

  return {
    total_income: totalIncome,
    total_expenses: totalExpenses,
    taxable_income: taxableIncome,
    withholding_tax_rate: rates.withholding_tax * 100,
    withholding_tax_owed: withholdingTaxOwed,
    vat_rate: rates.vat * 100,
    vat_owed: vatOwed,
    net_profit: netProfit,
    tax_liability: totalTaxLiability,
    estimated_tax_due: netProfit > 0 ? totalTaxLiability : 0,
  };
};

/**
 * Fetch real-time P&L data with automatic tax calculations
 */
export const getProfitAndLossWithTaxes = async (
  userId: string,
  organizationId: string,
  market: 'UGX' | 'KES' | 'NGN' = 'UGX'
): Promise<TaxCalculationData> => {
  try {
    console.log('🔵 Fetching P&L with tax calculations...');

    // Fetch P&L report
    const plData = await getProfitAndLoss(userId, organizationId);

    // Calculate tax liability
    const taxData = calculateTaxLiability(
      plData.total_income || 0,
      plData.total_expenses || 0,
      market
    );

    console.log('✅ P&L with taxes:', taxData);
    return taxData;
  } catch (error) {
    console.error('🔴 Error fetching P&L with taxes:', error);
    throw error;
  }
};

// ============================================================================
// AUDIT & REPORTING
// ============================================================================

export interface AuditReport {
  report_date: string;
  contractor_name: string;
  total_income: number;
  total_expenses: number;
  net_profit: number;
  tax_liability: number;
  transaction_count: number;
  transactions: Array<{
    date: string;
    description: string;
    type: 'income' | 'expense';
    amount: number;
  }>;
}

/**
 * Generate comprehensive audit report with all transactions
 */
export const generateAuditReport = async (
  userId: string,
  organizationId: string,
  contractorName: string
): Promise<AuditReport> => {
  try {
    console.log('🔵 Generating audit report...');

    // Fetch invoices (income)
    const invoicesData = await getInvoices(userId, organizationId, { limit: 100 });
    const invoices = invoicesData?.invoices || [];

    // Fetch expenses
    const expensesData = await getExpenses(userId, organizationId, { limit: 100 });
    const expenses = expensesData?.expenses || [];

    // Calculate totals
    const totalIncome = invoices.reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);
    const totalExpenses = expenses.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);
    const taxData = calculateTaxLiability(totalIncome, totalExpenses);

    // Build transaction list
    const transactions = [
      ...invoices.map((inv: any) => ({
        date: inv.invoice_date || new Date().toISOString().split('T')[0],
        description: `Invoice #${inv.invoice_number} - ${inv.customer_name}`,
        type: 'income' as const,
        amount: inv.total || 0,
      })),
      ...expenses.map((exp: any) => ({
        date: exp.expense_date || new Date().toISOString().split('T')[0],
        description: `Expense - ${exp.vendor_name} (${exp.account_name})`,
        type: 'expense' as const,
        amount: exp.amount || 0,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const report: AuditReport = {
      report_date: new Date().toISOString().split('T')[0],
      contractor_name: contractorName,
      total_income: totalIncome,
      total_expenses: totalExpenses,
      net_profit: taxData.net_profit,
      tax_liability: taxData.tax_liability,
      transaction_count: transactions.length,
      transactions,
    };

    console.log('✅ Audit report generated:', report);
    return report;
  } catch (error) {
    console.error('🔴 Error generating audit report:', error);
    throw error;
  }
};

/**
 * Generate tax filing document (PDF-ready format)
 */
export const generateTaxFilingDocument = async (
  userId: string,
  organizationId: string,
  contractorName: string
): Promise<{
  filename: string;
  content: string;
  taxData: TaxCalculationData;
}> => {
  try {
    console.log('🔵 Generating tax filing document...');

    const plData = await getProfitAndLoss(userId, organizationId);
    const taxData = calculateTaxLiability(plData.total_income || 0, plData.total_expenses || 0);

    // Generate CSV/text content for import into tax authority system
    const content = `
EMPOWISE TAX FILING DOCUMENT
Generated: ${new Date().toLocaleString()}
Contractor: ${contractorName}

FINANCIAL SUMMARY
================
Total Income: UGX ${(taxData.total_income).toLocaleString()}
Total Expenses: UGX ${(taxData.total_expenses).toLocaleString()}
Taxable Income: UGX ${(taxData.taxable_income).toLocaleString()}
Net Profit: UGX ${(taxData.net_profit).toLocaleString()}

TAX CALCULATIONS
================
Withholding Tax (${taxData.withholding_tax_rate}%): UGX ${(taxData.withholding_tax_owed).toLocaleString()}
VAT (${taxData.vat_rate}%): UGX ${(taxData.vat_owed).toLocaleString()}
TOTAL TAX LIABILITY: UGX ${(taxData.tax_liability).toLocaleString()}

ESTIMATED PAYMENT DUE
====================
Monthly estimate (÷12): UGX ${(taxData.estimated_tax_due / 12).toLocaleString()}
Quarterly estimate (÷4): UGX ${(taxData.estimated_tax_due / 4).toLocaleString()}

This document is automatically generated by Empowise Compliance Hub
and is ready for submission to the Uganda Revenue Authority (URA).

All transactions are auditable and supported by detailed documentation.
    `.trim();

    const filename = `TAX_FILING_${contractorName.replace(/\s+/g, '_')}_${new Date().getFullYear()}.txt`;

    return {
      filename,
      content,
      taxData,
    };
  } catch (error) {
    console.error('🔴 Error generating tax filing document:', error);
    throw error;
  }
};

/**
 * Create downloadable audit PDF (base64 encoded)
 */
export const generateAuditPDF = async (
  userId: string,
  organizationId: string,
  contractorName: string
): Promise<{
  filename: string;
  base64Content: string;
}> => {
  try {
    console.log('🔵 Generating audit PDF...');

    const auditReport = await generateAuditReport(userId, organizationId, contractorName);

    // Create CSV format (can be converted to PDF on client side or with backend service)
    const csvContent = [
      ['EMPOWISE AUDIT REPORT'],
      ['Report Date', auditReport.report_date],
      ['Contractor', auditReport.contractor_name],
      [''],
      ['FINANCIAL SUMMARY'],
      ['Total Income', auditReport.total_income],
      ['Total Expenses', auditReport.total_expenses],
      ['Net Profit', auditReport.net_profit],
      ['Tax Liability', auditReport.tax_liability],
      [''],
      ['TRANSACTIONS'],
      ['Date', 'Description', 'Type', 'Amount'],
      ...auditReport.transactions.map((t) => [t.date, t.description, t.type, t.amount]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    // Encode as base64
    const base64Content = btoa(unescape(encodeURIComponent(csvContent)));
    const filename = `AUDIT_REPORT_${contractorName.replace(/\s+/g, '_')}_${auditReport.report_date}.csv`;

    return {
      filename,
      base64Content,
    };
  } catch (error) {
    console.error('🔴 Error generating audit PDF:', error);
    throw error;
  }
};
