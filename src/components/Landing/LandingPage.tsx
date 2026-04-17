'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bee,
  Chemistry,
  DataCheck,
  Globe,
  Locked,
  Partnership,
  Security,
  ArrowRight,
  Login,
  UserFollow,
} from '@carbon/icons-react';
import { authApi, ApiError } from '@/lib/api';

const SUPPLY_CHAIN_STEPS = [
  { icon: Bee, labelKey: 'step_harvest', descKey: 'step_harvest_desc', color: '#22c55e' },
  { icon: DataCheck, labelKey: 'step_warehouse', descKey: 'step_warehouse_desc', color: '#3b82f6' },
  { icon: Chemistry, labelKey: 'step_lab', descKey: 'step_lab_desc', color: '#a855f7' },
  { icon: Security, labelKey: 'step_certify', descKey: 'step_certify_desc', color: '#ef4444' },
  { icon: Partnership, labelKey: 'step_enterprise', descKey: 'step_enterprise_desc', color: '#14b8a6' },
  { icon: Globe, labelKey: 'step_consumer', descKey: 'step_consumer_desc', color: '#f97316' },
];

const STATS = [
  { value: '1,200+', labelKey: 'stat_farmers' },
  { value: '50,000+', labelKey: 'stat_batches' },
  { value: '99.8%', labelKey: 'stat_integrity' },
  { value: '12', labelKey: 'stat_states' },
];

const roles = [
  { id: 'farmer' }, { id: 'warehouse' }, { id: 'lab' }, { id: 'officer' },
  { id: 'enterprise' }, { id: 'consumer' }, { id: 'secretary' },
];

const DEMO_CREDENTIALS: Record<string, { email: string; password: string }> = {
  farmer: { email: 'farmer@honeytrace.gov', password: 'password123' },
  warehouse: { email: 'warehouse@honeytrace.gov', password: 'password123' },
  lab: { email: 'lab@honeytrace.gov', password: 'password123' },
  officer: { email: 'officer@honeytrace.gov', password: 'password123' },
  enterprise: { email: 'enterprise@honeytrace.gov', password: 'password123' },
  consumer: { email: 'consumer@honeytrace.gov', password: 'password123' },
  secretary: { email: 'secretary@honeytrace.gov', password: 'password123' },
};

