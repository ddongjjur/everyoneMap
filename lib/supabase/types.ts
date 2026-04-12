export type Database = {
  public: {
    Tables: {
      couples: {
        Row: {
          id: string;
          code: string;
          creator_id: string | null;
          partner_id: string | null;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
