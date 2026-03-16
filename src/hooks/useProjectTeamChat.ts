import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface TeamMessage {
  id: string;
  contract_id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  message: string;
  attachment_url?: string;
  attachment_type?: string;
  created_at: string;
  updated_at: string;
}

export function useProjectTeamChat(contractId: string, userId: string) {
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  let channel: RealtimeChannel | null = null;

  const fetchMessages = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('project_team_chat')
        .select(`
          id,
          contract_id,
          sender_id,
          sender_name,
          sender_avatar,
          message,
          attachment_url,
          attachment_type,
          created_at,
          updated_at
        `)
        .eq('contract_id', contractId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (fetchError) throw fetchError;

      // Ensure sender_name is populated from profiles if missing
      const messagesWithNames = await Promise.all(
        (data || []).map(async (message) => {
          if (message.sender_name) {
            return message;
          }

          // Fetch sender name from profiles if not stored
          const { data: profileData } = await supabase
            .from('profiles')
            .select('name, avatar_url')
            .eq('id', message.sender_id)
            .single();

          return {
            ...message,
            sender_name: profileData?.name || 'Unknown User',
            sender_avatar: profileData?.avatar_url || message.sender_avatar,
          };
        })
      );

      setMessages(messagesWithNames);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch messages';
      setError(errorMsg);
      console.error('Error fetching messages:', err);
    }
  };

  const sendMessage = async (message: string, attachmentUrl?: string, attachmentType?: string) => {
    try {
      // Get sender's name from profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('name, avatar_url')
        .eq('id', userId)
        .single();

      const senderName = profileData?.name || 'Unknown User';
      const senderAvatar = profileData?.avatar_url || undefined;

      const { error: insertError } = await supabase
        .from('project_team_chat')
        .insert([
          {
            contract_id: contractId,
            sender_id: userId,
            sender_name: senderName,
            sender_avatar: senderAvatar,
            message,
            attachment_url: attachmentUrl || null,
            attachment_type: attachmentType || null,
          },
        ]);

      if (insertError) throw insertError;

      // Refetch messages to get the new message with server-generated fields
      await fetchMessages();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMsg);
      throw err;
    }
  };

  const setupRealtimeSubscription = () => {
    channel = supabase
      .channel(`project-chat-${contractId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_team_chat',
          filter: `contract_id=eq.${contractId}`,
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();
  };

  useEffect(() => {
    setLoading(true);
    fetchMessages()
      .then(() => {
        setupRealtimeSubscription();
        setLoading(false);
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Failed to load messages');
        setLoading(false);
      });

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [contractId]);

  return {
    messages,
    loading,
    error,
    sendMessage,
    refetch: fetchMessages,
  };
}
