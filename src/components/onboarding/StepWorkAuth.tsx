import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, Search } from "lucide-react";
import { countries } from "@/data/countries";
import { statesByCountry } from "@/data/states";
import { citiesByState } from "@/data/cities";
import { useState } from "react";

interface Props {
  form: {
    dob: string;
    country: string;
    state: string;
    city: string;
    postalCode: string;
    workFromDifferentCountry: boolean;
    authorizedToWork: boolean;
    agreeToRemain: boolean;
    signatureName: string;
    signatureText: string;
    signatureDate: string;
  };
  update: (key: string, value: any) => void;
}

const SearchableDropdown = ({
  label,
  value,
  placeholder,
  options,
  onSelect,
  allowFreeText = false,
}: {
  label: string;
  value: string;
  placeholder: string;
  options: string[];
  onSelect: (val: string) => void;
  allowFreeText?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmitFreeText = () => {
    if (allowFreeText && search.trim()) {
      onSelect(search.trim());
      setOpen(false);
      setSearch("");
    }
  };

  return (
    <div>
      <label className="text-sm font-medium text-foreground mb-1.5 block">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center justify-between w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
        >
          <span className={value ? "text-foreground" : "text-muted-foreground"}>
            {value || placeholder}
          </span>
          <ChevronDown size={14} className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-[79]" onClick={() => { setOpen(false); setSearch(""); }} />
            <div className="absolute top-full left-0 mt-1 z-[80] w-full bg-popover rounded-lg border border-border shadow-xl">
              <div className="p-2 relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={allowFreeText ? "Type or search..." : "Search..."}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (filtered.length > 0) {
                        onSelect(filtered[0]);
                        setOpen(false);
                        setSearch("");
                      } else {
                        handleSubmitFreeText();
                      }
                    }
                  }}
                  className="h-10 text-sm pl-8"
                  autoFocus
                />
              </div>
              <div className="max-h-[200px] overflow-y-auto overscroll-contain">
                {filtered.length === 0 && !allowFreeText && (
                  <div className="px-3 py-2.5 text-sm text-muted-foreground">No results</div>
                )}
                {filtered.length === 0 && allowFreeText && search.trim() && (
                  <button
                    onClick={handleSubmitFreeText}
                    className="flex items-center w-full px-3 py-2.5 text-sm hover:bg-secondary transition-colors"
                  >
                    <span className="text-foreground">Use "{search.trim()}"</span>
                  </button>
                )}
                {filtered.length === 0 && allowFreeText && !search.trim() && (
                  <div className="px-3 py-2.5 text-sm text-muted-foreground">Type a city name</div>
                )}
                {filtered.map((o) => (
                  <button
                    key={o}
                    onClick={() => { onSelect(o); setOpen(false); setSearch(""); }}
                    className={`flex items-center w-full px-3 py-2.5 text-sm hover:bg-secondary transition-colors ${value === o ? "bg-secondary font-medium" : ""}`}
                  >
                    <span className="text-foreground">{o}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const StepWorkAuth = ({ form, update }: Props) => {
  const [countryOpen, setCountryOpen] = useState(false);
  const [dobDisplay, setDobDisplay] = useState(() => {
    if (form.dob && form.dob.includes("-") && !form.dob.startsWith("__")) {
      const [y, m, d] = form.dob.split("-");
      return `${m}/${d}/${y}`;
    }
    return "";
  });
  const [sigDateDisplay, setSigDateDisplay] = useState(() => {
    if (form.signatureDate && form.signatureDate.includes("-")) {
      const [y, m, d] = form.signatureDate.split("-");
      return `${m}/${d}/${y}`;
    }
    return "";
  });

  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d]/g, "");
    if (raw.length > 8) return;
    let display = raw;
    if (raw.length > 4) display = `${raw.slice(0, 2)}/${raw.slice(2, 4)}/${raw.slice(4)}`;
    else if (raw.length > 2) display = `${raw.slice(0, 2)}/${raw.slice(2)}`;
    setDobDisplay(display);

    if (raw.length === 8) {
      const mm = raw.slice(0, 2), dd = raw.slice(2, 4), yyyy = raw.slice(4);
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const date = new Date(dateStr);
      if (!isNaN(date.getTime()) && date <= new Date() && date >= new Date("1900-01-01")) {
        update("dob", dateStr);
      } else {
        update("dob", "");
      }
    } else {
      update("dob", "");
    }
  };

  const stateOptions = statesByCountry[form.country] || [];
  const cityOptions = citiesByState[form.state] || [];

  return (
    <div className="text-center">
      <h1 className="text-xl font-bold text-foreground mb-1">Work authorization</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Please ensure you meet local employment requirements for work authorization. Accurate information helps us process your application smoothly.
      </p>

      <div className="text-left space-y-5">
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Date of Birth (MM/DD/YYYY) *</label>
          <Input
            type="text"
            inputMode="numeric"
            placeholder="MM/DD/YYYY"
            value={dobDisplay}
            onChange={handleDobChange}
            maxLength={10}
          />
        </div>

        <div className="border-t border-border pt-5">
          <h2 className="text-base font-semibold text-foreground mb-1">Location of Residence</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Let us know your location of residence, which is where you're based for most of the year. This might be different from your citizenship.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Country *</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setCountryOpen(!countryOpen)}
                  className="flex items-center justify-between w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <span className="text-foreground">{form.country || "Select Country"}</span>
                  <ChevronDown size={14} className="text-muted-foreground" />
                </button>
                {countryOpen && (
                  <>
                    <div className="fixed inset-0 z-[79]" onClick={() => setCountryOpen(false)} />
                    <div className="absolute top-full left-0 mt-1 z-[80] w-full bg-popover rounded-lg border border-border shadow-xl max-h-[200px] overflow-y-auto">
                      {countries.map((c) => (
                        <button
                          key={c.code}
                          onClick={() => {
                            update("country", c.name);
                            update("state", "");
                            update("city", "");
                            setCountryOpen(false);
                          }}
                          className={`flex items-center gap-2 w-full px-3 py-2.5 text-sm hover:bg-secondary transition-colors ${form.country === c.name ? "bg-secondary font-medium" : ""}`}
                        >
                          <span>{c.flag}</span>
                          <span className="text-foreground">{c.name}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <SearchableDropdown
              label="State / Province *"
              value={form.state}
              placeholder="Select State/Province"
              options={stateOptions}
              onSelect={(val) => {
                update("state", val);
                update("city", "");
              }}
            />

            {cityOptions.length > 0 ? (
              <SearchableDropdown
                label="City *"
                value={form.city}
                placeholder="Select City"
                options={cityOptions}
                onSelect={(val) => update("city", val)}
              />
            ) : (
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">City *</label>
                <Input
                  value={form.city}
                  onChange={(e) => update("city", e.target.value)}
                  placeholder="Enter city name"
                  className="text-sm"
                />
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Postal Code *</label>
              <Input value={form.postalCode} onChange={(e) => update("postalCode", e.target.value)} placeholder="Enter postal code" />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Checkbox
              id="diff-country"
              checked={form.workFromDifferentCountry}
              onCheckedChange={(checked) => update("workFromDifferentCountry", !!checked)}
              className="mt-0.5"
            />
            <label htmlFor="diff-country" className="text-xs text-muted-foreground cursor-pointer leading-relaxed">
              I will be physically working from a different country than {form.country || "India"} while performing services through Techvinex X
            </label>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="authorized"
              checked={form.authorizedToWork}
              onCheckedChange={(checked) => update("authorizedToWork", !!checked)}
              className="mt-0.5"
            />
            <div>
              <label htmlFor="authorized" className="text-xs text-foreground font-medium cursor-pointer">
                I confirm that I am legally authorized to work from {form.country || "India"}. *
              </label>
              <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                By checking this box, you represent and warrant that:<br />
                1. You have all necessary visas, permits, and/or legal rights to work from the country you have indicated.<br />
                2. You will defend, indemnify, and hold harmless Techvinex X from any claims, losses, or liabilities arising from your failure to maintain proper work authorization.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="agree-remain"
              checked={form.agreeToRemain}
              onCheckedChange={(checked) => update("agreeToRemain", !!checked)}
              className="mt-0.5"
            />
            <div>
              <label htmlFor="agree-remain" className="text-xs text-foreground font-medium cursor-pointer">
                I agree to remain working from {form.country || "India"}, and to notify Techvinex X in writing prior to any change. *
              </label>
              <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                By checking this box, you agree to:<br />
                1. Continue working only from the country specified above unless you have provided Techvinex X with prior written notice of your intended change of work location.<br />
                2. Obtain and maintain proper work authorization for any future country from which you intend to work before beginning work from that country.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-5">
          <h2 className="text-base font-semibold text-foreground mb-1">Digital Signature</h2>
          <p className="text-xs text-muted-foreground mb-4">Please provide your digital signature to confirm your agreement.</p>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Name *</label>
              <Input value={form.signatureName} onChange={(e) => update("signatureName", e.target.value)} placeholder="Enter your name" className="text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Signature ⓘ</label>
              <Input value={form.signatureText} onChange={(e) => update("signatureText", e.target.value)} placeholder="Enter your signature" className="text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Date (MM/DD/YYYY) *</label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="MM/DD/YYYY"
                value={sigDateDisplay}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^\d]/g, "");
                  if (raw.length > 8) return;
                  let display = raw;
                  if (raw.length > 4) display = `${raw.slice(0, 2)}/${raw.slice(2, 4)}/${raw.slice(4)}`;
                  else if (raw.length > 2) display = `${raw.slice(0, 2)}/${raw.slice(2)}`;
                  setSigDateDisplay(display);
                  if (raw.length === 8) {
                    const mm = raw.slice(0, 2), dd = raw.slice(2, 4), yyyy = raw.slice(4);
                    const dateStr = `${yyyy}-${mm}-${dd}`;
                    const date = new Date(dateStr);
                    if (!isNaN(date.getTime())) update("signatureDate", dateStr);
                    else update("signatureDate", "");
                  } else {
                    update("signatureDate", "");
                  }
                }}
                maxLength={10}
                className="text-sm"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepWorkAuth;