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
      affiliates: {
        Row: {
          affiliate_user_id: string
          commission_percent: number
          created_at: string | null
          creator_id: string
          id: string
          is_active: boolean | null
          metadata: Json | null
          updated_at: string | null
        }
        Insert: {
          affiliate_user_id: string
          commission_percent?: number
          created_at?: string | null
          creator_id: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          updated_at?: string | null
        }
        Update: {
          affiliate_user_id?: string
          commission_percent?: number
          created_at?: string | null
          creator_id?: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_aff_creator"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_aff_user"
            columns: ["affiliate_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      api_rate_limits: {
        Row: {
          created_at: string | null
          creator_id: string
          endpoint: string
          id: string
          metadata: Json | null
          method: string
          request_count: number | null
          updated_at: string | null
          window_end: string
          window_start: string
        }
        Insert: {
          created_at?: string | null
          creator_id: string
          endpoint: string
          id?: string
          metadata?: Json | null
          method?: string
          request_count?: number | null
          updated_at?: string | null
          window_end?: string
          window_start?: string
        }
        Update: {
          created_at?: string | null
          creator_id?: string
          endpoint?: string
          id?: string
          metadata?: Json | null
          method?: string
          request_count?: number | null
          updated_at?: string | null
          window_end?: string
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_api_rate_limit_creator"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      background_jobs: {
        Row: {
          attempts: number | null
          created_at: string | null
          id: string
          job_type: string
          last_error: string | null
          payload: Json
          status: string | null
          updated_at: string | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          id?: string
          job_type: string
          last_error?: string | null
          payload: Json
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          id?: string
          job_type?: string
          last_error?: string | null
          payload?: Json
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          content: string | null
          created_at: string | null
          creator_id: string
          custom_css: string | null
          custom_head_html: string | null
          custom_js: string | null
          description: string | null
          duration_seconds: number | null
          id: string
          is_free: boolean | null
          is_published: boolean | null
          metadata: Json | null
          product_id: string | null
          published_at: string | null
          search_vector: unknown
          site_id: string
          slug: string
          sort_order: number | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          video_embed_url: string | null
          video_source: string | null
          video_url: string | null
          view_count: number | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          creator_id: string
          custom_css?: string | null
          custom_head_html?: string | null
          custom_js?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_free?: boolean | null
          is_published?: boolean | null
          metadata?: Json | null
          product_id?: string | null
          published_at?: string | null
          search_vector?: unknown
          site_id: string
          slug: string
          sort_order?: number | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          video_embed_url?: string | null
          video_source?: string | null
          video_url?: string | null
          view_count?: number | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          creator_id?: string
          custom_css?: string | null
          custom_head_html?: string | null
          custom_js?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_free?: boolean | null
          is_published?: boolean | null
          metadata?: Json | null
          product_id?: string | null
          published_at?: string | null
          search_vector?: unknown
          site_id?: string
          slug?: string
          sort_order?: number | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          video_embed_url?: string | null
          video_source?: string | null
          video_url?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_blog_posts_creator"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_blog_posts_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_blog_posts_site"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      builder_assets: {
        Row: {
          asset_type: Database["public"]["Enums"]["builder_asset_type"]
          created_at: string | null
          creator_id: string
          id: string
          metadata: Json | null
          name: string
          source: string | null
          storage_url: string
          tags: string[] | null
          thumbnail_url: string | null
        }
        Insert: {
          asset_type: Database["public"]["Enums"]["builder_asset_type"]
          created_at?: string | null
          creator_id: string
          id?: string
          metadata?: Json | null
          name: string
          source?: string | null
          storage_url: string
          tags?: string[] | null
          thumbnail_url?: string | null
        }
        Update: {
          asset_type?: Database["public"]["Enums"]["builder_asset_type"]
          created_at?: string | null
          creator_id?: string
          id?: string
          metadata?: Json | null
          name?: string
          source?: string | null
          storage_url?: string
          tags?: string[] | null
          thumbnail_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_ba_creator"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      builder_fonts: {
        Row: {
          created_at: string | null
          creator_id: string
          font_family: string
          font_name: string
          google_font_id: string | null
          id: string
          is_active: boolean | null
          site_id: string
          source: Database["public"]["Enums"]["font_source_type"]
          storage_url: string | null
          variants: Json | null
        }
        Insert: {
          created_at?: string | null
          creator_id: string
          font_family: string
          font_name: string
          google_font_id?: string | null
          id?: string
          is_active?: boolean | null
          site_id: string
          source?: Database["public"]["Enums"]["font_source_type"]
          storage_url?: string | null
          variants?: Json | null
        }
        Update: {
          created_at?: string | null
          creator_id?: string
          font_family?: string
          font_name?: string
          google_font_id?: string | null
          id?: string
          is_active?: boolean | null
          site_id?: string
          source?: Database["public"]["Enums"]["font_source_type"]
          storage_url?: string | null
          variants?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_bf_creator"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bf_site"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      conversion_events: {
        Row: {
          created_at: string
          event_type: Database["public"]["Enums"]["conversion_event_type"]
          id: string
          order_id: string | null
          product_id: string | null
          revenue: number | null
          session_id: string | null
          site_id: string
        }
        Insert: {
          created_at?: string
          event_type: Database["public"]["Enums"]["conversion_event_type"]
          id?: string
          order_id?: string | null
          product_id?: string | null
          revenue?: number | null
          session_id?: string | null
          site_id: string
        }
        Update: {
          created_at?: string
          event_type?: Database["public"]["Enums"]["conversion_event_type"]
          id?: string
          order_id?: string | null
          product_id?: string | null
          revenue?: number | null
          session_id?: string | null
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_ce_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ce_site"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string | null
          creator_id: string
          current_uses: number | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          id: string
          is_active: boolean | null
          max_uses: number | null
          metadata: Json | null
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          creator_id: string
          current_uses?: number | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          metadata?: Json | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          creator_id?: string
          current_uses?: number | null
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          metadata?: Json | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_coupons_creator"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_balances: {
        Row: {
          creator_id: string
          currency: string | null
          id: string
          pending_payout: number
          total_earnings: number
          total_paid_out: number
          total_platform_fees: number
          updated_at: string | null
        }
        Insert: {
          creator_id: string
          currency?: string | null
          id?: string
          pending_payout?: number
          total_earnings?: number
          total_paid_out?: number
          total_platform_fees?: number
          updated_at?: string | null
        }
        Update: {
          creator_id?: string
          currency?: string | null
          id?: string
          pending_payout?: number
          total_earnings?: number
          total_paid_out?: number
          total_platform_fees?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_creator_balances_creator"
            columns: ["creator_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_kyc: {
        Row: {
          aadhaar_last4: string | null
          address_line1: string | null
          address_line2: string | null
          bank_account_enc: string | null
          bank_account_name: string | null
          bank_last4: string | null
          bank_verification_provider: string | null
          bank_verification_ref: string | null
          bank_verified: boolean | null
          bank_verified_at: string | null
          beneficiary_id: string | null
          beneficiary_metadata: Json | null
          city: string | null
          country: string | null
          created_at: string | null
          creator_id: string
          dob: string | null
          document_hashes: Json | null
          document_urls: Json | null
          full_name: string | null
          gender: string | null
          id: string
          ifsc_code: string | null
          kyc_level: string
          legal_name: string | null
          metadata: Json | null
          notes: string | null
          pan_enc: string | null
          pan_last4: string | null
          pan_name: string | null
          pan_verification_provider: string | null
          pan_verification_ref: string | null
          pan_verified: boolean | null
          pan_verified_at: string | null
          postal_code: string | null
          provider_verification_id: string | null
          rejected_at: string | null
          rejection_reason: string | null
          state: string | null
          status: string
          updated_at: string | null
          upi_id_enc: string | null
          upi_verification_provider: string | null
          upi_verification_ref: string | null
          upi_verified: boolean | null
          upi_verified_at: string | null
          verification_provider: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          aadhaar_last4?: string | null
          address_line1?: string | null
          address_line2?: string | null
          bank_account_enc?: string | null
          bank_account_name?: string | null
          bank_last4?: string | null
          bank_verification_provider?: string | null
          bank_verification_ref?: string | null
          bank_verified?: boolean | null
          bank_verified_at?: string | null
          beneficiary_id?: string | null
          beneficiary_metadata?: Json | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          creator_id: string
          dob?: string | null
          document_hashes?: Json | null
          document_urls?: Json | null
          full_name?: string | null
          gender?: string | null
          id?: string
          ifsc_code?: string | null
          kyc_level?: string
          legal_name?: string | null
          metadata?: Json | null
          notes?: string | null
          pan_enc?: string | null
          pan_last4?: string | null
          pan_name?: string | null
          pan_verification_provider?: string | null
          pan_verification_ref?: string | null
          pan_verified?: boolean | null
          pan_verified_at?: string | null
          postal_code?: string | null
          provider_verification_id?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          state?: string | null
          status?: string
          updated_at?: string | null
          upi_id_enc?: string | null
          upi_verification_provider?: string | null
          upi_verification_ref?: string | null
          upi_verified?: boolean | null
          upi_verified_at?: string | null
          verification_provider?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          aadhaar_last4?: string | null
          address_line1?: string | null
          address_line2?: string | null
          bank_account_enc?: string | null
          bank_account_name?: string | null
          bank_last4?: string | null
          bank_verification_provider?: string | null
          bank_verification_ref?: string | null
          bank_verified?: boolean | null
          bank_verified_at?: string | null
          beneficiary_id?: string | null
          beneficiary_metadata?: Json | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          creator_id?: string
          dob?: string | null
          document_hashes?: Json | null
          document_urls?: Json | null
          full_name?: string | null
          gender?: string | null
          id?: string
          ifsc_code?: string | null
          kyc_level?: string
          legal_name?: string | null
          metadata?: Json | null
          notes?: string | null
          pan_enc?: string | null
          pan_last4?: string | null
          pan_name?: string | null
          pan_verification_provider?: string | null
          pan_verification_ref?: string | null
          pan_verified?: boolean | null
          pan_verified_at?: string | null
          postal_code?: string | null
          provider_verification_id?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          state?: string | null
          status?: string
          updated_at?: string | null
          upi_id_enc?: string | null
          upi_verification_provider?: string | null
          upi_verification_ref?: string | null
          upi_verified?: boolean | null
          upi_verified_at?: string | null
          verification_provider?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_creator_kyc_creator"
            columns: ["creator_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_payout_methods: {
        Row: {
          account_holder_name: string | null
          account_number: string | null
          bank_name: string | null
          branch_name: string | null
          created_at: string | null
          creator_id: string
          id: string
          ifsc_code: string | null
          is_default: boolean | null
          metadata: Json | null
          status: string
          type: Database["public"]["Enums"]["payout_type"]
          updated_at: string | null
          upi_id: string | null
          version: number | null
        }
        Insert: {
          account_holder_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          branch_name?: string | null
          created_at?: string | null
          creator_id: string
          id?: string
          ifsc_code?: string | null
          is_default?: boolean | null
          metadata?: Json | null
          status?: string
          type: Database["public"]["Enums"]["payout_type"]
          updated_at?: string | null
          upi_id?: string | null
          version?: number | null
        }
        Update: {
          account_holder_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          branch_name?: string | null
          created_at?: string | null
          creator_id?: string
          id?: string
          ifsc_code?: string | null
          is_default?: boolean | null
          metadata?: Json | null
          status?: string
          type?: Database["public"]["Enums"]["payout_type"]
          updated_at?: string | null
          upi_id?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_creator_payout_methods_creator"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_payout_request_items: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          payout_request_id: string
          revenue_share_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          payout_request_id: string
          revenue_share_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          payout_request_id?: string
          revenue_share_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_cpri_payout_request"
            columns: ["payout_request_id"]
            isOneToOne: false
            referencedRelation: "creator_payout_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_cpri_revenue_share"
            columns: ["revenue_share_id"]
            isOneToOne: false
            referencedRelation: "creator_revenue_shares"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_payout_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string | null
          creator_id: string
          currency: string | null
          id: string
          metadata: Json | null
          payout_method_id: string | null
          rejection_reason: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string | null
          creator_id: string
          currency?: string | null
          id?: string
          metadata?: Json | null
          payout_method_id?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string | null
          creator_id?: string
          currency?: string | null
          id?: string
          metadata?: Json | null
          payout_method_id?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_creator_payout_requests_creator"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_creator_payout_requests_method"
            columns: ["payout_method_id"]
            isOneToOne: false
            referencedRelation: "creator_payout_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_payouts: {
        Row: {
          amount: number
          created_at: string | null
          creator_id: string
          currency: string | null
          failure_reason: string | null
          gateway_batch_id: string | null
          gateway_metadata: Json | null
          gateway_name: string | null
          gateway_payout_id: string | null
          id: string
          initiated_at: string | null
          payout_method_id: string | null
          payout_request_id: string | null
          processed_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          creator_id: string
          currency?: string | null
          failure_reason?: string | null
          gateway_batch_id?: string | null
          gateway_metadata?: Json | null
          gateway_name?: string | null
          gateway_payout_id?: string | null
          id?: string
          initiated_at?: string | null
          payout_method_id?: string | null
          payout_request_id?: string | null
          processed_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          creator_id?: string
          currency?: string | null
          failure_reason?: string | null
          gateway_batch_id?: string | null
          gateway_metadata?: Json | null
          gateway_name?: string | null
          gateway_payout_id?: string | null
          id?: string
          initiated_at?: string | null
          payout_method_id?: string | null
          payout_request_id?: string | null
          processed_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_creator_payouts_creator"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_creator_payouts_method"
            columns: ["payout_method_id"]
            isOneToOne: false
            referencedRelation: "creator_payout_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_creator_payouts_request"
            columns: ["payout_request_id"]
            isOneToOne: false
            referencedRelation: "creator_payout_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_revenue_shares: {
        Row: {
          created_at: string | null
          creator_earnings_amount: number
          creator_id: string
          currency: string | null
          gross_amount: number
          id: string
          metadata: Json | null
          order_id: string
          order_item_id: string
          platform_fee_amount: number
          platform_fee_percent: number
          product_id: string
          status: string
          subscription_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          creator_earnings_amount: number
          creator_id: string
          currency?: string | null
          gross_amount: number
          id?: string
          metadata?: Json | null
          order_id: string
          order_item_id: string
          platform_fee_amount: number
          platform_fee_percent: number
          product_id: string
          status?: string
          subscription_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          creator_earnings_amount?: number
          creator_id?: string
          currency?: string | null
          gross_amount?: number
          id?: string
          metadata?: Json | null
          order_id?: string
          order_item_id?: string
          platform_fee_amount?: number
          platform_fee_percent?: number
          product_id?: string
          status?: string
          subscription_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_crs_creator"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_crs_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_revenue_share_subscription"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_subscription_orders: {
        Row: {
          amount: number
          created_at: string | null
          creator_id: string
          currency: string | null
          gateway_name: string | null
          gateway_order_id: string | null
          gateway_payment_id: string | null
          gateway_signature: string | null
          id: string
          metadata: Json | null
          paid_at: string | null
          plan_id: string
          status: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          creator_id: string
          currency?: string | null
          gateway_name?: string | null
          gateway_order_id?: string | null
          gateway_payment_id?: string | null
          gateway_signature?: string | null
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          plan_id: string
          status?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          creator_id?: string
          currency?: string | null
          gateway_name?: string | null
          gateway_order_id?: string | null
          gateway_payment_id?: string | null
          gateway_signature?: string | null
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          plan_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_cso_creator"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_events: {
        Row: {
          created_at: string | null
          creator_id: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          order_id: string | null
          payout_request_id: string | null
          provider_response: Json | null
          recipient_email: string
          sent_at: string | null
          status: string | null
          subject: string
          template_name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          creator_id?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          payout_request_id?: string | null
          provider_response?: Json | null
          recipient_email: string
          sent_at?: string | null
          status?: string | null
          subject: string
          template_name: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          creator_id?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          payout_request_id?: string | null
          provider_response?: Json | null
          recipient_email?: string
          sent_at?: string | null
          status?: string | null
          subject?: string
          template_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_ee_creator"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ee_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_leads: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          metadata: Json | null
          mobile: string | null
          product_id: string | null
          site_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          metadata?: Json | null
          mobile?: string | null
          product_id?: string | null
          site_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          metadata?: Json | null
          mobile?: string | null
          product_id?: string | null
          site_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_guest_leads_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_guest_leads_site"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      media_library: {
        Row: {
          alt_text: string | null
          created_at: string | null
          creator_id: string
          description: string | null
          duration_seconds: number | null
          file_name: string
          file_size: number
          file_type: string
          height: number | null
          id: string
          is_favorite: boolean | null
          media_type: string
          metadata: Json | null
          storage_url: string
          tags: string[] | null
          thumbnail_url: string | null
          updated_at: string | null
          usage_count: number | null
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          creator_id: string
          description?: string | null
          duration_seconds?: number | null
          file_name: string
          file_size: number
          file_type: string
          height?: number | null
          id?: string
          is_favorite?: boolean | null
          media_type: string
          metadata?: Json | null
          storage_url: string
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string | null
          usage_count?: number | null
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          creator_id?: string
          description?: string | null
          duration_seconds?: number | null
          file_name?: string
          file_size?: number
          file_type?: string
          height?: number | null
          id?: string
          is_favorite?: boolean | null
          media_type?: string
          metadata?: Json | null
          storage_url?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string | null
          usage_count?: number | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_media_library_creator"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          metadata: Json | null
          recipient_creator_id: string | null
          recipient_user_id: string | null
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          recipient_creator_id?: string | null
          recipient_user_id?: string | null
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          recipient_creator_id?: string | null
          recipient_user_id?: string | null
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_notifications_creator"
            columns: ["recipient_creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_notifications_user"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          order_id: string
          origin_site_id: string | null
          price_at_purchase: number
          product_id: string | null
          quantity: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          order_id: string
          origin_site_id?: string | null
          price_at_purchase: number
          product_id?: string | null
          quantity?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          order_id?: string
          origin_site_id?: string | null
          price_at_purchase?: number
          product_id?: string | null
          quantity?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_order_items_order"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_order_items_origin_site"
            columns: ["origin_site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_order_items_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_referrals: {
        Row: {
          commission_amount: number | null
          created_at: string | null
          id: string
          metadata: Json | null
          order_id: string
          referral_code_id: string | null
          referred_user_id: string
          referrer_creator_id: string | null
          referrer_user_id: string | null
          status: string | null
        }
        Insert: {
          commission_amount?: number | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          order_id: string
          referral_code_id?: string | null
          referred_user_id: string
          referrer_creator_id?: string | null
          referrer_user_id?: string | null
          status?: string | null
        }
        Update: {
          commission_amount?: number | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string
          referral_code_id?: string | null
          referred_user_id?: string
          referrer_creator_id?: string | null
          referrer_user_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_or_referral_code"
            columns: ["referral_code_id"]
            isOneToOne: false
            referencedRelation: "referral_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_or_referred_user"
            columns: ["referred_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_or_referrer_creator"
            columns: ["referrer_creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_or_referrer_user"
            columns: ["referrer_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          gateway_name: string | null
          gateway_order_id: string | null
          gateway_payment_id: string | null
          gateway_signature: string | null
          guest_lead_id: string | null
          id: string
          metadata: Json | null
          origin_site_id: string | null
          payment_method: string | null
          status: string
          total_amount: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          gateway_name?: string | null
          gateway_order_id?: string | null
          gateway_payment_id?: string | null
          gateway_signature?: string | null
          guest_lead_id?: string | null
          id?: string
          metadata?: Json | null
          origin_site_id?: string | null
          payment_method?: string | null
          status?: string
          total_amount: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          gateway_name?: string | null
          gateway_order_id?: string | null
          gateway_payment_id?: string | null
          gateway_signature?: string | null
          guest_lead_id?: string | null
          id?: string
          metadata?: Json | null
          origin_site_id?: string | null
          payment_method?: string | null
          status?: string
          total_amount?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_orders_guest_lead"
            columns: ["guest_lead_id"]
            isOneToOne: false
            referencedRelation: "guest_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_origin_site"
            columns: ["origin_site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_orders_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      other_products: {
        Row: {
          created_at: string | null
          creator_id: string
          id: string
          is_active: boolean | null
          is_other_product: boolean | null
          metadata: Json | null
          product_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          creator_id: string
          id?: string
          is_active?: boolean | null
          is_other_product?: boolean | null
          metadata?: Json | null
          product_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          creator_id?: string
          id?: string
          is_active?: boolean | null
          is_other_product?: boolean | null
          metadata?: Json | null
          product_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_other_products_creator"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_other_products_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      page_block_media: {
        Row: {
          created_at: string | null
          id: string
          media_id: string
          page_block_id: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          media_id: string
          page_block_id: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          media_id?: string
          page_block_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_page_block_media_block"
            columns: ["page_block_id"]
            isOneToOne: false
            referencedRelation: "page_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_page_block_media_media"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_library"
            referencedColumns: ["id"]
          },
        ]
      }
      page_blocks: {
        Row: {
          animation: Json | null
          background_color: string | null
          background_image_url: string | null
          background_video_url: string | null
          block_type: Database["public"]["Enums"]["page_block_type"]
          content: Json
          created_at: string | null
          creator_id: string
          custom_classes: string | null
          custom_css: string | null
          custom_id: string | null
          custom_styles: Json | null
          deleted_at: string | null
          display_name: string | null
          entrance_animation: Json | null
          html_attributes: Json | null
          id: string
          interaction_triggers: Json | null
          is_locked: boolean | null
          is_visible: boolean | null
          layout_role: Database["public"]["Enums"]["layout_role_type"]
          margin: Json | null
          metadata: Json | null
          padding: Json | null
          page_id: string
          parent_block_id: string | null
          responsive_settings: Json | null
          sort_order: number
          updated_at: string | null
          visibility_rules: Json | null
        }
        Insert: {
          animation?: Json | null
          background_color?: string | null
          background_image_url?: string | null
          background_video_url?: string | null
          block_type: Database["public"]["Enums"]["page_block_type"]
          content?: Json
          created_at?: string | null
          creator_id: string
          custom_classes?: string | null
          custom_css?: string | null
          custom_id?: string | null
          custom_styles?: Json | null
          deleted_at?: string | null
          display_name?: string | null
          entrance_animation?: Json | null
          html_attributes?: Json | null
          id?: string
          interaction_triggers?: Json | null
          is_locked?: boolean | null
          is_visible?: boolean | null
          layout_role?: Database["public"]["Enums"]["layout_role_type"]
          margin?: Json | null
          metadata?: Json | null
          padding?: Json | null
          page_id: string
          parent_block_id?: string | null
          responsive_settings?: Json | null
          sort_order?: number
          updated_at?: string | null
          visibility_rules?: Json | null
        }
        Update: {
          animation?: Json | null
          background_color?: string | null
          background_image_url?: string | null
          background_video_url?: string | null
          block_type?: Database["public"]["Enums"]["page_block_type"]
          content?: Json
          created_at?: string | null
          creator_id?: string
          custom_classes?: string | null
          custom_css?: string | null
          custom_id?: string | null
          custom_styles?: Json | null
          deleted_at?: string | null
          display_name?: string | null
          entrance_animation?: Json | null
          html_attributes?: Json | null
          id?: string
          interaction_triggers?: Json | null
          is_locked?: boolean | null
          is_visible?: boolean | null
          layout_role?: Database["public"]["Enums"]["layout_role_type"]
          margin?: Json | null
          metadata?: Json | null
          padding?: Json | null
          page_id?: string
          parent_block_id?: string | null
          responsive_settings?: Json | null
          sort_order?: number
          updated_at?: string | null
          visibility_rules?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_page_blocks_creator"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_page_blocks_page"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_page_blocks_parent"
            columns: ["parent_block_id"]
            isOneToOne: false
            referencedRelation: "page_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      page_edit_locks: {
        Row: {
          expires_at: string
          id: string
          locked_at: string
          locked_by_user_id: string
          page_id: string
          session_id: string
        }
        Insert: {
          expires_at?: string
          id?: string
          locked_at?: string
          locked_by_user_id: string
          page_id: string
          session_id: string
        }
        Update: {
          expires_at?: string
          id?: string
          locked_at?: string
          locked_by_user_id?: string
          page_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_page_edit_locks_page"
            columns: ["page_id"]
            isOneToOne: true
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_page_edit_locks_user"
            columns: ["locked_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      page_templates: {
        Row: {
          category: string | null
          created_at: string | null
          creator_id: string | null
          description: string | null
          id: string
          is_public: boolean | null
          is_system_template: boolean | null
          metadata: Json | null
          page_type: Database["public"]["Enums"]["page_type"]
          rating: number | null
          template_blocks: Json
          template_name: string
          thumbnail_url: string | null
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          is_system_template?: boolean | null
          metadata?: Json | null
          page_type: Database["public"]["Enums"]["page_type"]
          rating?: number | null
          template_blocks: Json
          template_name: string
          thumbnail_url?: string | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          is_system_template?: boolean | null
          metadata?: Json | null
          page_type?: Database["public"]["Enums"]["page_type"]
          rating?: number | null
          template_blocks?: Json
          template_name?: string
          thumbnail_url?: string | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_page_templates_creator"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      page_versions: {
        Row: {
          change_summary: string | null
          created_at: string
          created_by_user_id: string | null
          id: string
          is_autosave: boolean | null
          layout: Json
          page_id: string
          version_label: string | null
        }
        Insert: {
          change_summary?: string | null
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          is_autosave?: boolean | null
          layout: Json
          page_id: string
          version_label?: string | null
        }
        Update: {
          change_summary?: string | null
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          is_autosave?: boolean | null
          layout?: Json
          page_id?: string
          version_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_page_versions_user"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_versions_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          canonical_url: string | null
          created_at: string
          creator_id: string | null
          custom_css: string | null
          custom_head_html: string | null
          custom_js: string | null
          description: string | null
          id: string
          is_homepage: boolean | null
          is_published: boolean | null
          layout: Json | null
          layout_type: string | null
          meta_robots: string | null
          metadata: Json | null
          name: string
          og_image_url: string | null
          page_type: Database["public"]["Enums"]["page_type"]
          password_protected_hash: string | null
          project_id: string
          published_at: string | null
          seo_description: string | null
          seo_keywords: string | null
          seo_title: string | null
          site_id: string | null
          slug: string
          sort_order: number | null
          status: Database["public"]["Enums"]["content_status"] | null
          theme_override: Json | null
          title: string | null
          updated_at: string
          view_count: number | null
          visibility: string | null
        }
        Insert: {
          canonical_url?: string | null
          created_at?: string
          creator_id?: string | null
          custom_css?: string | null
          custom_head_html?: string | null
          custom_js?: string | null
          description?: string | null
          id?: string
          is_homepage?: boolean | null
          is_published?: boolean | null
          layout?: Json | null
          layout_type?: string | null
          meta_robots?: string | null
          metadata?: Json | null
          name: string
          og_image_url?: string | null
          page_type?: Database["public"]["Enums"]["page_type"]
          password_protected_hash?: string | null
          project_id: string
          published_at?: string | null
          seo_description?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          site_id?: string | null
          slug: string
          sort_order?: number | null
          status?: Database["public"]["Enums"]["content_status"] | null
          theme_override?: Json | null
          title?: string | null
          updated_at?: string
          view_count?: number | null
          visibility?: string | null
        }
        Update: {
          canonical_url?: string | null
          created_at?: string
          creator_id?: string | null
          custom_css?: string | null
          custom_head_html?: string | null
          custom_js?: string | null
          description?: string | null
          id?: string
          is_homepage?: boolean | null
          is_published?: boolean | null
          layout?: Json | null
          layout_type?: string | null
          meta_robots?: string | null
          metadata?: Json | null
          name?: string
          og_image_url?: string | null
          page_type?: Database["public"]["Enums"]["page_type"]
          password_protected_hash?: string | null
          project_id?: string
          published_at?: string | null
          seo_description?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          site_id?: string | null
          slug?: string
          sort_order?: number | null
          status?: Database["public"]["Enums"]["content_status"] | null
          theme_override?: Json | null
          title?: string | null
          updated_at?: string
          view_count?: number | null
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_pages_creator"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_pages_site"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_requests: {
        Row: {
          amount: number | null
          created_at: string | null
          description: string | null
          id: string
          is_fixed_amount: boolean | null
          metadata: Json | null
          site_id: string
          slug: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_fixed_amount?: boolean | null
          metadata?: Json | null
          site_id: string
          slug?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_fixed_amount?: boolean | null
          metadata?: Json | null
          site_id?: string
          slug?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_payment_requests_site"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_submissions: {
        Row: {
          amount: number
          created_at: string | null
          customer_email: string
          customer_name: string
          customer_phone: string
          gateway_name: string | null
          gateway_order_id: string | null
          gateway_payment_id: string | null
          gateway_signature: string | null
          id: string
          metadata: Json | null
          payment_method: string | null
          payment_request_id: string
          payment_status: string | null
          transaction_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          customer_email: string
          customer_name: string
          customer_phone: string
          gateway_name?: string | null
          gateway_order_id?: string | null
          gateway_payment_id?: string | null
          gateway_signature?: string | null
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          payment_request_id: string
          payment_status?: string | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          gateway_name?: string | null
          gateway_order_id?: string | null
          gateway_payment_id?: string | null
          gateway_signature?: string | null
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          payment_request_id?: string
          payment_status?: string | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_payment_submissions_request"
            columns: ["payment_request_id"]
            isOneToOne: false
            referencedRelation: "payment_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      product_bundle_items: {
        Row: {
          bundle_id: string
          created_at: string | null
          id: string
          product_id: string
          sort_order: number | null
        }
        Insert: {
          bundle_id: string
          created_at?: string | null
          id?: string
          product_id: string
          sort_order?: number | null
        }
        Update: {
          bundle_id?: string
          created_at?: string | null
          id?: string
          product_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_pbi_bundle"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "product_bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_pbi_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_bundles: {
        Row: {
          bundle_price: number
          compare_at_price: number | null
          created_at: string | null
          creator_id: string
          description: string | null
          id: string
          is_published: boolean | null
          metadata: Json | null
          name: string
          thumbnail_url: string | null
          updated_at: string | null
        }
        Insert: {
          bundle_price: number
          compare_at_price?: number | null
          created_at?: string | null
          creator_id: string
          description?: string | null
          id?: string
          is_published?: boolean | null
          metadata?: Json | null
          name: string
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Update: {
          bundle_price?: number
          compare_at_price?: number | null
          created_at?: string | null
          creator_id?: string
          description?: string | null
          id?: string
          is_published?: boolean | null
          metadata?: Json | null
          name?: string
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_pbundle_creator"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_files: {
        Row: {
          checksum: string | null
          created_at: string | null
          creator_id: string
          download_count: number | null
          file_label: string
          file_size_bytes: number | null
          file_type: string | null
          id: string
          is_primary: boolean | null
          product_id: string
          storage_url: string
          updated_at: string | null
          version: string | null
        }
        Insert: {
          checksum?: string | null
          created_at?: string | null
          creator_id: string
          download_count?: number | null
          file_label: string
          file_size_bytes?: number | null
          file_type?: string | null
          id?: string
          is_primary?: boolean | null
          product_id: string
          storage_url: string
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          checksum?: string | null
          created_at?: string | null
          creator_id?: string
          download_count?: number | null
          file_label?: string
          file_size_bytes?: number | null
          file_type?: string | null
          id?: string
          is_primary?: boolean | null
          product_id?: string
          storage_url?: string
          updated_at?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_pf_creator"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_pf_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_licenses: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          issued_at: string | null
          license_key: string | null
          license_type: string | null
          metadata: Json | null
          order_id: string
          order_item_id: string
          product_id: string
          snapshot: Json | null
          status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          license_key?: string | null
          license_type?: string | null
          metadata?: Json | null
          order_id: string
          order_item_id: string
          product_id: string
          snapshot?: Json | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          license_key?: string | null
          license_type?: string | null
          metadata?: Json | null
          order_id?: string
          order_item_id?: string
          product_id?: string
          snapshot?: Json | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_pl_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_pl_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      product_ratings: {
        Row: {
          created_at: string | null
          helpful_count: number | null
          id: string
          is_approved: boolean | null
          is_verified_purchase: boolean | null
          product_id: string
          rating: number
          review_text: string | null
          review_title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          is_approved?: boolean | null
          is_verified_purchase?: boolean | null
          product_id: string
          rating: number
          review_text?: string | null
          review_title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          is_approved?: boolean | null
          is_verified_purchase?: boolean | null
          product_id?: string
          rating?: number
          review_text?: string | null
          review_title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_pr_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_pr_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      product_related: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          related_product_id: string
          relation_type: Database["public"]["Enums"]["product_relation_type"]
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          related_product_id: string
          relation_type: Database["public"]["Enums"]["product_relation_type"]
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          related_product_id?: string
          relation_type?: Database["public"]["Enums"]["product_relation_type"]
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_prelat_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_prelat_related"
            columns: ["related_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_view_events: {
        Row: {
          created_at: string
          device_type: Database["public"]["Enums"]["device_type"] | null
          id: string
          product_id: string
          referrer: string | null
          session_id: string | null
          site_id: string | null
        }
        Insert: {
          created_at?: string
          device_type?: Database["public"]["Enums"]["device_type"] | null
          id?: string
          product_id: string
          referrer?: string | null
          session_id?: string | null
          site_id?: string | null
        }
        Update: {
          created_at?: string
          device_type?: Database["public"]["Enums"]["device_type"] | null
          id?: string
          product_id?: string
          referrer?: string | null
          session_id?: string | null
          site_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_pve_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_pve_site"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          content: Json | null
          created_at: string | null
          creator_id: string
          deleted_at: string | null
          description: string | null
          id: string
          images: Json | null
          is_licensable: boolean | null
          is_on_discover_page: boolean | null
          is_published: boolean | null
          license_metadata: Json | null
          license_terms: string | null
          license_type: string | null
          metadata: Json | null
          name: string
          post_purchase_instructions: string | null
          post_purchase_url: string | null
          price: number
          product_link: string | null
          search_vector: unknown
          stock_count: number | null
          thumbnail_url: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          content?: Json | null
          created_at?: string | null
          creator_id: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          images?: Json | null
          is_licensable?: boolean | null
          is_on_discover_page?: boolean | null
          is_published?: boolean | null
          license_metadata?: Json | null
          license_terms?: string | null
          license_type?: string | null
          metadata?: Json | null
          name: string
          post_purchase_instructions?: string | null
          post_purchase_url?: string | null
          price?: number
          product_link?: string | null
          search_vector?: unknown
          stock_count?: number | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          content?: Json | null
          created_at?: string | null
          creator_id?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          images?: Json | null
          is_licensable?: boolean | null
          is_on_discover_page?: boolean | null
          is_published?: boolean | null
          license_metadata?: Json | null
          license_terms?: string | null
          license_type?: string | null
          metadata?: Json | null
          name?: string
          post_purchase_instructions?: string | null
          post_purchase_url?: string | null
          price?: number
          product_link?: string | null
          search_vector?: unknown
          stock_count?: number | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_products_creator"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          email_verified: boolean | null
          full_name: string | null
          id: string
          mobile: string | null
          mobile_verified: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          email_verified?: boolean | null
          full_name?: string | null
          id?: string
          mobile?: string | null
          mobile_verified?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          email_verified?: boolean | null
          full_name?: string | null
          id?: string
          mobile?: string | null
          mobile_verified?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_users"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          creator_id: string
          deleted_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          site_id: string | null
          slug: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          creator_id: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          site_id?: string | null
          slug?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          creator_id?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          site_id?: string | null
          slug?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_projects_creator"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_projects_site"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          owner_creator_id: string | null
          owner_user_id: string | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          owner_creator_id?: string | null
          owner_user_id?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          owner_creator_id?: string | null
          owner_user_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_rc_owner_creator"
            columns: ["owner_creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_rc_owner_user"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_components: {
        Row: {
          category: string | null
          component_tree: Json
          created_at: string | null
          creator_id: string
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          tags: string[] | null
          thumbnail_url: string | null
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          category?: string | null
          component_tree: Json
          created_at?: string | null
          creator_id: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          category?: string | null
          component_tree?: Json
          created_at?: string | null
          creator_id?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_sc_creator"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      site_ab_tests: {
        Row: {
          created_at: string | null
          creator_id: string
          end_at: string | null
          id: string
          section_key: string
          site_id: string
          start_at: string | null
          status: Database["public"]["Enums"]["ab_test_status"]
          test_name: string
          traffic_split_percent: number
          updated_at: string | null
          variant_a: Json
          variant_b: Json
          winner: string | null
        }
        Insert: {
          created_at?: string | null
          creator_id: string
          end_at?: string | null
          id?: string
          section_key: string
          site_id: string
          start_at?: string | null
          status?: Database["public"]["Enums"]["ab_test_status"]
          test_name: string
          traffic_split_percent?: number
          updated_at?: string | null
          variant_a: Json
          variant_b: Json
          winner?: string | null
        }
        Update: {
          created_at?: string | null
          creator_id?: string
          end_at?: string | null
          id?: string
          section_key?: string
          site_id?: string
          start_at?: string | null
          status?: Database["public"]["Enums"]["ab_test_status"]
          test_name?: string
          traffic_split_percent?: number
          updated_at?: string | null
          variant_a?: Json
          variant_b?: Json
          winner?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_sat_creator"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_sat_site"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      site_blog: {
        Row: {
          banner_url: string | null
          contact_email: string | null
          contact_mobile: string | null
          created_at: string | null
          custom_css: string | null
          custom_js: string | null
          description: string | null
          id: string
          legal_pages: Json | null
          logo_url: string | null
          meta_description: string | null
          metadata: Json | null
          site_id: string
          social_links: Json | null
          template_name: string | null
          theme: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          banner_url?: string | null
          contact_email?: string | null
          contact_mobile?: string | null
          created_at?: string | null
          custom_css?: string | null
          custom_js?: string | null
          description?: string | null
          id?: string
          legal_pages?: Json | null
          logo_url?: string | null
          meta_description?: string | null
          metadata?: Json | null
          site_id: string
          social_links?: Json | null
          template_name?: string | null
          theme?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          banner_url?: string | null
          contact_email?: string | null
          contact_mobile?: string | null
          created_at?: string | null
          custom_css?: string | null
          custom_js?: string | null
          description?: string | null
          id?: string
          legal_pages?: Json | null
          logo_url?: string | null
          meta_description?: string | null
          metadata?: Json | null
          site_id?: string
          social_links?: Json | null
          template_name?: string | null
          theme?: Json | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_site_blog_site"
            columns: ["site_id"]
            isOneToOne: true
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      site_design_tokens: {
        Row: {
          border_radius_scale: Json
          color_palette: Json
          created_at: string | null
          creator_id: string
          custom_css_variables: Json | null
          id: string
          is_active: boolean | null
          shadow_presets: Json | null
          site_id: string
          spacing_scale: Json
          typography: Json
          updated_at: string | null
        }
        Insert: {
          border_radius_scale?: Json
          color_palette?: Json
          created_at?: string | null
          creator_id: string
          custom_css_variables?: Json | null
          id?: string
          is_active?: boolean | null
          shadow_presets?: Json | null
          site_id: string
          spacing_scale?: Json
          typography?: Json
          updated_at?: string | null
        }
        Update: {
          border_radius_scale?: Json
          color_palette?: Json
          created_at?: string | null
          creator_id?: string
          custom_css_variables?: Json | null
          id?: string
          is_active?: boolean | null
          shadow_presets?: Json | null
          site_id?: string
          spacing_scale?: Json
          typography?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_sdt_creator"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_sdt_site"
            columns: ["site_id"]
            isOneToOne: true
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      site_main: {
        Row: {
          banner_url: string | null
          contact_email: string | null
          contact_mobile: string | null
          created_at: string | null
          custom_css: string | null
          custom_js: string | null
          description: string | null
          id: string
          legal_pages: Json | null
          logo_url: string | null
          meta_description: string | null
          meta_keywords: string | null
          metadata: Json | null
          site_id: string
          social_links: Json | null
          template_name: string | null
          theme: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          banner_url?: string | null
          contact_email?: string | null
          contact_mobile?: string | null
          created_at?: string | null
          custom_css?: string | null
          custom_js?: string | null
          description?: string | null
          id?: string
          legal_pages?: Json | null
          logo_url?: string | null
          meta_description?: string | null
          meta_keywords?: string | null
          metadata?: Json | null
          site_id: string
          social_links?: Json | null
          template_name?: string | null
          theme?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          banner_url?: string | null
          contact_email?: string | null
          contact_mobile?: string | null
          created_at?: string | null
          custom_css?: string | null
          custom_js?: string | null
          description?: string | null
          id?: string
          legal_pages?: Json | null
          logo_url?: string | null
          meta_description?: string | null
          meta_keywords?: string | null
          metadata?: Json | null
          site_id?: string
          social_links?: Json | null
          template_name?: string | null
          theme?: Json | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_site_main_site"
            columns: ["site_id"]
            isOneToOne: true
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      site_navigation: {
        Row: {
          created_at: string | null
          footer_bottom_text: string | null
          footer_columns: Json | null
          header_logo_alt: string | null
          header_logo_url: string | null
          id: string
          nav_items: Json | null
          show_cart_icon: boolean | null
          show_search: boolean | null
          site_id: string
          social_links: Json | null
          sticky_header: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          footer_bottom_text?: string | null
          footer_columns?: Json | null
          header_logo_alt?: string | null
          header_logo_url?: string | null
          id?: string
          nav_items?: Json | null
          show_cart_icon?: boolean | null
          show_search?: boolean | null
          site_id: string
          social_links?: Json | null
          sticky_header?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          footer_bottom_text?: string | null
          footer_columns?: Json | null
          header_logo_alt?: string | null
          header_logo_url?: string | null
          id?: string
          nav_items?: Json | null
          show_cart_icon?: boolean | null
          show_search?: boolean | null
          site_id?: string
          social_links?: Json | null
          sticky_header?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_snav_site"
            columns: ["site_id"]
            isOneToOne: true
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      site_page_views: {
        Row: {
          country_code: string | null
          created_at: string
          device_type: Database["public"]["Enums"]["device_type"] | null
          id: string
          page_slug: string | null
          referrer: string | null
          session_id: string | null
          site_id: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          device_type?: Database["public"]["Enums"]["device_type"] | null
          id?: string
          page_slug?: string | null
          referrer?: string | null
          session_id?: string | null
          site_id: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          country_code?: string | null
          created_at?: string
          device_type?: Database["public"]["Enums"]["device_type"] | null
          id?: string
          page_slug?: string | null
          referrer?: string | null
          session_id?: string | null
          site_id?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      site_product_assignments: {
        Row: {
          created_at: string | null
          id: string
          is_visible: boolean | null
          metadata: Json | null
          placement: string
          product_id: string
          site_id: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_visible?: boolean | null
          metadata?: Json | null
          placement?: string
          product_id: string
          site_id: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_visible?: boolean | null
          metadata?: Json | null
          placement?: string
          product_id?: string
          site_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_spa_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_spa_site"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      site_sections_config: {
        Row: {
          created_at: string | null
          id: string
          sections: Json
          site_id: string
          site_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          sections?: Json
          site_id: string
          site_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          sections?: Json
          site_id?: string
          site_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_ssc_site"
            columns: ["site_id"]
            isOneToOne: true
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      site_singlepage: {
        Row: {
          comparison_table: Json | null
          contact_email: string | null
          contact_mobile: string | null
          countdown_end_at: string | null
          created_at: string | null
          custom_css: string | null
          custom_js: string | null
          description: string | null
          enable_reviews: boolean | null
          faq_items: Json | null
          guarantee_badges: Json | null
          hero_image_url: string | null
          id: string
          legal_pages: Json | null
          meta_description: string | null
          metadata: Json | null
          product_id: string
          sections_config: Json | null
          show_add_to_cart: boolean | null
          show_buy_now: boolean | null
          site_id: string
          social_links: Json | null
          social_proof_config: Json | null
          template_name: string | null
          testimonials: Json | null
          theme: Json | null
          title: string
          updated_at: string | null
          upsell_product_ids: string[] | null
          video_testimonial_url: string | null
        }
        Insert: {
          comparison_table?: Json | null
          contact_email?: string | null
          contact_mobile?: string | null
          countdown_end_at?: string | null
          created_at?: string | null
          custom_css?: string | null
          custom_js?: string | null
          description?: string | null
          enable_reviews?: boolean | null
          faq_items?: Json | null
          guarantee_badges?: Json | null
          hero_image_url?: string | null
          id?: string
          legal_pages?: Json | null
          meta_description?: string | null
          metadata?: Json | null
          product_id: string
          sections_config?: Json | null
          show_add_to_cart?: boolean | null
          show_buy_now?: boolean | null
          site_id: string
          social_links?: Json | null
          social_proof_config?: Json | null
          template_name?: string | null
          testimonials?: Json | null
          theme?: Json | null
          title: string
          updated_at?: string | null
          upsell_product_ids?: string[] | null
          video_testimonial_url?: string | null
        }
        Update: {
          comparison_table?: Json | null
          contact_email?: string | null
          contact_mobile?: string | null
          countdown_end_at?: string | null
          created_at?: string | null
          custom_css?: string | null
          custom_js?: string | null
          description?: string | null
          enable_reviews?: boolean | null
          faq_items?: Json | null
          guarantee_badges?: Json | null
          hero_image_url?: string | null
          id?: string
          legal_pages?: Json | null
          meta_description?: string | null
          metadata?: Json | null
          product_id?: string
          sections_config?: Json | null
          show_add_to_cart?: boolean | null
          show_buy_now?: boolean | null
          site_id?: string
          social_links?: Json | null
          social_proof_config?: Json | null
          template_name?: string | null
          testimonials?: Json | null
          theme?: Json | null
          title?: string
          updated_at?: string | null
          upsell_product_ids?: string[] | null
          video_testimonial_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_site_singlepage_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_site_singlepage_site"
            columns: ["site_id"]
            isOneToOne: true
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      site_templates: {
        Row: {
          created_at: string | null
          default_theme: Json | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          preview_image_url: string | null
          site_type: string
          template_key: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_theme?: Json | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          preview_image_url?: string | null
          site_type: string
          template_key: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_theme?: Json | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          preview_image_url?: string | null
          site_type?: string
          template_key?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      site_theme_presets: {
        Row: {
          created_at: string | null
          creator_id: string | null
          description: string | null
          id: string
          is_favorite: boolean | null
          is_system_preset: boolean | null
          preset_name: string
          site_id: string | null
          theme_data: Json
          thumbnail_url: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          id?: string
          is_favorite?: boolean | null
          is_system_preset?: boolean | null
          preset_name: string
          site_id?: string | null
          theme_data: Json
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          id?: string
          is_favorite?: boolean | null
          is_system_preset?: boolean | null
          preset_name?: string
          site_id?: string | null
          theme_data?: Json
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_stp_creator"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_stp_site"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          child_slug: string | null
          created_at: string | null
          creator_id: string
          custom_domain: string | null
          deleted_at: string | null
          domain_verified: boolean | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          parent_site_id: string | null
          site_type: string | null
          slug: string | null
          ssl_status: string | null
          updated_at: string | null
        }
        Insert: {
          child_slug?: string | null
          created_at?: string | null
          creator_id: string
          custom_domain?: string | null
          deleted_at?: string | null
          domain_verified?: boolean | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          parent_site_id?: string | null
          site_type?: string | null
          slug?: string | null
          ssl_status?: string | null
          updated_at?: string | null
        }
        Update: {
          child_slug?: string | null
          created_at?: string | null
          creator_id?: string
          custom_domain?: string | null
          deleted_at?: string | null
          domain_verified?: boolean | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          parent_site_id?: string | null
          site_type?: string | null
          slug?: string | null
          ssl_status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_sites_creator"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sites_parent_site_id_fkey"
            columns: ["parent_site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_file_usages: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_type: string
          field_name: string | null
          file_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_type: string
          field_name?: string | null
          file_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          field_name?: string | null
          file_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_sfu_file"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "storage_files"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_files: {
        Row: {
          bucket: string
          created_at: string | null
          deleted_at: string | null
          file_type: string | null
          id: string
          metadata: Json | null
          owner_creator_id: string | null
          owner_user_id: string | null
          path: string
          public_url: string
          size_bytes: number | null
          status: string
          updated_at: string | null
        }
        Insert: {
          bucket: string
          created_at?: string | null
          deleted_at?: string | null
          file_type?: string | null
          id?: string
          metadata?: Json | null
          owner_creator_id?: string | null
          owner_user_id?: string | null
          path: string
          public_url: string
          size_bytes?: number | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          bucket?: string
          created_at?: string | null
          deleted_at?: string | null
          file_type?: string | null
          id?: string
          metadata?: Json | null
          owner_creator_id?: string | null
          owner_user_id?: string | null
          path?: string
          public_url?: string
          size_bytes?: number | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_sf_creator"
            columns: ["owner_creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_sf_user"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_offer_redemptions: {
        Row: {
          applied_at: string | null
          created_at: string | null
          creator_id: string
          discount_amount: number
          expires_at: string
          id: string
          metadata: Json | null
          offer_id: string
          subscription_id: string
        }
        Insert: {
          applied_at?: string | null
          created_at?: string | null
          creator_id: string
          discount_amount: number
          expires_at: string
          id?: string
          metadata?: Json | null
          offer_id: string
          subscription_id: string
        }
        Update: {
          applied_at?: string | null
          created_at?: string | null
          creator_id?: string
          discount_amount?: number
          expires_at?: string
          id?: string
          metadata?: Json | null
          offer_id?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_offer_redemption_creator"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_offer_redemption_offer"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "subscription_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_offer_redemption_subscription"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_offers: {
        Row: {
          apply_to_new_only: boolean | null
          created_at: string | null
          description: string | null
          discount_value: number
          end_date: string
          id: string
          is_active: boolean | null
          max_redemptions: number | null
          metadata: Json | null
          offer_name: string
          offer_type: Database["public"]["Enums"]["offer_type"]
          redeemed_count: number | null
          start_date: string
          subscription_plan_id: string
          updated_at: string | null
        }
        Insert: {
          apply_to_new_only?: boolean | null
          created_at?: string | null
          description?: string | null
          discount_value: number
          end_date: string
          id?: string
          is_active?: boolean | null
          max_redemptions?: number | null
          metadata?: Json | null
          offer_name: string
          offer_type: Database["public"]["Enums"]["offer_type"]
          redeemed_count?: number | null
          start_date: string
          subscription_plan_id: string
          updated_at?: string | null
        }
        Update: {
          apply_to_new_only?: boolean | null
          created_at?: string | null
          description?: string | null
          discount_value?: number
          end_date?: string
          id?: string
          is_active?: boolean | null
          max_redemptions?: number | null
          metadata?: Json | null
          offer_name?: string
          offer_type?: Database["public"]["Enums"]["offer_type"]
          redeemed_count?: number | null
          start_date?: string
          subscription_plan_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_subscription_offer_plan"
            columns: ["subscription_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          monthly_price: number
          plan_name: string
          plan_type: Database["public"]["Enums"]["subscription_plan_type"]
          platform_fee_percent: number
          updated_at: string | null
          yearly_price: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          monthly_price?: number
          plan_name: string
          plan_type: Database["public"]["Enums"]["subscription_plan_type"]
          platform_fee_percent: number
          updated_at?: string | null
          yearly_price?: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          monthly_price?: number
          plan_name?: string
          plan_type?: Database["public"]["Enums"]["subscription_plan_type"]
          platform_fee_percent?: number
          updated_at?: string | null
          yearly_price?: number
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          auto_renew: boolean | null
          billing_cycle: string
          created_at: string | null
          creator_id: string
          current_platform_fee_percent: number
          current_price: number
          end_date: string | null
          id: string
          metadata: Json | null
          renewal_date: string | null
          start_date: string | null
          status: string
          subscription_plan_id: string
          updated_at: string | null
        }
        Insert: {
          auto_renew?: boolean | null
          billing_cycle?: string
          created_at?: string | null
          creator_id: string
          current_platform_fee_percent: number
          current_price?: number
          end_date?: string | null
          id?: string
          metadata?: Json | null
          renewal_date?: string | null
          start_date?: string | null
          status?: string
          subscription_plan_id: string
          updated_at?: string | null
        }
        Update: {
          auto_renew?: boolean | null
          billing_cycle?: string
          created_at?: string | null
          creator_id?: string
          current_platform_fee_percent?: number
          current_price?: number
          end_date?: string | null
          id?: string
          metadata?: Json | null
          renewal_date?: string | null
          start_date?: string | null
          status?: string
          subscription_plan_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_subscription_plan"
            columns: ["subscription_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_subscriptions_creator"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_admin_id: string | null
          created_at: string | null
          creator_id: string | null
          description: string
          id: string
          metadata: Json | null
          priority: string | null
          site_id: string | null
          status: string | null
          subject: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          assigned_admin_id?: string | null
          created_at?: string | null
          creator_id?: string | null
          description: string
          id?: string
          metadata?: Json | null
          priority?: string | null
          site_id?: string | null
          status?: string | null
          subject: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_admin_id?: string | null
          created_at?: string | null
          creator_id?: string | null
          description?: string
          id?: string
          metadata?: Json | null
          priority?: string | null
          site_id?: string | null
          status?: string | null
          subject?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_st_admin"
            columns: ["assigned_admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_st_creator"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_st_site"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_st_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_ledger: {
        Row: {
          amount: number
          balance_after: number | null
          created_at: string
          creator_id: string | null
          currency: string
          direction: Database["public"]["Enums"]["wallet_direction"]
          id: number
          meta: Json | null
          order_id: string | null
          payout_id: string | null
          prev_hash: string | null
          record_hash: string
          referral_id: string | null
          tx_type: string
          user_id: string | null
          wallet_id: string | null
        }
        Insert: {
          amount: number
          balance_after?: number | null
          created_at?: string
          creator_id?: string | null
          currency?: string
          direction: Database["public"]["Enums"]["wallet_direction"]
          id?: number
          meta?: Json | null
          order_id?: string | null
          payout_id?: string | null
          prev_hash?: string | null
          record_hash: string
          referral_id?: string | null
          tx_type: string
          user_id?: string | null
          wallet_id?: string | null
        }
        Update: {
          amount?: number
          balance_after?: number | null
          created_at?: string
          creator_id?: string | null
          currency?: string
          direction?: Database["public"]["Enums"]["wallet_direction"]
          id?: number
          meta?: Json | null
          order_id?: string | null
          payout_id?: string | null
          prev_hash?: string | null
          record_hash?: string
          referral_id?: string | null
          tx_type?: string
          user_id?: string | null
          wallet_id?: string | null
        }
        Relationships: []
      }
      user_carts: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_carts_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_carts_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_product_access: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          order_item_id: string | null
          product_id: string
          product_link: string
          product_name: string
          product_price: number
          snapshot_metadata: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          order_item_id?: string | null
          product_id: string
          product_link: string
          product_name: string
          product_price: number
          snapshot_metadata?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          order_item_id?: string | null
          product_id?: string
          product_link?: string
          product_name?: string
          product_price?: number
          snapshot_metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_upa_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_upa_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_referrals: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          referral_code_id: string
          referred_user_id: string
          referrer_creator_id: string | null
          referrer_user_id: string | null
          reward_amount: number | null
          reward_status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          referral_code_id: string
          referred_user_id: string
          referrer_creator_id?: string | null
          referrer_user_id?: string | null
          reward_amount?: number | null
          reward_status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          referral_code_id?: string
          referred_user_id?: string
          referrer_creator_id?: string | null
          referrer_user_id?: string | null
          reward_amount?: number | null
          reward_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_ur_code"
            columns: ["referral_code_id"]
            isOneToOne: false
            referencedRelation: "referral_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ur_referred_user"
            columns: ["referred_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ur_referrer_creator"
            columns: ["referrer_creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ur_referrer_user"
            columns: ["referrer_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          role: Database["public"]["Enums"]["user_role_type"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: Database["public"]["Enums"]["user_role_type"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: Database["public"]["Enums"]["user_role_type"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_roles_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_wallet_transactions: {
        Row: {
          amount: number
          balance_after: number | null
          created_at: string | null
          description: string | null
          direction: Database["public"]["Enums"]["wallet_direction"]
          id: string
          metadata: Json | null
          related_order_id: string | null
          related_order_referral_id: string | null
          status: string | null
          tx_type: string
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount: number
          balance_after?: number | null
          created_at?: string | null
          description?: string | null
          direction: Database["public"]["Enums"]["wallet_direction"]
          id?: string
          metadata?: Json | null
          related_order_id?: string | null
          related_order_referral_id?: string | null
          status?: string | null
          tx_type: string
          user_id: string
          wallet_id: string
        }
        Update: {
          amount?: number
          balance_after?: number | null
          created_at?: string | null
          description?: string | null
          direction?: Database["public"]["Enums"]["wallet_direction"]
          id?: string
          metadata?: Json | null
          related_order_id?: string | null
          related_order_referral_id?: string | null
          status?: string | null
          tx_type?: string
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_uwt_order_referral"
            columns: ["related_order_referral_id"]
            isOneToOne: false
            referencedRelation: "order_referrals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_uwt_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_uwt_wallet"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_wallets: {
        Row: {
          balance: number
          created_at: string | null
          currency: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_uw_user"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_wishlist: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_wishlist_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_wishlist_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_provider: string | null
          auth_provider_id: string | null
          created_at: string | null
          email: string | null
          id: string
          is_verified: boolean | null
          phone: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          auth_provider?: string | null
          auth_provider_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_verified?: boolean | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          auth_provider?: string | null
          auth_provider_id?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_verified?: boolean | null
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_profile_id: { Args: never; Returns: string }
    }
    Enums: {
      ab_test_status: "draft" | "running" | "paused" | "concluded"
      builder_asset_type:
        | "icon_set"
        | "font"
        | "lottie_animation"
        | "pattern"
        | "illustration"
        | "stock_image"
      content_status: "draft" | "published" | "archived"
      conversion_event_type: "add_to_cart" | "checkout_start" | "purchase"
      device_type: "desktop" | "mobile" | "tablet"
      discount_type: "percentage" | "fixed"
      font_source_type: "google" | "custom_upload" | "system"
      kyc_status: "pending" | "verified" | "rejected" | "expired"
      layout_role_type: "section" | "row" | "column" | "block"
      offer_type: "percentage" | "fixed_amount" | "free_period"
      order_status:
        | "pending"
        | "completed"
        | "failed"
        | "refunded"
        | "cancelled"
      page_block_type:
        | "hero"
        | "text"
        | "image"
        | "image_gallery"
        | "video"
        | "product_showcase"
        | "cta_button"
        | "testimonial"
        | "faq"
        | "newsletter"
        | "columns"
        | "divider"
        | "pricing_table"
        | "form"
        | "countdown"
        | "rich_text"
        | "embed"
        | "custom_html"
      page_type: "landing" | "product" | "about" | "contact" | "blog" | "custom"
      payout_status: "pending" | "initiated" | "processed" | "failed"
      payout_type: "upi" | "bank_transfer"
      product_relation_type: "upsell" | "cross_sell" | "bundle"
      site_section_type:
        | "hero_banner"
        | "featured_products"
        | "product_grid"
        | "testimonials"
        | "about_creator"
        | "faq_accordion"
        | "countdown_timer"
        | "social_proof"
        | "email_capture"
        | "video_showcase"
        | "rich_text"
        | "image_gallery"
        | "product_comparison"
        | "pricing_table"
        | "announcement_bar"
        | "sticky_cta"
        | "trust_badges"
        | "custom_html"
      subscription_plan_type: "free" | "plus" | "pro"
      user_role_type: "super_admin" | "creator" | "user"
      wallet_direction: "credit" | "debit"
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
      ab_test_status: ["draft", "running", "paused", "concluded"],
      builder_asset_type: [
        "icon_set",
        "font",
        "lottie_animation",
        "pattern",
        "illustration",
        "stock_image",
      ],
      content_status: ["draft", "published", "archived"],
      conversion_event_type: ["add_to_cart", "checkout_start", "purchase"],
      device_type: ["desktop", "mobile", "tablet"],
      discount_type: ["percentage", "fixed"],
      font_source_type: ["google", "custom_upload", "system"],
      kyc_status: ["pending", "verified", "rejected", "expired"],
      layout_role_type: ["section", "row", "column", "block"],
      offer_type: ["percentage", "fixed_amount", "free_period"],
      order_status: ["pending", "completed", "failed", "refunded", "cancelled"],
      page_block_type: [
        "hero",
        "text",
        "image",
        "image_gallery",
        "video",
        "product_showcase",
        "cta_button",
        "testimonial",
        "faq",
        "newsletter",
        "columns",
        "divider",
        "pricing_table",
        "form",
        "countdown",
        "rich_text",
        "embed",
        "custom_html",
      ],
      page_type: ["landing", "product", "about", "contact", "blog", "custom"],
      payout_status: ["pending", "initiated", "processed", "failed"],
      payout_type: ["upi", "bank_transfer"],
      product_relation_type: ["upsell", "cross_sell", "bundle"],
      site_section_type: [
        "hero_banner",
        "featured_products",
        "product_grid",
        "testimonials",
        "about_creator",
        "faq_accordion",
        "countdown_timer",
        "social_proof",
        "email_capture",
        "video_showcase",
        "rich_text",
        "image_gallery",
        "product_comparison",
        "pricing_table",
        "announcement_bar",
        "sticky_cta",
        "trust_badges",
        "custom_html",
      ],
      subscription_plan_type: ["free", "plus", "pro"],
      user_role_type: ["super_admin", "creator", "user"],
      wallet_direction: ["credit", "debit"],
    },
  },
} as const
