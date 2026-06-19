"use client"

import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Check, Loader2, ShieldCheck, Copy, KeyRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from "next/image";
import { QRCodeSVG } from 'qrcode.react';
import { toast, Toaster } from 'sonner';
import { adminAuthApi, type Admin } from '@/lib/api/auth';
import { adminMfaApi } from '@/lib/api/mfa';
import { useAdminAuthStore } from '@/lib/stores/authStores';
import { setAdminTokens } from '@/lib/api/client';

type Step =
  | 'organization'
  | 'credentials'
  | 'signin'
  | 'verification'
  | 'mfa-code'      // enrolled admin: enter TOTP / backup code to finish login
  | 'mfa-enroll'    // first login: scan QR + confirm code
  | 'backup-codes'; // show one-time backup codes after enrollment

const HasaPayOnboarding = () => {
  const router = useRouter();
  const { setAuth } = useAdminAuthStore();

  const [step, setStep] = useState<Step>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isAnimating, setIsAnimating] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(59);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // MFA flow state
  const [challengeToken, setChallengeToken] = useState('');
  const [pendingAdmin, setPendingAdmin] = useState<Admin | null>(null);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [backupCodeInput, setBackupCodeInput] = useState('');
  const [enrollData, setEnrollData] = useState<{ secret: string; otpauth_url: string } | null>(null);
  const [enrollCode, setEnrollCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [savedAck, setSavedAck] = useState(false);

  // Separate sign in data
  const [signInData, setSignInData] = useState({
    email: '',
    password: ''
  });

  // Sign up form data
  const [formData, setFormData] = useState({
    organizationName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const validatePassword = (password: string) => {
    return {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password)
    };
  };

  const passwordValidation = validatePassword(formData.password);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSignInChange = (field: string, value: string) => {
    setSignInData(prev => ({ ...prev, [field]: value }));
  };

  // Finalize a successful login: persist the access + refresh tokens and route in.
  const completeLogin = (token: string, refreshToken: string, admin: Admin) => {
    setAuth(token, admin);
    setAdminTokens(token, refreshToken);
    toast.success('Welcome back');
    router.push('/admin');
  };

  // Step 1 — password. On success we get a short-lived MFA challenge token and
  // whether MFA is enrolled. Enrolled → prompt for a code; not enrolled → force
  // enrollment. No session token is issued here.
  const handleSignIn = async () => {
    if (!signInData.email || !signInData.password) return;

    setIsLoading(true);
    try {
      const res = await adminAuthApi.login({
        email: signInData.email,
        password: signInData.password,
      });

      setChallengeToken(res.challenge_token);
      setPendingAdmin(res.admin);
      setOtp(['', '', '', '', '', '']);
      setUseBackupCode(false);
      setBackupCodeInput('');

      if (res.mfa_enrolled) {
        setStep('mfa-code');
      } else {
        // First login: kick off enrollment immediately.
        try {
          const data = await adminMfaApi.enrollBegin(res.challenge_token);
          setEnrollData(data);
          setEnrollCode('');
          setStep('mfa-enroll');
        } catch (err: any) {
          toast.error(err.response?.data?.error?.message || 'Could not start MFA setup');
        }
      }
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Login failed. Please try again.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2 (enrolled) — verify TOTP or backup code, then finish login.
  const handleVerifyMfaCode = async () => {
    const code = useBackupCode ? backupCodeInput.trim() : otp.join('');
    if (!code) return;

    setIsLoading(true);
    try {
      const { token, refresh_token, admin } = await adminAuthApi.loginMfa({ challenge_token: challengeToken, code });
      completeLogin(token, refresh_token, admin);
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Invalid verification code';
      toast.error(message);
      setOtp(['', '', '', '', '', '']);
    } finally {
      setIsLoading(false);
    }
  };

  // First-login enrollment — confirm the code, capture backup codes, auto-login.
  const handleConfirmEnroll = async () => {
    if (enrollCode.length < 6) return;

    setIsLoading(true);
    try {
      const res = await adminMfaApi.enrollVerify(challengeToken, enrollCode);
      setBackupCodes(res.backup_codes);
      setSavedAck(false);
      // The verify response carries a session (access + refresh) on first-login enrollment.
      if (res.token && res.admin) {
        setAuth(res.token, res.admin);
        setAdminTokens(res.token, res.refresh_token);
      }
      setStep('backup-codes');
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 'Invalid code. Try again.';
      toast.error(message);
      setEnrollCode('');
    } finally {
      setIsLoading(false);
    }
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    toast.success('Backup codes copied');
  };

  const finishBackupCodes = () => {
    if (!savedAck) return;
    toast.success('MFA enabled');
    router.push('/admin');
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = [...otp];
    pastedData.split('').forEach((char, i) => {
      if (i < 6) newOtp[i] = char;
    });
    setOtp(newOtp);

    const lastFilledIndex = Math.min(pastedData.length - 1, 5);
    const lastInput = document.getElementById(`otp-${lastFilledIndex}`);
    lastInput?.focus();
  };

  const handleVerifyEmail = () => {
    setShowSuccessToast(true);
    setTimeout(() => {
      setShowSuccessToast(false);
    }, 3000);
  };

  const handleResendCode = () => {
    setOtp(['', '', '', '', '', '']);
    setResendTimer(59);
    const firstInput = document.getElementById('otp-0');
    firstInput?.focus();
  };

  const handleCompleteVerification = () => {
    // Store email in localStorage
    localStorage.setItem('userEmail', formData.email);
    // Redirect to dashboard
    router.push('/dashboard');
  };

  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 300);
    return () => clearTimeout(timer);
  }, [step]);

  useEffect(() => {
    if (step === 'verification' && resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer, step]);

  const renderLeftPanel = () => (
    <div className='hidden lg:flex bg-radial from-[#007acc]/20 to-[#003366]/20 p-20 items-center justify-center col-span-5'>
      <div className="flex-1 flex flex-col justify-center">
        <div>
          <div className="flex items-center gap-2 mb-5">
            <div className="flex items-center justify-center">
              <Image src="/images/hasa.png" alt="HASA Logo" width={45} height={45} />
            </div>
            <span className="text-[#F9F9F9] text-2xl font-bold">HasaPay</span>
          </div>

          <h1 className="text-[#F9F9F9] text-5xl font-bold mb-2 leading-tight">
            Enterprise Crypto<br />Payment Infrastructure
          </h1>
          
          <p className="text-[#FFFFFF60] text-base leading-relaxed max-w-lg">
            Secure wallet management, multi-chain support, and seamless payment processing for your organization.
          </p>
        </div>

        <div className="flex gap-16 mt-6">
          <div>
            <div className="text-[#007acc70] text-2xl font-semibold">$2B+</div>
            <div className="text-[#FFFFFF60] text-sm">Processed</div>
          </div>
          <div>
            <div className="text-[#007acc70] text-2xl font-semibold">99.9%</div>
            <div className="text-[#FFFFFF60] text-sm">Uptime</div>
          </div>
          <div>
            <div className="text-[#007acc70] text-2xl font-semibold">50+</div>
            <div className="text-[#FFFFFF60] text-sm">Blockchains</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderOrganizationStep = () => (
    <div className="flex-1 bg-black p-12 flex items-center justify-center col-span-4 overflow-y-auto">
      <div className={`w-full max-w-md bg-[#18181b80] p-5 rounded-xl border border-[#A1A1A120] transition-transform duration-700 ${
        isAnimating ? 'opacity-0 translate-y-8' : 'opacity-100 translate-y-0'
      }`}>
        <h2 className="text-[#F9F9F9] text-3xl font-bold mb-0.5">Create an account</h2>
        <p className="text-[#FFFFFF60] text-sm mb-4">Tell us about your organization</p>
        <div className="flex items-center gap-2 mb-8">
          <div className="h-1 bg-[#007acc40] flex-1 rounded"></div>
          <div className="h-1 bg-[#007acc40] flex-1 rounded"></div>
        </div>

        <div className="mb-6">
          <label className="text-[#F9F9F9] text-sm font-medium mb-2 block">
            Organization Name
          </label>
          <input
            type="text"
            value={formData.organizationName}
            onChange={(e) => handleInputChange('organizationName', e.target.value)}
            placeholder="Acme Fintech Ltd"
            className="w-full bg-[#18181b80] placeholder:text-[13px] border border-[#A1A1A120] rounded-md px-2 py-1.5 text-[#FFFFFF60] text-sm placeholder-[#FFFFFFF60] focus:outline-none focus:border-[#A1A1A120] transition-colors"
          />
          <p className="text-[#FFFFFF60] text-xs mt-2">
            This will be the name of your organization on HasaPay. You can change it later.
          </p>
        </div>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setStep('credentials')}
            className="flex-1 bg-[#18181b80] border border-[#A1A1A120] text-[#F9F9F9] text-sm py-2 rounded-lg hover:bg-gray-900 transition-colors cursor-pointer"
          >
            Back
          </button>
          <button
            onClick={() => {
              setStep('verification');
              handleVerifyEmail();
            }}
            disabled={!formData.organizationName}
            className="flex-1 bg-[#007acc40] text-[#F9F9F9] text-sm py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            Create Account
          </button>
        </div>

        <p className="text-[#FFFFFF60] text-[10px] text-center">
          By creating an account, you agree to our{' '}
          <a href="#" className="text-[#007acc70] ">Terms of Service</a> and{' '}
          <a href="#" className="text-[#007acc70] ">Privacy Policy</a>
        </p>
      </div>
    </div>
  );

  const renderCredentialsStep = () => (
    <div className="flex-1 bg-black p-12 flex items-center justify-center col-span-4 overflow-y-auto">
      <div className={`w-full max-w-md bg-[#18181b80] p-5 rounded-xl border border-[#A1A1A120] transition-transform duration-700 ${
        isAnimating ? 'opacity-0 translate-y-8' : 'opacity-100 translate-y-0'
      }`}>
        <h2 className="text-[#F9F9F9] text-2xl font-bold">Create an account</h2>
        <p className="text-[#FFFFFF60] text-sm mb-3">Enter your email and create a password</p>
        <div className="flex items-center gap-2 mb-6">
          <div className="h-1 bg-[#007acc40] flex-1 rounded"></div>
          <div className="h-1 bg-[#A1A1A120] flex-1 rounded"></div>
        </div>

        <div className="mb-4">
          <label className="text-[#F9F9F9] text-sm font-medium mb-2 block">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="name@company.com"
            className="w-full bg-[#18181b80] placeholder:text-[13px] border border-[#A1A1A120] rounded-md px-2 py-1.5 text-[#FFFFFF60] text-sm placeholder-[#FFFFFFF60] focus:outline-none focus:border-[#A1A1A120] transition-colors"
          />
        </div>

        <div className="mb-4">
          <label className="text-[#F9F9F9] text-sm font-medium mb-2 block">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              placeholder="123456Aa"
              className="w-full bg-[#18181b80] placeholder:text-[13px] border border-[#A1A1A120] rounded-md px-2 py-1.5 text-[#FFFFFF60] text-sm placeholder-[#FFFFFFF60] focus:outline-none focus:border-[#A1A1A120] transition-colors pr-12"
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#FFFFFF60] hover:text-[#FFFFFF60]"
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          
          <div className="mt-3 space-y-0.5">
            <div className={`flex items-center gap-2 text-[10px] ${passwordValidation.length ? 'text-green-900' : 'text-[#FFFFFF60]'}`}>
              <Check size={13} />
              <span>At least 8 characters</span>
            </div>
            <div className={`flex items-center gap-2 text-[10px] ${passwordValidation.uppercase ? 'text-green-900' : 'text-[#FFFFFF60]'}`}>
              <Check size={13} />
              <span>One uppercase letter</span>
            </div>
            <div className={`flex items-center gap-2 text-[10px] ${passwordValidation.lowercase ? 'text-green-900' : 'text-[#FFFFFF60]'}`}>
              <Check size={13} />
              <span>One lowercase letter</span>
            </div>
            <div className={`flex items-center gap-2 text-[10px] ${passwordValidation.number ? 'text-green-900' : 'text-[#FFFFFF60]'}`}>
              <Check size={13} />
              <span>One number</span>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <label className="text-[#F9F9F9] text-sm font-medium mb-2 block">Confirm Password</label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#18181b80] placeholder:text-[13px] border border-[#A1A1A120] rounded-md px-2 py-1.5 text-[#FFFFFF60] text-sm placeholder-[#FFFFFFF60] focus:outline-none focus:border-[#A1A1A120] transition-colors pr-12"
            />
            <button
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#FFFFFF60] hover:text-[#FFFFFF60]"
            >
              {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>

        <button
          onClick={() => setStep('organization')}
          disabled={!formData.email || !formData.password || !formData.confirmPassword}
          className="w-full bg-[#007acc40] text-[#F9F9F9] py-2 text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-6 cursor-pointer"
        >
          Continue
        </button>

        <p className="text-[#FFFFFF60] text-xs text-center">
          Already have an account?{' '}
          <button onClick={() => setStep('signin')} className="text-[#007acc70] cursor-pointer">
            Sign in
          </button>
        </p>
      </div>
    </div>
  );

  const renderSignInStep = () => (
    <div className="flex-1 bg-black p-4 md:p-12 flex items-center justify-center col-span-4 overflow-y-auto">
      <div className={`w-full max-w-md bg-[#18181b80] p-5 rounded-xl border border-[#A1A1A120] transition-transform duration-500 ${
        isAnimating ? 'opacity-0 translate-y-8' : 'opacity-100 translate-y-0'
      }`}>
        <h2 className="text-[#F9F9F9] text-2xl font-bold mb-0.5">Sign in</h2>
        <p className="text-[#FFFFFF60] text-sm mb-4">Enter your credentials to access your organization portal</p>

        <div className="mb-3">
          <label className="text-[#F9F9F9] text-sm font-medium mb-1.5 block">Email</label>
          <input
            type="email"
            value={signInData.email}
            onChange={(e) => handleSignInChange('email', e.target.value)}
            placeholder="name@company.com"
            className="w-full bg-[#18181b80] placeholder:text-[13px] border border-[#A1A1A120] rounded-md px-2 py-1.5 text-[#FFFFFF60] text-sm placeholder-[#FFFFFFF60] focus:outline-none focus:border-[#A1A1A120] transition-colors"
          />
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[#F9F9F9] text-sm font-medium">Password</label>
            <a href="#" className="text-[#007acc70] text-xs">
              Forgot password?
            </a>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={signInData.password}
              onChange={(e) => handleSignInChange('password', e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#18181b80] placeholder:text-[13px] border border-[#A1A1A120] rounded-md px-2 py-1.5 text-[#FFFFFF60] text-sm placeholder-[#FFFFFFF60] focus:outline-none focus:border-[#A1A1A120] transition-colors"
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#FFFFFF60] hover:text-[#FFFFFF60] cursor-pointer"
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>

        <button
          onClick={handleSignIn}
          disabled={!signInData.email || !signInData.password || isLoading}
          className="w-full bg-[#007acc70] text-[#F9F9F9] text-sm py-2 rounded-lg transition-colors mb-6 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Signing in...
            </>
          ) : (
            'Sign in'
          )}
        </button>

        {/* Admins are provisioned by a super_admin in the Admins page — no self
            sign-up on the admin console. */}
      </div>
    </div>
  );

  const renderVerificationStep = () => (
    <div className="flex-1 bg-black p-12 flex items-center justify-center col-span-4 overflow-y-auto">
      <div className={`w-full max-w-md bg-[#18181b80] p-5 rounded-xl border border-[#A1A1A120] transition-transform duration-700 ${
        isAnimating ? 'opacity-0 translate-y-8' : 'opacity-100 translate-y-0'
      }`}>
        <div className="flex justify-center mb-6">
          <div className="w-15 h-15 bg-[#007acc]/20 rounded-full flex items-center justify-center">
            <svg className="w-7 h-7 text-[#007acc]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        </div>

        <h2 className="text-[#F9F9F9] text-2xl font-bold text-center mb-0.5">Verify your email</h2>
        <p className="text-[#FFFFFF60] text-[13px] text-center mb-3">
          We've sent a 6-digit verification code to<br />
          <span className="text-white font-medium">{formData.email || 'your@email.com'}</span>
        </p>

        <div className="flex gap-3 mb-3 justify-center" onPaste={handleOtpPaste}>
          {otp.map((digit, index) => (
            <input
              key={index}
              id={`otp-${index}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(index, e.target.value)}
              onKeyDown={(e) => handleOtpKeyDown(index, e)}
              className="w-11 h-12 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-xl text-center focus:outline-none focus:border-[#A1A1A140] transition-colors"
            />
          ))}
        </div>

        <p className="text-[#FFFFFF60] text-[12px] text-center mb-3">
          Didn't receive the code?{' '}
          {resendTimer > 0 ? (
            <span className="text-gray-500">Resend in {resendTimer}s</span>
          ) : (
            <button onClick={handleResendCode} className="text-[#007acc70] hover:underline cursor-pointer">
              Resend code
            </button>
          )}
        </p>

        <button
          onClick={handleCompleteVerification}
          disabled={otp.some(digit => !digit)}
          className="w-full bg-[#007acc70] text-white text-sm font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#007acc] mb-4 cursor-pointer"
        >
          Verify Email
        </button>

        <button
          onClick={() => setStep('organization')}
          className="w-full text-[#FFFFFF60] text-sm cursor-pointer transition-colors"
        >
          Back to login
        </button>
      </div>
    </div>
  );

  // ── MFA: enter a code (enrolled admin completing login) ──────────────────
  const renderMfaCodeStep = () => (
    <div className="flex-1 bg-black p-4 md:p-12 flex items-center justify-center col-span-4 overflow-y-auto">
      <div className={`w-full max-w-md bg-[#18181b80] p-5 rounded-xl border border-[#A1A1A120] transition-transform duration-500 ${
        isAnimating ? 'opacity-0 translate-y-8' : 'opacity-100 translate-y-0'
      }`}>
        <div className="flex justify-center mb-5">
          <div className="w-14 h-14 bg-[#007acc]/20 rounded-full flex items-center justify-center">
            <ShieldCheck className="w-7 h-7 text-[#007acc]" />
          </div>
        </div>
        <h2 className="text-[#F9F9F9] text-2xl font-bold text-center mb-0.5">Two-factor authentication</h2>
        <p className="text-[#FFFFFF60] text-[13px] text-center mb-1">
          {useBackupCode
            ? 'Enter one of your backup codes'
            : 'Enter the 6-digit code from your authenticator app'}
        </p>
        {pendingAdmin && (
          <p className="text-white text-xs text-center font-medium mb-4">{pendingAdmin.email}</p>
        )}

        {!useBackupCode ? (
          <div className="flex gap-3 mb-4 justify-center" onPaste={handleOtpPaste}>
            {otp.map((digit, index) => (
              <input
                key={index}
                id={`otp-${index}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                className="w-11 h-12 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-xl text-center focus:outline-none focus:border-[#A1A1A140] transition-colors"
              />
            ))}
          </div>
        ) : (
          <input
            type="text"
            value={backupCodeInput}
            onChange={(e) => setBackupCodeInput(e.target.value)}
            placeholder="XXXX-XXXX"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white text-center tracking-widest focus:outline-none focus:border-[#A1A1A140] transition-colors mb-4"
          />
        )}

        <button
          onClick={handleVerifyMfaCode}
          disabled={isLoading || (useBackupCode ? !backupCodeInput.trim() : otp.some((d) => !d))}
          className="w-full bg-[#007acc70] text-white text-sm font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-3 cursor-pointer flex items-center justify-center gap-2"
        >
          {isLoading ? (<><Loader2 size={16} className="animate-spin" />Verifying...</>) : 'Verify'}
        </button>

        <button
          onClick={() => { setUseBackupCode(!useBackupCode); setBackupCodeInput(''); setOtp(['', '', '', '', '', '']); }}
          className="w-full text-[#007acc70] text-xs cursor-pointer mb-2 flex items-center justify-center gap-1.5"
        >
          <KeyRound size={13} />
          {useBackupCode ? 'Use authenticator app instead' : 'Use a backup code'}
        </button>

        <button
          onClick={() => setStep('signin')}
          className="w-full text-[#FFFFFF60] text-sm cursor-pointer transition-colors"
        >
          Back to login
        </button>
      </div>
    </div>
  );

  // ── MFA: first-login enrollment (scan QR + confirm) ──────────────────────
  const renderMfaEnrollStep = () => (
    <div className="flex-1 bg-black p-4 md:p-12 flex items-center justify-center col-span-4 overflow-y-auto">
      <div className={`w-full max-w-md bg-[#18181b80] p-5 rounded-xl border border-[#A1A1A120] transition-transform duration-500 ${
        isAnimating ? 'opacity-0 translate-y-8' : 'opacity-100 translate-y-0'
      }`}>
        <h2 className="text-[#F9F9F9] text-2xl font-bold mb-0.5">Set up two-factor authentication</h2>
        <p className="text-[#FFFFFF60] text-[13px] mb-4">
          MFA is required for all admins. Scan the QR code with Google Authenticator, Authy, or 1Password.
        </p>

        {enrollData && (
          <>
            <div className="flex justify-center mb-4">
              <div className="bg-white p-3 rounded-lg">
                <QRCodeSVG value={enrollData.otpauth_url} size={160} />
              </div>
            </div>
            <p className="text-[#FFFFFF60] text-[11px] text-center mb-1">Can&apos;t scan? Enter this key manually:</p>
            <p className="text-[#F9F9F9] text-xs text-center font-mono break-all bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1.5 mb-4">
              {enrollData.secret}
            </p>
          </>
        )}

        <label className="text-[#F9F9F9] text-sm font-medium mb-1.5 block">Enter the 6-digit code to confirm</label>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={enrollCode}
          onChange={(e) => setEnrollCode(e.target.value.replace(/\D/g, ''))}
          placeholder="123456"
          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-white text-center tracking-[0.5em] focus:outline-none focus:border-[#A1A1A140] transition-colors mb-4"
        />

        <button
          onClick={handleConfirmEnroll}
          disabled={isLoading || enrollCode.length < 6}
          className="w-full bg-[#007acc70] text-white text-sm font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-3 cursor-pointer flex items-center justify-center gap-2"
        >
          {isLoading ? (<><Loader2 size={16} className="animate-spin" />Confirming...</>) : 'Enable MFA'}
        </button>

        <button
          onClick={() => setStep('signin')}
          className="w-full text-[#FFFFFF60] text-sm cursor-pointer transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  // ── MFA: show one-time backup codes (shown once) ─────────────────────────
  const renderBackupCodesStep = () => (
    <div className="flex-1 bg-black p-4 md:p-12 flex items-center justify-center col-span-4 overflow-y-auto">
      <div className={`w-full max-w-md bg-[#18181b80] p-5 rounded-xl border border-[#A1A1A120] transition-transform duration-500 ${
        isAnimating ? 'opacity-0 translate-y-8' : 'opacity-100 translate-y-0'
      }`}>
        <h2 className="text-[#F9F9F9] text-2xl font-bold mb-0.5">Save your backup codes</h2>
        <p className="text-[#FFFFFF60] text-[13px] mb-4">
          Each code works once if you lose your authenticator. They will <span className="text-white font-medium">not</span> be shown again.
        </p>

        <div className="grid grid-cols-2 gap-2 bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-3">
          {backupCodes.map((code) => (
            <span key={code} className="text-[#F9F9F9] text-sm font-mono text-center tracking-wider">{code}</span>
          ))}
        </div>

        <button
          onClick={copyBackupCodes}
          className="w-full bg-[#18181b80] border border-[#A1A1A120] text-[#F9F9F9] text-sm py-2 rounded-lg hover:bg-gray-900 transition-colors mb-4 cursor-pointer flex items-center justify-center gap-2"
        >
          <Copy size={15} /> Copy codes
        </button>

        <label className="flex items-start gap-2 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={savedAck}
            onChange={(e) => setSavedAck(e.target.checked)}
            className="mt-0.5 accent-[#007acc]"
          />
          <span className="text-[#FFFFFF60] text-xs">I have saved these backup codes in a safe place</span>
        </label>

        <button
          onClick={finishBackupCodes}
          disabled={!savedAck}
          className="w-full bg-[#007acc70] text-white text-sm font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          Continue to dashboard
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Toaster + success toast are fixed-position and must NOT be grid children
          (a grid child consumes a column and pushes the form to a second row). */}
      <Toaster position="top-right" richColors theme="dark" />

      <div className="grid grid-cols-1 lg:grid-cols-9 h-screen w-full bg-black overflow-hidden">
        {renderLeftPanel()}
        {step === 'signin' && renderSignInStep()}
        {step === 'credentials' && renderCredentialsStep()}
        {step === 'organization' && renderOrganizationStep()}
        {step === 'verification' && renderVerificationStep()}
        {step === 'mfa-code' && renderMfaCodeStep()}
        {step === 'mfa-enroll' && renderMfaEnrollStep()}
        {step === 'backup-codes' && renderBackupCodesStep()}
      </div>

      {showSuccessToast && (
        <div className="fixed bottom-2 right-4 bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-2xl z-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center">
              <Check className="text-green-900" size={20} />
            </div>
            <div>
              <p className="text-white font-medium text-sm">Account created!</p>
              <p className="text-[#FFFFFF60] text-xs">Please check your email to verify your account.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HasaPayOnboarding;