import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  Download, Share2, Eye, FileText, Paperclip, MessageSquare, History,
  ChevronLeft, Loader, AlertCircle, CheckCircle, Plus, Trash2, Mail,
  FileDown, ExternalLink, Lock, Clock, User, Calendar, DollarSign,
  Folder, Settings, Edit2, X
} from 'lucide-react';

interface Contract {
  id: string;
  contract_number: string;
  client_name: string;
  client_contact_person?: string;
  client_email?: string;
  contract_amount: number;
  currency_code: string;
  contract_start_date: string;
  contract_end_date: string;
  status: string;
  contract_document_url?: string;
  created_at?: string;
  updated_at?: string;
}

interface Milestone {
  id: string;
  milestone_number: number;
  milestone_name: string;
  percentage_of_contract: number;
  amount_ugx: number;
  due_date: string;
  status: string;
}

interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
}

interface Comment {
  id: string;
  content: string;
  author: string;
  createdAt: string;
  avatar?: string;
}

export default function ContractDetails() {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();
  const [contract, setContract] = useState<Contract | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'milestones' | 'comments' | 'activity'>('overview');
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [newComment, setNewComment] = useState('');
  const [documentPreviewUrl, setDocumentPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchContractDetails();
  }, [contractId]);

  const fetchContractDetails = async () => {
    if (!contractId) return;

    try {
      setLoading(true);
      // Fetch contract
      const { data: contractData, error: contractError } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', contractId)
        .single();

      if (contractError) throw contractError;
      setContract(contractData);

      // Fetch milestones
      const { data: milestonesData, error: milestonesError } = await supabase
        .from('contract_milestones')
        .select('*')
        .eq('contract_id', contractId)
        .order('milestone_number', { ascending: true });

      if (milestonesError) throw milestonesError;
      setMilestones(milestonesData || []);

      // Fetch attachments (from a hypothetical contract_attachments table)
      const { data: attachmentsData } = await supabase
        .from('contract_attachments')
        .select('*')
        .eq('contract_id', contractId)
        .order('created_at', { ascending: false });

      setAttachments(attachmentsData || []);

      // Fetch comments
      const { data: commentsData } = await supabase
        .from('contract_comments')
        .select('*')
        .eq('contract_id', contractId)
        .order('created_at', { ascending: false });

      setComments(commentsData || []);

      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch contract details');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDocument = () => {
    if (!contract?.contract_document_url) return;
    
    const link = document.createElement('a');
    link.href = contract.contract_document_url;
    link.download = `${contract.contract_number}-document`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleViewDocument = () => {
    if (contract?.contract_document_url) {
      setDocumentPreviewUrl(contract.contract_document_url);
    }
  };

  const handleShareDocument = async () => {
    if (!shareEmail || !contract) return;

    try {
      // Send email with document link
      // This would typically call an edge function to send email
      alert(`Document would be shared with ${shareEmail}`);
      setShareEmail('');
      setShowShareModal(false);
    } catch (err) {
      console.error('Error sharing document:', err);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !contractId) return;

    try {
      const { error } = await supabase
        .from('contract_comments')
        .insert({
          contract_id: contractId,
          content: newComment,
          author: 'Current User', // Would come from auth context
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      setNewComment('');
      fetchContractDetails();
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <AlertCircle className="w-5 h-5 text-red-600 inline mr-2" />
        Contract not found
      </div>
    );
  }

  const progressPercentage = (milestones.filter(m => m.status === 'invoiced').length / milestones.length) * 100 || 0;
  const daysUntilExpiry = contract.contract_end_date 
    ? Math.ceil((new Date(contract.contract_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/contracts')}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{contract.contract_number}</h1>
              <p className="text-sm text-gray-600">{contract.client_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              contract.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-6 flex gap-8 border-t border-gray-200">
          {['overview', 'documents', 'milestones', 'comments', 'activity'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-4 font-medium text-sm border-b-2 transition ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Contract Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Key Details Card */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Contract Details</h2>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Contract Amount</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {contract.currency_code} {contract.contract_amount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Contract Duration</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {new Date(contract.contract_start_date).toLocaleDateString()} - {new Date(contract.contract_end_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <hr className="my-6" />

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-xs text-gray-600 uppercase tracking-wide">Contact Person</p>
                      <p className="text-sm font-medium text-gray-900">{contract.client_contact_person || 'Not specified'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-xs text-gray-600 uppercase tracking-wide">Email</p>
                      <p className="text-sm font-medium text-gray-900 break-all">{contract.client_email || 'Not specified'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-xs text-gray-600 uppercase tracking-wide">Created</p>
                      <p className="text-sm font-medium text-gray-900">
                        {contract.created_at ? new Date(contract.created_at).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-xs text-gray-600 uppercase tracking-wide">Days Until Expiry</p>
                      <p className={`text-sm font-medium ${daysUntilExpiry && daysUntilExpiry < 30 ? 'text-red-600' : 'text-gray-900'}`}>
                        {daysUntilExpiry ? `${daysUntilExpiry} days` : 'Expired'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Card */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Milestone Progress</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Overall Completion</span>
                      <span className="text-sm font-semibold text-blue-600">{Math.round(progressPercentage)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-gray-600">Total Milestones</p>
                      <p className="text-lg font-bold text-blue-600">{milestones.length}</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-gray-600">Completed</p>
                      <p className="text-lg font-bold text-green-600">{milestones.filter(m => m.status === 'invoiced').length}</p>
                    </div>
                    <div className="bg-amber-50 p-3 rounded-lg">
                      <p className="text-gray-600">Pending</p>
                      <p className="text-lg font-bold text-amber-600">{milestones.filter(m => m.status === 'pending').length}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Quick Actions */}
            <div className="space-y-4">
              {contract.contract_document_url && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Contract Document</h3>
                  <div className="space-y-2">
                    <button
                      onClick={handleViewDocument}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium rounded-lg transition"
                    >
                      <Eye className="w-4 h-4" />
                      View Document
                    </button>
                    <button
                      onClick={handleDownloadDocument}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                    <button
                      onClick={() => setShowShareModal(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition"
                    >
                      <Share2 className="w-4 h-4" />
                      Share
                    </button>
                  </div>
                </div>
              )}

              {/* Attachments Summary */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Paperclip className="w-4 h-4" />
                  Attachments
                </h3>
                <p className="text-sm text-gray-600">{attachments.length} files</p>
              </div>
            </div>
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div className="space-y-6">
            {/* Main Contract Document */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Folder className="w-5 h-5" />
                Contract Documents & Records
              </h2>

              {/* Primary Document */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Primary Contract Document</h3>
                {contract.contract_document_url ? (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <FileText className="w-10 h-10 text-blue-600 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-gray-900">
                            {contract.contract_number}-Document.docx
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            Uploaded on {contract.created_at ? new Date(contract.created_at).toLocaleDateString() : 'N/A'}
                          </p>
                          <p className="text-xs text-gray-600">Status: <span className="text-green-600 font-medium">Verified</span></p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleViewDocument}
                          className="p-2 hover:bg-gray-200 rounded-lg transition"
                          title="View"
                        >
                          <Eye className="w-4 h-4 text-gray-700" />
                        </button>
                        <button
                          onClick={handleDownloadDocument}
                          className="p-2 hover:bg-gray-200 rounded-lg transition"
                          title="Download"
                        >
                          <Download className="w-4 h-4 text-gray-700" />
                        </button>
                        <button
                          onClick={() => setShowShareModal(true)}
                          className="p-2 hover:bg-gray-200 rounded-lg transition"
                          title="Share"
                        >
                          <Share2 className="w-4 h-4 text-gray-700" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4 border border-dashed border-gray-300 text-center">
                    <FileText className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">No contract document uploaded</p>
                  </div>
                )}
              </div>

              {/* Attachments Section */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Attachments</h3>
                {attachments.length > 0 ? (
                  <div className="space-y-2">
                    {attachments.map(attachment => (
                      <div key={attachment.id} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Paperclip className="w-4 h-4 text-gray-500" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{attachment.name}</p>
                            <p className="text-xs text-gray-600">{attachment.uploadedBy} • {new Date(attachment.uploadedAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button className="p-1 hover:bg-gray-200 rounded transition">
                            <Download className="w-4 h-4 text-gray-600" />
                          </button>
                          <button className="p-1 hover:bg-gray-200 rounded transition">
                            <Trash2 className="w-4 h-4 text-gray-600" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4 border border-dashed border-gray-300 text-center">
                    <Paperclip className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">No attachments yet</p>
                    <button className="mt-2 text-xs text-blue-600 hover:underline">Add Attachment</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Milestones Tab */}
        {activeTab === 'milestones' && (
          <div className="space-y-4">
            {milestones.length > 0 ? (
              milestones.map(milestone => (
                <div key={milestone.id} className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Milestone {milestone.milestone_number}: {milestone.milestone_name}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">{milestone.percentage_of_contract}% of contract</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      milestone.status === 'invoiced' ? 'bg-green-100 text-green-800' :
                      milestone.status === 'photo_verified' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {milestone.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Amount</p>
                      <p className="font-semibold text-gray-900">{milestone.currency_code} {milestone.amount_ugx.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Due Date</p>
                      <p className="font-semibold text-gray-900">{new Date(milestone.due_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Status</p>
                      <p className="font-semibold text-gray-900 capitalize">{milestone.status}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                <p className="text-gray-600">No milestones created yet</p>
              </div>
            )}
          </div>
        )}

        {/* Comments Tab */}
        {activeTab === 'comments' && (
          <div className="space-y-6">
            {/* Add Comment */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Note / Comment</h2>
              <div className="space-y-3">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a note about this contract..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                  rows={4}
                />
                <button
                  onClick={handleAddComment}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  Post Comment
                </button>
              </div>
            </div>

            {/* Comments List */}
            <div className="space-y-4">
              {comments.length > 0 ? (
                comments.map(comment => (
                  <div key={comment.id} className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-semibold text-gray-900">{comment.author}</p>
                      <p className="text-xs text-gray-600">{new Date(comment.createdAt).toLocaleString()}</p>
                    </div>
                    <p className="text-gray-700">{comment.content}</p>
                  </div>
                ))
              ) : (
                <div className="bg-gray-50 rounded-lg p-6 text-center border border-dashed border-gray-300">
                  <MessageSquare className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">No comments yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <History className="w-5 h-5" />
              Activity Log
            </h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div className="flex gap-4 pb-4 border-b border-gray-200">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-900">Contract created</p>
                  <p className="text-sm text-gray-600">{contract.created_at ? new Date(contract.created_at).toLocaleString() : 'N/A'}</p>
                </div>
              </div>
              {contract.contract_document_url && (
                <div className="flex gap-4 pb-4 border-b border-gray-200">
                  <div className="w-2 h-2 bg-green-600 rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">Contract document uploaded</p>
                    <p className="text-sm text-gray-600">{contract.created_at ? new Date(contract.created_at).toLocaleString() : 'N/A'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Document Preview Modal */}
      {documentPreviewUrl && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Document Preview</h3>
              <button
                onClick={() => setDocumentPreviewUrl(null)}
                className="p-1 hover:bg-gray-100 rounded transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-gray-50">
              <iframe
                src={documentPreviewUrl}
                className="w-full h-full"
                title="Document Preview"
              />
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Share Document</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1 hover:bg-gray-100 rounded transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="recipient@example.com"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowShareModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleShareDocument}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
                >
                  Share
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
