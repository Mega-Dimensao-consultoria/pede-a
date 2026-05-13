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
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          taxa_entrega: number
          tipo: Database["public"]["Enums"]["order_type"]
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
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
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          taxa_entrega?: number
          tipo?: Database["public"]["Enums"]["order_type"]
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
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
          cnpj: string | null
          endereco: string | null
          horarios: Json
          id: string
          nome: string
          pix_key: string | null
          pix_qr_url: string | null
          telefone: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          cnpj?: string | null
          endereco?: string | null
          horarios?: Json
          id?: string
          nome?: string
          pix_key?: string | null
          pix_qr_url?: string | null
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          cnpj?: string | null
          endereco?: string | null
          horarios?: Json
          id?: string
          nome?: string
          pix_key?: string | null
          pix_qr_url?: string | null
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "customer"
      identifier_type: "email" | "whatsapp"
      order_status:
        | "pendente"
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
