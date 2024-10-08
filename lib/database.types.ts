export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      card: {
        Row: {
          base_health: number | null
          card_basic_info_id: string
          card_type: string
          cost: Json | null
          counters: number | null
          element: string | null
          energy: number | null
          equipped_to_id: string | null
          faction: string | null
          full_text: string | null
          health: number | null
          id: string
          img_src: string
          is_active: boolean | null
          location: Database["public"]["Enums"]["CardLocation"] | null
          max_energy: number | null
          name: string
          owner_id: string
          statuses: Json[] | null
          usages: number | null
          weapon_type: string | null
        }
        Insert: {
          base_health?: number | null
          card_basic_info_id: string
          card_type: string
          cost?: Json | null
          counters?: number | null
          element?: string | null
          energy?: number | null
          equipped_to_id?: string | null
          faction?: string | null
          full_text?: string | null
          health?: number | null
          id?: string
          img_src: string
          is_active?: boolean | null
          location?: Database["public"]["Enums"]["CardLocation"] | null
          max_energy?: number | null
          name: string
          owner_id: string
          statuses?: Json[] | null
          usages?: number | null
          weapon_type?: string | null
        }
        Update: {
          base_health?: number | null
          card_basic_info_id?: string
          card_type?: string
          cost?: Json | null
          counters?: number | null
          element?: string | null
          energy?: number | null
          equipped_to_id?: string | null
          faction?: string | null
          full_text?: string | null
          health?: number | null
          id?: string
          img_src?: string
          is_active?: boolean | null
          location?: Database["public"]["Enums"]["CardLocation"] | null
          max_energy?: number | null
          name?: string
          owner_id?: string
          statuses?: Json[] | null
          usages?: number | null
          weapon_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "card_card_basic_info_id_fkey"
            columns: ["card_basic_info_id"]
            isOneToOne: false
            referencedRelation: "card_basic_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_equipped_to_id_fkey"
            columns: ["equipped_to_id"]
            isOneToOne: false
            referencedRelation: "card"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      card_basic_info: {
        Row: {
          base_health: number | null
          card_subtype: string | null
          card_type: string | null
          cost: Json | null
          element: string | null
          faction: string | null
          full_text: string | null
          id: string
          img_src: string
          is_combat_action: boolean | null
          max_energy: number | null
          name: string
          weapon_type: string | null
        }
        Insert: {
          base_health?: number | null
          card_subtype?: string | null
          card_type?: string | null
          cost?: Json | null
          element?: string | null
          faction?: string | null
          full_text?: string | null
          id?: string
          img_src: string
          is_combat_action?: boolean | null
          max_energy?: number | null
          name: string
          weapon_type?: string | null
        }
        Update: {
          base_health?: number | null
          card_subtype?: string | null
          card_type?: string | null
          cost?: Json | null
          element?: string | null
          faction?: string | null
          full_text?: string | null
          id?: string
          img_src?: string
          is_combat_action?: boolean | null
          max_energy?: number | null
          name?: string
          weapon_type?: string | null
        }
        Relationships: []
      }
      card_effect: {
        Row: {
          card_id: string | null
          effect_id: string | null
          id: string
        }
        Insert: {
          card_id?: string | null
          effect_id?: string | null
          id?: string
        }
        Update: {
          card_id?: string | null
          effect_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_effect_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "card"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_effect_effect_id_fkey"
            columns: ["effect_id"]
            isOneToOne: false
            referencedRelation: "effect"
            referencedColumns: ["id"]
          },
        ]
      }
      deck: {
        Row: {
          created_at: string | null
          id: string
          name: string | null
          player_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name?: string | null
          player_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string | null
          player_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deck_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      deck_card_basic_info: {
        Row: {
          card_basic_info_id: string
          deck_id: string
          id: string
          quantity: number | null
        }
        Insert: {
          card_basic_info_id: string
          deck_id: string
          id?: string
          quantity?: number | null
        }
        Update: {
          card_basic_info_id?: string
          deck_id?: string
          id?: string
          quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deck_card_basic_info_card_basic_info_id_fkey"
            columns: ["card_basic_info_id"]
            isOneToOne: false
            referencedRelation: "card_basic_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deck_card_basic_info_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "deck"
            referencedColumns: ["id"]
          },
        ]
      }
      effect: {
        Row: {
          card_id: string | null
          cost: Json | null
          effect_basic_infoIdId: string | null
          id: string
          total_usages: number | null
          usages_this_turn: number | null
        }
        Insert: {
          card_id?: string | null
          cost?: Json | null
          effect_basic_infoIdId?: string | null
          id?: string
          total_usages?: number | null
          usages_this_turn?: number | null
        }
        Update: {
          card_id?: string | null
          cost?: Json | null
          effect_basic_infoIdId?: string | null
          id?: string
          total_usages?: number | null
          usages_this_turn?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "effect_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "card"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "effect_effect_basic_infoIdId_fkey"
            columns: ["effect_basic_infoIdId"]
            isOneToOne: false
            referencedRelation: "effect_basic_info"
            referencedColumns: ["id"]
          },
        ]
      }
      effect_basic_info: {
        Row: {
          card_basic_infoId: string | null
          cost: Json | null
          description: string
          effect_type: string | null
          id: string
          name: string | null
        }
        Insert: {
          card_basic_infoId?: string | null
          cost?: Json | null
          description: string
          effect_type?: string | null
          id?: string
          name?: string | null
        }
        Update: {
          card_basic_infoId?: string | null
          cost?: Json | null
          description?: string
          effect_type?: string | null
          id?: string
          name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "effect_basic_info_card_basic_infoId_fkey"
            columns: ["card_basic_infoId"]
            isOneToOne: false
            referencedRelation: "card_basic_info"
            referencedColumns: ["id"]
          },
        ]
      }
      game: {
        Row: {
          created_at: string | null
          id: string
          player1_id: string
          player2_id: string
          turn_count: number | null
          winner_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          player1_id: string
          player2_id: string
          turn_count?: number | null
          winner_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          player1_id?: string
          player2_id?: string
          turn_count?: number | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      profile: {
        Row: {
          avatar_url: string | null
          current_deck_id: string | null
          full_name: string | null
          id: string
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          current_deck_id?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          current_deck_id?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_current_deck_id_fkey"
            columns: ["current_deck_id"]
            isOneToOne: false
            referencedRelation: "deck"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      CardLocation:
        | "DECK"
        | "CHARACTER"
        | "SUMMON"
        | "HAND"
        | "EQUIPPED"
        | "DISCARDED"
        | "ACTION"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never
