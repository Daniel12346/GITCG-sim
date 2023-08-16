import { Database as DB } from "@/lib/database.types";
type CardT = DB["public"]["Tables"]["card"]["Row"];
declare global {
  type Database = DB;
  type Card = CardT;
}
