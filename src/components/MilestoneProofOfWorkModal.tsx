import { useState, useRef } from 'react';
import { useVideoUpload } from '../hooks/useVideoUpload';
import { uploadToB2 } from '../lib/b2Upload';
import { supabase } from '../lib/supabase';
import { X, Upload, Loader, AlertCircle, CheckCircle, Film, Image, FileText } from 'lucide-react';
import VideoFrameSelector from './VideoFrameSelector';

interface MilestoneProofOfWorkModalProps {
  contractId: string;
  milestoneId: string;
  milestoneNumber: number;
  milestoneName: string;
  userId: string;
  userName: string;
  onSuccess: () => void;
  onClose: () => void;
}

type UploadType = 'video' | 'photo' | 'document' | null;

export default function MilestoneProofOfWorkModal({
  contractId,
  milestoneId,
  milestoneNumber,
  milestoneName,
  userId,
  userName,
  onSuccess,
  onClose,
}: MilestoneProofOfWorkModalProps) {
  const [activeTab, setActiveTab] = useState<UploadType>('video');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFrameDataUrl, setSelectedFrameDataUrl] = useState<string | null>(null);
  const [selectedFrameTimestamp, setSelectedFrameTimestamp] = useState<number | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    isUploading,
    isProcessing,
    isReady,
    progress,
    error: uploadError,
    playbackId,
    uploadVideo,
    resetState,
  } = useVideoUpload();

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleFileSelect = (file: File) => {
    setLocalError(null);

    if (activeTab === 'video') {
      const videoTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
      if (!videoTypes.includes(file.type) || file.size > 500 * 1024 * 1024) {
        setLocalError('Video must be MP4, WebM, MOV, or AVI and under 500MB');
        return;
      }
    } else if (activeTab === 'photo') {
      const photoTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!photoTypes.includes(file.type) || file.size > 50 * 1024 * 1024) {
        setLocalError('Photo must be JPEG, PNG, or WebP and under 50MB');
        return;
      }
    } else if (activeTab === 'document') {
      const docTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!docTypes.includes(file.type) || file.size > 100 * 1024 * 1024) {
        setLocalError('Document must be PDF or Word and under 100MB');
        return;
      }
    }

    setSelectedFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const updateMilestoneAndCheckCompletion = async (mId: string, cId: string) => {
    // Update milestone status to 'completed'
    const { error: updateError } = await supabase
      .from('contract_milestones')
      .update({ status: 'completed' })
      .eq('id', mId);

    if (updateError) {
      console.error('Warning: Failed to update milestone status:', updateError);
      return; // Don't throw - the upload succeeded even if status update failed
    }

    // Check if all milestones are now completed
    const { data: allMilestones, error: checkError } = await supabase
      .from('contract_milestones')
      .select('id, status')
      .eq('contract_id', cId);

    if (!checkError && allMilestones && allMilestones.every(m => m.status === 'completed')) {
      // All milestones completed - mark contract as completed
      const { error: contractError } = await supabase
        .from('contracts')
        .update({ status: 'completed' })
        .eq('id', cId);

      if (contractError) {
        console.error('Warning: Failed to mark contract as completed:', contractError);
      }
    }
  };

  const handleUploadVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !description.trim()) {
      setLocalError('File and description are required');
      return;
    }

    setLocalError(null);
    await uploadVideo(selectedFile, userId);
  };

  const uploadCustomThumbnail = async (frameDataUrl: string): Promise<string> => {
    try {
      const response = await fetch(frameDataUrl);
      const blob = await response.blob();
      const timestamp = Date.now();
      const filename = `milestone_proof/${userId}/${timestamp}-thumbnail.jpg`;

      const { data, error } = await supabase.storage
        .from('project_evidence')
        .upload(filename, blob, { contentType: 'image/jpeg', upsert: false });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('project_evidence')
        .getPublicUrl(filename);

      return publicUrlData.publicUrl;
    } catch (err) {
      throw new Error(`Failed to upload thumbnail: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleSaveVideo = async () => {
    if (!playbackId || !description.trim()) {
      setLocalError('Missing required information');
      return;
    }

    setIsSaving(true);
    setLocalError(null);

    try {
      let thumbnailUrl = `https://image.mux.com/${playbackId}/thumbnail.jpg`;

      if (selectedFrameDataUrl) {
        thumbnailUrl = await uploadCustomThumbnail(selectedFrameDataUrl);
      }

      const { error: insertError } = await supabase
        .from('project_milestone_videos')
        .insert([
          {
            milestone_id: milestoneId,
            title: `Proof of work - Milestone ${milestoneNumber}`,
            description: description.trim(),
            url: `https://stream.mux.com/${playbackId}.m3u8`,
            thumbnail_url: thumbnailUrl,
            playback_id: playbackId,
            timestamp: selectedFrameTimestamp || Date.now(),
            uploaded_by: userId,
          },
        ]);

      if (insertError) throw insertError;

      // Update milestone status and check if contract is complete
      await updateMilestoneAndCheckCompletion(milestoneId, contractId);

      setDescription('');
      resetState();
      setSelectedFile(null);
      setSelectedFrameDataUrl(null);
      setSelectedFrameTimestamp(null);
      onSuccess();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to save video');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePhoto = async () => {
    if (!selectedFile || !description.trim()) {
      setLocalError('File and description are required');
      return;
    }

    setIsSaving(true);
    setLocalError(null);

    try {
      const { publicUrl, error: uploadError } = await uploadToB2(
        selectedFile,
        `milestone_proof/${userId}`
      );

      if (uploadError) throw new Error(uploadError);

      const { error: insertError } = await supabase
        .from('project_milestone_videos')
        .insert([
          {
            milestone_id: milestoneId,
            title: `Photo proof - Milestone ${milestoneNumber}`,
            description: description.trim(),
            url: publicUrl,
            thumbnail_url: publicUrl,
            playback_id: `photo-${Date.now()}`,
            timestamp: Date.now(),
            uploaded_by: userId,
          },
        ]);

      if (insertError) throw insertError;

      // Update milestone status and check if contract is complete
      await updateMilestoneAndCheckCompletion(milestoneId, contractId);

      setDescription('');
      setSelectedFile(null);
      onSuccess();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to save photo');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDocument = async () => {
    if (!selectedFile || !description.trim()) {
      setLocalError('File and description are required');
      return;
    }

    setIsSaving(true);
    setLocalError(null);

    try {
      const { publicUrl, error: uploadError } = await uploadToB2(
        selectedFile,
        `milestone_proof/${userId}`
      );

      if (uploadError) throw new Error(uploadError);

      const { error: insertError } = await supabase
        .from('project_milestone_videos')
        .insert([
          {
            milestone_id: milestoneId,
            title: `Document - Milestone ${milestoneNumber}: ${selectedFile.name}`,
            description: description.trim(),
            url: publicUrl,
            thumbnail_url: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%234f46e5'%3E%3Cpath d='M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z'/%3E%3C/svg%3E`,
            playback_id: `doc-${Date.now()}`,
            timestamp: Date.now(),
            uploaded_by: userId,
          },
        ]);

      if (insertError) throw insertError;

      // Update milestone status and check if contract is complete
      await updateMilestoneAndCheckCompletion(milestoneId, contractId);

      setDescription('');
      setSelectedFile(null);
      onSuccess();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to save document');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Proof of Work</h2>
            <p className="text-sm text-slate-600">Milestone {milestoneNumber}: {milestoneName}</p>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading || isProcessing || isSaving}
            className="text-slate-400 hover:text-slate-600 disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Upload Type Tabs */}
          <div className="flex gap-3 border-b border-slate-200 pb-3">
            <button
              onClick={() => {
                setActiveTab('video');
                setSelectedFile(null);
                setSelectedFrameDataUrl(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                activeTab === 'video'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Film className="w-5 h-5" />
              Video
            </button>
            <button
              onClick={() => {
                setActiveTab('photo');
                setSelectedFile(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                activeTab === 'photo'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Image className="w-5 h-5" />
              Photo
            </button>
            <button
              onClick={() => {
                setActiveTab('document');
                setSelectedFile(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                activeTab === 'document'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-5 h-5" />
              Document
            </button>
          </div>

          {/* Error Message */}
          {(localError || uploadError) && (
            <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{localError || uploadError}</p>
            </div>
          )}

          {/* Video Upload */}
          {activeTab === 'video' && !isReady && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Video File *
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleInputChange}
                  accept="video/*"
                  className="hidden"
                  disabled={isUploading || isProcessing}
                />
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full px-4 py-8 border-2 border-dashed rounded-lg transition flex flex-col items-center justify-center gap-2 ${
                    isUploading || isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-500'
                  } ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300'}`}
                >
                  <Film className="w-8 h-8 text-slate-400" />
                  <p className="text-sm font-medium text-slate-600">
                    {selectedFile ? selectedFile.name : 'Drag video here or click'}
                  </p>
                  <p className="text-xs text-slate-500">MP4, WebM, MOV, AVI up to 500MB</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this video shows..."
                  disabled={isUploading || isProcessing}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 resize-none"
                  rows={4}
                />
              </div>

              {isUploading || isProcessing ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Loader className="w-5 h-5 text-blue-600 animate-spin" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-700">
                        {isUploading ? 'Uploading...' : 'Processing video...'}
                      </p>
                      <div className="mt-2 w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleUploadVideo}
                  disabled={!selectedFile || !description.trim()}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Upload & Process Video
                </button>
              )}
            </>
          )}

          {/* Video Ready State */}
          {activeTab === 'video' && isReady && (
            <>
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="text-sm text-green-700">Video uploaded successfully!</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Select Thumbnail Frame (Optional)
                </label>
                <VideoFrameSelector
                  playbackId={playbackId}
                  onFrameSelect={setSelectedFrameDataUrl}
                  onTimestampSelect={setSelectedFrameTimestamp}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    resetState();
                    setSelectedFile(null);
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-medium"
                >
                  Upload Different
                </button>
                <button
                  onClick={handleSaveVideo}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-medium disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save & Complete Milestone'}
                </button>
              </div>
            </>
          )}

          {/* Photo Upload */}
          {activeTab === 'photo' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Photo File *
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleInputChange}
                  accept="image/*"
                  className="hidden"
                  disabled={isSaving}
                />
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full px-4 py-8 border-2 border-dashed rounded-lg transition flex flex-col items-center justify-center gap-2 cursor-pointer ${
                    dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-500'
                  }`}
                >
                  <Image className="w-8 h-8 text-slate-400" />
                  <p className="text-sm font-medium text-slate-600">
                    {selectedFile ? selectedFile.name : 'Drag photo here or click'}
                  </p>
                  <p className="text-xs text-slate-500">JPEG, PNG, WebP up to 50MB</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this photo shows..."
                  disabled={isSaving}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 resize-none"
                  rows={4}
                />
              </div>

              <button
                onClick={handleSavePhoto}
                disabled={!selectedFile || !description.trim() || isSaving}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                {isSaving ? 'Uploading...' : 'Upload Photo & Complete Milestone'}
              </button>
            </>
          )}

          {/* Document Upload */}
          {activeTab === 'document' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Document File * (PDF, Word)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleInputChange}
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  disabled={isSaving}
                />
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full px-4 py-8 border-2 border-dashed rounded-lg transition flex flex-col items-center justify-center gap-2 cursor-pointer ${
                    dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-500'
                  }`}
                >
                  <FileText className="w-8 h-8 text-slate-400" />
                  <p className="text-sm font-medium text-slate-600">
                    {selectedFile ? selectedFile.name : 'Drag document here or click'}
                  </p>
                  <p className="text-xs text-slate-500">PDF or Word up to 100MB</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this document contains..."
                  disabled={isSaving}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 resize-none"
                  rows={4}
                />
              </div>

              <button
                onClick={handleSaveDocument}
                disabled={!selectedFile || !description.trim() || isSaving}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                {isSaving ? 'Uploading...' : 'Upload Document & Complete Milestone'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
