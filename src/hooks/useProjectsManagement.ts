import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface ProjectVideo {
  id: string;
  milestone_id: string;
  url: string;
  thumbnail_url: string;
  title: string;
  timestamp: number;
  uploaded_at: string;
  playback_id: string;
}

export interface ProjectMilestone {
  id: string;
  contract_id: string;
  milestone_number: number;
  milestone_name: string;
  percentage_of_contract: number;
  amount_ugx: number;
  currency_code: string;
  description: string;
  due_date: string;
  status: string;
  videos: ProjectVideo[];
  field_verifications: any[];
}

export interface OngoingProject {
  id: string;
  contract_number: string;
  client_name: string;
  contract_amount: number;
  currency_code: string;
  contract_start_date: string;
  contract_end_date: string;
  status: string;
  milestones: ProjectMilestone[];
  progress_percentage: number;
}

export interface CompletedProject {
  id: string;
  contract_number: string;
  client_name: string;
  contract_amount: number;
  currency_code: string;
  contract_start_date: string;
  contract_end_date: string;
  completion_date: string;
  status: string;
  summary: string;
  key_achievements: string[];
  final_outcome: string;
  videos: ProjectVideo[];
  rating: number | null;
  testimonial: string | null;
}

export function useProjectsManagement(userId: string) {
  const [completedProjects, setCompletedProjects] = useState<CompletedProject[]>([]);
  const [ongoingProjects, setOngoingProjects] = useState<OngoingProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  let channel: RealtimeChannel | null = null;

  // Fetch ongoing projects from contracts
  const fetchOngoingProjects = async () => {
    try {
      const { data: contractsData, error: contractsError } = await supabase
        .from('contracts')
        .select(`
          id,
          contract_number,
          client_name,
          contract_amount,
          currency_code,
          contract_start_date,
          contract_end_date,
          status,
          contract_milestones(*)
        `)
        .eq('status', 'active');

      if (contractsError) throw contractsError;

      // Fetch project_milestone_videos for each milestone
      const projects = await Promise.all(
        contractsData?.map(async (contract) => {
          const milestonesWithVideos = await Promise.all(
            (contract.contract_milestones || []).map(async (milestone: any) => {
              const { data: videos, error: videosError } = await supabase
                .from('project_milestone_videos')
                .select('*')
                .eq('milestone_id', milestone.id);

              if (videosError) {
                console.error('Error fetching videos for milestone:', videosError);
              }

              return {
                ...milestone,
                videos: videos || [],
              };
            })
          );

          return {
            id: contract.id,
            contract_number: contract.contract_number,
            client_name: contract.client_name,
            contract_amount: contract.contract_amount,
            currency_code: contract.currency_code,
            contract_start_date: contract.contract_start_date,
            contract_end_date: contract.contract_end_date,
            status: contract.status,
            milestones: milestonesWithVideos,
            progress_percentage: calculateProgress(milestonesWithVideos),
          };
        }) || []
      );

      setOngoingProjects(projects);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch ongoing projects';
      setError(errorMsg);
      console.error('Error fetching ongoing projects:', err);
    }
  };

  // Fetch completed projects
  const fetchCompletedProjects = async () => {
    try {
      // This would typically come from a projects_portfolio table
      // For now, we'll fetch completed contracts and format them
      const { data: completedData, error: completedError } = await supabase
        .from('contracts')
        .select('*')
        .eq('status', 'completed')
        .limit(50);

      if (completedError) throw completedError;

      const projects = completedData?.map(contract => ({
        id: contract.id,
        contract_number: contract.contract_number,
        client_name: contract.client_name,
        contract_amount: contract.contract_amount,
        currency_code: contract.currency_code,
        contract_start_date: contract.contract_start_date,
        contract_end_date: contract.contract_end_date,
        completion_date: contract.contract_end_date,
        status: contract.status,
        summary: '',
        key_achievements: [],
        final_outcome: '',
        videos: [],
        rating: null,
        testimonial: null,
      })) || [];

      setCompletedProjects(projects);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch completed projects';
      setError(errorMsg);
      console.error('Error fetching completed projects:', err);
    }
  };

  // Set up real-time subscription
  const setupRealtimeSubscription = () => {
    channel = supabase
      .channel('projects-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contracts',
        },
        () => {
          // Refetch data when contracts change
          fetchOngoingProjects();
          fetchCompletedProjects();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'project_milestone_videos',
        },
        () => {
          // Refetch data when milestone videos are added
          console.log('Milestone video uploaded, refreshing projects...');
          fetchOngoingProjects();
          fetchCompletedProjects();
        }
      )
      .subscribe();
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchOngoingProjects(), fetchCompletedProjects()])
      .then(() => {
        setupRealtimeSubscription();
        setLoading(false);
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Failed to load projects');
        setLoading(false);
      });

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [userId]);

  const calculateProgress = (milestones: any[]) => {
    if (!milestones || milestones.length === 0) return 0;
    // A milestone is considered completed if it has status 'completed' OR has uploaded videos
    const completed = milestones.filter(m => m.status === 'completed' || (m.videos && m.videos.length > 0)).length;
    return Math.round((completed / milestones.length) * 100);
  };

  return {
    completedProjects,
    ongoingProjects,
    loading,
    error,
    refetch: async () => {
      await Promise.all([fetchOngoingProjects(), fetchCompletedProjects()]);
    }
  };
}
