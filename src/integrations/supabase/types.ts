export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          applied_at: string
          id: string
          job_id: string | null
          role_id: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          applied_at?: string
          id?: string
          job_id?: string | null
          role_id?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          applied_at?: string
          id?: string
          job_id?: string | null
          role_id?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      assessments: {
        Row: {
          created_at: string
          id: string
          score: number | null
          status: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          score?: number | null
          status?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          score?: number | null
          status?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contracts: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          start_date: string | null
          status: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          start_date?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          start_date?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      employer_billing: {
        Row: {
          candidate_name: string | null
          created_at: string
          employer_id: string
          fee: number | null
          hire_date: string | null
          id: string
          job_title: string | null
          status: string | null
        }
        Insert: {
          candidate_name?: string | null
          created_at?: string
          employer_id: string
          fee?: number | null
          hire_date?: string | null
          id?: string
          job_title?: string | null
          status?: string | null
        }
        Update: {
          candidate_name?: string | null
          created_at?: string
          employer_id?: string
          fee?: number | null
          hire_date?: string | null
          id?: string
          job_title?: string | null
          status?: string | null
        }
        Relationships: []
      }
      employer_candidates: {
        Row: {
          ai_score: number | null
          applied_at: string
          candidate_name: string | null
          email: string | null
          employer_id: string
          experience: number | null
          id: string
          job_id: string | null
          notes: string | null
          phone: string | null
          resume_url: string | null
          skills: string[] | null
          status: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          ai_score?: number | null
          applied_at?: string
          candidate_name?: string | null
          email?: string | null
          employer_id: string
          experience?: number | null
          id?: string
          job_id?: string | null
          notes?: string | null
          phone?: string | null
          resume_url?: string | null
          skills?: string[] | null
          status?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          ai_score?: number | null
          applied_at?: string
          candidate_name?: string | null
          email?: string | null
          employer_id?: string
          experience?: number | null
          id?: string
          job_id?: string | null
          notes?: string | null
          phone?: string | null
          resume_url?: string | null
          skills?: string[] | null
          status?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      employer_interviews: {
        Row: {
          candidate_id: string | null
          candidate_name: string | null
          created_at: string
          employer_id: string
          feedback: string | null
          id: string
          job_id: string | null
          job_title: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          status: string | null
        }
        Insert: {
          candidate_id?: string | null
          candidate_name?: string | null
          created_at?: string
          employer_id: string
          feedback?: string | null
          id?: string
          job_id?: string | null
          job_title?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: string | null
        }
        Update: {
          candidate_id?: string | null
          candidate_name?: string | null
          created_at?: string
          employer_id?: string
          feedback?: string | null
          id?: string
          job_id?: string | null
          job_title?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: string | null
        }
        Relationships: []
      }
      employer_jobs: {
        Row: {
          budget: string | null
          candidate_count: number | null
          created_at: string
          department: string | null
          description: string | null
          employer_id: string
          id: string
          location: string | null
          skills: string[] | null
          status: string | null
          title: string
          type: string | null
          updated_at: string
        }
        Insert: {
          budget?: string | null
          candidate_count?: number | null
          created_at?: string
          department?: string | null
          description?: string | null
          employer_id: string
          id?: string
          location?: string | null
          skills?: string[] | null
          status?: string | null
          title: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          budget?: string | null
          candidate_count?: number | null
          created_at?: string
          department?: string | null
          description?: string | null
          employer_id?: string
          id?: string
          location?: string | null
          skills?: string[] | null
          status?: string | null
          title?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      explore_jobs: {
        Row: {
          allow_direct_apply: boolean | null
          application_limit: number | null
          applications_count: number | null
          auto_match_only: boolean | null
          budget: string | null
          clicks_count: number | null
          company_name: string | null
          compliance_info: Json | null
          created_at: string
          created_by: string | null
          description: string | null
          experience: string | null
          expiry_date: string | null
          featured: boolean | null
          geo_targeting: string[] | null
          id: string
          internal_notes: string | null
          job_type: string | null
          location: string | null
          meta_description: string | null
          meta_title: string | null
          short_description: string | null
          show_company: boolean | null
          show_salary: boolean | null
          skill_targeting: string[] | null
          skills: string[] | null
          slug: string | null
          source_requirement_id: string | null
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string
          urgency: string | null
          views_count: number | null
          visibility: string | null
        }
        Insert: {
          allow_direct_apply?: boolean | null
          application_limit?: number | null
          applications_count?: number | null
          auto_match_only?: boolean | null
          budget?: string | null
          clicks_count?: number | null
          company_name?: string | null
          compliance_info?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          experience?: string | null
          expiry_date?: string | null
          featured?: boolean | null
          geo_targeting?: string[] | null
          id?: string
          internal_notes?: string | null
          job_type?: string | null
          location?: string | null
          meta_description?: string | null
          meta_title?: string | null
          short_description?: string | null
          show_company?: boolean | null
          show_salary?: boolean | null
          skill_targeting?: string[] | null
          skills?: string[] | null
          slug?: string | null
          source_requirement_id?: string | null
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          urgency?: string | null
          views_count?: number | null
          visibility?: string | null
        }
        Update: {
          allow_direct_apply?: boolean | null
          application_limit?: number | null
          applications_count?: number | null
          auto_match_only?: boolean | null
          budget?: string | null
          clicks_count?: number | null
          company_name?: string | null
          compliance_info?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          experience?: string | null
          expiry_date?: string | null
          featured?: boolean | null
          geo_targeting?: string[] | null
          id?: string
          internal_notes?: string | null
          job_type?: string | null
          location?: string | null
          meta_description?: string | null
          meta_title?: string | null
          short_description?: string | null
          show_company?: boolean | null
          show_salary?: boolean | null
          skill_targeting?: string[] | null
          skills?: string[] | null
          slug?: string | null
          source_requirement_id?: string | null
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          urgency?: string | null
          views_count?: number | null
          visibility?: string | null
        }
        Relationships: []
      }
      job_analytics: {
        Row: {
          created_at: string
          event_type: string
          id: string
          job_id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          job_id: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          job_id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      job_applications: {
        Row: {
          created_at: string
          id: string
          job_id: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      job_bookmarks: {
        Row: {
          created_at: string
          id: string
          job_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string | null
          created_at: string
          id: string
          is_read: boolean | null
          title: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          title: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          company: string | null
          created_at: string
          id: string
          status: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          id?: string
          status?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string
          id?: string
          status?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_stats: {
        Row: {
          id: string
          stat_key: string
          stat_value: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          stat_key: string
          stat_value?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          stat_key?: string
          stat_value?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          authorized_to_work: boolean | null
          availability_set: boolean | null
          city: string | null
          codechef: string | null
          codeforces: string | null
          country: string | null
          created_at: string
          dob: string | null
          education: Json | null
          email: string | null
          full_name: string | null
          github: string | null
          id: string
          leetcode: string | null
          linkedin: string | null
          no_linkedin: boolean | null
          no_resume: boolean | null
          onboarding_completed: boolean | null
          other_links: string[] | null
          phone: string | null
          portfolio: string | null
          postal_code: string | null
          resume_name: string | null
          signature_name: string | null
          state: string | null
          updated_at: string
          user_id: string
          work_experience: Json | null
          work_from_different_country: boolean | null
        }
        Insert: {
          authorized_to_work?: boolean | null
          availability_set?: boolean | null
          city?: string | null
          codechef?: string | null
          codeforces?: string | null
          country?: string | null
          created_at?: string
          dob?: string | null
          education?: Json | null
          email?: string | null
          full_name?: string | null
          github?: string | null
          id?: string
          leetcode?: string | null
          linkedin?: string | null
          no_linkedin?: boolean | null
          no_resume?: boolean | null
          onboarding_completed?: boolean | null
          other_links?: string[] | null
          phone?: string | null
          portfolio?: string | null
          postal_code?: string | null
          resume_name?: string | null
          signature_name?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
          work_experience?: Json | null
          work_from_different_country?: boolean | null
        }
        Update: {
          authorized_to_work?: boolean | null
          availability_set?: boolean | null
          city?: string | null
          codechef?: string | null
          codeforces?: string | null
          country?: string | null
          created_at?: string
          dob?: string | null
          education?: Json | null
          email?: string | null
          full_name?: string | null
          github?: string | null
          id?: string
          leetcode?: string | null
          linkedin?: string | null
          no_linkedin?: boolean | null
          no_resume?: boolean | null
          onboarding_completed?: boolean | null
          other_links?: string[] | null
          phone?: string | null
          portfolio?: string | null
          postal_code?: string | null
          resume_name?: string | null
          signature_name?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
          work_experience?: Json | null
          work_from_different_country?: boolean | null
        }
        Relationships: []
      }
      roles: {
        Row: {
          category: string | null
          contingent: boolean | null
          created_at: string
          description: string | null
          hired_count: number | null
          id: string
          location: string | null
          pay: string | null
          referral_bonus: string | null
          requirements: string[] | null
          title: string
          type: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          contingent?: boolean | null
          created_at?: string
          description?: string | null
          hired_count?: number | null
          id?: string
          location?: string | null
          pay?: string | null
          referral_bonus?: string | null
          requirements?: string[] | null
          title: string
          type?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          contingent?: boolean | null
          created_at?: string
          description?: string | null
          hired_count?: number | null
          id?: string
          location?: string | null
          pay?: string | null
          referral_bonus?: string | null
          requirements?: string[] | null
          title?: string
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      saved_roles: {
        Row: {
          id: string
          role_id: string | null
          saved_at: string
          user_id: string
        }
        Insert: {
          id?: string
          role_id?: string | null
          saved_at?: string
          user_id: string
        }
        Update: {
          id?: string
          role_id?: string | null
          saved_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "employer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user", "employer"],
    },
  },
} as const
