import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Camera } from 'lucide-react';
import PhotoLockUploadForm from './PhotoLockUploadForm';
import { supabase } from '../lib/supabase';

interface ProjectsPhotoLockUploadModalProps {
  milestoneId: string;
  milestoneNumber: number;
  milestoneName: string;
  contractorId: string;
  onSuccess: () => void;
  onClose: () => void;
}

interface FieldVerification {
  id: string;
  task_name: string;
  task_description?: string;
  photo_url: string;
  photo_upload_timestamp: string;
  verification_status: string;
  gps_latitude?: number;
  gps_longitude?: number;
}

export default function ProjectsPhotoLockUploadModal({
  milestoneId,
  milestoneNumber,
  milestoneName,
  contractorId,
  onSuccess,
  onClose,
}: ProjectsPhotoLockUploadModalProps) {
  const [submittedVerification, setSubmittedVerification] = useState<FieldVerification | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(true);

  useEffect(() => {
    // Fetch latest verification for this milestone
    fetchLatestVerification();
  }, [milestoneId]);

  const fetchLatestVerification = async () => {
    try {
      const { data } = await supabase
        .from('field_verification')
        .select('*')
        .eq('milestone_id', milestoneId)
        .order('photo_upload_timestamp', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        setSubmittedVerification(data[0]);
        setShowUploadForm(false);
      }
    } catch (err) {
      console.error('Failed to fetch verification:', err);
    }
  };

  const handleUploadSuccess = async () => {
    // Fetch the newly uploaded verification
    await fetchLatestVerification();
    setShowUploadForm(false);
    onSuccess();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto pt-24">
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-slate-200 bg-slate-50">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Upload Proof of Work</h2>
              <p className="text-slate-600 text-sm mt-1">
                Milestone {milestoneNumber}: {milestoneName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-200 rounded-lg transition"
            >
              <X className="w-6 h-6 text-slate-600" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {showUploadForm ? (
              <PhotoLockUploadForm
                milestoneId={milestoneId}
                contractorId={contractorId}
                onSuccess={handleUploadSuccess}
              />
            ) : submittedVerification ? (
              <div className="space-y-6">
                {/* Success Summary */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-green-800">Proof of Work Submitted</p>
                      <p className="text-green-700 text-sm mt-1">
                        Task: {submittedVerification.task_name}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Verification Details */}
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-slate-800 mb-2">Submission Details</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-600">Status</p>
                        <p className="font-medium text-slate-900 capitalize">
                          {submittedVerification.verification_status}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-600">Submitted</p>
                        <p className="font-medium text-slate-900">
                          {new Date(submittedVerification.photo_upload_timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Photo Preview */}
                  <div>
                    <h3 className="font-semibold text-slate-800 mb-2">Evidence</h3>
                    <a
                      href={submittedVerification.photo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                    >
                      <Camera className="w-4 h-4" />
                      View Photo
                    </a>
                  </div>

                  {/* Task Description if available */}
                  {submittedVerification.task_description && (
                    <div>
                      <h3 className="font-semibold text-slate-800 mb-2">Description</h3>
                      <p className="text-slate-700 text-sm">{submittedVerification.task_description}</p>
                    </div>
                  )}

                  {/* GPS Location if available */}
                  {submittedVerification.gps_latitude && submittedVerification.gps_longitude && (
                    <div>
                      <h3 className="font-semibold text-slate-800 mb-2">Location</h3>
                      <p className="text-slate-700 text-sm">
                        Coordinates: {submittedVerification.gps_latitude.toFixed(4)}, {submittedVerification.gps_longitude.toFixed(4)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-slate-200 flex gap-2">
                  <button
                    onClick={() => setShowUploadForm(true)}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-medium"
                  >
                    Upload Another
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 bg-slate-300 text-slate-900 py-2 rounded-lg hover:bg-slate-400 transition font-medium"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
