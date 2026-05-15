export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      patients: {
        Row: {
          id: string
          name: string
          dob: string
          hospital_file_number: string
          mobile_number: string
          sex: string
          age_of_diagnosis: string
          diagnosis: string
          treatment: string
          current_treatment: string
          history: string
          past_medical_history: string
          drug_history: string
          past_surgical_history: string
          note: string | null
          follow_up_date: string
          table_data: string
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          name: string
          dob: string
          hospital_file_number: string
          mobile_number: string
          sex: string
          age_of_diagnosis: string
          diagnosis: string
          treatment: string
          current_treatment: string
          history: string
          past_medical_history: string
          drug_history: string
          past_surgical_history: string
          note?: string | null
          follow_up_date: string
          table_data: string
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          name?: string
          dob?: string
          hospital_file_number?: string
          mobile_number?: string
          sex?: string
          age_of_diagnosis?: string
          diagnosis?: string
          treatment?: string
          current_treatment?: string
          history?: string
          past_medical_history?: string
          drug_history?: string
          past_surgical_history?: string
          note?: string | null
          follow_up_date?: string
          table_data?: string
          created_at?: string
          updated_at?: string
          user_id?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 