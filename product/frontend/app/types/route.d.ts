import { NextRequest } from 'next/server';

// Add compatibility for route handler types in Next.js 15
declare module 'next' {
  interface RouteHandlerContext<Params extends Record<string, string>> {
    params: Params;
  }

  // Extend the existing type to ensure our route handler context is properly typed
  export type NextRequestWithParams<T extends Record<string, string> = Record<string, string>> = {
    request: NextRequest;
    params: T;
  };
}