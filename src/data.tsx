import { createContext, useContext } from "react";
import type { Store } from "./lib/store";
import type { Content, Employee, Org, TeamInfo } from "./types";

/** Everything the pages need: content, sample organisation, the demo manager's team and the editable state. */
export interface Data extends Store {
  content: Content;
  org: Org;
  team: { info: TeamInfo; employees: Employee[] };
}

export const DataContext = createContext<Data | null>(null);

export function useData(): Data {
  const data = useContext(DataContext);
  if (!data) throw new Error("DataContext is missing");
  return data;
}
