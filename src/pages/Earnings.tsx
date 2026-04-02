import { useState, useEffect } from "react";
import SidebarNav from "@/components/SidebarNav";
import TopStatusBar from "@/components/TopStatusBar";
import BottomTabBar from "@/components/BottomTabBar";
import { Wallet, ArrowLeft, Settings, Download, DollarSign, Clock, ArrowRight, Shield, Camera, Upload, CheckCircle2, FileText, Phone, User } from "lucide-react";
import { useLang } from "@/contexts/LangContext";
import { Button } from "@/components/ui/button";
import { countries } from "@/data/countries";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const VERIFICATION_OTP = "123456";

const Earnings = () => {
  const { t } = useLang();
  const { user } = useAuth();
  const [showSetup, setShowSetup] = useState(false);
  const [step, setStep] = useState(0);
  // step 0: country select
  // step 1: stripe provider shown (auto after country)
  // step 2: stripe info + continue
  // step 3: email input
  // step 4: OTP
  // step 5: business details (type/structure)
  // step 6: business info form (name, trading name, description)

  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [businessCountry, setBusinessCountry] = useState("");
  const [businessType, setBusinessType] = useState("individual");
  const [businessStructure, setBusinessStructure] = useState("");
  const [setupComplete, setSetupComplete] = useState(false);
  const [legalBusinessName, setLegalBusinessName] = useState("");
  const [tradingName, setTradingName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [currency, setCurrency] = useState("HUF");
  const [bankCountry, setBankCountry] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [iban, setIban] = useState("");
  const [confirmIban, setConfirmIban] = useState("");
  const [sortCode, setSortCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
  // Tax verification (step 8)
  const [taxFullName, setTaxFullName] = useState("");
  const [taxCountry, setTaxCountry] = useState("");
  const [taxSignature, setTaxSignature] = useState("");
  const [taxAgree, setTaxAgree] = useState(false);
  // Identity verification (step 9)
  const [verifyPhone, setVerifyPhone] = useState("");
  const [verifyOtp, setVerifyOtp] = useState("");
  const [verifyOtpSent, setVerifyOtpSent] = useState(false);
  const [idUploaded, setIdUploaded] = useState(false);
  const [selfieUploaded, setSelfieUploaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [payoutHistory, setPayoutHistory] = useState<any[]>([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [totalPending, setTotalPending] = useState(0);
  const [pageLoading, setPageLoading] = useState(true);

  const fetchPayoutHistory = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('payout_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) {
      setPayoutHistory(data);
      setTotalPaid(data.filter(p => p.status === 'completed').reduce((s, p) => s + Number(p.amount), 0));
      setTotalPending(data.filter(p => p.status === 'pending').reduce((s, p) => s + Number(p.amount), 0));
    }
  };

  // Load existing payout account and history on mount
  useEffect(() => {
    const loadPayoutAccount = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('payout_accounts')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data && data.setup_completed) {
        setSetupComplete(true);
      }
    };
    loadPayoutAccount();
    fetchPayoutHistory();
  }, [user]);

  const handleCountrySelect = (val: string) => {
    setSelectedCountry(val);
    // Auto advance to stripe provider
    setTimeout(() => setStep(1), 300);
  };

  const handleStripeSelect = () => {
    setSelectedProvider("stripe");
    setStep(2);
  };

  const handleContinueToStripe = () => {
    setStep(3);
  };

  const handleEmailSubmit = () => {
    if (email.trim() && email.includes("@")) {
      setStep(4);
    }
  };

  const handleOtpChange = (val: string) => {
    setOtp(val);
    setOtpError("");
    if (val.length === 6) {
      if (val === VERIFICATION_OTP) {
        // Auto advance
        setTimeout(() => {
          setBusinessCountry(selectedCountry);
          setStep(5);
        }, 500);
      } else {
        setOtpError("Invalid OTP. Please try again.");
      }
    }
  };

  const handleBusinessContinue = () => {
    setStep(6);
  };

  const handleBusinessInfoContinue = () => {
    setStep(7);
  };

  const handleBankDetailsContinue = () => {
    setStep(8);
  };

  const handleTaxContinue = () => {
    setStep(9);
  };

  const handleIdentityContinue = () => {
    setStep(10);
  };

  const handlePayoutConfirm = async () => {
    if (!user) {
      toast.error("Please login first");
      return;
    }
    setSaving(true);
    try {
      // Check if payout account already exists
      const { data: existing } = await supabase
        .from('payout_accounts')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      const payoutData = {
        user_id: user.id,
        country: selectedCountry,
        payment_provider: 'stripe',
        email,
        business_country: businessCountry,
        business_type: businessType,
        business_structure: businessStructure,
        legal_business_name: legalBusinessName,
        trading_name: tradingName,
        product_description: productDescription,
        currency,
        bank_country: bankCountry,
        account_holder_name: accountHolderName,
        iban,
        sort_code: sortCode,
        account_number: accountNumber,
        tax_full_name: taxFullName,
        tax_country: taxCountry,
        tax_signature: taxSignature,
        tax_agreed: taxAgree,
        phone_verified: verifyOtp.length === 6,
        verified_phone: verifyPhone,
        id_uploaded: idUploaded,
        selfie_uploaded: selfieUploaded,
        setup_completed: true,
      };

      let error;
      if (existing) {
        ({ error } = await supabase
          .from('payout_accounts')
          .update(payoutData)
          .eq('id', existing.id));
      } else {
        ({ error } = await supabase
          .from('payout_accounts')
          .insert(payoutData));
      }

      if (error) throw error;

      toast.success("Payout account saved successfully!");
      setSetupComplete(true);
      setShowSetup(false);
      setStep(0);
    } catch (err: any) {
      toast.error(err.message || "Failed to save payout account");
    } finally {
      setSaving(false);
    }
  };

  const renderSetupContent = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Setup your Payment Method</h3>
            <p className="text-sm text-muted-foreground">Select the country in which you live and work</p>
            <Select onValueChange={handleCountrySelect} value={selectedCountry}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select your country" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.flag} {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Select Payment Provider</h3>
            <p className="text-sm text-muted-foreground">Choose your preferred payment method to receive payouts.</p>
            <button
              onClick={handleStripeSelect}
              className={`w-full flex items-center gap-3 p-4 rounded-lg border transition-colors ${
                selectedProvider === "stripe"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-secondary/50"
              }`}
            >
              <div className="h-5 w-5 rounded-full border-2 border-primary flex items-center justify-center">
                {selectedProvider === "stripe" && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
              </div>
              <div className="text-left">
                <p className="font-medium text-foreground text-sm">Stripe</p>
                <p className="text-xs text-muted-foreground">Fast, secure payments with instant payouts</p>
              </div>
            </button>
            <button
              onClick={() => {
                setSelectedCountry("");
                setStep(0);
              }}
              className="w-full py-2.5 rounded-lg border border-border text-sm text-foreground hover:bg-secondary/50 transition-colors"
            >
              Change Country
            </button>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <button onClick={() => setStep(1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft size={16} /> Back
            </button>
            <h3 className="text-lg font-semibold text-foreground">Creating a Stripe account</h3>
            <p className="text-sm text-muted-foreground">
              We use Stripe to process payouts. Please enter the exact details below when creating your Stripe account on the page which says "Tell us about your business".
            </p>
            <div className="space-y-2">
              <p className="text-sm text-foreground">
                <span className="font-medium">Type of business:</span>{" "}
                <span className="text-primary font-medium">Individual</span>
              </p>
              <p className="text-xs text-muted-foreground">
                The vast majority of individuals are independent contractors. Please do not register as a business unless you have a business identification number, a bank account in the name of your business, and other necessary documents.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-foreground">
                <span className="font-medium">Country:</span>{" "}
                <span className="text-primary font-medium">Where you live and work</span>
              </p>
              <p className="text-xs text-muted-foreground">
                The vast majority of users select the country where they live and where their primary bank account is located.
              </p>
            </div>
            <Button className="w-full" onClick={handleContinueToStripe}>
              Continue to Stripe setup
            </Button>
          </div>
        );

      case 3:
        return (
          <div className="space-y-5">
            <div className="bg-primary/10 rounded-xl p-5 text-center space-y-1">
              <p className="font-semibold text-foreground">Stripe</p>
              <p className="text-xs text-muted-foreground">Secure payments and financial services.</p>
            </div>
            <h3 className="text-2xl font-bold text-foreground">Sign in to Express</h3>
            <p className="text-sm text-muted-foreground">Fill in a few details below.</p>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email address</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-11"
              />
            </div>
            <Button className="w-full" onClick={handleEmailSubmit} disabled={!email.includes("@")}>
              Continue
            </Button>
          </div>
        );

      case 4:
        return (
          <div className="space-y-5">
            <div className="bg-primary/10 rounded-xl p-5 text-center space-y-1">
              <p className="font-semibold text-foreground">Stripe</p>
              <p className="text-xs text-muted-foreground">Secure payments and financial services.</p>
            </div>
            <h3 className="text-2xl font-bold text-foreground">We sent a text to your phone</h3>
            <p className="text-sm text-muted-foreground">
              Enter the verification code we sent to your email {email}.
            </p>
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otp} onChange={handleOtpChange}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup>
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            {otpError && (
              <p className="text-sm text-destructive text-center font-medium">{otpError}</p>
            )}
            <button className="text-sm text-primary font-medium mx-auto block">Resend code</button>
            <div className="space-y-2">
              <button
                onClick={() => { setOtp(""); setOtpError(""); setStep(3); }}
                className="w-full py-2.5 rounded-lg border border-border text-sm text-foreground hover:bg-secondary/50 transition-colors"
              >
                Go back
              </button>
              <button
                className="w-full py-2.5 rounded-lg border border-border text-sm text-foreground hover:bg-secondary/50 transition-colors"
              >
                Sign up another way
              </button>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-5">
            <div className="bg-primary/10 rounded-xl p-5 text-center space-y-1">
              <p className="font-semibold text-foreground">Stripe</p>
              <p className="text-xs text-muted-foreground">Secure payments and financial services.</p>
            </div>
            <p className="text-xs text-muted-foreground">Business type</p>
            <h3 className="text-2xl font-bold text-foreground">Tell us about your business</h3>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Country</label>
              <Select value={businessCountry} onValueChange={setBusinessCountry}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.flag} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Please select the country where you or your business will legally operate.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Business type</label>
              <Select value={businessType} onValueChange={(val) => { setBusinessType(val); setBusinessStructure(""); }}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual / Sole Trader</SelectItem>
                  <SelectItem value="company">Company</SelectItem>
                  <SelectItem value="nonprofit">Non-profit</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                If you haven't filed paperwork to register as a business entity, then your business type is likely to be Individual. For more information, refer to this support article.
              </p>
            </div>

            {(businessType === "company" || businessType === "nonprofit") && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Business structure</label>
                <Select value={businessStructure} onValueChange={setBusinessStructure}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Please choose an option" />
                  </SelectTrigger>
                  <SelectContent>
                    {businessType === "company" && (
                      <>
                        <SelectItem value="llp">Limited Liability Partnership (LLP)</SelectItem>
                        <SelectItem value="unincorporated">Unincorporated Partnership</SelectItem>
                        <SelectItem value="private">Private company</SelectItem>
                        <SelectItem value="other">Other/I'm not sure</SelectItem>
                      </>
                    )}
                    {businessType === "nonprofit" && (
                      <>
                        <SelectItem value="charitable">Charitable Company</SelectItem>
                        <SelectItem value="unincorporated_association">Unincorporated Association</SelectItem>
                        <SelectItem value="other">Other/I'm not sure</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button className="w-full" onClick={handleBusinessContinue}>
              Continue
            </Button>
          </div>
        );

      case 6:
        return (
          <div className="space-y-5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="h-3 w-3 rounded-full border-2 border-primary" />
              Business details
            </div>
            <h3 className="text-xl font-bold text-foreground">Tell us about your business</h3>
            <p className="text-xs text-muted-foreground">
              This information is collected to better serve your business and comply with regulators and financial partners, as indicated in the <span className="underline text-foreground cursor-pointer">Terms of Service</span>.
            </p>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Legal business name</label>
              <Input
                value={legalBusinessName}
                onChange={(e) => setLegalBusinessName(e.target.value)}
                placeholder="Company"
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">The name you provide must exactly match the name associated with your tax ID.</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-foreground">Business name (Trading name)</label>
                <span className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground">Optional</span>
              </div>
              <p className="text-xs text-muted-foreground">The operating name of your company, if it's different than the legal name.</p>
              <Input
                value={tradingName}
                onChange={(e) => setTradingName(e.target.value)}
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Product description</label>
              <textarea
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                placeholder="I am a contractor for Jetra X."
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
              <p className="text-xs text-muted-foreground">Provide a 1–2 sentence description. Make sure to note when you typically charge your customers (i.e. during checkout or 3 days later). This helps us better understand your business.</p>
            </div>

            <Button className="w-full" onClick={handleBusinessInfoContinue}>
              Continue
            </Button>
          </div>
        );

      case 7:
        return (
          <div className="space-y-5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="h-3 w-3 rounded-full border-2 border-primary" />
              Bank details
            </div>
            <h3 className="text-xl font-bold text-foreground">Add an account for payouts</h3>
            <p className="text-xs text-muted-foreground">We'll send earnings you receive to this account.</p>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Currency</label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BGN">BGN - Bulgarian Lev</SelectItem>
                  <SelectItem value="DKK">DKK - Danish Krone</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound</SelectItem>
                  <SelectItem value="HUF">HUF - Hungarian Forint</SelectItem>
                  <SelectItem value="NOK">NOK - Norwegian Krone</SelectItem>
                  <SelectItem value="PLN">PLN - Polish Zloty</SelectItem>
                  <SelectItem value="RON">RON - Romanian Leu</SelectItem>
                  <SelectItem value="SEK">SEK - Swedish Krona</SelectItem>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {currency === "EUR" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Country of bank account</label>
                <Select value={bankCountry} onValueChange={setBankCountry}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.flag} {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Account holder name</label>
              <p className="text-xs text-muted-foreground">Must match the name on your bank account exactly, using English characters.</p>
              <Input
                value={accountHolderName}
                onChange={(e) => setAccountHolderName(e.target.value)}
                className="h-11"
              />
            </div>

            {currency === "GBP" ? (
              <>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Sort code</label>
                  <Input
                    value={sortCode}
                    onChange={(e) => setSortCode(e.target.value)}
                    placeholder="10-88-00"
                    className="h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Account number</label>
                  <Input
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="00012345"
                    className="h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Confirm account number</label>
                  <Input
                    value={confirmAccountNumber}
                    onChange={(e) => setConfirmAccountNumber(e.target.value)}
                    placeholder="00012345"
                    className="h-11"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">IBAN</label>
                  <Input
                    value={iban}
                    onChange={(e) => setIban(e.target.value)}
                    placeholder={currency === "EUR" ? "AT61 1904 3002 3457 3201" : "HU42 1177 3016 1111 1018 0000 0000"}
                    className="h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Confirm IBAN</label>
                  <Input
                    value={confirmIban}
                    onChange={(e) => setConfirmIban(e.target.value)}
                    placeholder={currency === "EUR" ? "AT61 1904 3002 3457 3201" : "HU42 1177 3016 1111 1018 0000 0000"}
                    className="h-11"
                  />
                </div>
              </>
            )}

            <Button className="w-full" onClick={handleBankDetailsContinue}>
              Continue
            </Button>
          </div>
        );

      case 8:
        return (
          <div className="space-y-5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileText size={14} className="text-primary" />
              Tax verification
            </div>
            <h3 className="text-xl font-bold text-foreground">W-8BEN Tax Form</h3>
            <p className="text-xs text-muted-foreground">
              As a non-US contractor, you need to complete the W-8BEN form for tax withholding purposes. This certifies your foreign status.
            </p>

            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="text-xs font-medium text-foreground mb-1">📋 Certificate of Foreign Status</p>
              <p className="text-[11px] text-muted-foreground">Form W-8BEN is used by foreign individuals to claim tax treaty benefits and certify foreign status for U.S. tax withholding.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Full legal name</label>
              <Input
                value={taxFullName}
                onChange={(e) => setTaxFullName(e.target.value)}
                placeholder="As shown on your government ID"
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Country of citizenship</label>
              <Select value={taxCountry} onValueChange={setTaxCountry}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.flag} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Digital signature</label>
              <Input
                value={taxSignature}
                onChange={(e) => setTaxSignature(e.target.value)}
                placeholder="Type your full name as signature"
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">By typing your name, you are electronically signing the W-8BEN form.</p>
            </div>

            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={taxAgree}
                onChange={(e) => setTaxAgree(e.target.checked)}
                className="mt-1 rounded border-input"
              />
              <p className="text-xs text-muted-foreground">
                I certify that I am the beneficial owner of all income to which this form relates, and I am not a U.S. person.
              </p>
            </div>

            <Button className="w-full" onClick={handleTaxContinue} disabled={!taxFullName || !taxCountry || !taxSignature || !taxAgree}>
              Submit & Continue
            </Button>
          </div>
        );

      case 9:
        return (
          <div className="space-y-5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield size={14} className="text-primary" />
              Identity verification
            </div>
            <h3 className="text-xl font-bold text-foreground">Verify your identity</h3>
            <p className="text-xs text-muted-foreground">
              We need to verify your identity to comply with financial regulations and keep your account secure.
            </p>

            {/* Phone verification */}
            <div className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Phone size={16} className="text-primary" />
                <p className="text-sm font-medium text-foreground">Phone verification</p>
                {verifyOtpSent && verifyOtp.length === 6 && (
                  <CheckCircle2 size={16} className="text-green-500 ml-auto" />
                )}
              </div>
              {!verifyOtpSent ? (
                <div className="space-y-2">
                  <Input
                    value={verifyPhone}
                    onChange={(e) => setVerifyPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="h-11"
                  />
                  <Button size="sm" className="w-full" onClick={() => setVerifyOtpSent(true)} disabled={!verifyPhone}>
                    Send verification code
                  </Button>
                </div>
              ) : verifyOtp.length < 6 ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Enter the 6-digit code sent to {verifyPhone}</p>
                  <div className="flex justify-center">
                    <InputOTP maxLength={6} value={verifyOtp} onChange={setVerifyOtp}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                      </InputOTPGroup>
                      <InputOTPSeparator />
                      <InputOTPGroup>
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-green-600 font-medium">✓ Phone verified successfully</p>
              )}
            </div>

            {/* ID Upload */}
            <div className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Upload size={16} className="text-primary" />
                <p className="text-sm font-medium text-foreground">Government-issued ID</p>
                {idUploaded && <CheckCircle2 size={16} className="text-green-500 ml-auto" />}
              </div>
              <p className="text-xs text-muted-foreground">Upload a photo of your passport, driver's license, or national ID card.</p>
              {!idUploaded ? (
                <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => setIdUploaded(true)}>
                  <Upload size={14} /> Upload ID document
                </Button>
              ) : (
                <p className="text-xs text-green-600 font-medium">✓ ID document uploaded</p>
              )}
            </div>

            {/* Selfie */}
            <div className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Camera size={16} className="text-primary" />
                <p className="text-sm font-medium text-foreground">Selfie verification</p>
                {selfieUploaded && <CheckCircle2 size={16} className="text-green-500 ml-auto" />}
              </div>
              <p className="text-xs text-muted-foreground">Take a selfie to confirm your identity matches your ID document.</p>
              {!selfieUploaded ? (
                <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => setSelfieUploaded(true)}>
                  <Camera size={14} /> Take selfie
                </Button>
              ) : (
                <p className="text-xs text-green-600 font-medium">✓ Selfie captured</p>
              )}
            </div>

            <Button
              className="w-full"
              onClick={handleIdentityContinue}
              disabled={verifyOtp.length < 6 || !idUploaded || !selfieUploaded}
            >
              Continue
            </Button>
          </div>
        );

      case 10:
        return (
          <div className="space-y-5">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 size={32} className="text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Setup Complete!</h3>
              <p className="text-sm text-muted-foreground">Your payout account has been verified and is ready to receive payments.</p>
            </div>

            {/* Earnings summary cards */}
            <div className="grid grid-cols-3 gap-2">
             <div className="rounded-lg border border-border p-3 text-center bg-card">
                <Clock size={16} className="text-amber-500 mx-auto mb-1" />
                <p className="text-[10px] text-muted-foreground">Pending</p>
                <p className="text-sm font-bold text-foreground">${totalPending.toFixed(2)}</p>
              </div>
              <div className="rounded-lg border border-border p-3 text-center bg-card">
                <ArrowRight size={16} className="text-primary mx-auto mb-1" />
                <p className="text-[10px] text-muted-foreground">Sent</p>
                <p className="text-sm font-bold text-foreground">${(totalPaid + totalPending).toFixed(2)}</p>
              </div>
              <div className="rounded-lg border border-border p-3 text-center bg-card">
                <CheckCircle2 size={16} className="text-green-500 mx-auto mb-1" />
                <p className="text-[10px] text-muted-foreground">Paid</p>
                <p className="text-sm font-bold text-foreground">${totalPaid.toFixed(2)}</p>
              </div>
            </div>

            {/* Account info */}
            <div className="rounded-lg border border-border p-4 space-y-2 bg-card">
              <p className="text-sm font-medium text-foreground">Payout account</p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                  <Wallet size={16} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm text-foreground font-medium">{accountHolderName || "Account holder"}</p>
                  <p className="text-xs text-muted-foreground">{currency} • {iban ? `****${iban.slice(-4)}` : sortCode ? `Sort: ${sortCode}` : "Connected"}</p>
                </div>
                <CheckCircle2 size={16} className="text-green-500 ml-auto" />
              </div>
            </div>

            <Button className="w-full" onClick={handlePayoutConfirm} disabled={saving}>
              {saving ? "Saving..." : "Go to Earnings Dashboard"}
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SidebarNav />
      <div className="ml-16 pb-20">
        <TopStatusBar currentStep={2} />
        <div className="px-4 sm:px-6 pt-4 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">{t("earnings.title")}</h1>
        <p className="text-sm text-muted-foreground mb-4">
          Your total earnings to date are <span className="font-bold text-foreground">${totalPaid.toFixed(2)}</span>{" "}
          <span className="text-primary text-xs cursor-pointer">Explore open roles →</span>
        </p>

        {/* Payment method status */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-muted-foreground">
            {setupComplete ? "Payment method connected" : "No payment method connected"}
          </p>
          <Button
            size="sm"
            onClick={() => { setShowSetup(true); setStep(0); setSelectedCountry(""); setSelectedProvider(""); setEmail(""); setOtp(""); setOtpError(""); }}
            className="gap-1.5 text-xs"
          >
            <Settings size={14} />
            Connect provider
          </Button>
        </div>

        {/* Promo banner */}
        <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 mb-4">
          <p className="font-semibold text-foreground text-sm mb-1">Unlock more earnings with Intros</p>
          <p className="text-xs text-muted-foreground mb-3">You decide who to introduce and what gets sent. We handle the invite, so you don't need to reach out personally.</p>
          <Button size="sm" className="gap-1.5 text-xs" onClick={() => window.open("https://www.linkedin.com", "_blank")}>
            Explore LinkedIn Connections <ArrowRight size={14} />
          </Button>
        </div>

        {/* Earnings over time */}
        <div className="rounded-xl border border-border p-4 bg-card mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground text-sm">Earnings Over Time</h3>
            <div className="flex items-center gap-2">
              <DollarSign size={16} className="text-muted-foreground" />
              <Clock size={16} className="text-muted-foreground" />
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Earnings total</p>
                <p className="text-sm font-bold text-foreground">${totalPaid.toFixed(2)}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2 mb-4 flex-wrap">
            <span className="text-[10px] px-2 py-1 rounded border border-border text-muted-foreground">📅 Billing Date: Mar 1 - Mar 18, 2026</span>
            <span className="text-[10px] px-2 py-1 rounded border border-border text-muted-foreground">📋 Contracts</span>
            <span className="text-[10px] px-2 py-1 rounded border border-border text-muted-foreground">📊 Type</span>
          </div>
          {/* Chart placeholder */}
          <div className="h-28 border-l-2 border-b-2 border-border relative">
            <span className="absolute -left-8 top-0 text-[10px] text-muted-foreground">$100</span>
            <span className="absolute -left-6 top-1/4 text-[10px] text-muted-foreground">$75</span>
            <span className="absolute -left-6 top-1/2 text-[10px] text-muted-foreground">$50</span>
          </div>
        </div>

        {/* Payments table */}
        <div className="rounded-xl border border-border p-4 bg-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground text-sm">Payments</h3>
            <Button variant="outline" size="sm" className="text-xs gap-1.5">
              <Download size={14} /> Download Payment Report
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 font-medium text-muted-foreground">Payout date</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Type</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Description</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Hours</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Earned</th>
                </tr>
              </thead>
              <tbody>
                {payoutHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8">
                      <p className="text-sm text-muted-foreground font-medium">No payment history yet</p>
                      <p className="text-xs text-muted-foreground">Once you receive your first payout, it will appear here</p>
                    </td>
                  </tr>
                ) : (
                  payoutHistory.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0">
                      <td className="py-2 text-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                      <td className="py-2 text-foreground">Payout</td>
                      <td className="py-2 text-foreground">{p.notes || "—"}</td>
                      <td className="py-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          p.status === 'completed' ? 'bg-green-500/10 text-green-600' :
                          p.status === 'pending' ? 'bg-amber-500/10 text-amber-600' :
                          'bg-destructive/10 text-destructive'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-2 text-foreground">—</td>
                      <td className="py-2 font-medium text-foreground">${Number(p.amount).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Setup Dialog */}
      <Dialog open={showSetup} onOpenChange={setShowSetup}>
        <DialogContent className="max-w-sm mx-auto">
          {renderSetupContent()}
        </DialogContent>
      </Dialog>

      <BottomTabBar />
      </div>
    </div>
  );
};

export default Earnings;
