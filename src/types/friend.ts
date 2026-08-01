export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: FriendRequestStatus;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  sender?: {
    display_name?: string | null;
    avatar_url?: string | null;
    friend_code?: string | null;
    level?: number;
    xp?: number;
    streak?: number;
  };
  receiver?: {
    display_name?: string | null;
    avatar_url?: string | null;
    friend_code?: string | null;
    level?: number;
    xp?: number;
    streak?: number;
  };
}

export interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  created_at: string;
  deleted_at?: string | null;
}

export interface FriendWithProfile extends Friend {
  profile?: {
    display_name?: string | null;
    avatar_url?: string | null;
    friend_code?: string | null;
    level?: number;
    xp?: number;
    streak?: number;
  };
}
