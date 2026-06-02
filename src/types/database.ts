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
export type ProfileRole = "leader" | "admin" | "member" | "general";
export type TeamRoleCode = "L" | "M" | "S" | "D" | "A/G" | "B/G" | "E/G" | "V" | "STAFF";
export type SetlistStatus = "prep" | "confirmed";
export type AttendanceStatus = "attending" | "late" | "absent";
export type AttendanceEventType = "practice" | "worship";
export type ScheduleKind = "practice" | "worship" | "social";
export type ScheduleAttendanceStatus = "attending" | "absent";
export type PostCategory = "prayer" | "feedback" | "general";
export type FaithCheckType = "qt" | "prayer" | "bible";
export type ShopItemType = "avatar" | "frame" | "badge";

/** chord_sheet_blocks.section_tag — DB check 제약과 동일 */
export type ChordSheetSectionTag = "I" | "A" | "B" | "C" | "간주" | "O";
export type ChordSheetArrangementPosition = "below_title" | "top_right" | "after_lyrics";

export type ChordSheetHistoryAction = "block_insert" | "block_update" | "block_delete" | "reorder";

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
          sheet_music_url: string | null;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          youtube_url?: string | null;
          sheet_music_url?: string | null;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          youtube_url?: string | null;
          sheet_music_url?: string | null;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      auth_codes: {
        Row: {
          id: number;
          code: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: number;
          code: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          id?: number;
          code?: string;
          updated_at?: string;
          updated_by?: string | null;
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
      chord_sheet_documents: {
        Row: {
          id: string;
          song_id: string;
          title: string | null;
          arrangement: Json;
          arrangement_position: ChordSheetArrangementPosition;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          song_id: string;
          title?: string | null;
          arrangement?: Json;
          arrangement_position?: ChordSheetArrangementPosition;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          song_id?: string;
          title?: string | null;
          arrangement?: Json;
          arrangement_position?: ChordSheetArrangementPosition;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      chord_sheet_blocks: {
        Row: {
          id: string;
          document_id: string;
          section_tag: ChordSheetSectionTag;
          custom_label: string | null;
          order_index: number;
          lines_json: Json;
          transpose_semitones: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          section_tag: ChordSheetSectionTag;
          custom_label?: string | null;
          order_index: number;
          lines_json?: Json;
          transpose_semitones?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          section_tag?: ChordSheetSectionTag;
          custom_label?: string | null;
          order_index?: number;
          lines_json?: Json;
          transpose_semitones?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      chord_sheet_history: {
        Row: {
          id: string;
          document_id: string;
          block_id: string | null;
          action: ChordSheetHistoryAction;
          snapshot_before: Json;
          snapshot_after: Json | null;
          actor_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          block_id?: string | null;
          action: ChordSheetHistoryAction;
          snapshot_before: Json;
          snapshot_after?: Json | null;
          actor_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          block_id?: string | null;
          action?: ChordSheetHistoryAction;
          snapshot_before?: Json;
          snapshot_after?: Json | null;
          actor_id?: string;
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
          category: ShopItemType;
          image_url: string;
          effect_value: string;
          price_points: number;
          is_active: boolean;
          stock: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          category: ShopItemType;
          image_url: string;
          effect_value: string;
          price_points: number;
          is_active?: boolean;
          stock?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          category?: ShopItemType;
          image_url?: string;
          effect_value?: string;
          price_points?: number;
          is_active?: boolean;
          stock?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      inventory_marketplace_listings: {
        Row: {
          id: string;
          seller_id: string;
          inventory_id: string;
          shop_item_id: string;
          price_points: number;
          status: "active" | "sold" | "cancelled";
          buyer_id: string | null;
          sold_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          seller_id: string;
          inventory_id: string;
          shop_item_id: string;
          price_points: number;
          status?: "active" | "sold" | "cancelled";
          buyer_id?: string | null;
          sold_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          seller_id?: string;
          inventory_id?: string;
          shop_item_id?: string;
          price_points?: number;
          status?: "active" | "sold" | "cancelled";
          buyer_id?: string | null;
          sold_at?: string | null;
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
      team_members: {
        Row: {
          id: string;
          user_id: string;
          team_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          team_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          team_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey";
            columns: ["team_id"];
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_members_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      teams: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      weekly_checklists: {
        Row: {
          id: string;
          user_id: string;
          week_start_date: string;
          daily_records: Json;
          worship_records: Json;
          total_points: number;
          awarded_points: number;
          is_submitted: boolean;
          submitted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          week_start_date: string;
          daily_records?: Json;
          worship_records?: Json;
          total_points?: number;
          awarded_points?: number;
          is_submitted?: boolean;
          submitted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          week_start_date?: string;
          daily_records?: Json;
          worship_records?: Json;
          total_points?: number;
          awarded_points?: number;
          is_submitted?: boolean;
          submitted_at?: string | null;
          created_at?: string;
          updated_at?: string;
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
      ai_reports: {
        Row: {
          id: string;
          week_start_date: string;
          week_end_date: string;
          summary: string;
          keywords: string[];
          stats: Json;
          generated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          week_start_date: string;
          week_end_date: string;
          summary: string;
          keywords?: string[];
          stats?: Json;
          generated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          week_start_date?: string;
          week_end_date?: string;
          summary?: string;
          keywords?: string[];
          stats?: Json;
          generated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth_key: string;
          user_agent: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth_key: string;
          user_agent?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          endpoint?: string;
          p256dh?: string;
          auth_key?: string;
          user_agent?: string | null;
          created_at?: string;
          updated_at?: string;
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
    Functions: {
      calculate_weekly_checklist_points: {
        Args: {
          p_daily_records: Json;
          p_worship_records: Json;
        };
        Returns: number;
      };
      purchase_shop_item: {
        Args: {
          p_item_id: string;
        };
        Returns: Json;
      };
      create_inventory_listing: {
        Args: {
          p_inventory_id: string;
          p_price_points: number;
        };
        Returns: Json;
      };
      cancel_inventory_listing: {
        Args: {
          p_listing_id: string;
        };
        Returns: Json;
      };
      purchase_inventory_listing: {
        Args: {
          p_listing_id: string;
        };
        Returns: Json;
      };
      reorder_chord_sheet_blocks: {
        Args: {
          p_document_id: string;
          p_block_ids: string[];
        };
        Returns: undefined;
      };
      replace_chord_sheet_structure: {
        Args: {
          p_document_id: string;
          p_blocks: Json;
          p_arrangement_position?: string;
        };
        Returns: undefined;
      };
      set_chord_sheet_arrangement: {
        Args: {
          p_document_id: string;
          p_arrangement: Json;
        };
        Returns: undefined;
      };
      submit_weekly_checklist: {
        Args: {
          p_week_start_date: string;
        };
        Returns: {
          awarded_points: number;
          total_points: number;
          message: string;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
