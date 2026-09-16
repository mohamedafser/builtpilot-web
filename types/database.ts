export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole =
  | "owner"
  | "admin"
  | "project_manager"
  | "engineer"
  | "site_supervisor"
  | "worker"
  | "member";

export type MemberRole = UserRole;

export type AIMessageRole = "user" | "assistant";

export type ProjectStatus =
  "planning" | "active" | "on_hold" | "completed" | "cancelled";

export type Weather =
  | "sunny"
  | "cloudy"
  | "overcast"
  | "rainy"
  | "stormy"
  | "windy"
  | "hot"
  | "cold"
  | "foggy";

export type ManpowerRole =
  "mason" | "helper" | "carpenter" | "electrician" | "plumber" | "other";

export type MaterialType = "received" | "used";

export type WorkerRole =
  | "mason"
  | "helper"
  | "carpenter"
  | "electrician"
  | "plumber"
  | "painter"
  | "welder"
  | "operator"
  | "supervisor"
  | "other";

export type WorkerStatus = "active" | "inactive";

export type ProjectWorkerStatus = WorkerStatus;

export type AttendanceStatus = "present" | "absent" | "half_day";

export type MaterialCategory =
  | "cement"
  | "sand"
  | "aggregate"
  | "steel"
  | "bricks"
  | "blocks"
  | "plumbing"
  | "electrical"
  | "tiles"
  | "paint"
  | "wood"
  | "hardware"
  | "other";

export type MaterialUnit =
  | "bag"
  | "kg"
  | "ton"
  | "cubic_ft"
  | "cubic_m"
  | "piece"
  | "box"
  | "liter"
  | "meter"
  | "sq_ft"
  | "sq_m"
  | "other";

export type MaterialStatus = "active" | "inactive";

export type VendorStatus = "active" | "inactive";

export type MaterialTransactionType =
  "received" | "used" | "returned" | "adjusted";

export type AdjustmentDirection = "increase" | "decrease";

export type ExpenseCategory =
  | "equipment"
  | "transport"
  | "fuel"
  | "tools"
  | "machinery"
  | "permits"
  | "subcontractor"
  | "electricity"
  | "water"
  | "site_security"
  | "accommodation"
  | "food"
  | "miscellaneous"
  | "other";

export type ExpensePaymentMethod =
  "cash" | "bank_transfer" | "upi" | "card" | "cheque" | "other";

export type ExpenseStatus = "active" | "void";

export type QuotationStatus =
  "draft" | "sent" | "accepted" | "rejected" | "expired" | "cancelled";

export type QuotationItemType = "material" | "labour" | "custom";

export type DiscountType = "percentage" | "fixed";

export type BoqStatus = "draft" | "active" | "completed" | "archived";

export type BoqItemType =
  "material" | "labour" | "equipment" | "work" | "other";

export type BoqUnit =
  | "sq_ft"
  | "sq_m"
  | "cubic_ft"
  | "cubic_m"
  | "meter"
  | "kg"
  | "ton"
  | "bag"
  | "piece"
  | "day"
  | "hour"
  | "liter"
  | "lot"
  | "other";

