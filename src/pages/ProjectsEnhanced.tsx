import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useProjectsManagement, OngoingProject, CompletedProject } from '../hooks/useProjectsManagement';
import { supabase } from '../lib/supabase';
import {
  Clock, CheckCircle, AlertCircle, Loader, MessageCircle, TrendingUp,
  Calendar, DollarSign, User, Trophy, Zap, Film, Image, FileText, AlertTriangle,
  ChevronDown, Plus, X, Eye, Download, Share2, GripVertical, Timer, Bell,
  ListTodo, Users, MapPin, Send, Trash2, Edit2, CheckSquare, Square
} from 'lucide-react';
import ProjectMilestoneVideoUpload from '../components/ProjectMilestoneVideoUpload';
import ProjectTeamChat from '../components/ProjectTeamChat';
import ProjectsPhotoLockUploadModal from '../components/ProjectsPhotoLockUploadModal';

interface ProjectSOPEvidence {
  id: string;
  milestone_id: string;
  type: 'photo' | 'video' | 'document';
  url: string;
  thumbnail_url?: string;
  title: string;
  description?: string;
  uploaded_by: string;
  uploaded_at: string;
  evidence_type: string; // 'safety', 'process', 'measurement', 'specification'
}

interface ProjectTask {
  id: string;
  milestone_id: string;
  title: string;
  description?: string;
  assigned_to: string;
  assigned_to_name?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  due_date?: string;
  priority: 'low' | 'medium' | 'high';
  completion_percentage: number;
}

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  description?: string;
  location?: string;
  type: 'meeting' | 'deadline' | 'milestone' | 'review';
  contract_id?: string;
  completed?: boolean;
}

interface MilestoneReminder {
  milestone_id: string;
  milestone_name: string;
  due_date: string;
  days_until_due: number;
  status: string;
}

