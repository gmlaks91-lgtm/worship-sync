/**
 * Supabase `public` ??????? ??????? ???.
 * ????????? ?? `supabase gen types typescript`?? ??????? ???????? ???? ????????.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/** DB ????? ? UI ???? ???? ???? */
export type ProfileRole = "leader" | "member";
export type TeamRoleCode = "L" | "M" | "S" | "D" | "A/G" | "B/G" | "E/G" | "V" | "STAFF";
export type SetlistStatus = "prep" | "confirmed";
export type AttendanceStatus = "attending" | "late" | "absent";
export type AttendanceEventType = "practice" | "worship";
export type ScheduleKind = "practice" | "worship" | "social";
export type ScheduleAttendanceStatus = "attending" | "absent";
export type PostCategory = "prayer" | "feedback" | "general";
export type FaithCheckType = "qt" | "prayer" | "bible";
export type ShopItemType = "border" | "badge" | "background";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          role: ProfileRole;
          avatar_url: string | null;
          team_id: string | null;
          role_priority_1: TeamRoleCode | null;
          role_priority_2: TeamRoleCode | null;
          role_priority_3: TeamRoleCode | null;
          points: number;
          active_badge: string | null;
          active_border_color: string | null;
          active_background_color: string | null;
          birthday: string | null;
          mbti: string | null;
          favorite_song: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          role?: ProfileRole;
          avatar_url?: string | null;
          team_id?: string | null;
          role_priority_1?: TeamRoleCode | null;
          role_priority_2?: TeamRoleCode | null;
          role_priority_3?: TeamRoleCode | null;
          points?: number;
          active_badge?: string | null;
          active_border_color?: string | null;
          active_background_color?: string | null;
          birthday?: string | null;
          mbti?: string | null;
          favorite_song?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          role?: ProfileRole;
          avatar_url?: string | null;
          team_id?: string | null;
          role_priority_1?: TeamRoleCode | null;
          role_priority_2?: TeamRoleCode | null;
          role_priority_3?: TeamRoleCode | null;
          points?: number;
          active_badge?: string | null;
          active_border_color?: string | null;
          active_background_color?: string | null;
          birthday?: string | null;
          mbti?: string | null;
          favorite_song?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      songs: {
        Row: {
          id: string;
          title: string;
          youtube_url: string | null;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          youtube_url?: string | null;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          youtube_url?: string | null;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      setlists: {
        Row: {
          id: string;
          event_date: string;
          title: string;
          status: SetlistStatus;
          staff_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_date: string;
          title: string;
          status?: SetlistStatus;
          staff_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_date?: string;
          title?: string;
          status?: SetlistStatus;
          staff_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      setlist_songs: {
        Row: {
          setlist_id: string;
          song_id: string;
          order_index: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          setlist_id: string;
          song_id: string;
          order_index?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          setlist_id?: string;
          song_id?: string;
          order_index?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      setlist_lineups: {
        Row: {
          id: string;
          setlist_id: string;
          role_code: TeamRoleCode;
          member_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          setlist_id: string;
          role_code: TeamRoleCode;
          member_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          setlist_id?: string;
          role_code?: TeamRoleCode;
          member_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      sheets: {
        Row: {
          id: string;
          song_id: string;
          image_urls: string[];
          memo: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          song_id: string;
          image_urls: string[];
          memo?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          song_id?: string;
          image_urls?: string[];
          memo?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      attendance: {
        Row: {
          id: string;
          user_id: string;
          event_date: string;
          event_type: AttendanceEventType;
          status: AttendanceStatus;
          reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_date: string;
          event_type: AttendanceEventType;
          status: AttendanceStatus;
          reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          event_date?: string;
          event_type?: AttendanceEventType;
          status?: AttendanceStatus;
          reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      schedules: {
        Row: {
          id: string;
          title: string;
          kind: ScheduleKind;
          starts_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          kind: ScheduleKind;
          starts_at: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          kind?: ScheduleKind;
          starts_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      recurring_schedule_exclusions: {
        Row: {
          id: string;
          title: string;
          kind: ScheduleKind;
          starts_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          kind: ScheduleKind;
          starts_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          kind?: ScheduleKind;
          starts_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      attendances: {
        Row: {
          id: string;
          schedule_id: string;
          user_id: string;
          status: ScheduleAttendanceStatus;
          reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          schedule_id: string;
          user_id: string;
          status: ScheduleAttendanceStatus;
          reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          schedule_id?: string;
          user_id?: string;
          status?: ScheduleAttendanceStatus;
          reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      team_settings: {
        Row: {
          id: boolean;
          playlist_id: string | null;
          last_worship_video_url: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: boolean;
          playlist_id?: string | null;
          last_worship_video_url?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: boolean;
          playlist_id?: string | null;
          last_worship_video_url?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      faith_checks: {
        Row: {
          id: string;
          user_id: string;
          check_date: string;
          check_type: FaithCheckType;
          points_earned: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          check_date: string;
          check_type: FaithCheckType;
          points_earned?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          check_date?: string;
          check_type?: FaithCheckType;
          points_earned?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      shop_items: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          item_type: ShopItemType;
          value: string;
          price_points: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          item_type: ShopItemType;
          value: string;
          price_points: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          item_type?: ShopItemType;
          value?: string;
          price_points?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      user_inventory: {
        Row: {
          id: string;
          user_id: string;
          shop_item_id: string;
          is_applied: boolean;
          acquired_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          shop_item_id: string;
          is_applied?: boolean;
          acquired_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          shop_item_id?: string;
          is_applied?: boolean;
          acquired_at?: string;
        };
        Relationships: [];
      };
      prayer_requests: {
        Row: {
          id: string;
          content: string;
          user_id: string;
          is_anonymous: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          content: string;
          user_id: string;
          is_anonymous?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          content?: string;
          user_id?: string;
          is_anonymous?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      prayer_reactions: {
        Row: {
          request_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          request_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          request_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      posts: {
        Row: {
          id: string;
          user_id: string;
          category: PostCategory;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category: PostCategory;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category?: PostCategory;
          content?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      comments: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          user_id?: string;
          content?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
