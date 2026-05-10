import { useState, useRef } from "react";
import { Upload, Plus, X, Info, ChevronDown, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useUser } from "@/contexts/UserContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import { useNavigate } from "react-router-dom";
import { countries } from "@/data/countries";

import SidebarNav from "@/components/SidebarNav";
import TopStatusBar from "@/components/TopStatusBar";
import ProfileResumeTab from "@/components/profile/ProfileResumeTab";
import ProfileLocationTab from "@/components/profile/ProfileLocationTab";
import ProfileAvailabilityTab from "@/components/profile/ProfileAvailabilityTab";
import ProfileWorkPrefsTab from "@/components/profile/ProfileWorkPrefsTab";
import ProfileCommunicationsTab from "@/components/profile/ProfileCommunicationsTab";
import ProfileAccountTab from "@/components/profile/ProfileAccountTab";

const tabs = [
  "Resume",
  "Location & Work Authorization",
  "Availability",
  "Work Preferences",
  "Communications",
  "Account",
];

const Profile = () => {
  const [activeTab, setActiveTab] = useState("Resume");

  return (
    <div className="min-h-screen bg-background">
      <SidebarNav />
      <div className="md:ml-16 pb-20">
        <TopStatusBar currentStep={2} />
        <div className="px-4 sm:px-6 pt-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-xl font-semibold text-foreground mb-4">Profile</h1>

            {/* Horizontal scrollable tabs */}
            <div className="border-b border-border mb-6 overflow-x-auto scrollbar-hide">
              <div className="flex gap-0 min-w-max">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                      activeTab === tab
                        ? "border-foreground text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab content */}
            {activeTab === "Resume" && <ProfileResumeTab />}
            {activeTab === "Location & Work Authorization" && <ProfileLocationTab />}
            {activeTab === "Availability" && <ProfileAvailabilityTab />}
            {activeTab === "Work Preferences" && <ProfileWorkPrefsTab />}
            {activeTab === "Communications" && <ProfileCommunicationsTab />}
            {activeTab === "Account" && <ProfileAccountTab />}
          </div>
        </div>
      </div>
      
    </div>
  );
};

export default Profile;
