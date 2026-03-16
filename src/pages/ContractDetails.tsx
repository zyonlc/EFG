import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  Loader, ArrowLeft, FileText, Download, Share2, Upload, Trash2, MessageSquare,
  Clock, DollarSign, Calendar, AlertCircle, CheckCircle, Paperclip, Plus,
  Eye, Send, X, Mail, Copy
} from 'lucide-react';

interface Contract {
  id: string;
  contract_number: string;
  client_name: string;
  client_email?: string;
  client_contact_person?: string;
  contract_amount: number;
  currency_code: string;
  contract_start_date: string;
  contract_end_date: string;
  status: string;
  contract_document_url?: string;
  created_at?: string;
  updated_at?: string;
}

interface Attachment {
  id: string;
  contract_id: string;
  name: string;
  url: string;
  type: string;
  size?: number;
  uploaded_by?: string;
  created_at?: string;
}

interface Comment {
  id: string;
  contract_id: string;
  content: string;
  author: string;
  author_id?: string;
  created_at?: string;
  updated_at?: string;
}

export default function ContractDetails() {
  const { contractId } = useParams();
  const navigate = useNavigate();
  const [contract, setContract] = useState<Contract | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'attachments' | 'comments'>('overview');
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (contractId) {
      fetchContractData();
    }
  }, [contractId]);

  const fetchContractData = async () => {
    if (!contractId) return;
    setLoading(true);
    setError(null);

    try {
      // Fetch contract
      const { data: contractData, error: contractError } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', contractId)
        .single();

      if (contractError) throw contractError;
      setContract(contractData);

      // Fetch attachments
      const { data: attachmentsData, error: attachmentsError } = await supabase
        .from('contract_attachments')
        .select('*')
        .eq('contract_id', contractId)
        .order('created_at', { ascending: false });

      if (!attachmentsError && attachmentsData) {
        setAttachments(attachmentsData);
      }

      // Fetch comments
      const { data: commentsData, error: commentsError } = await supabase
        .from('contract_comments')
        .select('*')
        .eq('contract_id', contractId)
        .order('created_at', { ascending: false });

      if (!commentsError && commentsData) {
        setComments(commentsData);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load contract details');
      console.error('Error fetching contract:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !contractId) return;

    setSubmittingComment(true);
    try {
      const { error } = await supabase
        .from('contract_comments')
        .insert({
          contract_id: contractId,
          content: newComment,
          author: 'User', // This should come from auth context in production
          author_id: null // This should come from auth context in production
        });

      if (error) throw error;
      setNewComment('');
      fetchContractData(); // Refresh comments
    } catch (err: any) {
      setError(err.message || 'Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('contract_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      fetchContractData(); // Refresh comments
    } catch (err: any) {
      setError(err.message || 'Failed to delete comment');
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      const { error } = await supabase
        .from('contract_attachments')
        .delete()
        .eq('id', attachmentId);

      if (error) throw error;
      fetchContractData(); // Refresh attachments
    } catch (err: any) {
      setError(err.message || 'Failed to delete attachment');
    }
  };

  const downloadFile = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(label);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center pt-24">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading contract details...</p>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6 pt-24">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/contracts')}
            className="mb-6 flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Contracts
          </button>
          <div className="bg-white rounded-lg p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Contract Not Found</h2>
            <p className="text-gray-600 mb-6">The contract you're looking for doesn't exist or has been deleted.</p>
            <button
              onClick={() => navigate('/contracts')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Back to Contracts
            </button>
          </div>
        </div>
      </div>
    );
  }

  const daysUntilExpiry = Math.floor(
    (new Date(contract.contract_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  const isExpiringSoon = daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  const isExpired = daysUntilExpiry < 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6 pt-24">
      <div className="max-w-6xl mx-auto">
        {/* Header Button */}
        <button
          onClick={() => navigate('/contracts')}
          className="mb-6 flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Contracts
        </button>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-700 font-semibold">Error</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Contract Header Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8 border-l-4 border-blue-600">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <h1 className="text-4xl font-bold text-gray-800 mb-2">{contract.contract_number}</h1>
                  <p className="text-lg text-gray-600">{contract.client_name}</p>
                  {contract.client_contact_person && (
                    <p className="text-sm text-gray-500 mt-1">Contact: {contract.client_contact_person}</p>
                  )}
                </div>
                <span className={`text-sm font-semibold px-3 py-1 rounded whitespace-nowrap ${
                  contract.status === 'active' ? 'bg-green-100 text-green-800' :
                  contract.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {contract.status}
                </span>
              </div>
            </div>
          </div>

          {/* Expiry Alert */}
          {isExpired && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-red-700 font-semibold">This contract has expired</p>
            </div>
          )}
          {isExpiringSoon && (
            <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <p className="text-amber-700 font-semibold">Contract expires in {daysUntilExpiry} days</p>
            </div>
          )}

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Total Amount</p>
              <p className="text-2xl font-bold text-blue-600">
                {contract.currency_code} {contract.contract_amount.toLocaleString()}
              </p>
            </div>

            <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Start Date</p>
              <p className="text-lg font-semibold text-green-600">
                {new Date(contract.contract_start_date).toLocaleDateString()}
              </p>
            </div>

            <div className={`p-4 rounded-lg ${isExpired ? 'bg-red-50' : isExpiringSoon ? 'bg-amber-50' : 'bg-gray-50'}`}>
              <p className="text-sm text-gray-600 mb-1">End Date</p>
              <p className={`text-lg font-semibold ${isExpired ? 'text-red-600' : isExpiringSoon ? 'text-amber-600' : 'text-gray-600'}`}>
                {new Date(contract.contract_end_date).toLocaleDateString()}
              </p>
            </div>

            <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Duration</p>
              <p className="text-lg font-semibold text-purple-600">
                {Math.ceil((new Date(contract.contract_end_date).getTime() - new Date(contract.contract_start_date).getTime()) / (1000 * 60 * 60 * 24))} days
              </p>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="bg-white rounded-t-lg shadow-lg border-b border-gray-200 sticky top-20">
          <div className="flex flex-wrap gap-1 p-4">
            {[
              { id: 'overview', label: 'Overview', icon: FileText },
              { id: 'documents', label: 'Documents', icon: Paperclip },
              { id: 'attachments', label: 'Attachments', icon: Upload },
              { id: 'comments', label: 'Comments', icon: MessageSquare }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 rounded-t-lg font-medium transition ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-b-lg shadow-lg p-8">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Contract Details</h3>
                  <div className="space-y-3">
                    {contract.client_email && (
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <p className="text-gray-800 flex items-center gap-2">
                          {contract.client_email}
                          <button
                            onClick={() => copyToClipboard(contract.client_email || '', 'Email copied')}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-600">Created</p>
                      <p className="text-gray-800">{new Date(contract.created_at || '').toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => setShowShareModal(true)}
                      className="w-full flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                    >
                      <Share2 className="w-4 h-4" />
                      Share Contract
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800">Contract Document</h3>
              
              {contract.contract_document_url ? (
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-6 border border-blue-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-blue-600 rounded-lg">
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800">Contract Document</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {contract.contract_document_url.split('/').pop() || 'Contract File'}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          Uploaded: {new Date(contract.updated_at || '').toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <a
                      href={contract.contract_document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                    >
                      <Eye className="w-4 h-4" />
                      View Document
                    </a>
                    <button
                      onClick={() => downloadFile(contract.contract_document_url || '', 'contract')}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                    <button
                      onClick={() => setShowShareModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition"
                    >
                      <Share2 className="w-4 h-4" />
                      Share
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-8 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg text-center">
                  <Paperclip className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h4 className="text-lg font-semibold text-gray-700 mb-2">No Contract Document</h4>
                  <p className="text-gray-600 mb-4">Upload the signed contract document for reference</p>
                </div>
              )}
            </div>
          )}

          {/* Attachments Tab */}
          {activeTab === 'attachments' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">Attachments ({attachments.length})</h3>
              </div>

              {attachments.length > 0 ? (
                <div className="space-y-3">
                  {attachments.map(attachment => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="p-2 bg-gray-200 rounded">
                          <Paperclip className="w-5 h-5 text-gray-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-800 truncate">{attachment.name}</h4>
                          <p className="text-xs text-gray-500">
                            {attachment.size ? `${(attachment.size / 1024).toFixed(2)} KB` : 'Unknown size'} • 
                            {new Date(attachment.created_at || '').toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-600 hover:text-blue-600 transition"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => downloadFile(attachment.url, attachment.name)}
                          className="p-2 text-gray-600 hover:text-green-600 transition"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAttachment(attachment.id)}
                          className="p-2 text-gray-600 hover:text-red-600 transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg text-center">
                  <Paperclip className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h4 className="text-lg font-semibold text-gray-700 mb-2">No Attachments</h4>
                  <p className="text-gray-600 mb-4">No additional attachments have been added to this contract</p>
                </div>
              )}
            </div>
          )}

          {/* Comments Tab */}
          {activeTab === 'comments' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800">Comments & Notes</h3>

              {/* Add Comment Form */}
              <form onSubmit={handleAddComment} className="space-y-3">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a note or comment about this contract..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || submittingComment}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                  {submittingComment ? 'Posting...' : 'Post Comment'}
                </button>
              </form>

              {/* Comments List */}
              <div className="space-y-4">
                {comments.length > 0 ? (
                  comments.map(comment => (
                    <div key={comment.id} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-gray-800">{comment.author}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(comment.created_at || '').toLocaleString()}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-gray-700">{comment.content}</p>
                    </div>
                  ))
                ) : (
                  <div className="p-8 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg text-center">
                    <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600">No comments yet. Be the first to add a note!</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Share Contract</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="recipient@example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (shareEmail) {
                      // In production, integrate with email service
                      window.location.href = `mailto:${shareEmail}?subject=Contract: ${contract.contract_number}&body=Please review the contract document attached.`;
                      setShowShareModal(false);
                      setShareEmail('');
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50"
                  disabled={!shareEmail}
                >
                  <Mail className="w-4 h-4" />
                  Send Email
                </button>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-gray-600 mb-2">Or copy link:</p>
                <button
                  onClick={() => copyToClipboard(window.location.href, 'Link copied!')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition"
                >
                  <Copy className="w-4 h-4" />
                  {copyFeedback === 'Link copied!' ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
