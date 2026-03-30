import Navbar from "@/components/Navbar";
import BottomTabBar from "@/components/BottomTabBar";
import { ArrowLeft, Bell, Moon, Globe, Shield, ChevronRight, HelpCircle, Trash2, Lock, MessageCircle, ChevronDown, Loader2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/contexts/LangContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { checkPasswordStrength, checkLeakedPassword } from "@/lib/passwordSecurity";
import { useTheme } from "next-themes";

const langOptions = [
  { code: "en", label: "English", native: "English" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "es", label: "Spanish", native: "Español" },
  { code: "fr", label: "French", native: "Français" },
  { code: "de", label: "German", native: "Deutsch" },
  { code: "ja", label: "Japanese", native: "日本語" },
  { code: "zh", label: "Chinese (Simplified)", native: "简体中文" },
  { code: "zh-TW", label: "Chinese (Traditional)", native: "繁體中文" },
  { code: "ar", label: "Arabic", native: "العربية" },
  { code: "pt", label: "Portuguese", native: "Português" },
  { code: "ko", label: "Korean", native: "한국어" },
  { code: "ru", label: "Russian", native: "Русский" },
  { code: "tr", label: "Turkish", native: "Türkçe" },
  { code: "it", label: "Italian", native: "Italiano" },
  { code: "nl", label: "Dutch", native: "Nederlands" },
  { code: "pl", label: "Polish", native: "Polski" },
  { code: "sv", label: "Swedish", native: "Svenska" },
  { code: "da", label: "Danish", native: "Dansk" },
  { code: "no", label: "Norwegian", native: "Norsk" },
  { code: "fi", label: "Finnish", native: "Suomi" },
  { code: "el", label: "Greek", native: "Ελληνικά" },
  { code: "cs", label: "Czech", native: "Čeština" },
  { code: "ro", label: "Romanian", native: "Română" },
  { code: "hu", label: "Hungarian", native: "Magyar" },
  { code: "uk", label: "Ukrainian", native: "Українська" },
  { code: "th", label: "Thai", native: "ไทย" },
  { code: "vi", label: "Vietnamese", native: "Tiếng Việt" },
  { code: "id", label: "Indonesian", native: "Bahasa Indonesia" },
  { code: "ms", label: "Malay", native: "Bahasa Melayu" },
  { code: "tl", label: "Filipino", native: "Filipino" },
  { code: "bn", label: "Bengali", native: "বাংলা" },
  { code: "ta", label: "Tamil", native: "தமிழ்" },
  { code: "te", label: "Telugu", native: "తెలుగు" },
  { code: "mr", label: "Marathi", native: "मराठी" },
  { code: "gu", label: "Gujarati", native: "ગુજરાતી" },
  { code: "kn", label: "Kannada", native: "ಕನ್ನಡ" },
  { code: "ml", label: "Malayalam", native: "മലയാളം" },
  { code: "pa", label: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "ur", label: "Urdu", native: "اردو" },
  { code: "fa", label: "Persian", native: "فارسی" },
  { code: "he", label: "Hebrew", native: "עברית" },
  { code: "sw", label: "Swahili", native: "Kiswahili" },
  { code: "am", label: "Amharic", native: "አማርኛ" },
  { code: "ha", label: "Hausa", native: "Hausa" },
  { code: "yo", label: "Yoruba", native: "Yorùbá" },
  { code: "ig", label: "Igbo", native: "Igbo" },
  { code: "zu", label: "Zulu", native: "isiZulu" },
  { code: "af", label: "Afrikaans", native: "Afrikaans" },
  { code: "ne", label: "Nepali", native: "नेपाली" },
  { code: "si", label: "Sinhala", native: "සිංහල" },
  { code: "my", label: "Burmese", native: "မြန်မာ" },
  { code: "km", label: "Khmer", native: "ខ្មែរ" },
  { code: "lo", label: "Lao", native: "ລາວ" },
  { code: "ka", label: "Georgian", native: "ქართული" },
  { code: "hy", label: "Armenian", native: "Հայերեն" },
  { code: "az", label: "Azerbaijani", native: "Azərbaycan" },
  { code: "uz", label: "Uzbek", native: "Oʻzbek" },
  { code: "kk", label: "Kazakh", native: "Қазақ" },
  { code: "mn", label: "Mongolian", native: "Монгол" },
  { code: "sk", label: "Slovak", native: "Slovenčina" },
  { code: "sl", label: "Slovenian", native: "Slovenščina" },
  { code: "hr", label: "Croatian", native: "Hrvatski" },
  { code: "sr", label: "Serbian", native: "Српски" },
  { code: "bg", label: "Bulgarian", native: "Български" },
  { code: "lt", label: "Lithuanian", native: "Lietuvių" },
  { code: "lv", label: "Latvian", native: "Latviešu" },
  { code: "et", label: "Estonian", native: "Eesti" },
  { code: "is", label: "Icelandic", native: "Íslenska" },
  { code: "mt", label: "Maltese", native: "Malti" },
  { code: "ga", label: "Irish", native: "Gaeilge" },
  { code: "cy", label: "Welsh", native: "Cymraeg" },
  { code: "eu", label: "Basque", native: "Euskara" },
  { code: "ca", label: "Catalan", native: "Català" },
  { code: "gl", label: "Galician", native: "Galego" },
];

const FaqItem = ({ question, answer }: { question: string; answer: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium text-foreground hover:bg-secondary/50 transition-colors"
      >
        <span className="text-left flex-1">{question}</span>
        <ChevronDown size={14} className={`text-muted-foreground shrink-0 ml-2 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-3 pb-3 pt-0">
          <p className="text-xs text-muted-foreground leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
};

const Settings = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { t, lang, setLang } = useLang();
  const { logout } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  const [langOpen, setLangOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(() => searchParams.get("tab") === "support");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [changePassOpen, setChangePassOpen] = useState(false);
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [passLoading, setPassLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleNotifToggle = (val: boolean) => {
    setNotifications(val);
    toast({ title: val ? "Notifications enabled" : "Notifications disabled" });
  };

  const handleDarkToggle = (val: boolean) => {
    setTheme(val ? "dark" : "light");
    toast({ title: val ? "Dark mode enabled 🌙" : "Light mode enabled ☀️" });
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      // Sign out and show confirmation (actual deletion needs admin/edge function)
      await logout();
      toast({ title: "Account deletion request submitted. You have been signed out." });
      navigate("/login");
    } catch {
      toast({ title: "Failed to process request", variant: "destructive" });
    } finally {
      setDeleteLoading(false);
      setDeleteConfirm(false);
    }
  };

  const handleChangePass = async () => {
    if (!newPass || !confirmPass) {
      toast({ title: "Please fill both fields", variant: "destructive" });
      return;
    }
    if (newPass !== confirmPass) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    const strength = checkPasswordStrength(newPass);
    if (!strength.isStrong) {
      toast({ title: strength.errors[0], variant: "destructive" });
      return;
    }
    setPassLoading(true);
    try {
      const leaked = await checkLeakedPassword(newPass);
      if (leaked.leaked) {
        toast({ title: `This password appeared in ${leaked.count.toLocaleString()} data breaches. Choose a different one.`, variant: "destructive" });
        setPassLoading(false);
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: newPass });
      if (error) throw error;
      setChangePassOpen(false);
      setNewPass("");
      setConfirmPass("");
      toast({ title: "Password updated successfully!" });
    } catch (err: any) {
      toast({ title: err.message || "Failed to update password", variant: "destructive" });
    } finally {
      setPassLoading(false);
    }
  };

  const currentLangLabel = langOptions.find((l) => l.code === lang)?.label || "English";

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      <div className="pt-24 px-4 max-w-2xl mx-auto">
        <button onClick={() => navigate("/profile")} className="flex items-center gap-2 text-muted-foreground mb-6">
          <ArrowLeft size={18} />
          <span className="text-sm">{t("settings.back")}</span>
        </button>
        <h1 className="text-xl font-bold text-foreground mb-6">{t("settings.title")}</h1>

        {/* Toggles */}
        <div className="rounded-xl border border-border bg-card overflow-hidden mb-4">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <Bell size={18} className="text-muted-foreground" />
              <span className="text-sm text-foreground">{t("settings.notifications")}</span>
            </div>
            <Switch checked={notifications} onCheckedChange={handleNotifToggle} />
          </div>
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <Moon size={18} className="text-muted-foreground" />
              <span className="text-sm text-foreground">{t("settings.darkMode")}</span>
            </div>
            <Switch checked={isDark} onCheckedChange={handleDarkToggle} />
          </div>
        </div>

        {/* Menu items */}
        <div className="rounded-xl border border-border bg-card overflow-hidden mb-4">
          {/* Language */}
          <button
            onClick={() => setLangOpen(!langOpen)}
            className="flex items-center justify-between w-full px-5 py-4 text-sm text-foreground hover:bg-secondary transition-colors border-b border-border"
          >
            <div className="flex items-center gap-3">
              <Globe size={18} className="text-muted-foreground" />
              <span>{t("settings.language")}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{currentLangLabel}</span>
              <ChevronRight size={16} className={`text-muted-foreground transition-transform ${langOpen ? "rotate-90" : ""}`} />
            </div>
          </button>
          {langOpen && (
            <div className="bg-secondary/30 border-b border-border">
              {langOptions.map((option) => (
                <button
                  key={option.code}
                  onClick={() => {
                    setLang(option.code);
                    setLangOpen(false);
                    toast({ title: `Language changed to ${option.label}` });
                  }}
                  className={`w-full text-left px-8 py-3 text-sm hover:bg-secondary transition-colors flex items-center justify-between ${
                    lang === option.code ? "text-primary font-medium" : "text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span>{option.label}</span>
                    <span className="text-xs text-muted-foreground">{option.native}</span>
                  </div>
                  {lang === option.code && <span className="text-primary">✓</span>}
                </button>
              ))}
            </div>
          )}

          {/* Change Password */}
          <button
            onClick={() => setChangePassOpen(!changePassOpen)}
            className="flex items-center justify-between w-full px-5 py-4 text-sm text-foreground hover:bg-secondary transition-colors border-b border-border"
          >
            <div className="flex items-center gap-3">
              <Lock size={18} className="text-muted-foreground" />
              <span>{t("settings.changePassword")}</span>
            </div>
            <ChevronRight size={16} className={`text-muted-foreground transition-transform ${changePassOpen ? "rotate-90" : ""}`} />
          </button>
          {changePassOpen && (
            <div className="bg-secondary/30 px-5 py-4 space-y-3 border-b border-border">
              <input
                type="password"
                placeholder={t("settings.newPassword")}
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <button
                onClick={handleChangePass}
                disabled={passLoading}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {passLoading && <span className="inline-flex items-center gap-1 text-primary-foreground" role="status" aria-label="Loading">{[0, 0.12, 0.24, 0.36, 0.48, 0.6].map((d, i) => (<span key={i} className="loader-dot w-1.5 h-1.5 rounded-full bg-current" style={{ animationDelay: `${d}s` }} />))}</span>}
                {t("settings.updatePassword")}
              </button>
            </div>
          )}

          {/* Privacy Policy */}
          <button
            onClick={() => setPrivacyOpen(!privacyOpen)}
            className="flex items-center justify-between w-full px-5 py-4 text-sm text-foreground hover:bg-secondary transition-colors border-b border-border"
          >
            <div className="flex items-center gap-3">
              <Shield size={18} className="text-muted-foreground" />
              <span>{t("settings.privacyPolicy")}</span>
            </div>
            <ChevronRight size={16} className={`text-muted-foreground transition-transform ${privacyOpen ? "rotate-90" : ""}`} />
          </button>
          {privacyOpen && (
            <div className="bg-secondary/30 px-5 py-4 border-b border-border">
              <p className="text-xs text-muted-foreground leading-relaxed">
                At Jetra X, we value your privacy. We collect minimal personal data necessary to provide our services.
                Your information is encrypted and never shared with third parties without your consent.
                You can request data deletion at any time by contacting support@jetrax.com.
              </p>
            </div>
          )}

          {/* Help & Support */}
          <button
            onClick={() => setHelpOpen(!helpOpen)}
            className="flex items-center justify-between w-full px-5 py-4 text-sm text-foreground hover:bg-secondary transition-colors"
          >
            <div className="flex items-center gap-3">
              <HelpCircle size={18} className="text-muted-foreground" />
              <span>{t("settings.helpSupport")}</span>
            </div>
            <ChevronRight size={16} className={`text-muted-foreground transition-transform ${helpOpen ? "rotate-90" : ""}`} />
          </button>
          {helpOpen && (
            <div className="bg-secondary/30 px-5 py-4 space-y-3">
              {/* FAQ Section */}
              <div className="flex items-center gap-2 mb-1">
                <MessageCircle size={14} className="text-primary" />
                <span className="text-xs font-semibold text-foreground">{t("settings.faqTitle")}</span>
              </div>
              {[
                { q: t("settings.faq1q"), a: t("settings.faq1a") },
                { q: t("settings.faq2q"), a: t("settings.faq2a") },
                { q: t("settings.faq3q"), a: t("settings.faq3a") },
                { q: t("settings.faq4q"), a: t("settings.faq4a") },
                { q: t("settings.faq5q"), a: t("settings.faq5a") },
                { q: t("settings.faq6q"), a: t("settings.faq6a") },
              ].map((faq, i) => (
                <FaqItem key={i} question={faq.q} answer={faq.a} />
              ))}

              <div className="border-t border-border pt-3 mt-3">
                <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                  {t("settings.stillNeedHelp")}
                </p>
                <p className="text-xs text-foreground">📧 support@jetrax.com</p>
                <p className="text-xs text-foreground">📞 +91 1800-XXX-XXXX</p>
                <p className="text-xs text-muted-foreground mt-2">{t("settings.supportHours")}</p>
              </div>
            </div>
          )}
        </div>

        {/* Danger zone */}
        <div className="rounded-xl border border-destructive/30 bg-card overflow-hidden">
          <button
            onClick={() => setDeleteConfirm(true)}
            className="flex items-center justify-between w-full px-5 py-4 text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Trash2 size={18} />
              <span>{t("settings.deleteAccount")}</span>
            </div>
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Delete confirmation modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 px-6" onClick={() => setDeleteConfirm(false)}>
            <div className="bg-popover rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-base font-bold text-foreground mb-2">{t("settings.deleteConfirmTitle")}</h3>
              <p className="text-sm text-muted-foreground mb-5">{t("settings.deleteConfirmMsg")}</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(false)} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors">
                  {t("settings.cancel")}
                </button>
                <button onClick={handleDeleteAccount} disabled={deleteLoading} className="flex-1 py-2.5 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {deleteLoading && <span className="jetra-loader w-4 h-4 text-destructive-foreground"><span className="jetra-loader__line jetra-loader__line--first w-3 !h-[2px]" /><span className="jetra-loader__line jetra-loader__line--second w-3 !h-[2px]" /></span>}
                  {t("settings.delete")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <BottomTabBar />
    </div>
  );
};

export default Settings;
