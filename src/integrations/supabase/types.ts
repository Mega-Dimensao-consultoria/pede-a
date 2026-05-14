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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      cart_items: {
        Row: {
          addons: Json
          created_at: string
          id: string
          observacoes: string | null
          preco_unit: number
          product_id: string
          quantidade: number
          size: Json | null
          user_id: string
        }
        Insert: {
          addons?: Json
          created_at?: string
          id?: string
          observacoes?: string | null
          preco_unit?: number
          product_id: string
          quantidade?: number
          size?: Json | null
          user_id: string
        }
        Update: {
          addons?: Json
          created_at?: string
          id?: string
          observacoes?: string | null
          preco_unit?: number
          product_id?: string
          quantidade?: number
          size?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          ordem: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          ordem?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      neighborhood_delivery: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          is_outros: boolean
          nome: string
          taxa: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          is_outros?: boolean
          nome: string
          taxa?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          is_outros?: boolean
          nome?: string
          taxa?: number
        }
        Relationships: []
      }
      orders: {
        Row: {
          approved_at: string | null
          bairro_id: string | null
          bairro_nome: string | null
          cliente_nome: string | null
          cliente_whatsapp: string | null
          cpf_nota: string | null
          created_at: string
          endereco: Json | null
          id: string
          items: Json
          numero: number
          pagamento: Database["public"]["Enums"]["payment_method"]
          payment_proof_deleted_at: string | null
          payment_proof_path: string | null
          payment_proof_uploaded_at: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          taxa_entrega: number
          tipo: Database["public"]["Enums"]["order_type"]
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          bairro_id?: string | null
          bairro_nome?: string | null
          cliente_nome?: string | null
          cliente_whatsapp?: string | null
          cpf_nota?: string | null
          created_at?: string
          endereco?: Json | null
          id?: string
          items?: Json
          numero?: number
          pagamento?: Database["public"]["Enums"]["payment_method"]
          payment_proof_deleted_at?: string | null
          payment_proof_path?: string | null
          payment_proof_uploaded_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          taxa_entrega?: number
          tipo?: Database["public"]["Enums"]["order_type"]
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          bairro_id?: string | null
          bairro_nome?: string | null
          cliente_nome?: string | null
          cliente_whatsapp?: string | null
          cpf_nota?: string | null
          created_at?: string
          endereco?: Json | null
          id?: string
          items?: Json
          numero?: number
          pagamento?: Database["public"]["Enums"]["payment_method"]
          payment_proof_deleted_at?: string | null
          payment_proof_path?: string | null
          payment_proof_uploaded_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          taxa_entrega?: number
          tipo?: Database["public"]["Enums"]["order_type"]
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_bairro_id_fkey"
            columns: ["bairro_id"]
            isOneToOne: false
            referencedRelation: "neighborhood_delivery"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          addons: Json
          ativo: boolean
          category_id: string | null
          created_at: string
          descricao: string | null
          id: string
          imagem_url: string | null
          nome: string
          preco_base: number
          sizes: Json
          updated_at: string
        }
        Insert: {
          addons?: Json
          ativo?: boolean
          category_id?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          imagem_url?: string | null
          nome: string
          preco_base?: number
          sizes?: Json
          updated_at?: string
        }
        Update: {
          addons?: Json
          ativo?: boolean
          category_id?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          imagem_url?: string | null
          nome?: string
          preco_base?: number
          sizes?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          cpf: string | null
          created_at: string
          email: string | null
          id: string
          identifier_type: Database["public"]["Enums"]["identifier_type"]
          nome: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          email?: string | null
          id: string
          identifier_type?: Database["public"]["Enums"]["identifier_type"]
          nome?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          identifier_type?: Database["public"]["Enums"]["identifier_type"]
          nome?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      store_config: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          complemento: string | null
          endereco: string | null
          horarios: Json
          id: string
          nome: string
          numero: string | null
          pix_key: string | null
          pix_qr_url: string | null
          rua: string | null
          telefone: string | null
          uf: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          endereco?: string | null
          horarios?: Json
          id?: string
          nome?: string
          numero?: string | null
          pix_key?: string | null
          pix_qr_url?: string | null
          rua?: string | null
          telefone?: string | null
          uf?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          endereco?: string | null
          horarios?: Json
          id?: string
          nome?: string
          numero?: string | null
          pix_key?: string | null
          pix_qr_url?: string | null
          rua?: string | null
          telefone?: string | null
          uf?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_addresses: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          created_at: string
          estado: string | null
          id: string
          is_default: boolean
          numero: string
          referencia: string | null
          rotulo: string | null
          rua: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          created_at?: string
          estado?: string | null
          id?: string
          is_default?: boolean
          numero: string
          referencia?: string | null
          rotulo?: string | null
          rua: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          created_at?: string
          estado?: string | null
          id?: string
          is_default?: boolean
          numero?: string
          referencia?: string | null
          rotulo?: string | null
          rua?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      cleanup_old_payment_proofs: { Args: never; Returns: undefined }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "customer"
      identifier_type: "email" | "whatsapp"
      order_status:
        | "pendente"
        | "aprovado"
        | "preparando"
        | "saiu"
        | "concluido"
        | "cancelado"
      order_type: "retirada" | "entrega"
      payment_method: "cartao" | "pix"
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
      app_role: ["admin", "customer"],
      identifier_type: ["email", "whatsapp"],
      order_status: [
        "pendente",
        "aprovado",
        "preparando",
        "saiu",
        "concluido",
        "cancelado",
      ],
      order_type: ["retirada", "entrega"],
      payment_method: ["cartao", "pix"],
    },
  },
} as const
