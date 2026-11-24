import "server-only";

/** Runs one read; a failure becomes a value the page renders, not a crash. */
export async function load<T>(read: () => Promise<T>): Promise<{ data: T; error?: undefined } | { data?: undefined; error: unknown }> {
  try {
    return { data: await read() };
  } catch (error) {
    return { error };
  }
}

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;
