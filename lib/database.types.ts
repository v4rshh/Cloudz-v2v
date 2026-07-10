export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          phone_number: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          phone_number?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          phone_number?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      trusted_contacts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          phone_number: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          phone_number: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          phone_number?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      incident_reports: {
        Row: {
          id: string;
          location: unknown;
          raw_text: string;
          category: string;
          severity: number;
          confidence_score: number;
          status: string;
          anonymous: boolean;
          user_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          location: unknown;
          raw_text: string;
          category: string;
          severity: number;
          confidence_score?: number;
          status?: string;
          anonymous?: boolean;
          user_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          location?: unknown;
          raw_text?: string;
          category?: string;
          severity?: number;
          confidence_score?: number;
          status?: string;
          anonymous?: boolean;
          user_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      vibe_tags: {
        Row: {
          id: string;
          location: unknown;
          tag: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          location: unknown;
          tag: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          location?: unknown;
          tag?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      sos_events: {
        Row: {
          id: string;
          user_id: string | null;
          location: unknown;
          status: string;
          resolved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          location: unknown;
          status?: string;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          location?: unknown;
          status?: string;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_sos_event: {
        Args: {
          p_user_id: string | null;
          p_lat: number;
          p_lng: number;
          p_status?: string;
        };
        Returns: string;
      };
      get_sos_event: {
        Args: {
          p_id: string;
        };
        Returns: {
          id: string;
          user_id: string | null;
          lat: number;
          lng: number;
          status: string;
          created_at: string;
          updated_at: string;
        }[];
      };
      update_sos_location: {
        Args: {
          p_id: string;
          p_lat: number;
          p_lng: number;
        };
        Returns: undefined;
      };
      create_incident_report: {
        Args: {
          p_lat: number;
          p_lng: number;
          p_category: string;
          p_raw_text: string;
          p_severity: number;
          p_confidence_score?: number;
          p_anonymous?: boolean;
        };
        Returns: string;
      };
      create_vibe_tag: {
        Args: {
          p_lat: number;
          p_lng: number;
          p_tag: string;
        };
        Returns: string;
      };
      get_vibe_tags: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          tag: string;
          lat: number;
          lng: number;
          created_at: string;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type SosEventRow = Database["public"]["Functions"]["get_sos_event"]["Returns"][number];
