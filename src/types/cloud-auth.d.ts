declare module "@lovable.dev/cloud-auth-js" {
  type OAuthProvider = "google" | "apple" | "microsoft" | "lovable";
  
  interface OAuthResult {
    redirected?: boolean;
    error?: Error;
    tokens?: { access_token: string; refresh_token: string };
  }
  
  interface SignInOptions {
    redirect_uri?: string;
    extraParams?: Record<string, string>;
  }
  
  interface LovableAuth {
    signInWithOAuth(provider: OAuthProvider, opts?: SignInOptions): Promise<OAuthResult>;
  }
  
  export function createLovableAuth(): LovableAuth;
}
