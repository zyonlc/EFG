import { useState, useRef } from 'react';
import { useVideoUpload } from '../hooks/useVideoUpload';
import { supabase } from '../lib/supabase';
import { Upload, X, Film, Loader, Check, AlertCircle } from 'lucide-react';
import VideoFrameSelector from './VideoFrameSelector';

interface ProjectMilestoneVideoUploadProps {
  userId: string;
  userName: string;
  milestoneId: string;
  milestoneNumber: number;
  milestoneName: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

export default function ProjectMilestoneVideoUpload({
  userId,
  userName,
  milestoneId,
  milestoneNumber,
  milestoneName,
  onSuccess,
  onCancel
}: ProjectMilestoneVideoUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSavingContent, setIsSavingContent] = useState(false);
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

  const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];

  const isValidVideoFile = (file: File): boolean => {
    return ALLOWED_VIDEO_TYPES.includes(file.type) && file.size <= 500 * 1024 * 1024;
  };

  const handleFileSelect = (file: File | null) => {
    if (!file) return;

    if (!isValidVideoFile(file)) {
      if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
        setLocalError('Video type not supported. Please upload MP4, WebM, MOV, or AVI.');
      } else {
        setLocalError('Video must be smaller than 500MB');
      }
      return;
    }

    setVideoFile(file);
    setLocalError(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

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

  const handleStartUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setLocalError('Title is required');
      return;
    }

    if (!videoFile) {
      setLocalError('Please select a video file');
      return;
    }

    setLocalError(null);
    await uploadVideo(videoFile, userId);
  };

  const uploadCustomThumbnail = async (frameDataUrl: string): Promise<string> => {
    try {
      const response = await fetch(frameDataUrl);
      const blob = await response.blob();
      const timestamp = Date.now();
      const filename = `project_milestone_thumbnails/${userId}/${timestamp}-thumbnail.jpg`;

      const { data, error } = await supabase.storage
        .from('project_evidence')
        .upload(filename, blob, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('project_evidence')
        .getPublicUrl(filename);

      return publicUrlData.publicUrl;
    } catch (err) {
      throw new Error(`Failed to upload thumbnail: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleSaveContent = async () => {
    if (!title || !playbackId) {
      setLocalError('Missing required information');
      return;
    }

    setIsSavingContent(true);
    setLocalError(null);

    try {
      let thumbnailUrl = `https://image.mux.com/${playbackId}/thumbnail.jpg`;

      if (selectedFrameDataUrl) {
        thumbnailUrl = await uploadCustomThumbnail(selectedFrameDataUrl);
      }

      // Create a project_milestone_videos entry
      const { error: insertError } = await supabase
        .from('project_milestone_videos')
        .insert([
          {
            milestone_id: milestoneId,
            title: title.trim(),
            description: description.trim() || null,
            url: `https://stream.mux.com/${playbackId}.m3u8`,
            thumbnail_url: thumbnailUrl,
            playback_id: playbackId,
            timestamp: selectedFrameTimestamp || Date.now(),
            uploaded_by: userId,
          },
        ]);

      if (insertError) throw insertError;

      setTitle('');
      setDescription('');
      setVideoFile(null);
      setSelectedFrameDataUrl(null);
      setSelectedFrameTimestamp(null);
      resetState();
      setIsOpen(false);
      onSuccess();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to save video');
    } finally {
      setIsSavingContent(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setVideoFile(null);
    setTitle('');
    setDescription('');
    setLocalError(null);
    setSelectedFrameDataUrl(null);
    setSelectedFrameTimestamp(null);
    resetState();
    onCancel?.();
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
        title="Upload video evidence for this milestone"
      >
        <Film className="w-4 h-4" />
        <span>Upload Video</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Upload Milestone Evidence</h3>
            <p className="text-sm text-slate-500 mt-1">Milestone {milestoneNumber}: {milestoneName}</p>
          </div>
          <button
            onClick={handleClose}
            disabled={isUploading || isProcessing || isSavingContent}
            className="text-slate-400 hover:text-slate-600 disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleStartUpload} className="p-6 space-y-5">
          {/* Video File Selection */}
          {!isReady && (
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
                    isUploading || isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-500 hover:bg-blue-50'
                  } ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300'}`}
                >
                  <Film className="w-8 h-8 text-slate-400" />
                  <p className="text-sm font-medium text-slate-600">
                    {videoFile ? videoFile.name : 'Drag your video here or click to browse'}
                  </p>
                  <p className="text-xs text-slate-500">MP4, WebM, MOV, AVI up to 500MB</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Foundation Work Complete"
                    disabled={isUploading || isProcessing}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this video demonstrates..."
                  disabled={isUploading || isProcessing}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 resize-none"
                  rows={3}
                />
              </div>

              {(localError || uploadError) && (
                <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{localError || uploadError}</p>
                </div>
              )}

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
                  type="submit"
                  disabled={!videoFile || !title.trim()}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Upload Video
                </button>
              )}
            </>
          )}

          {/* After Video is Ready */}
          {isReady && (
            <>
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                <Check className="w-5 h-5 text-green-600" />
                <p className="text-sm text-green-700">Video uploaded successfully!</p>
              </div>

              {/* Frame Selection */}
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
                  type="button"
                  onClick={() => {
                    resetState();
                    setVideoFile(null);
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-medium"
                >
                  Upload Different
                </button>
                <button
                  type="button"
                  onClick={handleSaveContent}
                  disabled={isSavingContent}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium disabled:opacity-50"
                >
                  {isSavingContent ? 'Saving...' : 'Save Video'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
