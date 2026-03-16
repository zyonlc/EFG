import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface ContractorProfile {
  id: string;
  company_name: string;
  industry: string;
  location: string;
  rating: number;
  review_count: number;
  specialties: string[];
  description: string;
  completed_projects: number;
  website?: string;
  phone?: string;
  email?: string;
}

export interface ProfessionalConnection {
  id: string;
  user_id: string;
  connected_user_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  connected_at: string;
  is_following: boolean;
}

export interface DirectMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  message_text: string;
  sent_at: string;
  read: boolean;
  conversation_id: string;
}

export function useProfessionalDirectory() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<ContractorProfile[]>([]);
  const [connections, setConnections] = useState<ProfessionalConnection[]>([]);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all contractor profiles
  const fetchProfiles = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('account_type', 'contractor')
        .neq('id', user.id);

      if (error) throw error;

      setProfiles(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch profiles');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch user's connections
  const fetchConnections = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('professional_connections')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      setConnections(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch connections');
    }
  }, [user]);

  // Send connection request
  const sendConnectionRequest = useCallback(
    async (targetUserId: string): Promise<void> => {
      if (!user) throw new Error('User not authenticated');

      try {
        const { error } = await supabase.from('professional_connections').insert({
          user_id: user.id,
          connected_user_id: targetUserId,
          status: 'pending',
        });

        if (error) throw error;

        await fetchConnections();
      } catch (err) {
        throw new Error(
          `Connection request failed: ${err instanceof Error ? err.message : 'Unknown error'}`
        );
      }
    },
    [user, fetchConnections]
  );

  // Accept connection request
  const acceptConnection = useCallback(
    async (connectionId: string): Promise<void> => {
      try {
        const { error } = await supabase
          .from('professional_connections')
          .update({ status: 'accepted' })
          .eq('id', connectionId);

        if (error) throw error;

        await fetchConnections();
      } catch (err) {
        throw new Error(
          `Accept connection failed: ${err instanceof Error ? err.message : 'Unknown error'}`
        );
      }
    },
    [fetchConnections]
  );

  // Follow/Unfollow contractor
  const toggleFollow = useCallback(
    async (targetUserId: string, isFollowing: boolean): Promise<void> => {
      if (!user) throw new Error('User not authenticated');

      try {
        if (isFollowing) {
          // Remove follow
          const { error } = await supabase
            .from('professional_connections')
            .update({ is_following: false })
            .eq('user_id', user.id)
            .eq('connected_user_id', targetUserId);

          if (error) throw error;
        } else {
          // Add follow
          const { error } = await supabase.from('professional_connections').upsert({
            user_id: user.id,
            connected_user_id: targetUserId,
            is_following: true,
            status: 'accepted',
          });

          if (error) throw error;
        }

        await fetchConnections();
      } catch (err) {
        throw new Error(
          `Toggle follow failed: ${err instanceof Error ? err.message : 'Unknown error'}`
        );
      }
    },
    [user, fetchConnections]
  );

  // Send direct message
  const sendMessage = useCallback(
    async (recipientId: string, messageText: string): Promise<void> => {
      if (!user) throw new Error('User not authenticated');

      try {
        // Generate conversation ID (consistent regardless of direction)
        const conversationId = [user.id, recipientId].sort().join('_');

        const { error } = await supabase.from('direct_messages').insert({
          sender_id: user.id,
          recipient_id: recipientId,
          message_text: messageText,
          conversation_id: conversationId,
          read: false,
        });

        if (error) throw error;

        // Fetch updated messages
        await fetchMessages(recipientId);
      } catch (err) {
        throw new Error(
          `Message send failed: ${err instanceof Error ? err.message : 'Unknown error'}`
        );
      }
    },
    [user]
  );

  // Fetch conversation with specific user
  const fetchMessages = useCallback(
    async (otherUserId: string): Promise<void> => {
      if (!user) return;

      try {
        const conversationId = [user.id, otherUserId].sort().join('_');

        const { data, error } = await supabase
          .from('direct_messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('sent_at', { ascending: true });

        if (error) throw error;

        setMessages(data || []);

        // Mark messages as read
        await supabase
          .from('direct_messages')
          .update({ read: true })
          .eq('conversation_id', conversationId)
          .eq('recipient_id', user.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch messages');
      }
    },
    [user]
  );

  // Get unread message count
  const getUnreadCount = useCallback(async (): Promise<number> => {
    if (!user) return 0;

    try {
      const { count, error } = await supabase
        .from('direct_messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('read', false);

      if (error) throw error;

      return count || 0;
    } catch (err) {
      console.error('Error fetching unread count:', err);
      return 0;
    }
  }, [user]);

  // Get list of active conversations
  const fetchConversations = useCallback(async () => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('sender_id, recipient_id, sent_at, message_text, read')
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('sent_at', { ascending: false });

      if (error) throw error;

      // Get unique conversation partners
      const conversationMap = new Map();
      data?.forEach((msg) => {
        const partnerId = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id;
        if (!conversationMap.has(partnerId)) {
          conversationMap.set(partnerId, {
            user_id: partnerId,
            last_message: msg.message_text,
            last_message_time: msg.sent_at,
            unread: msg.recipient_id === user.id && !msg.read,
          });
        }
      });

      return Array.from(conversationMap.values());
    } catch (err) {
      console.error('Error fetching conversations:', err);
      return [];
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    fetchProfiles();
    fetchConnections();
  }, [fetchProfiles, fetchConnections]);

  return {
    profiles,
    connections,
    messages,
    loading,
    error,
    fetchProfiles,
    fetchConnections,
    fetchMessages,
    sendConnectionRequest,
    acceptConnection,
    toggleFollow,
    sendMessage,
    getUnreadCount,
    fetchConversations,
  };
}