export default function LandingPage() {
  const t = useTranslations('Landing');
  const tAuth = useTranslations('Auth');
  const tr = useTranslations('Roles');
  const pathname = usePathname();
  const router = useRouter();
  const locale = pathname.startsWith('/hi') ? 'hi' : 'en';

  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [selectedRole, setSelectedRole] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [farmerIdType, setFarmerIdType] = useState<'aadhaar' | 'pan'>('aadhaar');
  const [farmerIdNumber, setFarmerIdNumber] = useState('');
  const [farmerVillage, setFarmerVillage] = useState('');
  const [farmerDistrict, setFarmerDistrict] = useState('');
  const [farmerState, setFarmerState] = useState('');
  const [farmerKisanCard, setFarmerKisanCard] = useState('');
  const [farmerCapacity, setFarmerCapacity] = useState('');
  const [farmerOrganicCertified, setFarmerOrganicCertified] = useState<'yes' | 'no'>('no');
  const [warehouseName, setWarehouseName] = useState('');
  const [warehouseRegistrationNo, setWarehouseRegistrationNo] = useState('');
  const [warehouseIdType, setWarehouseIdType] = useState<'aadhaar' | 'pan'>('aadhaar');
  const [warehouseIdNumber, setWarehouseIdNumber] = useState('');
  const [warehouseAddress, setWarehouseAddress] = useState('');
  const [warehouseCity, setWarehouseCity] = useState('');
  const [warehouseState, setWarehouseState] = useState('');
  const [warehousePincode, setWarehousePincode] = useState('');
  const [warehouseStorageCapacity, setWarehouseStorageCapacity] = useState('');
  const [warehouseCurrentUtilization, setWarehouseCurrentUtilization] = useState('');
  const [warehouseTemperatureControlled, setWarehouseTemperatureControlled] = useState<'yes' | 'no'>('no');
  const [warehouseHumidityControl, setWarehouseHumidityControl] = useState<'yes' | 'no'>('no');
  const [labName, setLabName] = useState('');
  const [labFssaiNumber, setLabFssaiNumber] = useState('');
  const [labIdType, setLabIdType] = useState<'aadhaar' | 'pan'>('aadhaar');
  const [labIdNumber, setLabIdNumber] = useState('');
  const [labCertifications, setLabCertifications] = useState('');
  const [labPurityTest, setLabPurityTest] = useState<'yes' | 'no'>('yes');
  const [labAdulterationTest, setLabAdulterationTest] = useState<'yes' | 'no'>('yes');
  const [labMoistureTest, setLabMoistureTest] = useState<'yes' | 'no'>('yes');
  const [labAddress, setLabAddress] = useState('');
  const [labCity, setLabCity] = useState('');
  const [labState, setLabState] = useState('');
  const [officerEmployeeId, setOfficerEmployeeId] = useState('');
  const [officerDepartment, setOfficerDepartment] = useState('');
  const [officerIdType, setOfficerIdType] = useState<'aadhaar' | 'pan'>('aadhaar');
  const [officerIdNumber, setOfficerIdNumber] = useState('');
  const [officerAuthorityLevel, setOfficerAuthorityLevel] = useState<'regional' | 'state' | 'national'>('regional');
  const [officerLabAffiliation, setOfficerLabAffiliation] = useState('');
  const [enterpriseCompanyName, setEnterpriseCompanyName] = useState('');
  const [enterpriseCompanyPan, setEnterpriseCompanyPan] = useState('');
  const [enterpriseGstNumber, setEnterpriseGstNumber] = useState('');
  const [enterpriseFssaiLicense, setEnterpriseFssaiLicense] = useState('');
  const [enterpriseBusinessType, setEnterpriseBusinessType] = useState<'buyer' | 'processor' | 'exporter'>('buyer');
  const [enterpriseContactName, setEnterpriseContactName] = useState('');
  const [enterpriseContactDesignation, setEnterpriseContactDesignation] = useState('');
  const [enterpriseAddress, setEnterpriseAddress] = useState('');
  const [enterpriseCity, setEnterpriseCity] = useState('');
  const [enterpriseState, setEnterpriseState] = useState('');
  const [enterpriseProcessingCapacity, setEnterpriseProcessingCapacity] = useState('');
  const [secretaryEmployeeId, setSecretaryEmployeeId] = useState('');
  const [secretaryDepartment, setSecretaryDepartment] = useState('');
  const [secretaryIdType, setSecretaryIdType] = useState<'aadhaar' | 'pan'>('aadhaar');
  const [secretaryIdNumber, setSecretaryIdNumber] = useState('');
  const [secretaryJurisdictionLevel, setSecretaryJurisdictionLevel] = useState<'district' | 'state' | 'national'>('district');
  const [secretaryJurisdictionRegion, setSecretaryJurisdictionRegion] = useState('');
  const [secretaryApproveStakeholders, setSecretaryApproveStakeholders] = useState<'yes' | 'no'>('yes');
  const [secretaryAuditAccess, setSecretaryAuditAccess] = useState<'yes' | 'no'>('yes');
  const [secretaryComplianceControl, setSecretaryComplianceControl] = useState<'yes' | 'no'>('yes');
  const [consumerAadhaarNumber, setConsumerAadhaarNumber] = useState('');
  const [consumerOrganicOnly, setConsumerOrganicOnly] = useState<'yes' | 'no'>('no');
  const [consumerPreferredRegions, setConsumerPreferredRegions] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => { setIsHydrated(true); }, []);
  useEffect(() => {
    if (authMode === 'signup' && !selectedRole) {
      setSelectedRole('farmer');
    }
  }, [authMode, selectedRole]);

  const handleRoleSelect = (roleId: string) => {
    setSelectedRole(roleId);
    setError(null);
    if (authMode === 'login') {
      const creds = DEMO_CREDENTIALS[roleId];
      if (creds) { setEmail(creds.email); setPassword(creds.password); }
    }
  };

  const handleLogin = async () => {
    setError(null);
    const role = selectedRole || Object.entries(DEMO_CREDENTIALS).find(([, c]) => c.email === email)?.[0] || '';
    if (!role) { setError('Please select a role.'); return; }
    setLoading(true);
    try {
      await authApi.login(email, password, role);
      window.location.assign(`/${locale}/dashboard/${role}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed.');
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!selectedRole) { setError('Please select a role.'); return; }
    setLoading(true);
    try {
      const profile = selectedRole === 'farmer'
        ? {
            kisanCard: farmerKisanCard || undefined,
            aadhaarNumber: farmerIdType === 'aadhaar' ? farmerIdNumber : undefined,
            panNumber: farmerIdType === 'pan' ? farmerIdNumber.toUpperCase() : undefined,
            farmLocation: {
              village: farmerVillage,
              district: farmerDistrict,
              state: farmerState,
            },
            honeyProductionCapacity: farmerCapacity ? Number(farmerCapacity) : undefined,
            organicCertified: farmerOrganicCertified === 'yes',
          }
        : selectedRole === 'warehouse'
          ? {
              warehouseName,
              registrationNumber: warehouseRegistrationNo,
              aadhaarNumber: warehouseIdType === 'aadhaar' ? warehouseIdNumber : undefined,
              panNumber: warehouseIdType === 'pan' ? warehouseIdNumber.toUpperCase() : undefined,
              location: {
                address: warehouseAddress,
                city: warehouseCity,
                state: warehouseState,
                pincode: warehousePincode,
              },
              storageCapacity: warehouseStorageCapacity ? Number(warehouseStorageCapacity) : undefined,
              currentUtilization: warehouseCurrentUtilization ? Number(warehouseCurrentUtilization) : undefined,
              temperatureControlled: warehouseTemperatureControlled === 'yes',
              humidityControl: warehouseHumidityControl === 'yes',
            }
        : selectedRole === 'lab'
          ? {
              labName,
              fssaiLabNumber: labFssaiNumber,
              aadhaarNumber: labIdType === 'aadhaar' ? labIdNumber : undefined,
              panNumber: labIdType === 'pan' ? labIdNumber.toUpperCase() : undefined,
              certifications: labCertifications
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean),
              testingCapabilities: {
                purityTest: labPurityTest === 'yes',
                adulterationTest: labAdulterationTest === 'yes',
                moistureTest: labMoistureTest === 'yes',
              },
              location: {
                address: labAddress,
                city: labCity,
                state: labState,
              },
            }
        : selectedRole === 'officer'
          ? {
              employeeId: officerEmployeeId,
              department: officerDepartment,
              aadhaarNumber: officerIdType === 'aadhaar' ? officerIdNumber : undefined,
              panNumber: officerIdType === 'pan' ? officerIdNumber.toUpperCase() : undefined,
              authorityLevel: officerAuthorityLevel,
              labAffiliation: officerLabAffiliation || undefined,
            }
        : selectedRole === 'enterprise'
          ? {
              companyName: enterpriseCompanyName,
              companyPan: enterpriseCompanyPan.toUpperCase(),
              gstNumber: enterpriseGstNumber,
              fssaiLicense: enterpriseFssaiLicense,
              businessType: enterpriseBusinessType,
              contactPerson: {
                name: enterpriseContactName,
                designation: enterpriseContactDesignation,
              },
              facilityLocation: {
                address: enterpriseAddress,
                city: enterpriseCity,
                state: enterpriseState,
              },
              processingCapacity: enterpriseProcessingCapacity ? Number(enterpriseProcessingCapacity) : undefined,
            }
        : selectedRole === 'consumer'
          ? {
              aadhaarNumber: consumerAadhaarNumber,
              preferences: {
                organicOnly: consumerOrganicOnly === 'yes',
                preferredRegions: consumerPreferredRegions
                  .split(',')
                  .map((item) => item.trim())
                  .filter(Boolean),
              },
            }
        : selectedRole === 'secretary'
          ? {
              employeeId: secretaryEmployeeId,
              department: secretaryDepartment,
              aadhaarNumber: secretaryIdType === 'aadhaar' ? secretaryIdNumber : undefined,
              panNumber: secretaryIdType === 'pan' ? secretaryIdNumber.toUpperCase() : undefined,
              jurisdiction: {
                level: secretaryJurisdictionLevel,
                region: secretaryJurisdictionRegion,
              },
              permissions: {
                approveStakeholders: secretaryApproveStakeholders === 'yes',
                auditAccess: secretaryAuditAccess === 'yes',
                complianceControl: secretaryComplianceControl === 'yes',
              },
            }
        : undefined;
      await authApi.register({ name: signupName, email: signupEmail, password: signupPassword, role: selectedRole, profile });
      setInfo('Account created. Sign in below.');
      setEmail(signupEmail);
      setPassword(signupPassword);
      setAuthMode('login');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed.');
    } finally { setLoading(false); }
  };

  const switchLocale = () => {
    const target = locale === 'en' ? 'hi' : 'en';
    const rest = pathname.replace(/^\/(en|hi)/, '');
    router.push(`/${target}${rest}`);
  };

  return (
    <div className="lp" data-hydrated={isHydrated ? 'true' : 'false'}>
      {/* ── Skip Navigation (GIGW §4.1 / WCAG 2.1 SC 2.4.1) ─────────── */}
      <a href="#lp-main" className="lp-skip-nav">Skip to Main Content</a>

      {/* ── Tricolor stripe (GIGW mandatory) ────────────────────────── */}
      <div className="lp-gov-stripe" aria-hidden="true">
        <span /><span /><span />
      </div>

      {/* ── NIC-compliant Government Header ─────────────────────────── */}
      <header className="lp-gov-header" role="banner">
        <div className="lp-gov-header-inner">
          {/* Left: Emblem + Ministry branding */}
          <div className="lp-gov-brand">
            <img
              src="/logos/ministry-tribal-affairs.svg"
              alt="Government of India – Ministry of Tribal Affairs"
              className="lp-gov-emblem"
            />
            <div className="lp-gov-brand-text">
              <span className="lp-gov-title-hi" lang="hi">भारत सरकार | जनजातीय कार्य मंत्रालय</span>
              <span className="lp-gov-title-en">Government of India &nbsp;|&nbsp; Ministry of Tribal Affairs</span>
              <span className="lp-gov-subtitle">HoneyTRACE — Blockchain Traceability Portal</span>
            </div>
            <span className="lp-gov-sep" aria-hidden="true" />
            <img src="/logos/iit-delhi.jpg" alt="IIT Delhi" className="lp-gov-iit" />
          </div>

          {/* Right: Accessibility + Language (GIGW §4.3) */}
          <div className="lp-gov-tools" role="toolbar" aria-label="Accessibility and language tools">
            <div className="lp-font-sizer" role="group" aria-label="Adjust text size">
              <button className="lp-tool-btn" aria-label="Decrease text size" title="Decrease font size"
                onClick={() => { const s = parseFloat(getComputedStyle(document.documentElement).fontSize); document.documentElement.style.fontSize = Math.max(12, s - 2) + 'px'; }}>
                A<sup aria-hidden="true">-</sup>
              </button>
              <button className="lp-tool-btn lp-tool-btn--default" aria-label="Default text size" title="Default font size"
                onClick={() => { document.documentElement.style.fontSize = ''; }}>
                A
              </button>
              <button className="lp-tool-btn" aria-label="Increase text size" title="Increase font size"
                onClick={() => { const s = parseFloat(getComputedStyle(document.documentElement).fontSize); document.documentElement.style.fontSize = Math.min(24, s + 2) + 'px'; }}>
                A<sup aria-hidden="true">+</sup>
              </button>
            </div>
            <span className="lp-gov-divider" aria-hidden="true" />
            <button
              className="lp-tool-btn lp-tool-btn--contrast"
              aria-label="Toggle high contrast mode"
              title="High Contrast"
              onClick={() => document.body.classList.toggle('high-contrast')}
            >
              HC
            </button>
            <span className="lp-gov-divider" aria-hidden="true" />
            <button onClick={switchLocale} className="lp-tool-btn lp-tool-btn--lang"
              aria-label={locale === 'en' ? 'Switch to Hindi' : 'Switch to English'}>
              {locale === 'en' ? 'हिन्दी' : 'English'}
            </button>
          </div>
        </div>
      </header>

      {/* ── NIC navigation band ──────────────────────────────────────── */}
      <nav className="lp-nav-band" aria-label="Main navigation">
        <div className="lp-nav-inner">
          <a href="#lp-main" className="lp-nav-link lp-nav-link--active">Home</a>
          <a href="#supply-chain" className="lp-nav-link">Supply Chain</a>
          <a href="#features" className="lp-nav-link">Features</a>
          <a href={`/${locale}/track`} className="lp-nav-link">Track Journey</a>
          <a href="#auth" className="lp-nav-link">Portal Login</a>
          <a href="#contact" className="lp-nav-link">Contact Us</a>
        </div>
      </nav>

      {/* ── Hero split ──────────────────────────────────────────────── */}
      <main id="lp-main" tabIndex={-1}>
      <section className="lp-hero" aria-labelledby="lp-hero-title">
        <div className="lp-hero-bg" aria-hidden="true">
          <div className="lp-hero-gradient" />
          <div className="lp-hero-noise" />
        </div>

        <div className="lp-hero-inner">
          {/* Left: content */}
          <div className="lp-hero-content">
            <div className="lp-chip">
              <Locked size={14} />
              <span>{t('hero_chip')}</span>
            </div>

            <h1 id="lp-hero-title" className="lp-title">
              {t('hero_title_1')}
              <span className="lp-title-accent">{t('hero_title_accent')}</span>
              {t('hero_title_2')}
            </h1>

            <p className="lp-subtitle">{t('hero_subtitle')}</p>

            <div className="lp-stats">
              {STATS.map((s) => (
                <div key={s.labelKey} className="lp-stat">
                  <span className="lp-stat-val">{s.value}</span>
                  <span className="lp-stat-lbl">{t(s.labelKey)}</span>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="lp-submit-btn"
              style={{ marginTop: '1.25rem', maxWidth: '20rem' }}
              onClick={() => router.push(`/${locale}/track`)}
            >
              Track Product Journey
              <ArrowRight size={18} />
            </button>
          </div>

          {/* Right: auth card */}
          <div className="lp-auth-card" id="auth">
            <div className="lp-auth-header">
              <h2>{authMode === 'login' ? tAuth('welcomeBack') : tAuth('registration')}</h2>
              <div className="lp-auth-accent" />
            </div>

            {error && <div className="lp-alert lp-alert--error">{error}</div>}
            {info && <div className="lp-alert lp-alert--success">{info}</div>}

            {/* Role pills */}
            <div className="lp-role-grid">
              {roles.map((r) => (
                <button
                  key={r.id}
                  className={`lp-role-pill ${selectedRole === r.id ? 'active' : ''}`}
                  onClick={() => handleRoleSelect(r.id)}
                  type="button"
                >
                  {tr(`${r.id}.title`)}
                </button>
              ))}
            </div>

            {authMode === 'login' ? (
              <form onSubmit={(e) => { e.preventDefault(); void handleLogin(); }} className="lp-auth-form">
                <div className="lp-field">
                  <label htmlFor="lp-email">{tAuth('emailLabel')}</label>
                  <input
                    id="lp-email"
                    type="email"
                    placeholder={tAuth('emailPlaceHolder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="lp-field">
                  <label htmlFor="lp-pass">{tAuth('passwordLabel')}</label>
                  <input
                    id="lp-pass"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="lp-submit-btn" disabled={loading}>
                  {loading ? tAuth('authenticating') : tAuth('signIn')}
                  {!loading && <Login size={18} />}
                </button>
                <p className="lp-switch-text">
                  {tAuth('newToHoneyTrace')}{' '}
                  <button type="button" onClick={() => { if (!selectedRole) setSelectedRole('farmer'); setAuthMode('signup'); setError(null); }}>
                    {tAuth('createAccount')}
                  </button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="lp-auth-form">
                <div className="lp-field">
                  <label htmlFor="lp-name">{tAuth('fullName')}</label>
                  <input id="lp-name" placeholder="John Doe" value={signupName} onChange={(e) => setSignupName(e.target.value)} required />
                </div>
                <div className="lp-field">
                  <label htmlFor="lp-signup-email">{tAuth('emailAddress')}</label>
                  <input id="lp-signup-email" type="email" placeholder="john@example.com" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} required />
                </div>
                <div className="lp-field">
                  <label htmlFor="lp-signup-pass">{tAuth('passwordLabel')}</label>
                  <input id="lp-signup-pass" type="password" placeholder="Min. 8 characters" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} required />
                </div>
                {selectedRole === 'farmer' && (
                  <>
                    <div className="lp-field">
                      <label htmlFor="lp-farmer-id-type">Identity Document</label>
                      <select
                        id="lp-farmer-id-type"
                        value={farmerIdType}
                        onChange={(e) => {
                          const next = e.target.value === 'pan' ? 'pan' : 'aadhaar';
                          setFarmerIdType(next);
                          setFarmerIdNumber('');
                        }}
                        required
                      >
                        <option value="aadhaar">Aadhaar Number</option>
                        <option value="pan">PAN Number</option>
                      </select>
                    </div>
                    <div className="lp-field">
                      <label htmlFor="lp-farmer-id-number">{farmerIdType === 'aadhaar' ? 'Aadhaar Number' : 'PAN Number'}</label>
                      <input
                        id="lp-farmer-id-number"
                        placeholder={farmerIdType === 'aadhaar' ? '12-digit Aadhaar' : 'ABCDE1234F'}
                        value={farmerIdNumber}
                        onChange={(e) => setFarmerIdNumber(e.target.value)}
                        required
                      />
                    </div>
                    <div className="lp-field">
                      <label htmlFor="lp-farmer-village">Village</label>
                      <input id="lp-farmer-village" value={farmerVillage} onChange={(e) => setFarmerVillage(e.target.value)} required />
                    </div>
                    <div className="lp-field">
                      <label htmlFor="lp-farmer-district">District</label>
                      <input id="lp-farmer-district" value={farmerDistrict} onChange={(e) => setFarmerDistrict(e.target.value)} required />
                    </div>
                    <div className="lp-field">
                      <label htmlFor="lp-farmer-state">State</label>
                      <input id="lp-farmer-state" value={farmerState} onChange={(e) => setFarmerState(e.target.value)} required />
                    </div>
                    <div className="lp-field">
                      <label htmlFor="lp-farmer-kisan">Kisan Card (Optional)</label>
                      <input id="lp-farmer-kisan" value={farmerKisanCard} onChange={(e) => setFarmerKisanCard(e.target.value)} />
                    </div>
                    <div className="lp-field">
                      <label htmlFor="lp-farmer-capacity">Honey Production Capacity (Optional)</label>
                      <input id="lp-farmer-capacity" type="number" min="0" value={farmerCapacity} onChange={(e) => setFarmerCapacity(e.target.value)} />
                    </div>
                    <div className="lp-field">
                      <label htmlFor="lp-farmer-organic">Organic Certified</label>
                      <select id="lp-farmer-organic" value={farmerOrganicCertified} onChange={(e) => setFarmerOrganicCertified(e.target.value === 'yes' ? 'yes' : 'no')}>
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    </div>
                  </>
                )}
                {selectedRole === 'warehouse' && (
                  <>
                    <div className="lp-field">
                      <label htmlFor="lp-warehouse-name">Warehouse Name</label>
                      <input id="lp-warehouse-name" value={warehouseName} onChange={(e) => setWarehouseName(e.target.value)} required />
                    </div>
                    <div className="lp-field">
                      <label htmlFor="lp-warehouse-reg">Registration Number</label>
                      <input id="lp-warehouse-reg" value={warehouseRegistrationNo} onChange={(e) => setWarehouseRegistrationNo(e.target.value)} required />
                    </div>
                    <div className="lp-field">
                      <label htmlFor="lp-warehouse-id-type">Identity Document</label>
                      <select
                        id="lp-warehouse-id-type"
                        value={warehouseIdType}
                        onChange={(e) => {
                          const next = e.target.value === 'pan' ? 'pan' : 'aadhaar';
                          setWarehouseIdType(next);
                          setWarehouseIdNumber('');
                        }}
                        required
                      >
                        <option value="aadhaar">Aadhaar Number</option>
                        <option value="pan">PAN Number</option>
                      </select>
                    </div>
                    <div className="lp-field">
                      <label htmlFor="lp-warehouse-id-number">{warehouseIdType === 'aadhaar' ? 'Aadhaar Number' : 'PAN Number'}</label>
                      <input id="lp-warehouse-id-number" value={warehouseIdNumber} onChange={(e) => setWarehouseIdNumber(e.target.value)} required />
                    </div>
                    <div className="lp-field">
                      <label htmlFor="lp-warehouse-address">Address</label>
                      <input id="lp-warehouse-address" value={warehouseAddress} onChange={(e) => setWarehouseAddress(e.target.value)} required />
                    </div>
                    <div className="lp-field">
                      <label htmlFor="lp-warehouse-city">City</label>
                      <input id="lp-warehouse-city" value={warehouseCity} onChange={(e) => setWarehouseCity(e.target.value)} required />
                    </div>
                    <div className="lp-field">
                      <label htmlFor="lp-warehouse-state">State</label>
                      <input id="lp-warehouse-state" value={warehouseState} onChange={(e) => setWarehouseState(e.target.value)} required />
                    </div>
                    <div className="lp-field">
                      <label htmlFor="lp-warehouse-pincode">Pincode</label>
                      <input id="lp-warehouse-pincode" value={warehousePincode} onChange={(e) => setWarehousePincode(e.target.value)} required />
                    </div>
                    <div className="lp-field">
                      <label htmlFor="lp-warehouse-storage">Storage Capacity</label>
                      <input id="lp-warehouse-storage" type="number" min="0" value={warehouseStorageCapacity} onChange={(e) => setWarehouseStorageCapacity(e.target.value)} required />
                    </div>
                    <div className="lp-field">
                      <label htmlFor="lp-warehouse-utilization">Current Utilization (Optional)</label>
                      <input id="lp-warehouse-utilization" type="number" min="0" value={warehouseCurrentUtilization} onChange={(e) => setWarehouseCurrentUtilization(e.target.value)} />
                    </div>
                    <div className="lp-field">
                      <label htmlFor="lp-warehouse-temp">Temperature Controlled</label>
                      <select id="lp-warehouse-temp" value={warehouseTemperatureControlled} onChange={(e) => setWarehouseTemperatureControlled(e.target.value === 'yes' ? 'yes' : 'no')}>
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    </div>
                    <div className="lp-field">
                      <label htmlFor="lp-warehouse-humidity">Humidity Control</label>
                      <select id="lp-warehouse-humidity" value={warehouseHumidityControl} onChange={(e) => setWarehouseHumidityControl(e.target.value === 'yes' ? 'yes' : 'no')}>
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    </div>
                  </>
                )}
                {selectedRole === 'lab' && (
                  <>
                    <div className="lp-field">
                      <label htmlFor="lp-lab-name">Lab Name</label>
                      <input id="lp-lab-name" value={labName} onChange={(e) => setLabName(e.target.value)} required />
                    </div>
                    <div className="lp-field">
                      <label htmlFor="lp-lab-fssai">FSSAI Lab Number</label>
                      <input id="lp-lab-fssai" value={labFssaiNumber} onChange={(e) => setLabFssaiNumber(e.target.value)} required />
                    </div>
                    <div className="lp-field">
                      <label htmlFor="lp-lab-id-type">Identity Document</label>
                      <select
                        id="lp-lab-id-type"
                        value={labIdType}
                        onChange={(e) => {
                          const next = e.target.value === 'pan' ? 'pan' : 'aadhaar';
                          setLabIdType(next);
                          setLabIdNumber('');
                        }}
                        required
                      >
                        <option value="aadhaar">Aadhaar Number</option>
                        <option value="pan">PAN Number</option>
                      </select>
                    </div>
                    <div className="lp-field">
                      <label htmlFor="lp-lab-id-number">{labIdType === 'aadhaar' ? 'Aadhaar Number' : 'PAN Number'}</label>
                      <input id="lp-lab-id-number" value={labIdNumber} onChange={(e) => setLabIdNumber(e.target.value)} required />
                    </div>
                    <div className="lp-field">
                      <label htmlFor="lp-lab-certs">Certifications (comma-separated)</label>
                      <input id="lp-lab-certs" value={labCertifications} onChange={(e) => setLabCertifications(e.target.value)} />
                    </div>
                    <div className="lp-field">
                      <label htmlFor="lp-lab-purity">Purity Test Capability</label>
                      <select id="lp-lab-purity" value={labPurityTest} onChange={(e) => setLabPurityTest(e.target.value === 'yes' ? 'yes' : 'no')}>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </div>
                    <div className="lp-field">
                      <label htmlFor="lp-lab-adulteration">Adulteration Test Capability</label>
                      <select id="lp-lab-adulteration" value={labAdulterationTest} onChange={(e) => setLabAdulterationTest(e.target.value === 'yes' ? 'yes' : 'no')}>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </div>
                    <div className="lp-field">
                      <label htmlFor="lp-lab-moisture">Moisture Test Capability</label>
                      <select id="lp-lab-moisture" value={labMoistureTest} onChange={(e) => setLabMoistureTest(e.target.value === 'yes' ? 'yes' : 'no')}>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </div>
                    <div className="lp-field">
                      <label htmlFor="lp-lab-address">Address</label>
                      <input id="lp-lab-address" value={labAddress} onChange={(e) => setLabAddress(e.target.value)} required />
                    </div>
                    <div className="lp-field">
                      <label htmlFor="lp-lab-city">City</label>
                      <input id="lp-lab-city" value={labCity} onChange={(e) => setLabCity(e.target.value)} required />
                    </div>
                    <div className="lp-field">
                      <label htmlFor="lp-lab-state">State</label>
                      <input id="lp-lab-state" value={labState} onChange={(e) => setLabState(e.target.value)} required />
                    </div>
                  </>
                )}
                {selectedRole === 'officer' && (
                  <>
                    <div className="lp-field">
                      <label htmlFor="lp-officer-employee-id">Employee ID</label>
                      <input id="lp-officer-employee-id" value={officerEmployeeId} onChange={(e) => setOfficerEmployeeId(e.target.value)} required />
                    </div>
                    <div className="lp-field">
                      <label htmlFor="lp-officer-department">Department</label>
                      <input id="lp-officer-department" value={officerDepartment} onChange={(e) => setOfficerDepartment(e.target.value)} required />
                    </div>
                    <div className="lp-field">
                      <label htmlFor="lp-officer-id-type">Identity Document</label>
                      <select
                        id="lp-officer-id-type"
                        value={officerIdType}
                        onChange={(e) => {
                          const next = e.target.value === 'pan' ? 'pan' : 'aadhaar';
                          setOfficerIdType(next);
                          setOfficerIdNumber('');
                        }}
                        required
                      >
                        <option value="aadhaar">Aadhaar Number</option>
                        <option value="pan">PAN Number</option>
                      </select>
                    </div>
                    <div className="lp-field">
                      <label htmlFor="lp-officer-id-number">{officerIdType === 'aadhaar' ? 'Aadhaar Number' : 'PAN Number'}</label>
                      <input id="lp-officer-id-number" value={officerIdNumber} onChange={(e) => setOfficerIdNumber(e.target.value)} required />
                    </div>
                    <div className="lp-field">
                      <label htmlFor="lp-officer-authority">Authority Level</label>
                      <select id="lp-officer-authority" value={officerAuthorityLevel} onChange={(e) => {
                        const v = e.target.value;
                        setOfficerAuthorityLevel(v === 'state' || v === 'national' ? v : 'regional');
                      }}>
                        <option value="regional">Regional</option>
                        <option value="state">State</option>
                        <option value="national">National</option>
                      </select>
                    </div>
                    <div className="lp-field">
                      <label htmlFor="lp-officer-lab-affiliation">Lab Affiliation (Optional)</label>
                      <input id="lp-officer-lab-affiliation" value={officerLabAffiliation} onChange={(e) => setOfficerLabAffiliation(e.target.value)} />
                    </div>
                  </>
                )}
                {selectedRole === 'enterprise' && (
                  <>
                    <div className="lp-field">
                      <label htmlFor="lp-enterprise-company">Company Name</label>
                      <input id="lp-enterprise-company" value={enterpriseCompanyName} onChange={(e) => setEnterpriseCompanyName(e.target.value)} required />
                    </div>
                    <div className="lp-field">
                      <label htmlFor="lp-enterprise-pan">Company PAN</label>
                      <input id="lp-enterprise-pan" value={enterpriseCompanyPan} onChange={(e) => setEnterpriseCompanyPan(e.target.value)} required />
                    </div>
                    <div className="lp-field">
                      <label htmlFor="lp-enterprise-gst">GST Number</label>
                      <input id="lp-enterprise-gst" value={enterpriseGstNumber} onChange={(e) => setEnterpriseGstNumber(e.target.value)} required />
                    </div>
                    <div className="lp-field">
                      <label htmlFor="lp-enterprise-fssai">FSSAI License</label>
                      <input id="lp-enterprise-fssai" value={enterpriseFssaiLicense} onChange={(e) => setEnterpriseFssaiLicense(e.target.value)} required />
                    </div>
                    <div className="lp-field">
                      <label htmlFor="lp-enterprise-type">Business Type</label>
                      <select id="lp-enterprise-type" value={enterpriseBusinessType} onChange={(e) => {
                        const v = e.target.value;
                        setEnterpriseBusinessType(v === 'processor' || v === 'exporter' ? v : 'buyer');
                      }}>
                        <option value="buyer">Buyer</option>
                        <option value="processor">Processor</option>
                        <option value="exporter">Exporter</option>
                      </select>
                    </div>
                    <div className="lp-field">
                      <label htmlFor="lp-enterprise-contact-name">Contact Person Name</label>
                      <input id="lp-enterprise-contact-name" value={enterpriseContactName} onChange={(e) => setEnterpriseContactName(e.target.value)} required />
                    </div>
                    <div className="lp-field">
                      <label htmlFor="lp-enterprise-contact-designation">Contact Person Designation</label>
                      <input id="lp-enterprise-contact-designation" value={enterpriseContactDesignation} onChange={(e) => setEnterpriseContactDesignation(e.target.value)} required />
                    </div>
                    <div className="lp-field">
                      <label htmlFor="lp-enterprise-address">Facility Address</label>
                      <input id="lp-enterprise-address" value={enterpriseAddress} onChange={(e) => setEnterpriseAddress(e.target.value)} required />
                    </div>
                    <div className="lp-field">
                      <label htmlFor="lp-enterprise-city">Facility City</label>
                      <input id="lp-enterprise-city" value={enterpriseCity} onChange={(e) => setEnterpriseCity(e.target.value)} required />
                    </div>
                    <div className="lp-field">
                      <label htmlFor="lp-enterprise-state">Facility State</label>
                      <input id="lp-enterprise-state" value={enterpriseState} onChange={(e) => setEnterpriseState(e.target.value)} required />
                    </div>
                    <div className="lp-field">
                      <label htmlFor="lp-enterprise-capacity">Processing Capacity (Optional)</label>
                      <input id="lp-enterprise-capacity" type="number" min="0" value={enterpriseProcessingCapacity} onChange={(e) => setEnterpriseProcessingCapacity(e.target.value)} />
                    </div>
                  </>
                )}
                {selectedRole === 'consumer' && (
                  <>
                    <div className="lp-field">
                      <label htmlFor="lp-consumer-aadhaar">Aadhaar Number (Optional)</label>
                      <input id="lp-consumer-aadhaar" value={consumerAadhaarNumber} onChange={(e) => setConsumerAadhaarNumber(e.target.value)} />
                    </div>
                    <div className="lp-field">
                      <label htmlFor="lp-consumer-organic">Preference: Organic Only</label>
                      <select id="lp-consumer-organic" value={consumerOrganicOnly} onChange={(e) => setConsumerOrganicOnly(e.target.value === 'yes' ? 'yes' : 'no')}>
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    </div>
                    <div className="lp-field">
                      <label htmlFor="lp-consumer-regions">Preferred Regions (comma-separated, optional)</label>
                      <input id="lp-consumer-regions" value={consumerPreferredRegions} onChange={(e) => setConsumerPreferredRegions(e.target.value)} />
                    </div>
                  </>
                )}
                {selectedRole === 'secretary' && (
                  <>
                    <div className="lp-field">
                      <label htmlFor="lp-secretary-employee-id">Employee ID</label>
                      <input id="lp-secretary-employee-id" value={secretaryEmployeeId} onChange={(e) => setSecretaryEmployeeId(e.target.value)} required />
                    </div>
                    <div className="lp-field">
                      <label htmlFor="lp-secretary-department">Department</label>
                      <input id="lp-secretary-department" value={secretaryDepartment} onChange={(e) => setSecretaryDepartment(e.target.value)} required />
                    </div>
                    <div className="lp-field">
                      <label htmlFor="lp-secretary-id-type">Identity Document</label>
                      <select id="lp-secretary-id-type" value={secretaryIdType} onChange={(e) => {
                        const next = e.target.value === 'pan' ? 'pan' : 'aadhaar';
                        setSecretaryIdType(next);
                        setSecretaryIdNumber('');
                      }} required>
                        <option value="aadhaar">Aadhaar Number</option>
                        <option value="pan">PAN Number</option>
                      </select>
                    </div>
                    <div className="lp-field">
                      <label htmlFor="lp-secretary-id-number">{secretaryIdType === 'aadhaar' ? 'Aadhaar Number' : 'PAN Number'}</label>
                      <input id="lp-secretary-id-number" value={secretaryIdNumber} onChange={(e) => setSecretaryIdNumber(e.target.value)} required />
                    </div>
                    <div className="lp-field">
                      <label htmlFor="lp-secretary-jurisdiction-level">Jurisdiction Level</label>
                      <select id="lp-secretary-jurisdiction-level" value={secretaryJurisdictionLevel} onChange={(e) => {
                        const v = e.target.value;
                        setSecretaryJurisdictionLevel(v === 'state' || v === 'national' ? v : 'district');
                      }}>
                        <option value="district">District</option>
                        <option value="state">State</option>
                        <option value="national">National</option>
                      </select>
                    </div>
                    <div className="lp-field">
                      <label htmlFor="lp-secretary-jurisdiction-region">Jurisdiction Region</label>
                      <input id="lp-secretary-jurisdiction-region" value={secretaryJurisdictionRegion} onChange={(e) => setSecretaryJurisdictionRegion(e.target.value)} required />
                    </div>
                    <div className="lp-field">
                      <label htmlFor="lp-secretary-perm-approve">Permission: Approve Stakeholders</label>
                      <select id="lp-secretary-perm-approve" value={secretaryApproveStakeholders} onChange={(e) => setSecretaryApproveStakeholders(e.target.value === 'yes' ? 'yes' : 'no')}>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </div>
                    <div className="lp-field">
                      <label htmlFor="lp-secretary-perm-audit">Permission: Audit Access</label>
                      <select id="lp-secretary-perm-audit" value={secretaryAuditAccess} onChange={(e) => setSecretaryAuditAccess(e.target.value === 'yes' ? 'yes' : 'no')}>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </div>
                    <div className="lp-field">
                      <label htmlFor="lp-secretary-perm-compliance">Permission: Compliance Control</label>
                      <select id="lp-secretary-perm-compliance" value={secretaryComplianceControl} onChange={(e) => setSecretaryComplianceControl(e.target.value === 'yes' ? 'yes' : 'no')}>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </div>
                  </>
                )}
                <button type="submit" className="lp-submit-btn" disabled={!selectedRole || loading}>
                  {loading ? tAuth('authenticating') : tAuth('continueIdentity')}
                  {!loading && <UserFollow size={18} />}
                </button>
                <p className="lp-switch-text">
                  <button type="button" onClick={() => { setAuthMode('login'); setError(null); }}>
                    {tAuth('alreadyHaveAccount')}
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ── Supply Chain ────────────────────────────────────────────── */}
      <section id="supply-chain" className="lp-section" aria-labelledby="supply-chain-title">
        <div className="lp-section-inner">
          <div className="lp-section-hd">
            <span className="lp-overline">{t('chain_overline')}</span>
            <h2 id="supply-chain-title">{t('chain_title')}</h2>
            <p>{t('chain_desc')}</p>
          </div>

          <div className="lp-chain">
            {SUPPLY_CHAIN_STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.labelKey} className="lp-chain-card">
                  <div className="lp-chain-num" style={{ color: step.color }}>{String(i + 1).padStart(2, '0')}</div>
                  <div className="lp-chain-icon" style={{ background: `${step.color}14`, color: step.color }}>
                    <Icon size={24} />
                  </div>
                  <h3>{t(step.labelKey)}</h3>
                  <p>{t(step.descKey)}</p>
                  {i < SUPPLY_CHAIN_STEPS.length - 1 && (
                    <div className="lp-chain-arrow"><ArrowRight size={14} /></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────── */}
      <section id="features" className="lp-section lp-section--alt" aria-labelledby="features-title">
        <div className="lp-section-inner">
          <div className="lp-section-hd">
            <span className="lp-overline">{t('features_overline')}</span>
            <h2 id="features-title">{t('features_title')}</h2>
          </div>
          <div className="lp-features">
            {[
              { icon: Locked, title: t('feat_immutable_title'), desc: t('feat_immutable_desc'), c: '#3b82f6' },
              { icon: Security, title: t('feat_codex_title'), desc: t('feat_codex_desc'), c: '#22c55e' },
              { icon: Globe, title: t('feat_trace_title'), desc: t('feat_trace_desc'), c: '#a855f7' },
            ].map((f) => {
              const FIcon = f.icon;
              return (
                <div key={f.title} className="lp-feat-card">
                  <div className="lp-feat-icon" style={{ background: `${f.c}10`, color: f.c }}>
                    <FIcon size={22} />
                  </div>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────── */}
      <section className="lp-cta" aria-labelledby="cta-title">
        <div className="lp-cta-inner">
          <span className="lp-overline lp-overline--light">{t('cta_overline')}</span>
          <h2 id="cta-title">{t('cta_title')}</h2>
          <p>{t('cta_desc')}</p>
          <a href="#auth" className="lp-cta-btn">
            {t('hero_cta')}
            <ArrowRight size={18} aria-hidden="true" />
          </a>
        </div>
      </section>

      {/* ── Contact anchor ──────────────────────────────────────────── */}
      <div id="contact" aria-hidden="true" />
      </main>
    </div>
  );
}
