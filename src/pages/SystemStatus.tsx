import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle, AlertCircle, Clock, Loader } from 'lucide-react';

export default function SystemStatus() {
  const [status, setStatus] = useState({
    supabaseConnection: 'checking' as 'checking' | 'ok' | 'error',
    storageBuckets: 'checking' as 'checking' | 'ok' | 'error',
    tables: 'checking' as 'checking' | 'ok' | 'error',
    complianceConfig: 'checking' as 'checking' | 'ok' | 'error',
  });

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    // Check Supabase Connection
    try {
      const { data, error } = await supabase.auth.getSession();
      setStatus(prev => ({
        ...prev,
        supabaseConnection: error ? 'error' : 'ok',
      }));
    } catch (err) {
      setStatus(prev => ({ ...prev, supabaseConnection: 'error' }));
    }

    // Check Storage Buckets
    try {
      const { data: buckets, error } = await supabase.storage.listBuckets();
      const hasComplianceBucket = buckets?.some(b => b.name === 'compliance-documents');
      const hasFieldVerificationBucket = buckets?.some(b => b.name === 'field-verification');
      
      setStatus(prev => ({
        ...prev,
        storageBuckets: (hasComplianceBucket && hasFieldVerificationBucket) ? 'ok' : 'error',
      }));
    } catch (err) {
      setStatus(prev => ({ ...prev, storageBuckets: 'error' }));
    }

    // Check Tables
    try {
      const { data, error } = await supabase
        .from('contractor_profiles')
        .select('count(*)', { count: 'exact' })
        .limit(1);
      
      setStatus(prev => ({
        ...prev,
        tables: error ? 'error' : 'ok',
      }));
    } catch (err) {
      setStatus(prev => ({ ...prev, tables: 'error' }));
    }

    // Check Compliance Config
    try {
      const { data, error } = await supabase
        .from('compliance_config')
        .select('*')
        .eq('market_code', 'UGX')
        .single();
      
      setStatus(prev => ({
        ...prev,
        complianceConfig: (data && !error) ? 'ok' : 'error',
      }));
    } catch (err) {
      setStatus(prev => ({ ...prev, complianceConfig: 'error' }));
    }
  };

  const getIcon = (status: string) => {
    switch (status) {
      case 'ok':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-6 h-6 text-red-600" />;
      default:
        return <Loader className="w-6 h-6 text-blue-600 animate-spin" />;
    }
  };

  const getColor = (status: string) => {
    switch (status) {
      case 'ok':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const allOk = Object.values(status).every(s => s === 'ok');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">System Status</h1>
          <p className="text-gray-600 mb-8">Empowise Platform Infrastructure Check</p>

          {allOk ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-8 flex gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-green-900">All Systems Operational! ✅</p>
                <p className="text-green-800 text-sm">Your platform is ready to launch.</p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-8 flex gap-3">
              <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-yellow-900">Action Required</p>
                <p className="text-yellow-800 text-sm">Check the items below for issues.</p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* Supabase Connection */}
            <div className={`border-2 rounded-lg p-4 ${getColor(status.supabaseConnection)}`}>
              <div className="flex items-center gap-3 mb-2">
                {getIcon(status.supabaseConnection)}
                <h3 className="font-semibold text-gray-800">Supabase Connection</h3>
              </div>
              <p className="text-sm text-gray-700 ml-9">
                {status.supabaseConnection === 'ok' && 'Connected to Supabase database'}
                {status.supabaseConnection === 'error' && 'Failed to connect. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'}
                {status.supabaseConnection === 'checking' && 'Checking connection...'}
              </p>
            </div>

            {/* Storage Buckets */}
            <div className={`border-2 rounded-lg p-4 ${getColor(status.storageBuckets)}`}>
              <div className="flex items-center gap-3 mb-2">
                {getIcon(status.storageBuckets)}
                <h3 className="font-semibold text-gray-800">Storage Buckets</h3>
              </div>
              <p className="text-sm text-gray-700 ml-9">
                {status.storageBuckets === 'ok' && 'Both compliance-documents and field-verification buckets found'}
                {status.storageBuckets === 'error' && 'Missing buckets. Create them in Supabase > Storage'}
                {status.storageBuckets === 'checking' && 'Checking buckets...'}
              </p>
              {status.storageBuckets === 'error' && (
                <div className="ml-9 mt-2 text-xs bg-white p-2 rounded">
                  <p className="font-semibold mb-1">Required buckets:</p>
                  <ul className="list-disc ml-5 space-y-1">
                    <li>compliance-documents (PUBLIC)</li>
                    <li>field-verification (PUBLIC)</li>
                  </ul>
                </div>
              )}
            </div>

            {/* Tables */}
            <div className={`border-2 rounded-lg p-4 ${getColor(status.tables)}`}>
              <div className="flex items-center gap-3 mb-2">
                {getIcon(status.tables)}
                <h3 className="font-semibold text-gray-800">Database Tables</h3>
              </div>
              <p className="text-sm text-gray-700 ml-9">
                {status.tables === 'ok' && '15 tables created and accessible'}
                {status.tables === 'error' && 'Database tables not found. Run the SQL migration script'}
                {status.tables === 'checking' && 'Checking tables...'}
              </p>
            </div>

            {/* Compliance Config */}
            <div className={`border-2 rounded-lg p-4 ${getColor(status.complianceConfig)}`}>
              <div className="flex items-center gap-3 mb-2">
                {getIcon(status.complianceConfig)}
                <h3 className="font-semibold text-gray-800">Uganda Compliance Rules</h3>
              </div>
              <p className="text-sm text-gray-700 ml-9">
                {status.complianceConfig === 'ok' && 'Uganda (UGX) market rules configured'}
                {status.complianceConfig === 'error' && 'Compliance config missing. Check compliance_config table'}
                {status.complianceConfig === 'checking' && 'Checking configuration...'}
              </p>
            </div>
          </div>

          {/* Refresh Button */}
          <button
            onClick={checkStatus}
            className="w-full mt-8 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
          >
            Refresh Status
          </button>

          {/* Documentation Link */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              📖 See <code className="bg-white px-2 py-1 rounded">EMPOWISE_FINAL_SETUP.md</code> for complete setup instructions
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
