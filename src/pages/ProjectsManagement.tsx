import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useProjectsManagement, OngoingProject, CompletedProject } from '../hooks/useProjectsManagement';
import {
  Clock, CheckCircle, AlertCircle, Loader, MessageCircle, TrendingUp,
  Calendar, DollarSign, User, Trophy, Zap, Film
} from 'lucide-react';
import ProjectMilestoneVideoUpload from '../components/ProjectMilestoneVideoUpload';
import ProjectTeamChat from '../components/ProjectTeamChat';
import MilestoneProofOfWorkModal from '../components/MilestoneProofOfWorkModal';

export default function ProjectsManagement() {
  const { user } = useAuth();
  const { completedProjects, ongoingProjects, loading, error, refetch } = useProjectsManagement(user?.id || '');
  const [activeTab, setActiveTab] = useState<'ongoing' | 'completed'>('ongoing');
  const [selectedProject, setSelectedProject] = useState<OngoingProject | CompletedProject | null>(null);
  const [showMilestoneDetails, setShowMilestoneDetails] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showProofOfWorkModal, setShowProofOfWorkModal] = useState(false);
  const [chatContractId, setChatContractId] = useState<string>('');
  const [chatContractNumber, setChatContractNumber] = useState<string>('');
  const [selectedMilestoneForProof, setSelectedMilestoneForProof] = useState<{
    contractId: string;
    milestoneId: string;
    milestoneNumber: number;
    milestoneName: string;
  } | null>(null);

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center text-slate-600">Please sign in</div>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="text-center space-y-4">
          <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
          <p className="text-slate-600">Loading your projects...</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'UGX',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Projects</h1>
          <p className="text-slate-600 text-lg">Manage your completed and ongoing projects</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-8 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('ongoing')}
            className={`px-4 py-3 font-medium transition-colors relative ${
              activeTab === 'ongoing'
                ? 'text-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              <span>Ongoing ({ongoingProjects.length})</span>
            </div>
            {activeTab === 'ongoing' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-3 font-medium transition-colors relative ${
              activeTab === 'completed'
                ? 'text-green-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span>Completed ({completedProjects.length})</span>
            </div>
            {activeTab === 'completed' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600"></div>
            )}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Ongoing Projects Tab */}
        {activeTab === 'ongoing' && (
          <div className="space-y-6">
            {ongoingProjects.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
                <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600">No ongoing projects</p>
              </div>
            ) : (
              ongoingProjects.map((project) => (
                <div
                  key={project.id}
                  className="bg-white rounded-lg border border-slate-200 overflow-hidden hover:shadow-lg transition"
                >
                  {/* Project Header */}
                  <div className="p-6 border-b border-slate-100">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">{project.client_name}</h3>
                        <p className="text-sm text-slate-600 mt-1">Contract #{project.contract_number}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-slate-900">
                          {formatCurrency(project.contract_amount, project.currency_code)}
                        </div>
                        <p className="text-xs text-slate-600 mt-1">Contract Value</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700">Progress</span>
                        <span className="text-sm font-bold text-blue-600">{project.progress_percentage}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${project.progress_percentage}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar className="w-4 h-4" />
                        <span>Start: {formatDate(project.contract_start_date)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar className="w-4 h-4" />
                        <span>End: {formatDate(project.contract_end_date)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Milestones */}
                  <div className="p-6">
                    <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                      Milestones ({project.milestones.length})
                    </h4>
                    <div className="space-y-3">
                      {project.milestones.map((milestone, idx) => (
                        <div
                          key={milestone.id}
                          className="p-4 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition cursor-pointer"
                          onClick={() => {
                            setSelectedMilestoneForProof({
                              contractId: project.id,
                              milestoneId: milestone.id,
                              milestoneNumber: milestone.milestone_number,
                              milestoneName: milestone.milestone_name,
                            });
                            setShowProofOfWorkModal(true);
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-bold text-blue-600">
                                  #{milestone.milestone_number}
                                </span>
                                <h5 className="font-medium text-slate-900">{milestone.milestone_name}</h5>
                                <span className={`px-2 py-1 text-xs font-medium rounded ${
                                  milestone.status === 'completed'
                                    ? 'bg-green-100 text-green-700'
                                    : milestone.status === 'in_progress'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {milestone.status}
                                </span>
                              </div>
                              <p className="text-sm text-slate-600 mb-2">{milestone.description}</p>
                              <div className="flex items-center gap-4 text-sm text-slate-600">
                                <span>{milestone.percentage_of_contract}% of contract</span>
                                <span>{formatCurrency(milestone.amount_ugx, milestone.currency_code)}</span>
                                <span>Due: {formatDate(milestone.due_date)}</span>
                              </div>

                              {/* Show video count if any */}
                              {milestone.videos && milestone.videos.length > 0 && (
                                <div className="mt-3 flex items-center gap-1 text-xs text-blue-600">
                                  <Film className="w-4 h-4" />
                                  <span>{milestone.videos.length} video{milestone.videos.length !== 1 ? 's' : ''} attached</span>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              {milestone.status === 'completed' ? (
                                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                              ) : milestone.status === 'in_progress' ? (
                                <Clock className="w-6 h-6 text-blue-600 flex-shrink-0" />
                              ) : (
                                <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedMilestoneForProof({
                                    contractId: project.id,
                                    milestoneId: milestone.id,
                                    milestoneNumber: milestone.milestone_number,
                                    milestoneName: milestone.milestone_name,
                                  });
                                  setShowProofOfWorkModal(true);
                                }}
                                className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition whitespace-nowrap"
                              >
                                Upload Proof
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                    <button
                      onClick={() => {
                        setChatContractId(project.id);
                        setChatContractNumber(project.contract_number);
                        setShowChat(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Chat with Team</span>
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition font-medium">
                      <Zap className="w-4 h-4" />
                      <span>View Reports</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Completed Projects Tab */}
        {activeTab === 'completed' && (
          <div className="space-y-6">
            {completedProjects.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
                <CheckCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600">No completed projects yet</p>
              </div>
            ) : (
              completedProjects.map((project) => (
                <div
                  key={project.id}
                  className="bg-white rounded-lg border border-green-200 overflow-hidden hover:shadow-lg transition"
                >
                  {/* Project Header */}
                  <div className="p-6 border-b border-green-100 bg-gradient-to-r from-green-50 to-transparent">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Trophy className="w-6 h-6 text-green-600" />
                          <h3 className="text-xl font-bold text-slate-900">{project.client_name}</h3>
                        </div>
                        <p className="text-sm text-slate-600">Contract #{project.contract_number}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-slate-900">
                          {formatCurrency(project.contract_amount, project.currency_code)}
                        </div>
                        <p className="text-xs text-slate-600 mt-1">Contract Value</p>
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar className="w-4 h-4" />
                        <span>Started: {formatDate(project.contract_start_date)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar className="w-4 h-4" />
                        <span>Completed: {formatDate(project.completion_date)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-green-600 font-medium">
                        <CheckCircle className="w-4 h-4" />
                        <span>100% Complete</span>
                      </div>
                    </div>
                  </div>

                  {/* Project Details */}
                  <div className="p-6 grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-bold text-slate-900 mb-3">Project Summary</h4>
                      <p className="text-slate-600 text-sm leading-relaxed">
                        {project.summary || 'No summary provided'}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 mb-3">Key Achievements</h4>
                      {project.key_achievements && project.key_achievements.length > 0 ? (
                        <ul className="space-y-2">
                          {project.key_achievements.map((achievement, idx) => (
                            <li key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                              <span className="text-green-600 font-bold mt-0.5">✓</span>
                              <span>{achievement}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-slate-500 text-sm">No achievements recorded</p>
                      )}
                    </div>
                  </div>

                  {/* Rating and Testimonial */}
                  {(project.rating || project.testimonial) && (
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 space-y-3">
                      {project.rating && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-700">Client Rating:</span>
                          <div className="flex gap-1">
                            {Array(5).fill(0).map((_, i) => (
                              <span
                                key={i}
                                className={`text-lg ${i < Math.floor(project.rating || 0) ? 'text-yellow-400' : 'text-slate-300'}`}
                              >
                                ★
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {project.testimonial && (
                        <p className="text-sm text-slate-600 italic">"{project.testimonial}"</p>
                      )}
                    </div>
                  )}

                  {/* View Details */}
                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                    <button
                      onClick={() => {
                        setSelectedProject(project);
                        setShowMilestoneDetails(true);
                      }}
                      className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-medium"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Team Chat Modal */}
        {showChat && (
          <ProjectTeamChat
            contractId={chatContractId}
            contractNumber={chatContractNumber}
            onClose={() => setShowChat(false)}
          />
        )}

        {/* Proof of Work Modal */}
        {showProofOfWorkModal && selectedMilestoneForProof && (
          <MilestoneProofOfWorkModal
            contractId={selectedMilestoneForProof.contractId}
            milestoneId={selectedMilestoneForProof.milestoneId}
            milestoneNumber={selectedMilestoneForProof.milestoneNumber}
            milestoneName={selectedMilestoneForProof.milestoneName}
            userId={user?.id || ''}
            userName={user?.name || 'User'}
            onSuccess={async () => {
              setShowProofOfWorkModal(false);
              setSelectedMilestoneForProof(null);
              // Refresh the projects data after successful upload
              await refetch();
            }}
            onClose={() => {
              setShowProofOfWorkModal(false);
              setSelectedMilestoneForProof(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
