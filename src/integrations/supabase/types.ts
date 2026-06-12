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
      applicants: {
        Row: {
          created_at: string
          email: string
          email_verified: boolean
          full_name: string
          id: string
          job_id: string | null
          linkedin_url: string | null
          no_linkedin: boolean
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          email_verified?: boolean
          full_name: string
          id?: string
          job_id?: string | null
          linkedin_url?: string | null
          no_linkedin?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          email_verified?: boolean
          full_name?: string
          id?: string
          job_id?: string | null
          linkedin_url?: string | null
          no_linkedin?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applicants_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "explore_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
          target_type: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      benchmark_results: {
        Row: {
          ai_response: string | null
          attempts: Json | null
          created_at: string
          id: string
          latency_ms: number | null
          max_score: number
          metadata: Json | null
          model: string
          pass_at_1: boolean | null
          pass_at_n: boolean | null
          score: number | null
          status: string
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_response?: string | null
          attempts?: Json | null
          created_at?: string
          id?: string
          latency_ms?: number | null
          max_score?: number
          metadata?: Json | null
          model?: string
          pass_at_1?: boolean | null
          pass_at_n?: boolean | null
          score?: number | null
          status?: string
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_response?: string | null
          attempts?: Json | null
          created_at?: string
          id?: string
          latency_ms?: number | null
          max_score?: number
          metadata?: Json | null
          model?: string
          pass_at_1?: boolean | null
          pass_at_n?: boolean | null
          score?: number | null
          status?: string
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "benchmark_results_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "benchmark_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      benchmark_reviews: {
        Row: {
          comments: string | null
          created_at: string
          id: string
          override_score: number | null
          result_id: string
          reviewer_id: string
          status: string
          updated_at: string
        }
        Insert: {
          comments?: string | null
          created_at?: string
          id?: string
          override_score?: number | null
          result_id: string
          reviewer_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          comments?: string | null
          created_at?: string
          id?: string
          override_score?: number | null
          result_id?: string
          reviewer_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "benchmark_reviews_result_id_fkey"
            columns: ["result_id"]
            isOneToOne: false
            referencedRelation: "benchmark_results"
            referencedColumns: ["id"]
          },
        ]
      }
      benchmark_tasks: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          difficulty: string
          expected_output: string | null
          id: string
          input_data: string | null
          input_type: string
          is_active: boolean
          max_score: number
          prompt: string
          rubric: Json
          system_prompt: string | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          difficulty?: string
          expected_output?: string | null
          id?: string
          input_data?: string | null
          input_type?: string
          is_active?: boolean
          max_score?: number
          prompt: string
          rubric?: Json
          system_prompt?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          difficulty?: string
          expected_output?: string | null
          id?: string
          input_data?: string | null
          input_type?: string
          is_active?: boolean
          max_score?: number
          prompt?: string
          rubric?: Json
          system_prompt?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      blogs: {
        Row: {
          author: string | null
          category: string | null
          content: string | null
          created_at: string
          id: string
          image_url: string | null
          read_time: string | null
          short_description: string | null
          slug: string
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author?: string | null
          category?: string | null
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          read_time?: string | null
          short_description?: string | null
          slug: string
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author?: string | null
          category?: string | null
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          read_time?: string | null
          short_description?: string | null
          slug?: string
          status?: string | null
          title?: string
          updated_at?: string
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
      feature_flags: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean | null
          flag_key: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean | null
          flag_key: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean | null
          flag_key?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      idempotency_keys: {
        Row: {
          completed_at: string | null
          created_at: string
          expires_at: string
          id: string
          key: string
          request_hash: string | null
          response_body: Json | null
          response_status: number | null
          scope: string
          status: string
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          key: string
          request_hash?: string | null
          response_body?: Json | null
          response_status?: number | null
          scope: string
          status?: string
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          key?: string
          request_hash?: string | null
          response_body?: Json | null
          response_status?: number | null
          scope?: string
          status?: string
          user_id?: string | null
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
      payout_accounts: {
        Row: {
          account_holder_name: string | null
          account_number: string | null
          bank_country: string | null
          business_country: string | null
          business_structure: string | null
          business_type: string | null
          country: string | null
          created_at: string
          currency: string | null
          email: string | null
          iban: string | null
          id: string
          id_uploaded: boolean | null
          legal_business_name: string | null
          payment_provider: string | null
          phone_verified: boolean | null
          product_description: string | null
          selfie_uploaded: boolean | null
          setup_completed: boolean | null
          sort_code: string | null
          tax_agreed: boolean | null
          tax_country: string | null
          tax_full_name: string | null
          tax_signature: string | null
          trading_name: string | null
          updated_at: string
          user_id: string
          verified_phone: string | null
        }
        Insert: {
          account_holder_name?: string | null
          account_number?: string | null
          bank_country?: string | null
          business_country?: string | null
          business_structure?: string | null
          business_type?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          email?: string | null
          iban?: string | null
          id?: string
          id_uploaded?: boolean | null
          legal_business_name?: string | null
          payment_provider?: string | null
          phone_verified?: boolean | null
          product_description?: string | null
          selfie_uploaded?: boolean | null
          setup_completed?: boolean | null
          sort_code?: string | null
          tax_agreed?: boolean | null
          tax_country?: string | null
          tax_full_name?: string | null
          tax_signature?: string | null
          trading_name?: string | null
          updated_at?: string
          user_id: string
          verified_phone?: string | null
        }
        Update: {
          account_holder_name?: string | null
          account_number?: string | null
          bank_country?: string | null
          business_country?: string | null
          business_structure?: string | null
          business_type?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          email?: string | null
          iban?: string | null
          id?: string
          id_uploaded?: boolean | null
          legal_business_name?: string | null
          payment_provider?: string | null
          phone_verified?: boolean | null
          product_description?: string | null
          selfie_uploaded?: boolean | null
          setup_completed?: boolean | null
          sort_code?: string | null
          tax_agreed?: boolean | null
          tax_country?: string | null
          tax_full_name?: string | null
          tax_signature?: string | null
          trading_name?: string | null
          updated_at?: string
          user_id?: string
          verified_phone?: string | null
        }
        Relationships: []
      }
      payout_history: {
        Row: {
          amount: number | null
          created_at: string
          description: string | null
          id: string
          status: string | null
          user_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          description?: string | null
          id?: string
          status?: string | null
          user_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          description?: string | null
          id?: string
          status?: string | null
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
          agree_to_remain: boolean | null
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
          interview_completed: boolean | null
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
          signature_date: string | null
          signature_name: string | null
          signature_text: string | null
          state: string | null
          updated_at: string
          user_id: string
          work_experience: Json | null
          work_from_different_country: boolean | null
        }
        Insert: {
          agree_to_remain?: boolean | null
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
          interview_completed?: boolean | null
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
          signature_date?: string | null
          signature_name?: string | null
          signature_text?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
          work_experience?: Json | null
          work_from_different_country?: boolean | null
        }
        Update: {
          agree_to_remain?: boolean | null
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
          interview_completed?: boolean | null
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
          signature_date?: string | null
          signature_name?: string | null
          signature_text?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
          work_experience?: Json | null
          work_from_different_country?: boolean | null
        }
        Relationships: []
      }
      rate_limit_buckets: {
        Row: {
          bucket_key: string
          count: number
          expires_at: string
          id: string
          window_start: string
        }
        Insert: {
          bucket_key: string
          count?: number
          expires_at: string
          id?: string
          window_start?: string
        }
        Update: {
          bucket_key?: string
          count?: number
          expires_at?: string
          id?: string
          window_start?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referral_code: string | null
          referred_email: string
          referrer_id: string
          reward_amount: number | null
          status: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          referral_code?: string | null
          referred_email: string
          referrer_id: string
          reward_amount?: number | null
          status?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          referral_code?: string | null
          referred_email?: string
          referrer_id?: string
          reward_amount?: number | null
          status?: string | null
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
      secrets: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          hint: string | null
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          hint?: string | null
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          hint?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: string
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
      webhook_deliveries: {
        Row: {
          body_preview: string | null
          created_at: string
          endpoint_name: string
          headers: Json | null
          id: string
          reason: string | null
          status_code: number | null
          verified: boolean
        }
        Insert: {
          body_preview?: string | null
          created_at?: string
          endpoint_name: string
          headers?: Json | null
          id?: string
          reason?: string | null
          status_code?: number | null
          verified?: boolean
        }
        Update: {
          body_preview?: string | null
          created_at?: string
          endpoint_name?: string
          headers?: Json | null
          id?: string
          reason?: string | null
          status_code?: number | null
          verified?: boolean
        }
        Relationships: []
      }
      webhook_endpoints: {
        Row: {
          algorithm: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          secret_key_name: string
          signature_header: string
          tolerance_seconds: number
          updated_at: string
        }
        Insert: {
          algorithm?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          secret_key_name: string
          signature_header?: string
          tolerance_seconds?: number
          updated_at?: string
        }
        Update: {
          algorithm?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          secret_key_name?: string
          signature_header?: string
          tolerance_seconds?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_rate_buckets: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      rate_limit_hit: {
        Args: { _key: string; _window_ms: number }
        Returns: {
          current_count: number
          reset_ms: number
        }[]
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "moderator"
        | "user"
        | "employer"
        | "reviewer"
        | "viewer"
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
      app_role: [
        "admin",
        "moderator",
        "user",
        "employer",
        "reviewer",
        "viewer",
      ],
    },
  },
} as const