export type BoqMeasurementStatus = "active" | "void";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          language: "en" | "ta" | "ar" | "hi";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          language?: "en" | "ta" | "ar" | "hi";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          language?: "en" | "ta" | "ar" | "hi";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      email_otps: {
        Row: {
          id: string;
          user_id: string;
          email: string;
          code_hash: string;
          expires_at: string;
          attempts: number;
          consumed_at: string | null;
          created_at: string;
          purpose: "signup" | "password_reset";
        };
        Insert: {
          id?: string;
          user_id: string;
          email: string;
          code_hash: string;
          expires_at: string;
          attempts?: number;
          consumed_at?: string | null;
          created_at?: string;
          purpose?: "signup" | "password_reset";
        };
        Update: {
          id?: string;
          user_id?: string;
          email?: string;
          code_hash?: string;
          expires_at?: string;
          attempts?: number;
          consumed_at?: string | null;
          created_at?: string;
          purpose?: "signup" | "password_reset";
        };
        Relationships: [];
      };
      businesses: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          created_by: string | null;
          country_code: string;
          currency_code: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          owner_id: string;
          created_by?: string | null;
          country_code?: string;
          currency_code?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          owner_id?: string;
          created_by?: string | null;
          country_code?: string;
          currency_code?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "businesses_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "businesses_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      business_invitations: {
        Row: {
          id: string;
          business_id: string;
          email: string;
          role: MemberRole;
          invited_by: string;
          token_hash: string;
          expires_at: string;
          accepted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          email: string;
          role: MemberRole;
          invited_by: string;
          token_hash: string;
          expires_at: string;
          accepted_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          email?: string;
          role?: MemberRole;
          invited_by?: string;
          token_hash?: string;
          expires_at?: string;
          accepted_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "business_invitations_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "business_invitations_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      business_members: {
        Row: {
          id: string;
          business_id: string;
          user_id: string;
          role: MemberRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          user_id: string;
          role: MemberRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          user_id?: string;
          role?: MemberRole;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "business_members_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "business_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          client_name: string | null;
          client_phone: string | null;
          client_email: string | null;
          location: string | null;
          description: string | null;
          estimated_budget: string | null;
          status: ProjectStatus;
          start_date: string | null;
          expected_end_date: string | null;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          client_name?: string | null;
          client_phone?: string | null;
          client_email?: string | null;
          location?: string | null;
          description?: string | null;
          estimated_budget?: number | string | null;
          status?: ProjectStatus;
          start_date?: string | null;
          expected_end_date?: string | null;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          client_name?: string | null;
          client_phone?: string | null;
          client_email?: string | null;
          location?: string | null;
          description?: string | null;
          estimated_budget?: number | string | null;
          status?: ProjectStatus;
          start_date?: string | null;
          expected_end_date?: string | null;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projects_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_site_reports: {
        Row: {
          id: string;
          project_id: string;
          business_id: string;
          report_date: string;
          weather: string | null;
          work_completed: string;
          issues: string | null;
          tomorrow_plan: string | null;
          general_notes: string | null;
          created_by: string;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          business_id: string;
          report_date: string;
          weather?: string | null;
          work_completed: string;
          issues?: string | null;
          tomorrow_plan?: string | null;
          general_notes?: string | null;
          created_by: string;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          business_id?: string;
          report_date?: string;
          weather?: string | null;
          work_completed?: string;
          issues?: string | null;
          tomorrow_plan?: string | null;
          general_notes?: string | null;
          created_by?: string;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "daily_site_reports_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daily_site_reports_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daily_site_reports_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_report_manpower: {
        Row: {
          id: string;
          daily_report_id: string;
          role: ManpowerRole;
          worker_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          daily_report_id: string;
          role: ManpowerRole;
          worker_count: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          daily_report_id?: string;
          role?: ManpowerRole;
          worker_count?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "daily_report_manpower_daily_report_id_fkey";
            columns: ["daily_report_id"];
            isOneToOne: false;
            referencedRelation: "daily_site_reports";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_report_materials: {
        Row: {
          id: string;
          daily_report_id: string;
          material_name: string;
          quantity: string;
          unit: string;
          type: MaterialType;
          created_at: string;
        };
        Insert: {
          id?: string;
          daily_report_id: string;
          material_name: string;
          quantity: number | string;
          unit: string;
          type: MaterialType;
          created_at?: string;
        };
        Update: {
          id?: string;
          daily_report_id?: string;
          material_name?: string;
          quantity?: number | string;
          unit?: string;
          type?: MaterialType;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "daily_report_materials_daily_report_id_fkey";
            columns: ["daily_report_id"];
            isOneToOne: false;
            referencedRelation: "daily_site_reports";
            referencedColumns: ["id"];
          },
        ];
      };
      site_photos: {
        Row: {
          id: string;
          project_id: string;
          daily_report_id: string | null;
          business_id: string;
          storage_path: string;
          file_name: string;
          file_size: number;
          mime_type: string;
          caption: string | null;
          uploaded_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          daily_report_id?: string | null;
          business_id: string;
          storage_path: string;
          file_name: string;
          file_size: number;
          mime_type: string;
          caption?: string | null;
          uploaded_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          daily_report_id?: string | null;
          business_id?: string;
          storage_path?: string;
          file_name?: string;
          file_size?: number;
          mime_type?: string;
          caption?: string | null;
          uploaded_by?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "site_photos_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "site_photos_daily_report_id_fkey";
            columns: ["daily_report_id"];
            isOneToOne: false;
            referencedRelation: "daily_site_reports";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "site_photos_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "site_photos_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      project_documents: {
        Row: {
          id: string;
          project_id: string;
          business_id: string;
          storage_path: string;
          file_name: string;
          file_size: number;
          mime_type: string;
          uploaded_by: string;
          notes: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          business_id: string;
          storage_path: string;
          file_name: string;
          file_size?: number;
          mime_type?: string;
          uploaded_by: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          business_id?: string;
          storage_path?: string;
          file_name?: string;
          file_size?: number;
          mime_type?: string;
          uploaded_by?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "project_documents_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_documents_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_documents_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      workers: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          phone: string | null;
          role: WorkerRole;
          daily_wage: string;
          status: WorkerStatus;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          phone?: string | null;
          role: WorkerRole;
          daily_wage: number | string;
          status?: WorkerStatus;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          phone?: string | null;
          role?: WorkerRole;
          daily_wage?: number | string;
          status?: WorkerStatus;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workers_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      project_workers: {
        Row: {
          id: string;
          project_id: string;
          worker_id: string;
          business_id: string;
          assigned_from: string;
          assigned_until: string | null;
          status: ProjectWorkerStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          worker_id: string;
          business_id: string;
          assigned_from?: string;
          assigned_until?: string | null;
          status?: ProjectWorkerStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          worker_id?: string;
          business_id?: string;
          assigned_from?: string;
          assigned_until?: string | null;
          status?: ProjectWorkerStatus;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_workers_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_workers_worker_id_fkey";
            columns: ["worker_id"];
            isOneToOne: false;
            referencedRelation: "workers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_workers_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      worker_attendance: {
        Row: {
          id: string;
          business_id: string;
          project_id: string;
          worker_id: string;
          attendance_date: string;
          status: AttendanceStatus;
          hours_worked: string | null;
          wage: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          project_id: string;
          worker_id: string;
          attendance_date: string;
          status: AttendanceStatus;
          hours_worked?: number | string | null;
          wage: number | string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          project_id?: string;
          worker_id?: string;
          attendance_date?: string;
          status?: AttendanceStatus;
          hours_worked?: number | string | null;
          wage?: number | string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "worker_attendance_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "worker_attendance_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "worker_attendance_worker_id_fkey";
            columns: ["worker_id"];
            isOneToOne: false;
            referencedRelation: "workers";
            referencedColumns: ["id"];
          },
        ];
      };
      materials: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          category: MaterialCategory;
          unit: MaterialUnit;
          default_unit_price: string | null;
          minimum_stock: string | null;
          vendor_id: string | null;
          status: MaterialStatus;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          category: MaterialCategory;
          unit: MaterialUnit;
          default_unit_price?: number | string | null;
          minimum_stock?: number | string | null;
          vendor_id?: string | null;
          status?: MaterialStatus;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          category?: MaterialCategory;
          unit?: MaterialUnit;
          default_unit_price?: number | string | null;
          minimum_stock?: number | string | null;
          vendor_id?: string | null;
          status?: MaterialStatus;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "materials_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "materials_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: false;
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
      };
      vendors: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          contact_person: string | null;
          phone: string | null;
          email: string | null;
          address: string | null;
          notes: string | null;
          status: VendorStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          contact_person?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          notes?: string | null;
          status?: VendorStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          contact_person?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          notes?: string | null;
          status?: VendorStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vendors_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      project_vendors: {
        Row: {
          id: string;
          business_id: string;
          project_id: string;
          vendor_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          project_id: string;
          vendor_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          project_id?: string;
          vendor_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_vendors_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_vendors_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_vendors_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: false;
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
      };
      project_materials: {
        Row: {
          id: string;
          business_id: string;
          project_id: string;
          material_id: string;
          planned_quantity: string | null;
          minimum_stock: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          project_id: string;
          material_id: string;
          planned_quantity?: number | string | null;
          minimum_stock?: number | string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          project_id?: string;
          material_id?: string;
          planned_quantity?: number | string | null;
          minimum_stock?: number | string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_materials_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_materials_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_materials_material_id_fkey";
            columns: ["material_id"];
            isOneToOne: false;
            referencedRelation: "materials";
            referencedColumns: ["id"];
          },
        ];
      };
      material_transactions: {
        Row: {
          id: string;
          business_id: string;
          project_id: string;
          material_id: string;
          vendor_id: string | null;
          transaction_type: MaterialTransactionType;
          quantity: string;
          unit_price: string | null;
          total_cost: string | null;
          transaction_date: string;
          reference_number: string | null;
          notes: string | null;
          adjustment_direction: AdjustmentDirection | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          project_id: string;
          material_id: string;
          vendor_id?: string | null;
          transaction_type: MaterialTransactionType;
          quantity: number | string;
          unit_price?: number | string | null;
          total_cost?: number | string | null;
          transaction_date: string;
          reference_number?: string | null;
          notes?: string | null;
          adjustment_direction?: AdjustmentDirection | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          project_id?: string;
          material_id?: string;
          vendor_id?: string | null;
          transaction_type?: MaterialTransactionType;
          quantity?: number | string;
          unit_price?: number | string | null;
          total_cost?: number | string | null;
          transaction_date?: string;
          reference_number?: string | null;
          notes?: string | null;
          adjustment_direction?: AdjustmentDirection | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "material_transactions_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "material_transactions_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "material_transactions_material_id_fkey";
            columns: ["material_id"];
            isOneToOne: false;
            referencedRelation: "materials";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "material_transactions_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: false;
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "material_transactions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      project_expenses: {
        Row: {
          id: string;
          business_id: string;
          project_id: string;
          vendor_id: string | null;
          category: ExpenseCategory;
          description: string;
          amount: string;
          expense_date: string;
          payment_method: ExpensePaymentMethod | null;
          reference_number: string | null;
          receipt_path: string | null;
          notes: string | null;
          status: ExpenseStatus;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          project_id: string;
          vendor_id?: string | null;
          category: ExpenseCategory;
          description: string;
          amount: number | string;
          expense_date: string;
          payment_method?: ExpensePaymentMethod | null;
          reference_number?: string | null;
          receipt_path?: string | null;
          notes?: string | null;
          status?: ExpenseStatus;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          project_id?: string;
          vendor_id?: string | null;
          category?: ExpenseCategory;
          description?: string;
          amount?: number | string;
          expense_date?: string;
          payment_method?: ExpensePaymentMethod | null;
          reference_number?: string | null;
          receipt_path?: string | null;
          notes?: string | null;
          status?: ExpenseStatus;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_expenses_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_expenses_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_expenses_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: false;
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_expenses_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      quotation_counters: {
        Row: {
          business_id: string;
          year: number;
          last_number: number;
        };
        Insert: {
          business_id: string;
          year: number;
          last_number?: number;
        };
        Update: {
          business_id?: string;
          year?: number;
          last_number?: number;
        };
        Relationships: [
          {
            foreignKeyName: "quotation_counters_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      quotation_templates: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          country_code: string;
          currency_code: string;
          project_type: string;
          description: string | null;
          payload: Json;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          country_code: string;
          currency_code: string;
          project_type?: string;
          description?: string | null;
          payload: Json;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          country_code?: string;
          currency_code?: string;
          project_type?: string;
          description?: string | null;
          payload?: Json;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quotation_templates_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotation_templates_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      quotations: {
        Row: {
          id: string;
          business_id: string;
          project_id: string | null;
          quotation_number: string;
          title: string;
          client_name: string;
          client_phone: string | null;
          client_email: string | null;
          client_address: string | null;
          quotation_date: string;
          valid_until: string | null;
          subtotal: string;
          discount_type: DiscountType | null;
          discount_value: string;
          discount_amount: string;
          tax_percentage: string | null;
          tax_amount: string;
          total_amount: string;
          notes: string | null;
          terms: string | null;
          status: QuotationStatus;
          rejection_reason: string | null;
          response_token_hash: string | null;
          response_token_created_at: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          project_id?: string | null;
          quotation_number: string;
          title: string;
          client_name: string;
          client_phone?: string | null;
          client_email?: string | null;
          client_address?: string | null;
          quotation_date: string;
          valid_until?: string | null;
          subtotal?: number | string;
          discount_type?: DiscountType | null;
          discount_value?: number | string;
          discount_amount?: number | string;
          tax_percentage?: number | string | null;
          tax_amount?: number | string;
          total_amount?: number | string;
          notes?: string | null;
          terms?: string | null;
          status?: QuotationStatus;
          rejection_reason?: string | null;
          response_token_hash?: string | null;
          response_token_created_at?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          project_id?: string | null;
          quotation_number?: string;
          title?: string;
          client_name?: string;
          client_phone?: string | null;
          client_email?: string | null;
          client_address?: string | null;
          quotation_date?: string;
          valid_until?: string | null;
          subtotal?: number | string;
          discount_type?: DiscountType | null;
          discount_value?: number | string;
          discount_amount?: number | string;
          tax_percentage?: number | string | null;
          tax_amount?: number | string;
          total_amount?: number | string;
          notes?: string | null;
          terms?: string | null;
          status?: QuotationStatus;
          rejection_reason?: string | null;
          response_token_hash?: string | null;
          response_token_created_at?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quotations_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotations_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotations_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      quotation_items: {
        Row: {
          id: string;
          quotation_id: string;
          business_id: string;
          item_type: QuotationItemType;
          material_id: string | null;
          worker_id: string | null;
          description: string;
          quantity: string;
          unit: string;
          unit_price: string;
          total_amount: string;
          sort_order: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          quotation_id: string;
          business_id: string;
          item_type: QuotationItemType;
          material_id?: string | null;
          worker_id?: string | null;
          description: string;
          quantity: number | string;
          unit: string;
          unit_price: number | string;
          total_amount: number | string;
          sort_order?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          quotation_id?: string;
          business_id?: string;
          item_type?: QuotationItemType;
          material_id?: string | null;
          worker_id?: string | null;
          description?: string;
          quantity?: number | string;
          unit?: string;
          unit_price?: number | string;
          total_amount?: number | string;
          sort_order?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quotation_items_quotation_id_fkey";
            columns: ["quotation_id"];
            isOneToOne: false;
            referencedRelation: "quotations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotation_items_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotation_items_material_id_fkey";
            columns: ["material_id"];
            isOneToOne: false;
            referencedRelation: "materials";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotation_items_worker_id_fkey";
            columns: ["worker_id"];
            isOneToOne: false;
            referencedRelation: "workers";
            referencedColumns: ["id"];
          },
        ];
      };
      boqs: {
        Row: {
          id: string;
          business_id: string;
          project_id: string;
          name: string;
          description: string | null;
          status: BoqStatus;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          project_id: string;
          name: string;
          description?: string | null;
          status?: BoqStatus;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          project_id?: string;
          name?: string;
          description?: string | null;
          status?: BoqStatus;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "boqs_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boqs_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boqs_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      boq_sections: {
        Row: {
          id: string;
          boq_id: string;
          business_id: string;
          name: string;
          description: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          boq_id: string;
          business_id: string;
          name: string;
          description?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          boq_id?: string;
          business_id?: string;
          name?: string;
          description?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "boq_sections_boq_id_fkey";
            columns: ["boq_id"];
            isOneToOne: false;
            referencedRelation: "boqs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_sections_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      boq_items: {
        Row: {
          id: string;
          boq_id: string;
          section_id: string | null;
          business_id: string;
          material_id: string | null;
          item_code: string | null;
          description: string;
          item_type: BoqItemType;
          unit: BoqUnit;
          estimated_quantity: string;
          rate: string;
          estimated_amount: string;
          completed_quantity: string;
          notes: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          boq_id: string;
          section_id?: string | null;
          business_id: string;
          material_id?: string | null;
          item_code?: string | null;
          description: string;
          item_type: BoqItemType;
          unit: BoqUnit;
          estimated_quantity: number | string;
          rate: number | string;
          estimated_amount: number | string;
          completed_quantity?: number | string;
          notes?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          boq_id?: string;
          section_id?: string | null;
          business_id?: string;
          material_id?: string | null;
          item_code?: string | null;
          description?: string;
          item_type?: BoqItemType;
          unit?: BoqUnit;
          estimated_quantity?: number | string;
          rate?: number | string;
          estimated_amount?: number | string;
          completed_quantity?: number | string;
          notes?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "boq_items_boq_id_fkey";
            columns: ["boq_id"];
            isOneToOne: false;
            referencedRelation: "boqs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_items_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "boq_sections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_items_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_items_material_id_fkey";
            columns: ["material_id"];
            isOneToOne: false;
            referencedRelation: "materials";
            referencedColumns: ["id"];
          },
        ];
      };
      boq_measurements: {
        Row: {
          id: string;
          business_id: string;
          project_id: string;
          boq_id: string;
          boq_item_id: string;
          measurement_date: string;
          description: string | null;
          quantity: string;
          unit: BoqUnit;
          location: string | null;
          reference: string | null;
          notes: string | null;
          status: BoqMeasurementStatus;
          measured_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          project_id: string;
          boq_id: string;
          boq_item_id: string;
          measurement_date: string;
          description?: string | null;
          quantity: number | string;
          unit: BoqUnit;
          location?: string | null;
          reference?: string | null;
          notes?: string | null;
          status?: BoqMeasurementStatus;
          measured_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          project_id?: string;
          boq_id?: string;
          boq_item_id?: string;
          measurement_date?: string;
          description?: string | null;
          quantity?: number | string;
          unit?: BoqUnit;
          location?: string | null;
          reference?: string | null;
          notes?: string | null;
          status?: BoqMeasurementStatus;
          measured_by?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "boq_measurements_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_measurements_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_measurements_boq_id_fkey";
            columns: ["boq_id"];
            isOneToOne: false;
            referencedRelation: "boqs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_measurements_boq_item_id_fkey";
            columns: ["boq_item_id"];
            isOneToOne: false;
            referencedRelation: "boq_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "boq_measurements_measured_by_fkey";
            columns: ["measured_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      project_client_access: {
        Row: {
          id: string;
          business_id: string;
          project_id: string;
          client_name: string;
          client_email: string | null;
          client_phone: string | null;
          access_token_hash: string;
          is_active: boolean;
          expires_at: string | null;
          last_accessed_at: string | null;
          whatsapp_enabled: boolean;
          whatsapp_phone: string | null;
          whatsapp_opted_in: boolean;
          whatsapp_opted_in_at: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          project_id: string;
          client_name: string;
          client_email?: string | null;
          client_phone?: string | null;
          access_token_hash: string;
          is_active?: boolean;
          expires_at?: string | null;
          last_accessed_at?: string | null;
          whatsapp_enabled?: boolean;
          whatsapp_phone?: string | null;
          whatsapp_opted_in?: boolean;
          whatsapp_opted_in_at?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          project_id?: string;
          client_name?: string;
          client_email?: string | null;
          client_phone?: string | null;
          access_token_hash?: string;
          is_active?: boolean;
          expires_at?: string | null;
          last_accessed_at?: string | null;
          whatsapp_enabled?: boolean;
          whatsapp_phone?: string | null;
          whatsapp_opted_in?: boolean;
          whatsapp_opted_in_at?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_client_access_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_client_access_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_client_access_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      project_client_settings: {
        Row: {
          id: string;
          business_id: string;
          project_id: string;
          show_project_overview: boolean;
          show_daily_reports: boolean;
          show_site_photos: boolean;
          show_boq: boolean;
          show_measurements: boolean;
          show_quotation: boolean;
          show_project_cost: boolean;
          show_client_contact: boolean;
          show_project_location: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          project_id: string;
          show_project_overview?: boolean;
          show_daily_reports?: boolean;
          show_site_photos?: boolean;
          show_boq?: boolean;
          show_measurements?: boolean;
          show_quotation?: boolean;
          show_project_cost?: boolean;
          show_client_contact?: boolean;
          show_project_location?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          project_id?: string;
          show_project_overview?: boolean;
          show_daily_reports?: boolean;
          show_site_photos?: boolean;
          show_boq?: boolean;
          show_measurements?: boolean;
          show_quotation?: boolean;
          show_project_cost?: boolean;
          show_client_contact?: boolean;
          show_project_location?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_client_settings_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_client_settings_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: true;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_conversations: {
        Row: {
          id: string;
          business_id: string;
          user_id: string;
          project_id: string | null;
          title: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          user_id: string;
          project_id?: string | null;
          title?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          user_id?: string;
          project_id?: string | null;
          title?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_conversations_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_conversations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_conversations_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_messages: {
        Row: {
          id: string;
          business_id: string;
          conversation_id: string;
          role: AIMessageRole;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          conversation_id: string;
          role: AIMessageRole;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          conversation_id?: string;
          role?: AIMessageRole;
          content?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_messages_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "ai_conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_usage: {
        Row: {
          id: string;
          business_id: string;
          user_id: string;
          conversation_id: string | null;
          model: string;
          input_tokens: number | null;
          output_tokens: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          user_id: string;
          conversation_id?: string | null;
          model: string;
          input_tokens?: number | null;
          output_tokens?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          user_id?: string;
          conversation_id?: string | null;
          model?: string;
          input_tokens?: number | null;
          output_tokens?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_usage_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_usage_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_usage_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "ai_conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      whatsapp_messages: {
        Row: {
          id: string;
          business_id: string;
          project_id: string | null;
          client_access_id: string | null;
          recipient_phone: string;
          message_type: string;
          template_name: string | null;
          content: string | null;
          provider_message_id: string | null;
          idempotency_key: string | null;
          status: string;
          error_code: string | null;
          error_message: string | null;
          retryable: boolean;
          sent_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          project_id?: string | null;
          client_access_id?: string | null;
          recipient_phone: string;
          message_type: string;
          template_name?: string | null;
          content?: string | null;
          provider_message_id?: string | null;
          idempotency_key?: string | null;
          status?: string;
          error_code?: string | null;
          error_message?: string | null;
          retryable?: boolean;
          sent_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          project_id?: string | null;
          client_access_id?: string | null;
          recipient_phone?: string;
          message_type?: string;
          template_name?: string | null;
          content?: string | null;
          provider_message_id?: string | null;
          idempotency_key?: string | null;
          status?: string;
          error_code?: string | null;
          error_message?: string | null;
          retryable?: boolean;
          sent_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "whatsapp_messages_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "whatsapp_messages_client_access_id_fkey";
            columns: ["client_access_id"];
            isOneToOne: false;
            referencedRelation: "project_client_access";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "whatsapp_messages_sent_by_fkey";
            columns: ["sent_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      whatsapp_webhook_events: {
        Row: {
          id: string;
          provider_event_id: string;
          provider_message_id: string | null;
          event_type: string;
          payload_digest: string | null;
          processed_at: string;
        };
        Insert: {
          id?: string;
          provider_event_id: string;
          provider_message_id?: string | null;
          event_type: string;
          payload_digest?: string | null;
          processed_at?: string;
        };
        Update: {
          id?: string;
          provider_event_id?: string;
          provider_message_id?: string | null;
          event_type?: string;
          payload_digest?: string | null;
          processed_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          business_id: string;
          user_id: string;
          project_id: string | null;
          type: string;
          title: string;
          message: string;
          action_url: string | null;
          is_read: boolean;
          dedupe_key: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          user_id: string;
          project_id?: string | null;
          type: string;
          title: string;
          message: string;
          action_url?: string | null;
          is_read?: boolean;
          dedupe_key?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          user_id?: string;
          project_id?: string | null;
          type?: string;
          title?: string;
          message?: string;
          action_url?: string | null;
          is_read?: boolean;
          dedupe_key?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_preferences: {
        Row: {
          id: string;
          business_id: string;
          user_id: string;
          daily_report_notifications: boolean;
          quotation_notifications: boolean;
          boq_notifications: boolean;
          labour_notifications: boolean;
          material_notifications: boolean;
          client_portal_notifications: boolean;
          whatsapp_notifications: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          user_id: string;
          daily_report_notifications?: boolean;
          quotation_notifications?: boolean;
          boq_notifications?: boolean;
          labour_notifications?: boolean;
          material_notifications?: boolean;
          client_portal_notifications?: boolean;
          whatsapp_notifications?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          user_id?: string;
          daily_report_notifications?: boolean;
          quotation_notifications?: boolean;
          boq_notifications?: boolean;
          labour_notifications?: boolean;
          material_notifications?: boolean;
          client_portal_notifications?: boolean;
          whatsapp_notifications?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_preferences_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notification_preferences_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      project_actions: {
        Row: {
          id: string;
          business_id: string;
          project_id: string;
          type:
            | "material"
            | "labour"
            | "quotation"
            | "payment"
            | "task"
            | "inspection";
          action_key: string;
          title: string;
          description: string | null;
          status: "pending" | "completed" | "dismissed";
          reference_id: string | null;
          href: string | null;
          metadata: Record<string, unknown>;
          created_by: string | null;
          completed_by: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          project_id: string;
          type:
            | "material"
            | "labour"
            | "quotation"
            | "payment"
            | "task"
            | "inspection";
          action_key: string;
          title: string;
          description?: string | null;
          status?: "pending" | "completed" | "dismissed";
          reference_id?: string | null;
          href?: string | null;
          metadata?: Record<string, unknown>;
          created_by?: string | null;
          completed_by?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          project_id?: string;
          type?:
            | "material"
            | "labour"
            | "quotation"
            | "payment"
            | "task"
            | "inspection";
          action_key?: string;
          title?: string;
          description?: string | null;
          status?: "pending" | "completed" | "dismissed";
          reference_id?: string | null;
          href?: string | null;
          metadata?: Record<string, unknown>;
          created_by?: string | null;
          completed_by?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_actions_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_actions_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      material_stock_balances: {
        Row: {
          business_id: string | null;
          project_id: string | null;
          material_id: string | null;
          current_stock: string | null;
          total_received: string | null;
          total_used: string | null;
          total_returned: string | null;
          total_purchased_cost: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      seed_default_materials_for_business: {
        Args: {
          target_business_id: string;
          target_country_code?: string;
        };
        Returns: number;
      };
      setup_owner_business: {
        Args: {
          target_user_id: string;
          target_business_name: string;
          target_country_code?: string;
          target_language?: string;
        };
        Returns: string;
      };
      is_business_member: {
        Args: { target_business_id: string };
        Returns: boolean;
      };
      has_business_role: {
        Args: {
          target_business_id: string;
          allowed_roles: MemberRole[];
        };
        Returns: boolean;
      };
      can_view_profile: {
        Args: { target_user_id: string };
        Returns: boolean;
      };
      project_belongs_to_business: {
        Args: { target_project_id: string; target_business_id: string };
        Returns: boolean;
      };
      can_access_daily_report: {
        Args: { target_report_id: string };
        Returns: boolean;
      };
      daily_report_matches_scope: {
        Args: {
          target_report_id: string;
          target_project_id: string;
          target_business_id: string;
        };
        Returns: boolean;
      };
      is_site_photo_member: {
        Args: { object_name: string };
        Returns: boolean;
      };
      worker_belongs_to_business: {
        Args: { target_worker_id: string; target_business_id: string };
        Returns: boolean;
      };
      assignment_matches_scope: {
        Args: {
          target_project_id: string;
          target_worker_id: string;
          target_business_id: string;
        };
        Returns: boolean;
      };
      material_belongs_to_business: {
        Args: { target_material_id: string; target_business_id: string };
        Returns: boolean;
      };
      vendor_belongs_to_business: {
        Args: { target_vendor_id: string; target_business_id: string };
        Returns: boolean;
      };
      project_material_matches_scope: {
        Args: {
          target_project_id: string;
          target_material_id: string;
          target_business_id: string;
        };
        Returns: boolean;
      };
      project_vendor_matches_scope: {
        Args: {
          target_project_id: string;
          target_vendor_id: string;
          target_business_id: string;
        };
        Returns: boolean;
      };
      material_transaction_matches_scope: {
        Args: {
          target_project_id: string;
          target_material_id: string;
          target_vendor_id: string | null;
          target_business_id: string;
        };
        Returns: boolean;
      };
      is_expense_receipt_member: {
        Args: { object_name: string };
        Returns: boolean;
      };
      project_cost_totals: {
        Args: {
          target_project_id: string;
          range_from?: string | null;
          range_to?: string | null;
        };
        Returns: {
          labour_cost: number;
          material_cost: number;
          expense_cost: number;
          labour_records: number;
          material_records: number;
          expense_records: number;
        }[];
      };
      projects_cost_totals: {
        Args: { target_project_ids: string[] };
        Returns: {
          project_id: string;
          labour_cost: number;
          material_cost: number;
          expense_cost: number;
        }[];
      };
      project_monthly_costs: {
        Args: {
          target_project_id: string;
          range_from: string;
          range_to: string;
        };
        Returns: {
          month_start: string;
          labour_cost: number;
          material_cost: number;
          expense_cost: number;
        }[];
      };
      project_expense_category_totals: {
        Args: {
          target_project_id: string;
          range_from?: string | null;
          range_to?: string | null;
        };
        Returns: {
          category: ExpenseCategory;
          total_amount: number;
          expense_count: number;
        }[];
      };
      quotation_belongs_to_business: {
        Args: { target_quotation_id: string; target_business_id: string };
        Returns: boolean;
      };
      next_quotation_number: {
        Args: { target_business_id: string };
        Returns: string;
      };
      quotation_workspace_stats: {
        Args: { target_business_id: string };
        Returns: {
          total: number;
          draft: number;
          sent: number;
          accepted: number;
          rejected: number;
          expired: number;
          cancelled: number;
          accepted_value: number;
        }[];
      };
      boq_belongs_to_business: {
        Args: { target_boq_id: string; target_business_id: string };
        Returns: boolean;
      };
      boq_section_belongs_to_business: {
        Args: { target_section_id: string; target_business_id: string };
        Returns: boolean;
      };
      boq_item_belongs_to_business: {
        Args: { target_item_id: string; target_business_id: string };
        Returns: boolean;
      };
      boq_summaries: {
        Args: { target_project_id: string };
        Returns: {
          boq_id: string;
          item_count: number;
          estimated_value: number;
          completed_value: number;
        }[];
      };
      resolve_client_portal: {
        Args: { p_token_hash: string };
        Returns: {
          status: string;
          access_id: string | null;
          business_id: string | null;
          project_id: string | null;
          client_name: string | null;
          client_email: string | null;
          client_phone: string | null;
          expires_at: string | null;
          last_accessed_at: string | null;
          business_name: string | null;
          project_name: string | null;
          project_status: ProjectStatus | null;
          project_location: string | null;
          project_description: string | null;
          project_start_date: string | null;
          project_expected_end_date: string | null;
          project_client_name: string | null;
          project_client_email: string | null;
          project_client_phone: string | null;
          show_project_overview: boolean | null;
          show_daily_reports: boolean | null;
          show_site_photos: boolean | null;
          show_boq: boolean | null;
          show_measurements: boolean | null;
          show_quotation: boolean | null;
          show_project_cost: boolean | null;
          show_client_contact: boolean | null;
          show_project_location: boolean | null;
        }[];
      };
      lookup_client_portal: {
        Args: { p_token_hash: string };
        Returns: {
          status: string;
          access_id: string | null;
          business_id: string | null;
          project_id: string | null;
          client_name: string | null;
          client_email: string | null;
          client_phone: string | null;
          expires_at: string | null;
          last_accessed_at: string | null;
          business_name: string | null;
          project_name: string | null;
          project_status: ProjectStatus | null;
          project_location: string | null;
          project_description: string | null;
          project_start_date: string | null;
          project_expected_end_date: string | null;
          project_client_name: string | null;
          project_client_email: string | null;
          project_client_phone: string | null;
          show_project_overview: boolean | null;
          show_daily_reports: boolean | null;
          show_site_photos: boolean | null;
          show_boq: boolean | null;
          show_measurements: boolean | null;
          show_quotation: boolean | null;
          show_project_cost: boolean | null;
          show_client_contact: boolean | null;
          show_project_location: boolean | null;
        }[];
      };
      client_portal_reports: {
        Args: {
          p_token_hash: string;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: {
          id: string;
          report_date: string;
          weather: string | null;
          work_completed: string;
          issues: string | null;
          tomorrow_plan: string | null;
          general_notes: string | null;
          photo_count: number;
          worker_count: number;
          total_count: number;
        }[];
      };
      client_portal_report: {
        Args: { p_token_hash: string; p_report_id: string };
        Returns: {
          id: string;
          report_date: string;
          weather: string | null;
          work_completed: string;
          issues: string | null;
          tomorrow_plan: string | null;
          general_notes: string | null;
        }[];
      };
      client_portal_report_manpower: {
        Args: { p_token_hash: string; p_report_id: string };
        Returns: {
          role: ManpowerRole;
          worker_count: number;
        }[];
      };
      client_portal_photos: {
        Args: {
          p_token_hash: string;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: {
          id: string;
          storage_path: string;
          caption: string | null;
          created_at: string;
          daily_report_id: string | null;
          report_date: string | null;
          total_count: number;
        }[];
      };
      client_portal_boq_items: {
        Args: { p_token_hash: string };
        Returns: {
          boq_id: string;
          boq_name: string;
          section_id: string | null;
          section_name: string | null;
          section_sort_order: number | null;
          item_id: string;
          item_code: string | null;
          description: string;
          unit: BoqUnit;
          estimated_quantity: number;
          completed_quantity: number;
          rate: number;
          estimated_amount: number;
          sort_order: number;
        }[];
      };
      client_portal_measurements: {
        Args: {
          p_token_hash: string;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: {
          id: string;
          measurement_date: string;
          quantity: number;
          unit: BoqUnit;
          location: string | null;
          description: string | null;
          reference: string | null;
          item_description: string;
          total_count: number;
        }[];
      };
      client_portal_quotation: {
        Args: { p_token_hash: string };
        Returns: {
          id: string;
          quotation_number: string;
          title: string;
          quotation_date: string;
          valid_until: string | null;
          client_name: string;
          client_phone: string | null;
          client_email: string | null;
          client_address: string | null;
          subtotal: number;
          discount_type: DiscountType | null;
          discount_value: number;
          discount_amount: number;
          tax_percentage: number | null;
          tax_amount: number;
          total_amount: number;
          notes: string | null;
          terms: string | null;
        }[];
      };
      client_portal_quotation_items: {
        Args: { p_token_hash: string };
        Returns: {
          id: string;
          description: string;
          quantity: number;
          unit: string;
          unit_price: number;
          total_amount: number;
          sort_order: number;
        }[];
      };
      client_portal_cost_totals: {
        Args: { p_token_hash: string };
        Returns: {
          labour_cost: number;
          material_cost: number;
          expense_cost: number;
          labour_records: number;
          material_records: number;
          expense_records: number;
        }[];
      };
    };
    Enums: {
      member_role: MemberRole;
      project_status: ProjectStatus;
      manpower_role: ManpowerRole;
      material_entry_type: MaterialType;
      worker_role: WorkerRole;
      worker_status: WorkerStatus;
      project_worker_status: ProjectWorkerStatus;
      attendance_status: AttendanceStatus;
      material_category: MaterialCategory;
      material_unit: MaterialUnit;
      material_status: MaterialStatus;
      vendor_status: VendorStatus;
      material_transaction_type: MaterialTransactionType;
      adjustment_direction: AdjustmentDirection;
      expense_category: ExpenseCategory;
      expense_payment_method: ExpensePaymentMethod;
      expense_status: ExpenseStatus;
      quotation_status: QuotationStatus;
      quotation_item_type: QuotationItemType;
      discount_type: DiscountType;
      boq_status: BoqStatus;
      boq_item_type: BoqItemType;
      boq_unit: BoqUnit;
      boq_measurement_status: BoqMeasurementStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Business = Database["public"]["Tables"]["businesses"]["Row"];
export type BusinessMember =
  Database["public"]["Tables"]["business_members"]["Row"];
export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type DailySiteReport =
  Database["public"]["Tables"]["daily_site_reports"]["Row"];
export type DailyReportManpower =
  Database["public"]["Tables"]["daily_report_manpower"]["Row"];
export type DailyReportMaterial =
  Database["public"]["Tables"]["daily_report_materials"]["Row"];
export type SitePhoto = Database["public"]["Tables"]["site_photos"]["Row"];
export type Worker = Database["public"]["Tables"]["workers"]["Row"];
export type ProjectWorker =
  Database["public"]["Tables"]["project_workers"]["Row"];
export type WorkerAttendance =
  Database["public"]["Tables"]["worker_attendance"]["Row"];
export type Material = Database["public"]["Tables"]["materials"]["Row"];
export type Vendor = Database["public"]["Tables"]["vendors"]["Row"];
export type ProjectVendor =
  Database["public"]["Tables"]["project_vendors"]["Row"];
export type ProjectMaterial =
  Database["public"]["Tables"]["project_materials"]["Row"];
export type MaterialTransaction =
  Database["public"]["Tables"]["material_transactions"]["Row"];
export type MaterialStockBalance =
  Database["public"]["Views"]["material_stock_balances"]["Row"];
export type ProjectExpense =
  Database["public"]["Tables"]["project_expenses"]["Row"];
export type QuotationCounter =
  Database["public"]["Tables"]["quotation_counters"]["Row"];
export type QuotationTemplate =
  Database["public"]["Tables"]["quotation_templates"]["Row"];
export type Quotation = Database["public"]["Tables"]["quotations"]["Row"];
export type QuotationItem =
  Database["public"]["Tables"]["quotation_items"]["Row"];
export type Boq = Database["public"]["Tables"]["boqs"]["Row"];
export type BoqSection = Database["public"]["Tables"]["boq_sections"]["Row"];
export type BoqItem = Database["public"]["Tables"]["boq_items"]["Row"];
export type BoqMeasurement =
  Database["public"]["Tables"]["boq_measurements"]["Row"];
export type ProjectClientAccess =
  Database["public"]["Tables"]["project_client_access"]["Row"];
export type ProjectClientSettings =
  Database["public"]["Tables"]["project_client_settings"]["Row"];
export type AIConversation =
  Database["public"]["Tables"]["ai_conversations"]["Row"];
export type AIMessage = Database["public"]["Tables"]["ai_messages"]["Row"];
export type AIUsage = Database["public"]["Tables"]["ai_usage"]["Row"];
export type WhatsAppMessage =
  Database["public"]["Tables"]["whatsapp_messages"]["Row"];
export type WhatsAppWebhookEvent =
  Database["public"]["Tables"]["whatsapp_webhook_events"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type NotificationPreference =
  Database["public"]["Tables"]["notification_preferences"]["Row"];
export type ProjectAction =
  Database["public"]["Tables"]["project_actions"]["Row"];
export type ProjectActionType = ProjectAction["type"];
export type ProjectActionStatus = ProjectAction["status"];
