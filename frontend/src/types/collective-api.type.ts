import type { Collective } from "./collective.type";

export interface CollectiveApi {
    count: number;
    next: string | null;
    previous: string | null;
    results: Collective[];
  }