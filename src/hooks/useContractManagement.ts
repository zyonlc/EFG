import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Contract, ContractMilestone } from '../types/empowise';

interface ContractWithProgress extends Contract {
  progress_percentage: number;
  active_milestones: ContractMilestone[];
  milestone_count: number;
}

interface UseContractManagementReturn {
  activeContracts: ContractWithProgress[];
  completedContracts: Contract[];
  totalActive: number;
  totalCompleted: number;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and manage contractor's contracts
 */
export function useContractManagement(contractorId: string | undefined): UseContractManagementReturn {
  const [activeContracts, setActiveContracts] = useState<ContractWithProgress[]>([]);
  const [completedContracts, setCompletedContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContracts = async () => {
    if (!contractorId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch active contracts with their milestones
      const { data: activeData, error: activeError } = await supabase
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
          contract_milestones (
            id,
            milestone_name,
            status,
            percentage_of_contract
          )
        `)
        .eq('contractor_id', contractorId)
        .eq('status', 'active')
        .order('contract_start_date', { ascending: false });

      if (activeError) throw activeError;

      // Calculate progress for each contract
      const activeWithProgress: ContractWithProgress[] = (activeData || []).map((contract: any) => {
        const milestones = contract.contract_milestones || [];
        const completedMilestones = milestones.filter((m: any) => m.status === 'paid').length;
        const progressPercentage = milestones.length > 0 
          ? Math.round((completedMilestones / milestones.length) * 100)
          : 0;

        return {
          ...contract,
          progress_percentage: progressPercentage,
          active_milestones: milestones,
          milestone_count: milestones.length
        };
      });

      setActiveContracts(activeWithProgress);

      // Fetch completed contracts
      const { data: completedData, error: completedError } = await supabase
        .from('contracts')
        .select('*')
        .eq('contractor_id', contractorId)
        .eq('status', 'completed')
        .order('contract_end_date', { ascending: false })
        .limit(10);

      if (completedError) throw completedError;

      setCompletedContracts(completedData || []);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch contracts';
      setError(errorMsg);
      console.error('Contract management error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, [contractorId]);

  return {
    activeContracts,
    completedContracts,
    totalActive: activeContracts.length,
    totalCompleted: completedContracts.length,
    loading,
    error,
    refetch: fetchContracts
  };
}

/**
 * Hook to get a single contract with all details
 */
export function useContractDetail(contractId: string | undefined) {
  const [contract, setContract] = useState<any>(null);
  const [milestones, setMilestones] = useState<ContractMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!contractId) {
      setLoading(false);
      return;
    }

    const fetchContractDetail = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: contractData, error: contractError } = await supabase
          .from('contracts')
          .select('*')
          .eq('id', contractId)
          .single();

        if (contractError) throw contractError;

        const { data: milestonesData, error: milestonesError } = await supabase
          .from('contract_milestones')
          .select('*')
          .eq('contract_id', contractId)
          .order('milestone_number', { ascending: true });

        if (milestonesError) throw milestonesError;

        setContract(contractData);
        setMilestones(milestonesData || []);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to fetch contract detail';
        setError(errorMsg);
        console.error('Contract detail error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchContractDetail();
  }, [contractId]);

  return {
    contract,
    milestones,
    loading,
    error
  };
}

/**
 * Hook to create a new contract
 */
export function useCreateContract() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createContract = async (contractData: Partial<Contract>) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: insertError } = await supabase
        .from('contracts')
        .insert([contractData])
        .select()
        .single();

      if (insertError) throw insertError;

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create contract';
      setError(errorMsg);
      console.error('Create contract error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    createContract,
    loading,
    error
  };
}
