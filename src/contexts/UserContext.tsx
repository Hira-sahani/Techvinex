import { createContext, useContext, useState, ReactNode } from "react";

interface UserProfile {
  name: string;
  email: string;
  phone: string;
}

interface UserContextType {
  profile: UserProfile;
  updateProfile: (data: UserProfile) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [profile, setProfile] = useState<UserProfile>({
    name: "Guest User",
    email: "",
    phone: "",
  });

  const updateProfile = (data: UserProfile) => setProfile(data);

  return (
    <UserContext.Provider value={{ profile, updateProfile }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
};
