declare module '@supabase/supabase-js' {
  export function createClient(url: string, key: string, options?: any): any;
  export type SupabaseClient<T = any> = any;
  export type Session = any;
  export type User = any;
  export type AuthError = any;
  export type AuthChangeEvent = any;
  const _default: any;
  export default _default;
}
