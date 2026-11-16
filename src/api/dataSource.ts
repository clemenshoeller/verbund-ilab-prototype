import type { Content, Org } from "../types";
import contentJson from "../data/content.json";
import orgJson from "../data/org.json";

/**
 * The only place the app reads data from.
 *
 * MOCKED: in "mock" mode the two JSON files in src/data stand in for a backend.
 * A real backend (preferred stack: .NET with PostgreSQL or SQL Server) only has to
 * serve the same two shapes at GET {VITE_API_BASE_URL}/content and /org.
 */
const source = import.meta.env.VITE_DATA_SOURCE ?? "mock";
const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) throw new Error("The data could not be loaded.");
  return (await response.json()) as T;
}

export async function getContent(): Promise<Content> {
  if (source === "api") return fetchJson<Content>("/content");
  return contentJson as unknown as Content;
}

export async function getOrg(): Promise<Org> {
  if (source === "api") return fetchJson<Org>("/org");
  return orgJson as unknown as Org;
}
