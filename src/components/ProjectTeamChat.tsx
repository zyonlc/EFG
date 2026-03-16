import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useProjectTeamChat } from '../hooks/useProjectTeamChat';
import { Send, Loader, AlertCircle, Upload, File, X } from 'lucide-react';
import { uploadToB2 } from '../lib/b2Upload';

interface ProjectTeamChatProps {
  contractId: string;
  contractNumber: string;
  onClose?: () => void;
}

export default function ProjectTeamChat({
  contractId,
  contractNumber,
  onClose,
}: ProjectTeamChatProps) {
  const { user } = useAuth();
  const { messages, loading, error, sendMessage } = useProjectTeamChat(contractId, user?.id || '');
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!messageText.trim() && !selectedFile) {
      setLocalError('Message or file is required');
      return;
    }

    setIsSending(true);
    setIsUploadingFile(!!selectedFile);
    setLocalError(null);

    try {
      let attachmentUrl: string | undefined;
      let attachmentType: string | undefined;

      // Upload file to B2 if selected
      if (selectedFile) {
        const { publicUrl, error: uploadError } = await uploadToB2(
          selectedFile,
          `project-team-chat/${contractId}`
        );

        if (uploadError) throw new Error(uploadError);

        attachmentUrl = publicUrl;

        // Determine attachment type based on file type
        if (selectedFile.type.startsWith('image/')) {
          attachmentType = 'image';
        } else if (selectedFile.type.startsWith('video/')) {
          attachmentType = 'video';
        } else if (selectedFile.type.startsWith('audio/')) {
          attachmentType = 'audio';
        } else {
          attachmentType = 'document';
        }
      }

      await sendMessage(messageText.trim() || `[${selectedFile?.name}]`, attachmentUrl, attachmentType);
      setMessageText('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to send message';
      setLocalError(errorMsg);
    } finally {
      setIsSending(false);
      setIsUploadingFile(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.round((now.getTime() - date.getTime()) / (1000 * 60));
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.round(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Team Chat</h2>
            <p className="text-sm text-slate-600">Contract #{contractNumber}</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition"
            >
              ✕
            </button>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <p className="text-slate-600 mb-2">No messages yet</p>
                <p className="text-sm text-slate-500">Start a conversation with your team</p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => {
                const isCurrentUser = message.sender_id === user?.id;

                return (
                  <div
                    key={message.id}
                    className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs px-4 py-3 rounded-lg ${
                        isCurrentUser
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-slate-900 border border-slate-200'
                      }`}
                    >
                      {!isCurrentUser && (
                        <p className={`text-xs font-medium mb-1 ${
                          isCurrentUser ? 'text-blue-100' : 'text-slate-500'
                        }`}>
                          {message.sender_name}
                        </p>
                      )}
                      <p className="text-sm">{message.message}</p>

                      {/* Display Attachment */}
                      {message.attachment_url && (
                        <div className="mt-2">
                          {message.attachment_type === 'image' && (
                            <img
                              src={message.attachment_url}
                              alt="Attachment"
                              className="max-w-xs rounded"
                            />
                          )}
                          {message.attachment_type === 'video' && (
                            <video
                              src={message.attachment_url}
                              controls
                              className="max-w-xs rounded"
                            />
                          )}
                          {message.attachment_type === 'document' && (
                            <a
                              href={message.attachment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`inline-flex items-center gap-2 px-3 py-2 rounded text-sm font-medium ${
                                isCurrentUser
                                  ? 'bg-blue-500 hover:bg-blue-400'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                              }`}
                            >
                              <File className="w-4 h-4" />
                              View Document
                            </a>
                          )}
                        </div>
                      )}

                      <p
                        className={`text-xs mt-1 ${
                          isCurrentUser ? 'text-blue-100' : 'text-slate-500'
                        }`}
                      >
                        {formatTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}

          {error && (
            <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Input Area */}
        <form onSubmit={handleSendMessage} className="p-6 border-t border-slate-200 bg-white">
          {localError && (
            <div className="mb-3 flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{localError}</p>
            </div>
          )}

          {/* File Preview */}
          {selectedFile && (
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <File className="w-4 h-4 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-900">{selectedFile.name}</p>
                  <p className="text-xs text-blue-700">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                disabled={isSending}
                className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex gap-3">
            {/* File Upload Button */}
            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                disabled={isSending}
                className="hidden"
                accept="*/*"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSending}
                className="px-3 py-2 text-slate-600 hover:text-slate-900 disabled:opacity-50 transition"
                title="Upload file (images, documents, videos, etc.)"
              >
                <Upload className="w-5 h-5" />
              </button>
            </div>

            {/* Message Input */}
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type your message..."
              disabled={isSending}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={isSending || (!messageText.trim() && !selectedFile)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
            >
              {isUploadingFile ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span className="hidden sm:inline">Uploading...</span>
                </>
              ) : isSending ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
