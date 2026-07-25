import { supabase } from '../lib/supabase';
import { Arena, ArenaMember, ArenaVisibility } from '../types/arena';

export const arenaService = {
  async getDefaultArena(): Promise<Arena | null> {
    const { data, error } = await supabase
      .from('arenas')
      .select('*')
      .eq('is_default', true)
      .maybeSingle();

    if (error) {
      console.error('Error fetching default arena:', error);
      throw error;
    }
    return data as Arena | null;
  },

  async joinArena(arenaId: string, userId: string): Promise<ArenaMember> {
    const { data, error } = await supabase
      .from('arena_members')
      .upsert(
        {
          arena_id: arenaId,
          user_id: userId,
          joined_at: new Date().toISOString(),
          active: true,
          deleted_at: null,
        },
        { onConflict: 'arena_id,user_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('Error joining arena:', error);
      throw error;
    }
    return data as ArenaMember;
  },

  async getArenaMembers(arenaId: string): Promise<ArenaMember[]> {
    const { data, error } = await supabase
      .from('arena_members')
      .select('*')
      .eq('arena_id', arenaId)
      .eq('active', true)
      .is('deleted_at', null);

    if (error) {
      console.error('Error fetching arena members:', error);
      throw error;
    }
    return (data || []) as ArenaMember[];
  },

  async getUserArenas(userId: string): Promise<Arena[]> {
    const { data, error } = await supabase
      .from('arena_members')
      .select('arena_id, arenas(*)')
      .eq('user_id', userId)
      .eq('active', true)
      .is('deleted_at', null);

    if (error) {
      console.error('Error fetching user arenas:', error);
      throw error;
    }
    return (data?.map((item: any) => item.arenas) || []) as Arena[];
  },

  async createArena(
    name: string,
    slug: string,
    description: string | null,
    visibility: ArenaVisibility = 'invite_only',
    createdBy: string
  ): Promise<Arena> {
    const { data, error } = await supabase
      .from('arenas')
      .insert({
        name,
        slug,
        description,
        visibility,
        created_by: createdBy,
        is_default: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating arena:', error);
      throw error;
    }

    return data as Arena;
  },
};
