'use client';

import { useState } from 'react';
import {
  Tile,
  Button,
  TextInput,
  Stack,
  Select,
  SelectItem,
  InlineNotification,
  Loading,
  FileUploader,
} from '@carbon/react';
import {
  Login,
  UserFollow,
  Identification,
  UserAccess,
  Certificate,
  Delivery,
  InventoryManagement,
  Analytics,
  Collaborate,
  CheckmarkFilled,
} from '@carbon/icons-react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { authApi, ApiError } from '@/lib/api';

const roles = [
  { id: 'farmer',    icon: Collaborate,        color: '#24a148' },
  { id: 'warehouse', icon: InventoryManagement, color: '#0f62fe' },
  { id: 'lab',       icon: Analytics,           color: '#8a3ffc' },
  { id: 'officer',   icon: Identification,      color: '#fa4d56' },
  { id: 'enterprise',icon: Certificate,         color: '#007d79' },
  { id: 'consumer',  icon: UserAccess,          color: '#ff832b' },
  { id: 'secretary', icon: Delivery,            color: '#393939' },
];

const DEMO_CREDENTIALS = {
  farmer:     { email: 'farmer@honeytrace.gov',     password: 'password123' },
  warehouse:  { email: 'warehouse@honeytrace.gov',  password: 'password123' },
  lab:        { email: 'lab@honeytrace.gov',         password: 'password123' },
  officer:    { email: 'officer@honeytrace.gov',    password: 'password123' },
  enterprise: { email: 'enterprise@honeytrace.gov', password: 'password123' },
  consumer:   { email: 'consumer@honeytrace.gov',   password: 'password123' },
  secretary:  { email: 'secretary@honeytrace.gov',  password: 'password123' },
};

