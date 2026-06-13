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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ab_tests: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          name: string
          product_id: string | null
          status: string
          variant_a: Json | null
          variant_b: Json | null
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          name: string
          product_id?: string | null
          status?: string
          variant_a?: Json | null
          variant_b?: Json | null
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          name?: string
          product_id?: string | null
          status?: string
          variant_a?: Json | null
          variant_b?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ab_tests_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ab_tests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
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
            foreignKeyName: "fk_affiliates_affiliate_user"
            columns: ["affiliate_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_affiliates_creator"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          category: string
          content: string
          created_at: string
          creator_id: string
          id: string
          is_pinned: boolean
          updated_at: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          creator_id: string
          id?: string
          is_pinned?: boolean
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          creator_id?: string
          id?: string
          is_pinned?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_reactions: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          post_id: string
          reaction: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          post_id: string
          reaction?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          post_id?: string
          reaction?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_reactions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
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
        Relationships: []
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
          admin_notes: string | null
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
          pan_enc: string | null
          pan_last4: string | null
          pan_name: string | null
          pan_verification_provider: string | null
          pan_verification_ref: string | null
          pan_verified: boolean | null
          pan_verified_at: string | null
          postal_code: string | null
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
        }
        Insert: {
          aadhaar_last4?: string | null
          address_line1?: string | null
          address_line2?: string | null
          admin_notes?: string | null
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
          pan_enc?: string | null
          pan_last4?: string | null
          pan_name?: string | null
          pan_verification_provider?: string | null
          pan_verification_ref?: string | null
          pan_verified?: boolean | null
          pan_verified_at?: string | null
          postal_code?: string | null
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
        }
        Update: {
          aadhaar_last4?: string | null
          address_line1?: string | null
          address_line2?: string | null
          admin_notes?: string | null
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
          pan_enc?: string | null
          pan_last4?: string | null
          pan_name?: string | null
          pan_verification_provider?: string | null
          pan_verification_ref?: string | null
          pan_verified?: boolean | null
          pan_verified_at?: string | null
          postal_code?: string | null
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
        }
        Relationships: [
          {
            foreignKeyName: "fk_kyc_creator"
            columns: ["creator_id"]
            isOneToOne: false
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
            foreignKeyName: "fk_cpm_creator"
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
            foreignKeyName: "fk_cpri_request"
            columns: ["payout_request_id"]
            isOneToOne: false
            referencedRelation: "creator_payout_requests"
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
            foreignKeyName: "fk_cpr_creator"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            foreignKeyName: "fk_payout_request"
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
            foreignKeyName: "fk_crs_order"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_crs_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
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
          id: string
          metadata: Json | null
          order_id: string | null
          payout_request_id: string | null
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
          id?: string
          metadata?: Json | null
          order_id?: string | null
          payout_request_id?: string | null
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
          id?: string
          metadata?: Json | null
          order_id?: string | null
          payout_request_id?: string | null
          recipient_email?: string
          sent_at?: string | null
          status?: string | null
          subject?: string
          template_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_email_events_creator"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_email_events_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          site_id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          site_id: string
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          site_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "forms_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
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
            foreignKeyName: "fk_guest_leads_site"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_form: {
        Row: {
          created_at: string | null
          email: string | null
          form_id: string
          full_name: string | null
          id: string
          mobile: string | null
          other: Json | null
          site_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          form_id: string
          full_name?: string | null
          id?: string
          mobile?: string | null
          other?: Json | null
          site_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          form_id?: string
          full_name?: string | null
          id?: string
          mobile?: string | null
          other?: Json | null
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_form_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      linkinbio_analytics: {
        Row: {
          created_at: string
          event_type: string
          id: string
          ip_hash: string | null
          link_id: string | null
          referrer_url: string | null
          site_id: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          ip_hash?: string | null
          link_id?: string | null
          referrer_url?: string | null
          site_id: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          ip_hash?: string | null
          link_id?: string | null
          referrer_url?: string | null
          site_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "linkinbio_analytics_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "linkinbio_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "linkinbio_analytics_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      linkinbio_blocks: {
        Row: {
          content: Json
          created_at: string
          id: string
          is_visible: boolean
          page_id: string
          settings: Json
          sort_order: number
          style: Json
          type: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          is_visible?: boolean
          page_id: string
          settings?: Json
          sort_order?: number
          style?: Json
          type: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          is_visible?: boolean
          page_id?: string
          settings?: Json
          sort_order?: number
          style?: Json
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_linkinbio_blocks_page"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "linkinbio_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      linkinbio_items: {
        Row: {
          block_id: string
          click_count: number
          created_at: string
          description: string
          id: string
          is_visible: boolean
          metadata: Json
          product_id: string | null
          sort_order: number
          thumbnail_url: string
          title: string
          type: string
          updated_at: string
          url: string
        }
        Insert: {
          block_id: string
          click_count?: number
          created_at?: string
          description?: string
          id?: string
          is_visible?: boolean
          metadata?: Json
          product_id?: string | null
          sort_order?: number
          thumbnail_url?: string
          title?: string
          type?: string
          updated_at?: string
          url?: string
        }
        Update: {
          block_id?: string
          click_count?: number
          created_at?: string
          description?: string
          id?: string
          is_visible?: boolean
          metadata?: Json
          product_id?: string | null
          sort_order?: number
          thumbnail_url?: string
          title?: string
          type?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_linkinbio_items_block"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "linkinbio_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_linkinbio_items_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      linkinbio_pages: {
        Row: {
          avatar_url: string | null
          bio: string | null
          cover_url: string | null
          created_at: string
          display_name: string
          id: string
          layout: Json
          published: boolean
          seo: Json
          settings: Json
          site_id: string
          theme: Json
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          layout?: Json
          published?: boolean
          seo?: Json
          settings?: Json
          site_id: string
          theme?: Json
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          layout?: Json
          published?: boolean
          seo?: Json
          settings?: Json
          site_id?: string
          theme?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_linkinbio_pages_site"
            columns: ["site_id"]
            isOneToOne: true
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
          storage_file_id: string | null
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
          storage_file_id?: string | null
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
          storage_file_id?: string | null
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
          {
            foreignKeyName: "fk_media_library_storage"
            columns: ["storage_file_id"]
            isOneToOne: false
            referencedRelation: "storage_files"
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
            foreignKeyName: "fk_notif_creator"
            columns: ["recipient_creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_notif_user"
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
          site_id: string | null
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
          site_id?: string | null
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
          site_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_oi_order"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_oi_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
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
          referral_code_id: string
          referred_user_id: string | null
          referrer_creator_id: string | null
          status: string | null
        }
        Insert: {
          commission_amount?: number | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          order_id: string
          referral_code_id: string
          referred_user_id?: string | null
          referrer_creator_id?: string | null
          status?: string | null
        }
        Update: {
          commission_amount?: number | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string
          referral_code_id?: string
          referred_user_id?: string | null
          referrer_creator_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_order_referrals_code"
            columns: ["referral_code_id"]
            isOneToOne: false
            referencedRelation: "referral_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_order_referrals_creator"
            columns: ["referrer_creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_order_referrals_order"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          creator_id: string | null
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
          payment_verified_at: string | null
          status: string
          total_amount: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          creator_id?: string | null
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
          payment_verified_at?: string | null
          status?: string
          total_amount: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          creator_id?: string | null
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
          payment_verified_at?: string | null
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
            foreignKeyName: "fk_orders_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
        Relationships: []
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
        }
        Relationships: [
          {
            foreignKeyName: "fk_payment_submission_request"
            columns: ["payment_request_id"]
            isOneToOne: false
            referencedRelation: "payment_requests"
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
          storage_file_id: string | null
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
          storage_file_id?: string | null
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
          storage_file_id?: string | null
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
          {
            foreignKeyName: "fk_pf_storage"
            columns: ["storage_file_id"]
            isOneToOne: false
            referencedRelation: "storage_files"
            referencedColumns: ["id"]
          },
        ]
      }
      product_licenses: {
        Row: {
          expires_at: string | null
          id: string
          issued_at: string | null
          license_key: string | null
          license_type: string | null
          order_id: string
          order_item_id: string
          product_id: string
          snapshot: Json | null
          status: string
          user_id: string | null
        }
        Insert: {
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          license_key?: string | null
          license_type?: string | null
          order_id: string
          order_item_id: string
          product_id: string
          snapshot?: Json | null
          status?: string
          user_id?: string | null
        }
        Update: {
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          license_key?: string | null
          license_type?: string | null
          order_id?: string
          order_item_id?: string
          product_id?: string
          snapshot?: Json | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
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
        Relationships: []
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
            foreignKeyName: "fk_profiles_user"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      public_images: {
        Row: {
          category: string
          created_at: string | null
          height: number | null
          id: string
          name: string
          tags: string[] | null
          url: string
          width: number | null
        }
        Insert: {
          category?: string
          created_at?: string | null
          height?: number | null
          id?: string
          name?: string
          tags?: string[] | null
          url: string
          width?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          height?: number | null
          id?: string
          name?: string
          tags?: string[] | null
          url?: string
          width?: number | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          count: number
          key: string
          window_start: string
        }
        Insert: {
          count?: number
          key: string
          window_start: string
        }
        Update: {
          count?: number
          key?: string
          window_start?: string
        }
        Relationships: []
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
            foreignKeyName: "fk_referral_codes_owner_creator"
            columns: ["owner_creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_referral_codes_owner_user"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      service_bookings: {
        Row: {
          amount_paid: number | null
          booked_at: string | null
          created_at: string
          creator_id: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          notes: string | null
          service_id: string
          status: string
        }
        Insert: {
          amount_paid?: number | null
          booked_at?: string | null
          created_at?: string
          creator_id: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          notes?: string | null
          service_id: string
          status?: string
        }
        Update: {
          amount_paid?: number | null
          booked_at?: string | null
          created_at?: string
          creator_id?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          notes?: string | null
          service_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_bookings_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string
          creator_id: string
          description: string | null
          duration_minutes: number | null
          id: string
          is_active: boolean
          metadata: Json | null
          price: number
          service_type: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          price?: number
          service_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          price?: number
          service_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            foreignKeyName: "fk_design_tokens_creator"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            foreignKeyName: "fk_site_navigation_site"
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
          placement: string
          product_id: string
          site_id: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_visible?: boolean | null
          placement?: string
          product_id: string
          site_id: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_visible?: boolean | null
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
            foreignKeyName: "fk_site_sections_config_site"
            columns: ["site_id"]
            isOneToOne: true
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      site_singlepage: {
        Row: {
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
        }
        Insert: {
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
        }
        Update: {
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
        }
        Relationships: [
          {
            foreignKeyName: "fk_sp_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_sp_site"
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
          cdn_url: string
          checksum_sha256: string | null
          created_at: string | null
          deleted_at: string | null
          file_name: string | null
          file_type: string | null
          id: string
          metadata: Json | null
          mime_type: string | null
          owner_creator_id: string | null
          owner_user_id: string | null
          provider: Database["public"]["Enums"]["storage_provider_type"]
          provider_bucket: string
          provider_path: string
          public_url: string | null
          size_bytes: number | null
          status: string
          updated_at: string | null
        }
        Insert: {
          cdn_url: string
          checksum_sha256?: string | null
          created_at?: string | null
          deleted_at?: string | null
          file_name?: string | null
          file_type?: string | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          owner_creator_id?: string | null
          owner_user_id?: string | null
          provider?: Database["public"]["Enums"]["storage_provider_type"]
          provider_bucket: string
          provider_path: string
          public_url?: string | null
          size_bytes?: number | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          cdn_url?: string
          checksum_sha256?: string | null
          created_at?: string | null
          deleted_at?: string | null
          file_name?: string | null
          file_type?: string | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          owner_creator_id?: string | null
          owner_user_id?: string | null
          provider?: Database["public"]["Enums"]["storage_provider_type"]
          provider_bucket?: string
          provider_path?: string
          public_url?: string | null
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
            foreignKeyName: "fk_sub_creator"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_sub_plan"
            columns: ["subscription_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
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
        Relationships: [
          {
            foreignKeyName: "fk_ledger_creator"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ledger_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      upsell_pages: {
        Row: {
          config: Json
          created_at: string | null
          creator_id: string
          id: string
          is_published: boolean | null
          primary_product_id: string
          slug: string
          title: string
          updated_at: string | null
          upsell_product_ids: string[] | null
        }
        Insert: {
          config?: Json
          created_at?: string | null
          creator_id: string
          id?: string
          is_published?: boolean | null
          primary_product_id: string
          slug: string
          title: string
          updated_at?: string | null
          upsell_product_ids?: string[] | null
        }
        Update: {
          config?: Json
          created_at?: string | null
          creator_id?: string
          id?: string
          is_published?: boolean | null
          primary_product_id?: string
          slug?: string
          title?: string
          updated_at?: string | null
          upsell_product_ids?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "upsell_pages_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upsell_pages_primary_product_id_fkey"
            columns: ["primary_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "fk_cart_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_cart_user"
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
            foreignKeyName: "fk_upa_order"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
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
        Relationships: []
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
          balance_after: number
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
          balance_after: number
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
          balance_after?: number
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
            foreignKeyName: "fk_uwt_order"
            columns: ["related_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
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
            foreignKeyName: "fk_wallet_user"
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
            foreignKeyName: "fk_wishlist_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_wishlist_user"
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
      check_rate_limit: {
        Args: { p_key: string; p_max: number; p_window_seconds: number }
        Returns: boolean
      }
      credit_creator_balance: {
        Args: {
          p_creator_id: string
          p_earnings_delta: number
          p_fees_delta: number
        }
        Returns: undefined
      }
      current_profile_id: { Args: never; Returns: string }
      increment_coupon_uses: {
        Args: { p_coupon_id: string }
        Returns: undefined
      }
      increment_link_click_count: {
        Args: { p_link_id: string }
        Returns: undefined
      }
      is_super_admin: { Args: never; Returns: boolean }
      sum_bucket_bytes_for_prefix: {
        Args: { p_bucket_id: string; p_prefix: string }
        Returns: number
      }
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
      storage_provider_type:
        | "supabase"
        | "digitalocean"
        | "aws_s3"
        | "cloudflare_r2"
        | "gcs"
        | "bunny"
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
      storage_provider_type: [
        "supabase",
        "digitalocean",
        "aws_s3",
        "cloudflare_r2",
        "gcs",
        "bunny",
      ],
      subscription_plan_type: ["free", "plus", "pro"],
      user_role_type: ["super_admin", "creator", "user"],
      wallet_direction: ["credit", "debit"],
    },
  },
} as const
