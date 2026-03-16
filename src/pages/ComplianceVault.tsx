import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  Calendar,
  AlertTriangle,
  Loader,
  Trash2,
  Download,
} from 'lucide-react';
import ComplianceDocumentUpload from '../components/ComplianceDocumentUpload';

interface ComplianceDocument {
  id: string;
  reminder_type: string;
  document_name: string;
  expiry_date: string;
  status: string;
  document_url: string;
  created_at: string;
  last_reminder_sent_at: string | null;
}

export default function ComplianceVault() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [documents, setDocuments] = useState<ComplianceDocument[]>([]);
  const [contractorId, setContractorId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchContractorAndDocuments();
    }
  }, [user]);

  const fetchContractorAndDocuments = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Get contractor ID
      const { data: profileData, error: profileError } = await supabase
        .from('contractor_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;

      setContractorId(profileData.id);

      // Get documents
      const { data: docsData, error: docsError } = await supabase
        .from('tax_reminders')
        .select('*')
        .eq('contractor_id', user.id)
        .order('expiry_date', { ascending: true });

      if (docsError) throw docsError;

      setDocuments(docsData || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    setDeleting(docId);
    try {
      const { error: deleteError } = await supabase
        .from('tax_reminders')
        .delete()
        .eq('id', docId);

      if (deleteError) throw deleteError;

      setDocuments(documents.filter(d => d.id !== docId));
    } catch (err: any) {
      alert('Failed to delete document: ' + err.message);
    } finally {
      setDeleting(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ok':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'critical':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'critical':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-400" />;
    }
  };

  const getDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysLeft = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft;
  };

  const criticalAlerts = documents.filter(d => d.status === 'critical');
  const bidReadinessPercentage = (documents.length / 6) * 100; // 6 critical docs

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your compliance documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Compliance Vault</h1>
          <p className="text-lg text-slate-600">
            Manage all your compliance documents. We'll automatically track expiry dates and notify you.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Bid Readiness Score */}
        <div className="mb-8 p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Bid Readiness Score</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-700 font-medium">Compliance Documents Uploaded</span>
              <span className="text-2xl font-bold text-blue-600">{bidReadinessPercentage.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-green-500 to-blue-600 h-3 rounded-full transition-all"
                style={{ width: `${bidReadinessPercentage}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600">
              {documents.length} of 6 critical documents uploaded
            </p>
          </div>
        </div>

        {/* Critical Alerts */}
        {criticalAlerts.length > 0 && (
          <div className="mb-8 p-6 bg-red-50 border-2 border-red-300 rounded-xl">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-900 mb-2">Immediate Action Required</h3>
                <ul className="space-y-2">
                  {criticalAlerts.map((doc) => (
                    <li key={doc.id} className="text-red-800">
                      <span className="font-semibold">{doc.document_name}</span> expires in{' '}
                      <span className="font-bold">{getDaysUntilExpiry(doc.expiry_date)} days</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Documents Grid */}
        {documents.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Your Documents</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {documents.map((doc) => {
                const daysLeft = getDaysUntilExpiry(doc.expiry_date);
                return (
                  <div key={doc.id} className={`border-2 rounded-lg p-6 ${getStatusColor(doc.status)}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-3 flex-1">
                        {getStatusIcon(doc.status)}
                        <div>
                          <h3 className="font-semibold text-slate-900">{doc.document_name}</h3>
                          <p className="text-sm text-slate-600 mt-1">
                            Uploaded {new Date(doc.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        disabled={deleting === doc.id}
                        className="p-2 hover:bg-red-100 rounded-lg transition disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <span className="text-slate-700">
                          Expires: {new Date(doc.expiry_date).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="pt-3 border-t border-current border-opacity-20">
                        {daysLeft < 0 ? (
                          <div className="text-sm font-semibold text-red-700">
                            ⚠️ EXPIRED - Please renew immediately
                          </div>
                        ) : daysLeft <= 7 ? (
                          <div className="text-sm font-semibold text-red-600">
                            🔴 Critical: {daysLeft} day(s) left
                          </div>
                        ) : daysLeft <= 30 ? (
                          <div className="text-sm font-semibold text-yellow-700">
                            🟡 Warning: {daysLeft} days left
                          </div>
                        ) : (
                          <div className="text-sm font-semibold text-green-700">
                            ✅ OK: {daysLeft} days left
                          </div>
                        )}
                      </div>
                    </div>

                    {doc.document_url && (
                      <a
                        href={doc.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full mt-4 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-semibold transition flex items-center justify-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        View Document
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Add Document Form */}
        {contractorId && user && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Add New Document</h2>
            <ComplianceDocumentUpload
              contractorId={user.id}
              onSuccess={fetchContractorAndDocuments}
            />
          </div>
        )}

        {/* Empty State */}
        {documents.length === 0 && (
          <div className="p-12 bg-white rounded-lg border-2 border-dashed border-gray-300 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Documents Yet</h3>
            <p className="text-gray-600 mb-6">Start by uploading your compliance documents</p>
          </div>
        )}
      </div>
    </div>
  );
}