export default function LoginPortal() {
  const router   = useRouter();
  const pathname = usePathname();
  const t  = useTranslations('Auth');
  const tr = useTranslations('Roles');
  const locale = pathname.split('/')[1] || 'en';

  const [mode, setMode]               = useState<'login' | 'signup' | 'kyc'>('login');
  const [selectedRole, setSelectedRole] = useState('');
  const [loading, setLoading]         = useState(false);
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [demoFilled, setDemoFilled]   = useState(false);
  const [authError, setAuthError]     = useState<string | null>(null);

  const handleRoleChange = (roleId: string) => {
    setSelectedRole(roleId);
    if (mode === 'login') {
      const creds = DEMO_CREDENTIALS[roleId as keyof typeof DEMO_CREDENTIALS];
      if (creds) {
        setEmail(creds.email);
        setPassword(creds.password);
        setDemoFilled(true);
      } else {
        setEmail('');
        setPassword('');
        setDemoFilled(false);
      }
    }
  };

  const handleLogin = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthError(null);
    setLoading(true);
    try {
      await authApi.login(email, password, selectedRole);
      router.push(`/${locale}/dashboard/${selectedRole}`);
      router.refresh(); // Force middleware to re-read the new cookie
    } catch (err) {
      setAuthError(err instanceof ApiError ? err.message : 'Login failed. Please try again.');
      setLoading(false);
    }
  };

  const handleSignup = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMode('kyc');
  };

  const handleKYCSubmit = async () => {
    setAuthError(null);
    setLoading(true);
    try {
      await authApi.login(email, password, selectedRole);
      router.push(`/${locale}/dashboard/${selectedRole}`);
      router.refresh();
    } catch (err) {
      setAuthError(err instanceof ApiError ? err.message : 'Verification failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Ambient background — strong enough to actually be visible */}
      <div className="absolute top-[-15%] right-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[400px] h-[400px] bg-success/8 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand mark */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/25 text-white">
            {/* Honeycomb-inspired hex shape using CSS + icon */}
            <svg viewBox="0 0 32 32" className="w-8 h-8 fill-white" aria-hidden="true">
              <path d="M16 2 L28 9 L28 23 L16 30 L4 23 L4 9 Z" fillOpacity="0.2"/>
              <path d="M16 7 L23 11 L23 21 L16 25 L9 21 L9 11 Z" fillOpacity="0.4"/>
              <path d="M16 12 L19.5 14 L19.5 18 L16 20 L12.5 18 L12.5 14 Z"/>
            </svg>
          </div>
          <h1 className="text-h1 mb-1">{t('brandName')}</h1>
          <p className="text-xs uppercase tracking-[0.25em] font-bold text-primary">{t('brandSubtitle')}</p>
        </div>

        {/* Card — visible border on near-white bg */}
        <Tile className="standard-tile !rounded-2xl border border-border-strong/20 shadow-2xl bg-surface">
          <div className="p-8">

            {mode === 'login' && (
              <form onSubmit={handleLogin}>
                <Stack gap={5}>
                  <div>
                    <h2 className="text-2xl font-black text-text-primary">{t('welcomeBack')}</h2>
                    <div className="w-10 h-1 bg-primary rounded-full mt-2" />
                  </div>

                  {demoFilled && (
                    <InlineNotification
                      kind="info"
                      title="Demo credentials pre-filled."
                      subtitle="You can sign in directly or change the role."
                      hideCloseButton
                      lowContrast
                    />
                  )}

                  {authError && (
                    <InlineNotification
                      kind="error"
                      title="Authentication failed."
                      subtitle={authError}
                      onCloseButtonClick={() => setAuthError(null)}
                      lowContrast
                    />
                  )}

                  <Select
                    id="role-select"
                    labelText={t('selectRole')}
                    size="lg"
                    value={selectedRole}
                    onChange={(e) => handleRoleChange(e.target.value)}
                  >
                    <SelectItem value="" text={t('pleaseSelect')} />
                    {roles.map(role => (
                      <SelectItem key={role.id} value={role.id} text={tr(`${role.id}.title`)} />
                    ))}
                  </Select>

                  <TextInput
                    id="email"
                    labelText={t('emailLabel')}
                    placeholder={t('emailPlaceHolder')}
                    size="lg"
                    required
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setDemoFilled(false); }}
                  />
                  <TextInput
                    id="password"
                    type="password"
                    labelText={t('passwordLabel')}
                    placeholder="••••••••"
                    size="lg"
                    required
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setDemoFilled(false); }}
                  />

                  <Button
                    className="w-full flex justify-center !min-w-full"
                    size="lg"
                    renderIcon={Login}
                    type="submit"
                    disabled={loading || !selectedRole}
                    kind="primary"
                  >
                    {loading ? t('authenticating') : t('signIn')}
                  </Button>

                  <p className="text-sm text-center text-text-secondary">
                    {t('newToHoneyTrace')}{' '}
                    <button
                      type="button"
                      className="text-primary hover:underline font-bold"
                      onClick={() => setMode('signup')}
                    >
                      {t('createAccount')}
                    </button>
                  </p>
                </Stack>
              </form>
            )}

            {mode === 'signup' && (
              <form onSubmit={handleSignup}>
                <Stack gap={5}>
                  <div>
                    <h2 className="text-2xl font-black text-text-primary">{t('registration')}</h2>
                    <div className="w-10 h-1 bg-primary rounded-full mt-2" />
                  </div>

                  <TextInput
                    id="full-name"
                    labelText={t('fullName')}
                    placeholder="John Doe"
                    size="lg"
                    required
                  />
                  <TextInput
                    id="email-signup"
                    labelText={t('emailAddress')}
                    placeholder="john@example.com"
                    size="lg"
                    required
                  />
                  <TextInput
                    id="password-signup"
                    type="password"
                    labelText={t('passwordLabel')}
                    placeholder="Min. 8 characters"
                    size="lg"
                    required
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                  />
                  <Select
                    id="role-signup"
                    labelText={t('userRole')}
                    size="lg"
                    value={selectedRole}
                    onChange={(e) => handleRoleChange(e.target.value)}
                  >
                    <SelectItem value="" text={t('pleaseSelect')} />
                    {roles.map(role => (
                      <SelectItem key={role.id} value={role.id} text={tr(`${role.id}.title`)} />
                    ))}
                  </Select>

                  <Button
                    className="w-full flex justify-center !min-w-full"
                    size="lg"
                    renderIcon={UserFollow}
                    type="submit"
                    disabled={!selectedRole}
                  >
                    {t('continueIdentity')}
                  </Button>

                  <div className="text-center">
                    <Button kind="ghost" size="sm" onClick={() => setMode('login')}>
                      {t('alreadyHaveAccount')}
                    </Button>
                  </div>
                </Stack>
              </form>
            )}

            {mode === 'kyc' && (
              <Stack gap={5}>
                <div className="flex items-center gap-3 text-primary">
                  <Identification size={22} />
                  <h2 className="text-xl font-black">{t('kycVerification')}</h2>
                </div>

                <InlineNotification
                  kind="info"
                  title={t('idVerificationReq')}
                  subtitle={t('identityDesc')}
                  hideCloseButton
                />

                <Stack gap={4}>
                  <p className="text-xs font-bold uppercase text-text-secondary tracking-widest text-center">
                    {t('stakeholder')}: {selectedRole ? tr(`${selectedRole}.title`) : ''}
                  </p>

                  <TextInput
                    id="id-number"
                    labelText={selectedRole === 'enterprise' ? t('idNumberEnterprise') : t('idNumberIndividual')}
                    placeholder={t('idNumberPlaceHolder')}
                    size="lg"
                    required
                  />

                  <FileUploader
                    labelTitle={t('uploadDoc')}
                    labelDescription={t('uploadDesc')}
                    buttonLabel={t('addFile')}
                    buttonKind="secondary"
                    size="md"
                    filenameStatus="edit"
                    accept={['.jpg', '.pdf']}
                    multiple={false}
                  />
                </Stack>

                {authError && (
                  <InlineNotification
                    kind="error"
                    title="Verification failed."
                    subtitle={authError}
                    onCloseButtonClick={() => setAuthError(null)}
                    lowContrast
                  />
                )}

                <Button
                  className="w-full !max-w-none flex justify-center !min-w-full"
                  size="lg"
                  renderIcon={CheckmarkFilled}
                  onClick={handleKYCSubmit}
                  disabled={loading}
                >
                  {loading ? t('verifyingIdentity') : t('submitKYC')}
                </Button>

                {/* Terms — legible size, not hidden */}
                <p className="text-xs text-center text-text-secondary leading-relaxed px-2">
                  {t('terms')}
                </p>
              </Stack>
            )}

          </div>
        </Tile>

        <p className="mt-6 text-center text-xs text-text-secondary uppercase tracking-[0.2em] opacity-60">
          {t('protectedBy')}
        </p>
      </div>

      {loading && <Loading description="Processing..." withOverlay={true} />}
    </div>
  );
}
