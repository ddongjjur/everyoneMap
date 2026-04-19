export type Database = {
  public: {
    Tables: {
      couples: {
        Row: {
          id: string;
          code: string;
          creator_id: string | null;
          partner_id: string | null;
          creator_name: string | null;
          partner_name: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          creator_id?: string | null;
          partner_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          creator_id?: string | null;
          partner_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      city_records: {
        Row: {
          id: string;
          couple_id: string;
          city_id: string;
          city_name: string | null;
          memo: string;
          visit_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          couple_id: string;
          city_id: string;
          city_name?: string | null;
          memo?: string;
          visit_date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          couple_id?: string;
          city_id?: string;
          city_name?: string | null;
          memo?: string;
          visit_date?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      places: {
        Row: {
          id: string;
          city_record_id: string;
          name: string;
          order_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          city_record_id: string;
          name: string;
          order_index?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          city_record_id?: string;
          name?: string;
          order_index?: number;
        };
        Relationships: [];
      };
      photos: {
        Row: {
          id: string;
          city_record_id: string;
          storage_path: string;
          caption: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          city_record_id: string;
          storage_path: string;
          caption?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          caption?: string;
        };
        Relationships: [];
      };
      grapes: {
        Row: {
          id: string;
          couple_id: string;
          user_id: string | null;
          small_count: number;
          large_exchanged: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          couple_id: string;
          user_id?: string | null;
          small_count?: number;
          large_exchanged?: number;
          updated_at?: string;
        };
        Update: {
          small_count?: number;
          large_exchanged?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      coupons: {
        Row: {
          id: string;
          couple_id: string;
          user_id: string | null;
          grape_count: number;
          issued_at: string;
          used: boolean;
          used_at: string | null;
          used_place: string | null;
          used_amount: number | null;
        };
        Insert: {
          id?: string;
          couple_id: string;
          user_id?: string | null;
          grape_count?: number;
          issued_at?: string;
          used?: boolean;
          used_at?: string | null;
          used_place?: string | null;
          used_amount?: number | null;
        };
        Update: {
          used?: boolean;
          used_at?: string | null;
          used_place?: string | null;
          used_amount?: number | null;
        };
        Relationships: [];
      };
      grape_requests: {
        Row: {
          id: string;
          couple_id: string;
          requester_id: string;
          target_user_id: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          couple_id: string;
          requester_id: string;
          target_user_id?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          status?: string;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at?: string;
        };
        Update: {
          endpoint?: string;
          p256dh?: string;
          auth?: string;
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
