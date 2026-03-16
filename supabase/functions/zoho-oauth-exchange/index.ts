import { createClient } from 'jsr:@supabase/supabase-js@2';

const ZOHO_CLIENT_ID = Deno.env.get('VITE_ZOHO_CLIENT_ID');
const ZOHO_CLIENT_SECRET = Deno.env.get('VITE_ZOHO_CLIENT_SECRET');
const ZOHO_OAUTH_TOKEN_URL = 'https://accounts.zoho.com/oauth/v2/token';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.log('🔵 [zoho-oauth-exchange] Function initialized');
console.log(`🔵 [zoho-oauth-exchange] VITE_ZOHO_CLIENT_ID: ${ZOHO_CLIENT_ID ? 'SET' : 'MISSING'}`);
console.log(`🔵 [zoho-oauth-exchange] VITE_ZOHO_CLIENT_SECRET: ${ZOHO_CLIENT_SECRET ? 'SET' : 'MISSING'}`);

Deno.serve(async (req) => {
  console.log(`🔵 [zoho-oauth-exchange] ${req.method} request received from ${req.headers.get('origin')}`);

  if (req.method === 'OPTIONS') {
    console.log('🔵 [zoho-oauth-exchange] Handling CORS preflight');
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    console.error(`🔴 [zoho-oauth-exchange] Method not allowed: ${req.method}`);
    return new Response(
      JSON.stringify({ error: 'Method Not Allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    let code, redirectUri, userId;

    try {
      const body = await req.json();
      code = body.code;
      redirectUri = body.redirectUri;
      userId = body.userId;
      console.log(`🔵 [zoho-oauth-exchange] Request body parsed: code=${!!code}, redirectUri=${!!redirectUri}, userId=${!!userId}`);
    } catch (parseError) {
      console.error('🔴 [zoho-oauth-exchange] Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request body' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate input
    if (!code) {
      console.error('🔴 [zoho-oauth-exchange] Missing authorization code');
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization code is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!userId) {
      console.error('🔴 [zoho-oauth-exchange] Missing user ID');
      return new Response(
        JSON.stringify({ success: false, error: 'User ID is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!redirectUri) {
      console.error('🔴 [zoho-oauth-exchange] Missing redirect URI');
      return new Response(
        JSON.stringify({ success: false, error: 'Redirect URI is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check environment variables
    if (!ZOHO_CLIENT_ID || !ZOHO_CLIENT_SECRET) {
      console.error('🔴 [zoho-oauth-exchange] Missing Zoho credentials in environment');
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error: Missing Zoho credentials' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`🔵 [zoho-oauth-exchange] Exchanging authorization code for access token...`);
    console.log(`🔵 [zoho-oauth-exchange] Zoho OAuth URL: ${ZOHO_OAUTH_TOKEN_URL}`);

    // Exchange authorization code for access token
    const tokenResponse = await fetch(ZOHO_OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: ZOHO_CLIENT_ID,
        client_secret: ZOHO_CLIENT_SECRET,
        redirect_uri: redirectUri,
        code,
      }).toString(),
    });

    console.log(`🔵 [zoho-oauth-exchange] Zoho token response status: ${tokenResponse.status}`);

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error(`🔴 [zoho-oauth-exchange] Zoho OAuth error: ${tokenData.error}`);
      console.error(`🔴 [zoho-oauth-exchange] Error details:`, tokenData);
      return new Response(
        JSON.stringify({ success: false, error: `Zoho OAuth failed: ${tokenData.error}` }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!tokenData.access_token) {
      console.error('🔴 [zoho-oauth-exchange] No access token in response');
      console.error('🔴 [zoho-oauth-exchange] Token response:', tokenData);
      return new Response(
        JSON.stringify({ success: false, error: 'No access token received from Zoho' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('✅ [zoho-oauth-exchange] Access token received successfully');
    console.log(`✅ [zoho-oauth-exchange] Token expires in: ${tokenData.expires_in} seconds`);

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('🔴 [zoho-oauth-exchange] Missing Supabase credentials');
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

    console.log(`🔵 [zoho-oauth-exchange] Storing tokens in database for user: ${userId}`);

    // Store tokens in database
    const { error: dbError, data: dbData } = await supabase
      .from('zoho_books_integrations')
      .upsert({
        user_id: userId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || null,
        token_expires_at: new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString(),
        organization_id: null, // Will be fetched on first API call
        is_connected: true,
        connected_at: new Date().toISOString(),
        disconnected_at: null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (dbError) {
      console.error('🔴 [zoho-oauth-exchange] Database error:', dbError);
      console.error('🔴 [zoho-oauth-exchange] Full error details:', JSON.stringify(dbError, null, 2));
      return new Response(
        JSON.stringify({
          success: false,
          error: `Database error: ${dbError.message}`,
          details: dbError,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('✅ [zoho-oauth-exchange] Tokens stored successfully in database');
    console.log('✅ [zoho-oauth-exchange] Database response:', dbData);

    return new Response(
      JSON.stringify({
        success: true,
        accessToken: tokenData.access_token,
        message: 'Zoho Books connected successfully',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('🔴 [zoho-oauth-exchange] Unhandled error:', errorMessage);
    console.error('🔴 [zoho-oauth-exchange] Error stack:', errorStack);
    console.error('🔴 [zoho-oauth-exchange] Full error object:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        details: errorStack,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
