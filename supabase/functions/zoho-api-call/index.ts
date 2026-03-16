import { createClient } from 'jsr:@supabase/supabase-js@2';

const ZOHO_BOOKS_API_BASE = 'https://www.zohoapis.com/books/v3';
const ZOHO_OAUTH_TOKEN_URL = 'https://accounts.zoho.com/oauth/v2/token';
const ZOHO_CLIENT_ID = Deno.env.get('VITE_ZOHO_CLIENT_ID');
const ZOHO_CLIENT_SECRET = Deno.env.get('VITE_ZOHO_CLIENT_SECRET');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.log('🔵 [zoho-api-call] Function initialized');
console.log(`🔵 [zoho-api-call] VITE_ZOHO_CLIENT_ID: ${ZOHO_CLIENT_ID ? 'SET' : 'MISSING'}`);
console.log(`🔵 [zoho-api-call] VITE_ZOHO_CLIENT_SECRET: ${ZOHO_CLIENT_SECRET ? 'SET' : 'MISSING'}`);

async function getValidAccessToken(
  supabase: any,
  userId: string
): Promise<string> {
  console.log(`🔵 [zoho-api-call] Getting valid access token for user: ${userId}`);

  const { data: integration, error: fetchError } = await supabase
    .from('zoho_books_integrations')
    .select('access_token, token_expires_at, refresh_token')
    .eq('user_id', userId)
    .single();

  if (fetchError) {
    console.error(`🔴 [zoho-api-call] Failed to fetch integration record:`, fetchError);
    throw new Error(`Failed to fetch integration: ${fetchError.message}`);
  }

  if (!integration) {
    console.error(`🔴 [zoho-api-call] No integration found for user: ${userId}`);
    throw new Error('No Zoho Books integration found for this user');
  }

  if (!integration.access_token) {
    console.error(`🔴 [zoho-api-call] No access token found for user: ${userId}`);
    throw new Error('No access token found. Please reconnect to Zoho Books.');
  }

  const expiresAt = new Date(integration.token_expires_at);
  const now = new Date();
  console.log(`🔵 [zoho-api-call] Token expiration check: expires at ${expiresAt.toISOString()}, now is ${now.toISOString()}`);

  if (expiresAt <= now) {
    console.log(`🔵 [zoho-api-call] Token expired, attempting refresh...`);

    // Token expired, refresh it
    if (!integration.refresh_token) {
      console.error(`🔴 [zoho-api-call] No refresh token found for user: ${userId}`);
      throw new Error('Token expired and no refresh token available. Please reconnect to Zoho Books.');
    }

    if (!ZOHO_CLIENT_ID || !ZOHO_CLIENT_SECRET) {
      console.error('🔴 [zoho-api-call] Missing Zoho credentials for token refresh');
      throw new Error('Server configuration error: Missing Zoho credentials');
    }

    const tokenResponse = await fetch(ZOHO_OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: ZOHO_CLIENT_ID,
        client_secret: ZOHO_CLIENT_SECRET,
        refresh_token: integration.refresh_token,
      }).toString(),
    });

    console.log(`🔵 [zoho-api-call] Token refresh response status: ${tokenResponse.status}`);
    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error(`🔴 [zoho-api-call] Token refresh failed: ${tokenData.error}`);
      throw new Error(`Token refresh failed: ${tokenData.error}`);
    }

    if (!tokenData.access_token) {
      console.error(`🔴 [zoho-api-call] No access token in refresh response`);
      throw new Error('No access token in refresh response');
    }

    // Update tokens in database
    console.log(`🔵 [zoho-api-call] Updating tokens in database...`);
    const { error: updateError } = await supabase
      .from('zoho_books_integrations')
      .update({
        access_token: tokenData.access_token,
        token_expires_at: new Date(
          Date.now() + (tokenData.expires_in || 3600) * 1000
        ).toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error(`🔴 [zoho-api-call] Failed to update tokens:`, updateError);
      throw new Error(`Failed to update tokens: ${updateError.message}`);
    }

    console.log(`✅ [zoho-api-call] Token refreshed successfully`);
    return tokenData.access_token;
  }

  console.log(`✅ [zoho-api-call] Access token is valid`);
  return integration.access_token;
}

