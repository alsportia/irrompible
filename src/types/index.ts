import type { User } from "@/lib/userContext";

export interface Program {
  id: number;
  name: string;
}

export interface UserWithPrograms extends User {
  programs: Program[];
}
