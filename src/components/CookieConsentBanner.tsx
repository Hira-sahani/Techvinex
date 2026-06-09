import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  acceptAll,
  rejectAll,
  setConsent,
  hasConsentDecision,
  getConsent,
  CONSENT_EVENT,
} from "@/lib/consent";

const CookieConsentBanner = () => {
  const [visible, setVisible] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [functional, setFunctional] = useState(false);

  useEffect(() => {
    if (!hasConsentDecision()) {
      setVisible(true);
    }
    const onChange = () => setVisible(false);
    const onOpen = () => {
      const c = getConsent();
      setAnalytics(!!c?.analytics);
      setMarketing(!!c?.marketing);
      setFunctional(!!c?.functional);
      setShowPrefs(true);
      setVisible(true);
    };
    window.addEventListener(CONSENT_EVENT, onChange);
    window.addEventListener("open-cookie-preferences", onOpen);
    return () => {
      window.removeEventListener(CONSENT_EVENT, onChange);
      window.removeEventListener("open-cookie-preferences", onOpen);
    };
  }, []);

  if (!visible) return null;

  const handleAcceptAll = () => {
    acceptAll();
    setVisible(false);
  };
  const handleRejectAll = () => {
    rejectAll();
    setVisible(false);
  };
  const handleSave = () => {
    setConsent({ analytics, marketing, functional });
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[1000] p-3 sm:p-4 pointer-events-none"
    >
      <div className="pointer-events-auto mx-auto max-w-3xl rounded-xl border border-border bg-background/95 backdrop-blur shadow-lg p-4 sm:p-5">
        {!showPrefs ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex-1 text-sm text-foreground">
              <p className="font-medium mb-1">We value your privacy</p>
              <p className="text-muted-foreground">
                We use cookies to enhance your experience and analyze site usage. See our{" "}
                <Link to="/cookie-policy" className="underline">cookie policy</Link>.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 sm:flex-nowrap">
              <Button variant="outline" size="sm" onClick={() => setShowPrefs(true)}>
                Preferences
              </Button>
              <Button variant="outline" size="sm" onClick={handleRejectAll}>
                Reject all
              </Button>
              <Button size="sm" onClick={handleAcceptAll}>
                Accept all
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="font-medium text-sm">Cookie preferences</p>
              <p className="text-xs text-muted-foreground mt-1">
                Choose which categories of cookies you allow.
              </p>
            </div>
            <div className="space-y-3">
              <PrefRow
                label="Strictly necessary"
                description="Required for the site to function. Always on."
                checked
                disabled
              />
              <PrefRow
                label="Functional"
                description="Remember preferences and enhance functionality."
                checked={functional}
                onChange={setFunctional}
              />
              <PrefRow
                label="Analytics"
                description="Help us understand site usage (Google Analytics)."
                checked={analytics}
                onChange={setAnalytics}
              />
              <PrefRow
                label="Marketing"
                description="Used to deliver relevant ads and measure campaigns."
                checked={marketing}
                onChange={setMarketing}
              />
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" size="sm" onClick={handleRejectAll}>
                Reject all
              </Button>
              <Button variant="outline" size="sm" onClick={handleAcceptAll}>
                Accept all
              </Button>
              <Button size="sm" onClick={handleSave}>
                Save preferences
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const PrefRow = ({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}) => (
  <div className="flex items-start justify-between gap-3">
    <div>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
    <Switch
      checked={checked}
      disabled={disabled}
      onCheckedChange={(v) => onChange?.(!!v)}
      aria-label={label}
    />
  </div>
);

export default CookieConsentBanner;