export default function ProjectsEnhanced() {
  const { user } = useAuth();
  const { completedProjects, ongoingProjects, loading, error, refetch } = useProjectsManagement(user?.id || '');
  const [activeTab, setActiveTab] = useState<'ongoing' | 'completed'>('ongoing');
  const [selectedProject, setSelectedProject] = useState<OngoingProject | CompletedProject | null>(null);
  const [showMilestoneDetails, setShowMilestoneDetails] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showProofOfWorkModal, setShowProofOfWorkModal] = useState(false);
  const [showSOPGallery, setShowSOPGallery] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTasks, setShowTasks] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showReminders, setShowReminders] = useState(false);
  const [chatContractId, setChatContractId] = useState<string>('');
  const [chatContractNumber, setChatContractNumber] = useState<string>('');
  const [selectedMilestoneForProof, setSelectedMilestoneForProof] = useState<{
    contractId: string;
    milestoneId: string;
    milestoneNumber: number;
    milestoneName: string;
  } | null>(null);
  const [sopEvidence, setSOPEvidence] = useState<ProjectSOPEvidence[]>([]);
  const [selectedSOPView, setSelectedSOPView] = useState<'grid' | 'timeline'>('grid');
  const [projectTasks, setProjectTasks] = useState<ProjectTask[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [milestoneReminders, setMilestoneReminders] = useState<MilestoneReminder[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [contractorId, setContractorId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Fetch contractor ID when user is available
  useEffect(() => {
    if (user) {
      fetchContractorId();
    }
  }, [user]);

  const fetchContractorId = async () => {
    try {
      const { data, error } = await supabase
        .from('contractor_profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setContractorId(data?.id || null);
    } catch (err) {
      console.error('Failed to fetch contractor ID:', err);
    }
  };

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center text-slate-600 pt-24">Please sign in</div>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-24">
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

  // Calculate total project budget from milestones
  const calculateProjectBudget = (project: OngoingProject | CompletedProject) => {
    if (!project.milestones) return 0;
    return project.milestones.reduce((total, milestone) => {
      return total + (milestone.milestone_budget || 0);
    }, 0);
  };

  // Filter and sort projects
  const getFilteredAndSortedProjects = (projects: (OngoingProject | CompletedProject)[]) => {
    let filtered = projects.filter(project => {
      const matchesSearch =
        project.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.contract_number.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ||
        project.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    // Sort projects
    filtered.sort((a, b) => {
      let compareValue = 0;

      switch (sortBy) {
        case 'date':
          compareValue = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
          break;
        case 'amount':
          compareValue = (a.contract_amount || 0) - (b.contract_amount || 0);
          break;
        case 'client':
          compareValue = a.client_name.localeCompare(b.client_name);
          break;
        default:
          compareValue = 0;
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    return filtered;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (date: string, time?: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: time ? undefined : '2-digit',
      minute: time ? undefined : '2-digit'
    });
  };

  const loadSOPEvidence = async (contractId: string) => {
    try {
      const { data: videos } = await supabase
        .from('project_milestone_videos')
        .select('*')
        .eq('contract_id', contractId)
        .order('created_at', { ascending: false });

      const { data: photos } = await supabase
        .from('field_verification')
        .select('*')
        .order('photo_upload_timestamp', { ascending: false });

      const evidence: ProjectSOPEvidence[] = [
        ...(videos?.map(v => ({
          id: v.id,
          milestone_id: v.milestone_id,
          type: 'video' as const,
          url: v.url,
          thumbnail_url: v.thumbnail_url,
          title: v.title,
          description: v.description,
          uploaded_by: v.uploaded_by,
          uploaded_at: v.created_at,
          evidence_type: 'process'
        })) || []),
        ...(photos?.map(p => ({
          id: p.id,
          milestone_id: p.milestone_id,
          type: 'photo' as const,
          url: p.photo_url,
          thumbnail_url: p.photo_url,
          title: p.task_name,
          description: p.task_description,
          uploaded_by: p.contractor_id,
          uploaded_at: p.photo_upload_timestamp,
          evidence_type: p.gps_latitude ? 'verification' : 'documentation'
        })) || [])
      ];

      setSOPEvidence(evidence);
    } catch (err) {
      console.error('Failed to load SOP evidence:', err);
    }
  };

  const loadMilestoneReminders = (project: OngoingProject) => {
    const now = new Date();
    const reminders: MilestoneReminder[] = (project.milestones || []).map(milestone => {
      const dueDate = new Date(milestone.due_date);
      const daysUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        milestone_id: milestone.id,
        milestone_name: milestone.milestone_name,
        due_date: milestone.due_date,
        days_until_due: daysUntilDue,
        status: milestone.status
      };
    });
    
    setMilestoneReminders(reminders.sort((a, b) => a.days_until_due - b.days_until_due));
  };

  const generateCalendarEvents = (project: OngoingProject): CalendarEvent[] => {
    const events: CalendarEvent[] = [];
    
    (project.milestones || []).forEach((milestone, idx) => {
      events.push({
        id: `milestone-${milestone.id}`,
        title: `Milestone: ${milestone.milestone_name}`,
        date: milestone.due_date,
        time: '09:00',
        type: 'milestone',
        contract_id: project.id,
        description: milestone.description,
        completed: milestone.status === 'paid' || milestone.status === 'completed'
      });
    });
    
    return events;
  };

  // Task Management Modal
  const TaskManagementModal = ({ project }: { project: OngoingProject | CompletedProject }) => {
    const [tasks, setTasks] = useState<ProjectTask[]>([
      {
        id: '1',
        milestone_id: project.milestones[0]?.id || '',
        title: 'Prepare project scope document',
        assigned_to: user?.id || '',
        assigned_to_name: user?.email,
        status: 'completed',
        priority: 'high',
        completion_percentage: 100
      },
      {
        id: '2',
        milestone_id: project.milestones[0]?.id || '',
        title: 'Coordinate with team members',
        assigned_to: '',
        status: 'in_progress',
        priority: 'high',
        completion_percentage: 65
      },
      {
        id: '3',
        milestone_id: project.milestones[0]?.id || '',
        title: 'Submit initial documentation',
        assigned_to: '',
        status: 'pending',
        priority: 'medium',
        completion_percentage: 0
      }
    ]);

    const toggleTaskStatus = (taskId: string) => {
      setTasks(tasks.map(task => 
        task.id === taskId 
          ? { ...task, status: task.status === 'completed' ? 'pending' : 'completed', completion_percentage: task.status === 'completed' ? 0 : 100 }
          : task
      ));
    };

    const getPriorityColor = (priority: string) => {
      switch (priority) {
        case 'high': return 'bg-red-100 text-red-800';
        case 'medium': return 'bg-yellow-100 text-yellow-800';
        case 'low': return 'bg-green-100 text-green-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    };

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'completed': return 'text-green-600';
        case 'in_progress': return 'text-blue-600';
        case 'blocked': return 'text-red-600';
        default: return 'text-gray-600';
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto pt-24">
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-white rounded-lg shadow-xl">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-200">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Task Management</h2>
                <p className="text-slate-600 text-sm mt-1">{project.client_name}</p>
              </div>
              <button
                onClick={() => setShowTasks(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-6 h-6 text-slate-600" />
              </button>
            </div>

            {/* Add Task */}
            <div className="p-6 border-b border-slate-200 bg-slate-50">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Add new task..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => {
                    if (newTaskTitle.trim()) {
                      setTasks([
                        ...tasks,
                        {
                          id: Date.now().toString(),
                          milestone_id: project.milestones[0]?.id || '',
                          title: newTaskTitle,
                          assigned_to: newTaskAssignee || user?.id || '',
                          status: 'pending',
                          priority: 'medium',
                          completion_percentage: 0
                        }
                      ]);
                      setNewTaskTitle('');
                      setNewTaskAssignee('');
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
            </div>

            {/* Tasks List */}
            <div className="p-6 space-y-3 max-h-96 overflow-y-auto">
              {tasks.length === 0 ? (
                <p className="text-center text-slate-600 py-8">No tasks yet. Create one to get started.</p>
              ) : (
                tasks.map(task => (
                  <div key={task.id} className="p-4 border border-slate-200 rounded-lg hover:shadow-md transition">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleTaskStatus(task.id)}
                        className={`mt-1 flex-shrink-0 ${task.status === 'completed' ? 'text-green-600' : 'text-slate-400'}`}
                      >
                        {task.status === 'completed' ? (
                          <CheckSquare className="w-5 h-5" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={`font-semibold ${task.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                            {task.title}
                          </h4>
                          <span className={`text-xs font-semibold px-2 py-1 rounded ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-600">
                          <span className={`font-medium ${getStatusColor(task.status)}`}>
                            {task.status.replace(/_/g, ' ')}
                          </span>
                          {task.assigned_to_name && (
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              <span>{task.assigned_to_name}</span>
                            </div>
                          )}
                        </div>
                        {task.completion_percentage > 0 && (
                          <div className="mt-2 w-full bg-slate-200 rounded-full h-1.5">
                            <div
                              className="bg-blue-600 h-1.5 rounded-full"
                              style={{ width: `${task.completion_percentage}%` }}
                            ></div>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setTasks(tasks.filter(t => t.id !== task.id))}
                        className="p-1 hover:bg-red-100 rounded transition text-slate-600 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Calendar Modal
  const CalendarModal = ({ project }: { project: OngoingProject | CompletedProject }) => {
    const events = generateCalendarEvents(project as OngoingProject);
    const currentMonth = new Date();

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto pt-24">
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-white rounded-lg shadow-xl">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-200">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Project Calendar</h2>
                <p className="text-slate-600 text-sm mt-1">Milestones and important dates</p>
              </div>
              <button
                onClick={() => setShowCalendar(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-6 h-6 text-slate-600" />
              </button>
            </div>

            {/* Calendar Events */}
            <div className="p-6">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Upcoming Events
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {events.length === 0 ? (
                  <p className="text-slate-600 text-center py-8">No events scheduled</p>
                ) : (
                  events.map(event => (
                    <div key={event.id} className={`p-4 border rounded-lg ${event.completed ? 'border-green-200 bg-green-50' : 'border-slate-200'}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className={`font-semibold ${event.completed ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                              {event.title}
                            </h4>
                            <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
                              {event.type}
                            </span>
                          </div>
                          {event.description && (
                            <p className="text-sm text-slate-600 mb-2">{event.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-slate-600">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{formatDate(event.date)}</span>
                            </div>
                            {event.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                <span>{event.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {event.completed ? (
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                        ) : (
                          <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Reminders Modal
  const RemindersModal = ({ project }: { project: OngoingProject | CompletedProject }) => {
    loadMilestoneReminders(project as OngoingProject);

    const getUrgency = (daysUntilDue: number) => {
      if (daysUntilDue < 0) return { color: 'bg-red-100 border-red-300', text: 'text-red-800', label: 'Overdue' };
      if (daysUntilDue <= 7) return { color: 'bg-red-100 border-red-300', text: 'text-red-800', label: 'Urgent' };
      if (daysUntilDue <= 14) return { color: 'bg-yellow-100 border-yellow-300', text: 'text-yellow-800', label: 'Warning' };
      return { color: 'bg-blue-100 border-blue-300', text: 'text-blue-800', label: 'On track' };
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto pt-24">
        <div className="max-w-2xl mx-auto p-6">
          <div className="bg-white rounded-lg shadow-xl">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-200">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Milestone Reminders</h2>
                <p className="text-slate-600 text-sm mt-1">Stay on track with upcoming deadlines</p>
              </div>
              <button
                onClick={() => setShowReminders(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-6 h-6 text-slate-600" />
              </button>
            </div>

            {/* Reminders List */}
            <div className="p-6 space-y-3 max-h-96 overflow-y-auto">
              {milestoneReminders.length === 0 ? (
                <p className="text-center text-slate-600 py-8">No milestones to remind about</p>
              ) : (
                milestoneReminders.map(reminder => {
                  const urgency = getUrgency(reminder.days_until_due);
                  return (
                    <div key={reminder.milestone_id} className={`p-4 border rounded-lg ${urgency.color} ${urgency.text}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold mb-1">{reminder.milestone_name}</h4>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>{formatDate(reminder.due_date)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Timer className="w-4 h-4" />
                              <span>
                                {reminder.days_until_due < 0
                                  ? `${Math.abs(reminder.days_until_due)} days overdue`
                                  : reminder.days_until_due === 0
                                  ? 'Due today'
                                  : `${reminder.days_until_due} days remaining`}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Bell className="w-5 h-5 flex-shrink-0" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Ongoing Projects Tab
  const renderOngoingProjects = () => {
    const filteredProjects = getFilteredAndSortedProjects(ongoingProjects);
    return (
    <div className="space-y-6">
      {filteredProjects.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
          <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600">{searchQuery || statusFilter !== 'all' ? 'No projects match your filters' : 'No ongoing projects'}</p>
        </div>
      ) : (
        filteredProjects.map((project) => (
          <div
            key={project.id}
            className="bg-white rounded-lg border border-slate-200 overflow-hidden hover:shadow-lg transition"
          >
            {/* Project Header */}
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-transparent">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{project.client_name}</h3>
                  <p className="text-sm text-slate-600 mt-1">Contract #{project.contract_number}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-slate-900">
                    {formatCurrency(calculateProjectBudget(project), project.currency_code)}
                  </div>
                  <p className="text-xs text-slate-600 mt-1">Project Budget</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">Overall Progress</span>
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
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="w-4 h-4" />
                  <span>Start: {formatDate(project.contract_start_date)}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="w-4 h-4" />
                  <span>End: {formatDate(project.contract_end_date)}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <TrendingUp className="w-4 h-4" />
                  <span>{project.milestones.length} milestones</span>
                </div>
              </div>
            </div>

            {/* Milestones Grid */}
            <div className="p-6">
              <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Milestones
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {project.milestones.map((milestone) => (
                  <div
                    key={milestone.id}
                    className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border border-slate-200 hover:shadow-md transition"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            #{milestone.milestone_number}
                          </span>
                          <h5 className="font-semibold text-slate-900">{milestone.milestone_name}</h5>
                        </div>
                        <p className="text-sm text-slate-600 mb-2">{milestone.description}</p>
                      </div>
                      {milestone.status === 'completed' ? (
                        <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                      ) : (
                        <Clock className="w-6 h-6 text-blue-600 flex-shrink-0" />
                      )}
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-xs text-slate-600">
                        <span>{milestone.percentage_of_contract}% of contract</span>
                        <span>{formatCurrency(milestone.amount_ugx, milestone.currency_code)}</span>
                      </div>
                      <div className="w-full bg-slate-300 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            milestone.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${milestone.status === 'completed' ? 100 : 65}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 mb-3">
                      Due: {formatDate(milestone.due_date)}
                    </div>

                    {/* Evidence Count */}
                    {milestone.videos && milestone.videos.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-blue-600 mb-3 p-2 bg-blue-50 rounded">
                        <Film className="w-4 h-4" />
                        <span>{milestone.videos.length} video{milestone.videos.length !== 1 ? 's' : ''}</span>
                      </div>
                    )}

                    <button
                      onClick={() => {
                        setSelectedMilestoneForProof({
                          contractId: project.id,
                          milestoneId: milestone.id,
                          milestoneNumber: milestone.milestone_number,
                          milestoneName: milestone.milestone_name,
                        });
                        setShowProofOfWorkModal(true);
                      }}
                      className="w-full text-xs px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition font-medium"
                    >
                      Upload Evidence
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 grid grid-cols-5 gap-2">
              <button
                onClick={() => {
                  loadSOPEvidence(project.id);
                  setSelectedProject(project);
                  setShowSOPGallery(true);
                }}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg transition font-medium text-sm"
                title="View SOP Evidence & Accountability Gallery"
              >
                <Image className="w-4 h-4" />
                <span className="hidden sm:inline text-xs">Gallery</span>
              </button>
              <button
                onClick={() => {
                  setSelectedProject(project);
                  loadMilestoneReminders(project);
                  setShowReminders(true);
                }}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition font-medium text-sm"
                title="Milestone Reminders"
              >
                <Bell className="w-4 h-4" />
                <span className="hidden sm:inline text-xs">Reminders</span>
              </button>
              <button
                onClick={() => {
                  setSelectedProject(project);
                  setShowTasks(true);
                }}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition font-medium text-sm"
                title="Task Checklist"
              >
                <ListTodo className="w-4 h-4" />
                <span className="hidden sm:inline text-xs">Tasks</span>
              </button>
              <button
                onClick={() => {
                  setSelectedProject(project);
                  setShowCalendar(true);
                }}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg transition font-medium text-sm"
                title="Project Calendar"
              >
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline text-xs">Calendar</span>
              </button>
              <button
                onClick={() => {
                  setChatContractId(project.id);
                  setChatContractNumber(project.contract_number);
                  setShowChat(true);
                }}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition font-medium text-sm"
                title="Team Chat"
              >
                <MessageCircle className="w-4 h-4" />
                <span className="hidden sm:inline text-xs">Chat</span>
              </button>
            </div>
          </div>
        ))
      )}
    </div>
    );
  };

  // SOP Gallery Modal
  if (showSOPGallery && selectedProject) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto pt-24">
        <div className="max-w-6xl mx-auto p-6">
          <div className="bg-white rounded-lg shadow-xl">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-200">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">SOP Compliance & Accountability Gallery</h2>
                <p className="text-slate-600 text-sm mt-1">{selectedProject.client_name} - Contract #{selectedProject.contract_number}</p>
              </div>
              <button
                onClick={() => setShowSOPGallery(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-6 h-6 text-slate-600" />
              </button>
            </div>

            {/* View Toggle */}
            <div className="flex gap-4 p-6 border-b border-slate-200 bg-slate-50">
              <button
                onClick={() => setSelectedSOPView('grid')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  selectedSOPView === 'grid'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Grid View
              </button>
              <button
                onClick={() => setSelectedSOPView('timeline')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  selectedSOPView === 'timeline'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Timeline
              </button>
            </div>

            {/* Evidence Content */}
            <div className="p-6">
              {sopEvidence.length === 0 ? (
                <div className="text-center py-12">
                  <Image className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600">No evidence uploaded yet</p>
                </div>
              ) : selectedSOPView === 'grid' ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {sopEvidence.map((item) => (
                    <div
                      key={item.id}
                      className="group relative bg-slate-100 rounded-lg overflow-hidden hover:shadow-lg transition cursor-pointer"
                    >
                      {item.type === 'video' ? (
                        <div className="aspect-video bg-slate-300 flex items-center justify-center">
                          <Film className="w-8 h-8 text-slate-500" />
                        </div>
                      ) : (
                        <img
                          src={item.thumbnail_url || item.url}
                          alt={item.title}
                          className="w-full aspect-square object-cover"
                        />
                      )}

                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition flex items-center justify-center gap-3">
                        <button className="opacity-0 group-hover:opacity-100 transition p-2 bg-white rounded-full hover:bg-slate-100">
                          <Eye className="w-5 h-5 text-slate-900" />
                        </button>
                        <button className="opacity-0 group-hover:opacity-100 transition p-2 bg-white rounded-full hover:bg-slate-100">
                          <Download className="w-5 h-5 text-slate-900" />
                        </button>
                      </div>

                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-3 opacity-0 group-hover:opacity-100 transition">
                        <p className="text-white text-sm font-semibold truncate">{item.title}</p>
                        <p className="text-gray-300 text-xs">{formatDate(item.uploaded_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {sopEvidence.map((item) => (
                    <div key={item.id} className="flex gap-4 pb-4 border-b border-slate-200 last:border-0">
                      <div className="w-20 h-20 bg-slate-200 rounded-lg overflow-hidden flex-shrink-0">
                        {item.type === 'video' ? (
                          <div className="w-full h-full flex items-center justify-center bg-slate-300">
                            <Film className="w-8 h-8 text-slate-500" />
                          </div>
                        ) : (
                          <img
                            src={item.thumbnail_url || item.url}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-slate-900">{item.title}</h4>
                            <p className="text-sm text-slate-600">{item.description}</p>
                          </div>
                          <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-700 rounded">
                            {item.evidence_type}
                          </span>
                        </div>
                        <div className="flex gap-4 text-xs text-slate-600">
                          <span>{formatDate(item.uploaded_at)}</span>
                          <span>Type: {item.type}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
              <p className="text-sm text-slate-600">Total Evidence: {sopEvidence.length} items</p>
              <button
                onClick={() => setShowSOPGallery(false)}
                className="px-4 py-2 bg-slate-300 hover:bg-slate-400 text-slate-900 rounded-lg transition font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Team Chat
  if (showChat) {
    return (
      <ProjectTeamChat
        contractId={chatContractId}
        contractNumber={chatContractNumber}
        onClose={() => setShowChat(false)}
      />
    );
  }

  // Proof of Work Modal
  if (showProofOfWorkModal && selectedMilestoneForProof && contractorId) {
    return (
      <ProjectsPhotoLockUploadModal
        milestoneId={selectedMilestoneForProof.milestoneId}
        milestoneNumber={selectedMilestoneForProof.milestoneNumber}
        milestoneName={selectedMilestoneForProof.milestoneName}
        contractorId={contractorId}
        onSuccess={async () => {
          setShowProofOfWorkModal(false);
          setSelectedMilestoneForProof(null);
          await refetch();
          await loadSOPEvidence(selectedMilestoneForProof.contractId);
        }}
        onClose={() => {
          setShowProofOfWorkModal(false);
          setSelectedMilestoneForProof(null);
        }}
      />
    );
  }

  // Task Management Modal
  if (showTasks && selectedProject) {
    return <TaskManagementModal project={selectedProject} />;
  }

  // Calendar Modal
  if (showCalendar && selectedProject) {
    return <CalendarModal project={selectedProject} />;
  }

  // Reminders Modal
  if (showReminders && selectedProject) {
    return <RemindersModal project={selectedProject} />;
  }

  // Completed Projects Tab
  const renderCompletedProjects = () => {
    const filteredProjects = getFilteredAndSortedProjects(completedProjects);
    return (
    <div className="space-y-6">
      {filteredProjects.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
          <CheckCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600">{searchQuery || statusFilter !== 'all' ? 'No projects match your filters' : 'No completed projects yet'}</p>
        </div>
      ) : (
        filteredProjects.map((project) => (
          <div
            key={project.id}
            className="bg-white rounded-lg border border-green-200 overflow-hidden hover:shadow-lg transition"
          >
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
                    {formatCurrency(calculateProjectBudget(project), project.currency_code)}
                  </div>
                  <p className="text-xs text-slate-600 mt-1">Project Budget</p>
                </div>
              </div>

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

            <div className="p-6">
              <div className="grid grid-cols-2 gap-6">
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
            </div>

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
          </div>
        ))
      )}
    </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Projects</h1>
          <p className="text-slate-600 text-lg">Manage your project milestones, team collaboration, and evidence tracking</p>
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

        {/* Filtering & Sorting Controls */}
        {(activeTab === 'ongoing' || activeTab === 'completed') && (
          <div className="mb-8 bg-white rounded-lg p-4 border border-slate-200 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Search</label>
                <input
                  type="text"
                  placeholder="Client name or contract #"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="on_hold">On Hold</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="date">Date</option>
                  <option value="amount">Amount</option>
                  <option value="client">Client Name</option>
                </select>
              </div>

              {/* Order */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Order</label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="desc">Newest First</option>
                  <option value="asc">Oldest First</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'ongoing' && renderOngoingProjects()}
        {activeTab === 'completed' && renderCompletedProjects()}
      </div>
    </div>
  );
}
