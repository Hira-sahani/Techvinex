import Navbar from "@/components/Navbar";

import { ArrowLeft, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserContext";
import { countries } from "@/data/countries";

const EditProfile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile, updateProfile } = useUser();
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [phone, setPhone] = useState(profile.phone);
  const [countryCode, setCountryCode] = useState("IN");
  const [countryOpen, setCountryOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedCountry = countries.find((c) => c.code === countryCode) || countries[0];
  const filteredCountries = countries.filter(
    (c) => c.name.toLowerCase().includes(countrySearch.toLowerCase()) || c.dial.includes(countrySearch)
  );

  const handleSave = () => {
    updateProfile({ name, email, phone });
    toast({ title: "Profile updated!", description: "Your changes have been saved." });
    navigate("/profile");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      <div className="pt-24 px-4 max-w-2xl mx-auto">
        <button onClick={() => navigate("/profile")} className="flex items-center gap-2 text-muted-foreground mb-6">
          <ArrowLeft size={18} />
          <span className="text-sm">Back</span>
        </button>
        <h1 className="text-xl font-bold text-foreground mb-6">Edit Profile</h1>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Full Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Phone</label>
            <div className="flex gap-2">
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setCountryOpen(!countryOpen)}
                  className="flex items-center gap-1 h-10 px-2.5 rounded-md border border-input bg-background text-sm hover:bg-secondary transition-colors min-w-[90px]"
                >
                  <span className="text-base">{selectedCountry.flag}</span>
                  <span className="text-foreground">{selectedCountry.dial}</span>
                  <ChevronDown size={14} className={`text-muted-foreground transition-transform ${countryOpen ? "rotate-180" : ""}`} />
                </button>
                {countryOpen && (
                  <>
                    <div className="fixed inset-0 z-[79]" onClick={() => { setCountryOpen(false); setCountrySearch(""); }} />
                    <div className="absolute top-full left-0 mt-1 z-[80] w-[280px] bg-popover rounded-lg border border-border shadow-xl">
                      <div className="p-2">
                        <Input
                          placeholder="Search country..."
                          value={countrySearch}
                          onChange={(e) => setCountrySearch(e.target.value)}
                          className="h-9 text-sm"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-[200px] overflow-y-auto overscroll-contain">
                        {filteredCountries.map((c) => (
                          <button
                            key={c.code}
                            onClick={() => {
                              setCountryCode(c.code);
                              setCountryOpen(false);
                              setCountrySearch("");
                            }}
                            className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm hover:bg-secondary active:bg-secondary transition-colors ${
                              c.code === countryCode ? "bg-secondary font-medium" : ""
                            }`}
                          >
                            <span className="text-lg">{c.flag}</span>
                            <span className="flex-1 text-left text-foreground">{c.name}</span>
                            <span className="text-xs text-muted-foreground">{c.dial}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
              <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="00000 00000" className="flex-1" />
            </div>
          </div>
          <Button onClick={handleSave} className="w-full mt-4">Save Changes</Button>
        </div>
      </div>
      <BottomTabBar />
    </div>
  );
};

export default EditProfile;