Deno.serve(async (req) => {
  console.log(`🔵 [zoho-api-call] ${req.method} request received from ${req.headers.get('origin')}`);

  if (req.method === 'OPTIONS') {
    console.log('🔵 [zoho-api-call] Handling CORS preflight');
    return new Response('ok', { headers: corsHeaders });
  }

  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(req.method)) {
    console.error(`🔴 [zoho-api-call] Method not allowed: ${req.method}`);
    return new Response(
      JSON.stringify({ success: false, error: 'Method Not Allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    let userId, organizationId, endpoint, method = 'GET', body;

    try {
      const bodyData = await req.json();
      userId = bodyData.userId;
      organizationId = bodyData.organizationId;
      endpoint = bodyData.endpoint;
      method = bodyData.method || 'GET';
      body = bodyData.body;
      console.log(`🔵 [zoho-api-call] Request body parsed: method=${method} endpoint=${endpoint} userId=${!!userId} orgId=${!!organizationId}`);
    } catch (parseError) {
      console.error('🔴 [zoho-api-call] Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request body' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate input parameters
    if (!userId) {
      console.error('🔴 [zoho-api-call] Missing userId in request');
      return new Response(
        JSON.stringify({ success: false, error: 'userId is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!organizationId) {
      console.error('🔴 [zoho-api-call] Missing organizationId in request');
      return new Response(
        JSON.stringify({ success: false, error: 'organizationId is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!endpoint) {
      console.error('🔴 [zoho-api-call] Missing endpoint in request');
      return new Response(
        JSON.stringify({ success: false, error: 'endpoint is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`🔵 [zoho-api-call] Making ${method} API call to: ${endpoint}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('🔴 [zoho-api-call] Missing Supabase credentials');
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error: Missing Supabase credentials' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Get valid access token
    const accessToken = await getValidAccessToken(supabase, userId);

    // Build request URL
    const url = new URL(`${ZOHO_BOOKS_API_BASE}${endpoint}`);
    url.searchParams.set('organization_id', organizationId);

    // Make API call
    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json',
      },
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(body);
      console.log(`📝 [zoho-api-call] Request body:`, JSON.stringify(body, null, 2));
    }

    console.log(`📡 [zoho-api-call] Making ${method} request to: ${url.toString()}`);
    console.log(`📝 [zoho-api-call] Headers: Authorization: Zoho-oauthtoken [***], Content-Type: application/json`);

    const response = await fetch(url.toString(), options);
    const responseText = await response.text();

    console.log(`📊 [zoho-api-call] Response status: ${response.status}`);
    if (responseText.length < 1000) {
      console.log(`📊 [zoho-api-call] Response body:`, responseText);
    } else {
      console.log(`📊 [zoho-api-call] Response body (truncated):`, responseText.substring(0, 1000) + '...');
    }

    if (!response.ok) {
      let errorMessage = response.statusText;
      let errorCode = null;
      let fullErrorData = null;

      try {
        fullErrorData = JSON.parse(responseText);
        errorCode = fullErrorData.code;
        errorMessage = fullErrorData.message || fullErrorData.error || response.statusText;
        console.error(`🔴 [zoho-api-call] Zoho API error (code ${errorCode}): ${errorMessage}`);
        console.error(`🔴 [zoho-api-call] Full error response:`, JSON.stringify(fullErrorData));
      } catch (e) {
        errorMessage = responseText || response.statusText;
        console.error(`🔴 [zoho-api-call] Failed to parse error response: ${errorMessage}`);
      }

      // Return error response with detailed information
      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage,
          code: errorCode,
          status: response.status,
          details: fullErrorData,
        }),
        {
          status: 200, // Return 200 so function execution is successful
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('🔴 [zoho-api-call] Failed to parse response:', responseText);
      throw new Error('Invalid JSON response from Zoho Books API');
    }

    console.log('✅ [zoho-api-call] Zoho API call successful');

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'API call failed';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('🔴 [zoho-api-call] Unhandled error:', errorMessage);
    console.error('🔴 [zoho-api-call] Error stack:', errorStack);
    console.error('🔴 [zoho-api-call] Full error:', error);

    // Return detailed error information
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        details: errorStack || 'No stack trace available',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
