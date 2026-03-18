import type { User } from "@/lib/userContext";

export interface Program {
  id: number;
  name: string;
  description?: string | null;
  image_url?: string | null;
}

export interface UserWithPrograms extends User {
  programs: Program[];
}
