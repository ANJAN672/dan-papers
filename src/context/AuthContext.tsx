import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";


export interface User {
  id: string;
  userId: string; // Alias for id to match app usage
  name: string;
  email?: string;
  image?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  console.log("AuthProvider (Supabase) rendering");
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const mapUser = (sbUser: import("@supabase/supabase-js").User | null | undefined): User | null => {
    if (!sbUser) return null;
    return {
      id: sbUser.id,
      userId: sbUser.id,
      name: sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || sbUser.email || "Anonymous",
      email: sbUser.email,
      image: sbUser.user_metadata?.avatar_url || sbUser.user_metadata?.picture || "",
    };
  };

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(mapUser(session?.user));
      setIsLoading(false);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(mapUser(session?.user));
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/`, // Redirect to home after login
        queryParams: {
          prompt: 'consent'
        }
      }
    });
    if (error) {
      console.error("Error signing in:", error);
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        signIn: handleSignIn,
        signOut: handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
