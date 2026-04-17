'use client';

import { useEffect, useState } from 'react';
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
import { usePathname } from 'next/navigation';
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
  const pathname = usePathname();
  const t  = useTranslations('Auth');
  const tr = useTranslations('Roles');
  const locale = pathname.split('/')[1] || 'en';

  const [mode, setMode]               = useState<'login' | 'signup' | 'kyc'>('login');
  const [selectedRole, setSelectedRole] = useState('');
  const [loading, setLoading]         = useState(false);
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
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
  const [demoFilled, setDemoFilled]   = useState(false);
  const [authError, setAuthError]     = useState<string | null>(null);
  const [authInfo, setAuthInfo] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (mode === 'signup' && !selectedRole) {
      setSelectedRole('farmer');
    }
  }, [mode, selectedRole]);

  const resolveRoleFromEmail = (value: string): string => {
    const found = Object.entries(DEMO_CREDENTIALS).find(([, creds]) => creds.email === value);
    return found ? found[0] : '';
  };

  const effectiveRole = selectedRole || resolveRoleFromEmail(email);

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

  const handleLogin = async () => {
    setAuthError(null);
    setAuthInfo(null);
    const roleForLogin = effectiveRole;
    if (!roleForLogin) {
      setAuthError('Please select a role before signing in.');
      return;
    }

    setLoading(true);
    try {
      await authApi.login(email, password, roleForLogin);
      window.location.assign(`/${locale}/dashboard/${roleForLogin}`);
    } catch (err) {
      setAuthError(err instanceof ApiError ? err.message : 'Login failed. Please try again.');
      setLoading(false);
    }
  };

  const handleLoginSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    void handleLogin();
  };

  const handleSignup = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthError(null);
    setAuthInfo(null);
    if (!selectedRole) {
      setAuthError('Please select a role before creating an account.');
      return;
    }
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

      await authApi.register({
        name: signupName,
        email: signupEmail,
        password: signupPassword,
        role: selectedRole,
        profile,
      });
      setAuthInfo('Account created. Please sign in and complete KYC verification if prompted.');
      setEmail(signupEmail);
      setPassword(signupPassword);
      setMode('login');
    } catch (err) {
      setAuthError(err instanceof ApiError ? err.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKYCSubmit = async () => {
    setAuthError(null);
    const roleForLogin = effectiveRole;
    if (!roleForLogin) {
      setAuthError('Please select a role before continuing verification.');
      return;
    }

    setLoading(true);
    try {
      await authApi.login(email, password, roleForLogin);
      window.location.assign(`/${locale}/dashboard/${roleForLogin}`);
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
              <form onSubmit={handleLoginSubmit} data-auth-hydrated={isHydrated ? 'true' : 'false'}>
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

                  {authInfo && (
                    <InlineNotification
                      kind="success"
                      title="Registration successful."
                      subtitle={authInfo}
                      onCloseButtonClick={() => setAuthInfo(null)}
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
                    type="button"
                    onClick={() => { void handleLogin(); }}
                    disabled={loading}
                    kind="primary"
                  >
                    {loading ? t('authenticating') : t('signIn')}
                  </Button>

                  <p className="text-sm text-center text-text-secondary">
                    {t('newToHoneyTrace')}{' '}
                    <button
                      type="button"
                      className="text-primary hover:underline font-bold"
                      onClick={() => {
                        if (!selectedRole) setSelectedRole('farmer');
                        setMode('signup');
                      }}
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
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                  />
                  <TextInput
                    id="email-signup"
                    labelText={t('emailAddress')}
                    placeholder="john@example.com"
                    size="lg"
                    required
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
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

                  {selectedRole === 'farmer' && (
                    <>
                      <Select
                        id="farmer-id-type"
                        labelText="Identity Document"
                        size="lg"
                        value={farmerIdType}
                        onChange={(e) => {
                          const next = e.target.value === 'pan' ? 'pan' : 'aadhaar';
                          setFarmerIdType(next);
                          setFarmerIdNumber('');
                        }}
                      >
                        <SelectItem value="aadhaar" text="Aadhaar Number" />
                        <SelectItem value="pan" text="PAN Number" />
                      </Select>

                      <TextInput
                        id="farmer-id-value"
                        labelText={farmerIdType === 'aadhaar' ? 'Aadhaar Number' : 'PAN Number'}
                        placeholder={farmerIdType === 'aadhaar' ? '12-digit Aadhaar' : 'ABCDE1234F'}
                        size="lg"
                        required
                        value={farmerIdNumber}
                        onChange={(e) => setFarmerIdNumber(e.target.value)}
                      />

                      <TextInput id="farmer-village" labelText="Village" size="lg" required value={farmerVillage} onChange={(e) => setFarmerVillage(e.target.value)} />
                      <TextInput id="farmer-district" labelText="District" size="lg" required value={farmerDistrict} onChange={(e) => setFarmerDistrict(e.target.value)} />
                      <TextInput id="farmer-state" labelText="State" size="lg" required value={farmerState} onChange={(e) => setFarmerState(e.target.value)} />
                      <TextInput id="farmer-kisan" labelText="Kisan Card (Optional)" size="lg" value={farmerKisanCard} onChange={(e) => setFarmerKisanCard(e.target.value)} />
                      <TextInput id="farmer-capacity" labelText="Honey Production Capacity (Optional)" size="lg" value={farmerCapacity} onChange={(e) => setFarmerCapacity(e.target.value)} />
                      <Select id="farmer-organic" labelText="Organic Certified" size="lg" value={farmerOrganicCertified} onChange={(e) => setFarmerOrganicCertified(e.target.value === 'yes' ? 'yes' : 'no')}>
                        <SelectItem value="no" text="No" />
                        <SelectItem value="yes" text="Yes" />
                      </Select>
                    </>
                  )}
                  {selectedRole === 'warehouse' && (
                    <>
                      <TextInput id="warehouse-name" labelText="Warehouse Name" size="lg" required value={warehouseName} onChange={(e) => setWarehouseName(e.target.value)} />
                      <TextInput id="warehouse-reg" labelText="Registration Number" size="lg" required value={warehouseRegistrationNo} onChange={(e) => setWarehouseRegistrationNo(e.target.value)} />

                      <Select
                        id="warehouse-id-type"
                        labelText="Identity Document"
                        size="lg"
                        value={warehouseIdType}
                        onChange={(e) => {
                          const next = e.target.value === 'pan' ? 'pan' : 'aadhaar';
                          setWarehouseIdType(next);
                          setWarehouseIdNumber('');
                        }}
                      >
                        <SelectItem value="aadhaar" text="Aadhaar Number" />
                        <SelectItem value="pan" text="PAN Number" />
                      </Select>

                      <TextInput
                        id="warehouse-id-value"
                        labelText={warehouseIdType === 'aadhaar' ? 'Aadhaar Number' : 'PAN Number'}
                        placeholder={warehouseIdType === 'aadhaar' ? '12-digit Aadhaar' : 'ABCDE1234F'}
                        size="lg"
                        required
                        value={warehouseIdNumber}
                        onChange={(e) => setWarehouseIdNumber(e.target.value)}
                      />

                      <TextInput id="warehouse-address" labelText="Address" size="lg" required value={warehouseAddress} onChange={(e) => setWarehouseAddress(e.target.value)} />
                      <TextInput id="warehouse-city" labelText="City" size="lg" required value={warehouseCity} onChange={(e) => setWarehouseCity(e.target.value)} />
                      <TextInput id="warehouse-state" labelText="State" size="lg" required value={warehouseState} onChange={(e) => setWarehouseState(e.target.value)} />
                      <TextInput id="warehouse-pincode" labelText="Pincode" size="lg" required value={warehousePincode} onChange={(e) => setWarehousePincode(e.target.value)} />
                      <TextInput id="warehouse-storage" labelText="Storage Capacity" size="lg" required value={warehouseStorageCapacity} onChange={(e) => setWarehouseStorageCapacity(e.target.value)} />
                      <TextInput id="warehouse-utilization" labelText="Current Utilization (Optional)" size="lg" value={warehouseCurrentUtilization} onChange={(e) => setWarehouseCurrentUtilization(e.target.value)} />
                      <Select id="warehouse-temp" labelText="Temperature Controlled" size="lg" value={warehouseTemperatureControlled} onChange={(e) => setWarehouseTemperatureControlled(e.target.value === 'yes' ? 'yes' : 'no')}>
                        <SelectItem value="no" text="No" />
                        <SelectItem value="yes" text="Yes" />
                      </Select>
                      <Select id="warehouse-humidity" labelText="Humidity Control" size="lg" value={warehouseHumidityControl} onChange={(e) => setWarehouseHumidityControl(e.target.value === 'yes' ? 'yes' : 'no')}>
                        <SelectItem value="no" text="No" />
                        <SelectItem value="yes" text="Yes" />
                      </Select>
                    </>
                  )}
                  {selectedRole === 'lab' && (
                    <>
                      <TextInput id="lab-name" labelText="Lab Name" size="lg" required value={labName} onChange={(e) => setLabName(e.target.value)} />
                      <TextInput id="lab-fssai" labelText="FSSAI Lab Number" size="lg" required value={labFssaiNumber} onChange={(e) => setLabFssaiNumber(e.target.value)} />

                      <Select
                        id="lab-id-type"
                        labelText="Identity Document"
                        size="lg"
                        value={labIdType}
                        onChange={(e) => {
                          const next = e.target.value === 'pan' ? 'pan' : 'aadhaar';
                          setLabIdType(next);
                          setLabIdNumber('');
                        }}
                      >
                        <SelectItem value="aadhaar" text="Aadhaar Number" />
                        <SelectItem value="pan" text="PAN Number" />
                      </Select>
                      <TextInput
                        id="lab-id-value"
                        labelText={labIdType === 'aadhaar' ? 'Aadhaar Number' : 'PAN Number'}
                        placeholder={labIdType === 'aadhaar' ? '12-digit Aadhaar' : 'ABCDE1234F'}
                        size="lg"
                        required
                        value={labIdNumber}
                        onChange={(e) => setLabIdNumber(e.target.value)}
                      />
                      <TextInput id="lab-certs" labelText="Certifications (comma-separated)" size="lg" value={labCertifications} onChange={(e) => setLabCertifications(e.target.value)} />
                      <Select id="lab-purity" labelText="Purity Test Capability" size="lg" value={labPurityTest} onChange={(e) => setLabPurityTest(e.target.value === 'yes' ? 'yes' : 'no')}>
                        <SelectItem value="yes" text="Yes" />
                        <SelectItem value="no" text="No" />
                      </Select>
                      <Select id="lab-adulteration" labelText="Adulteration Test Capability" size="lg" value={labAdulterationTest} onChange={(e) => setLabAdulterationTest(e.target.value === 'yes' ? 'yes' : 'no')}>
                        <SelectItem value="yes" text="Yes" />
                        <SelectItem value="no" text="No" />
                      </Select>
                      <Select id="lab-moisture" labelText="Moisture Test Capability" size="lg" value={labMoistureTest} onChange={(e) => setLabMoistureTest(e.target.value === 'yes' ? 'yes' : 'no')}>
                        <SelectItem value="yes" text="Yes" />
                        <SelectItem value="no" text="No" />
                      </Select>
                      <TextInput id="lab-address" labelText="Address" size="lg" required value={labAddress} onChange={(e) => setLabAddress(e.target.value)} />
                      <TextInput id="lab-city" labelText="City" size="lg" required value={labCity} onChange={(e) => setLabCity(e.target.value)} />
                      <TextInput id="lab-state" labelText="State" size="lg" required value={labState} onChange={(e) => setLabState(e.target.value)} />
                    </>
                  )}
                  {selectedRole === 'officer' && (
                    <>
                      <TextInput id="officer-employee-id" labelText="Employee ID" size="lg" required value={officerEmployeeId} onChange={(e) => setOfficerEmployeeId(e.target.value)} />
                      <TextInput id="officer-department" labelText="Department" size="lg" required value={officerDepartment} onChange={(e) => setOfficerDepartment(e.target.value)} />
                      <Select
                        id="officer-id-type"
                        labelText="Identity Document"
                        size="lg"
                        value={officerIdType}
                        onChange={(e) => {
                          const next = e.target.value === 'pan' ? 'pan' : 'aadhaar';
                          setOfficerIdType(next);
                          setOfficerIdNumber('');
                        }}
                      >
                        <SelectItem value="aadhaar" text="Aadhaar Number" />
                        <SelectItem value="pan" text="PAN Number" />
                      </Select>
                      <TextInput
                        id="officer-id-value"
                        labelText={officerIdType === 'aadhaar' ? 'Aadhaar Number' : 'PAN Number'}
                        placeholder={officerIdType === 'aadhaar' ? '12-digit Aadhaar' : 'ABCDE1234F'}
                        size="lg"
                        required
                        value={officerIdNumber}
                        onChange={(e) => setOfficerIdNumber(e.target.value)}
                      />
                      <Select id="officer-authority" labelText="Authority Level" size="lg" value={officerAuthorityLevel} onChange={(e) => {
                        const v = e.target.value;
                        setOfficerAuthorityLevel(v === 'state' || v === 'national' ? v : 'regional');
                      }}>
                        <SelectItem value="regional" text="Regional" />
                        <SelectItem value="state" text="State" />
                        <SelectItem value="national" text="National" />
                      </Select>
                      <TextInput id="officer-lab-affiliation" labelText="Lab Affiliation (Optional)" size="lg" value={officerLabAffiliation} onChange={(e) => setOfficerLabAffiliation(e.target.value)} />
                    </>
                  )}
                  {selectedRole === 'enterprise' && (
                    <>
                      <TextInput id="enterprise-company" labelText="Company Name" size="lg" required value={enterpriseCompanyName} onChange={(e) => setEnterpriseCompanyName(e.target.value)} />
                      <TextInput id="enterprise-pan" labelText="Company PAN" size="lg" required value={enterpriseCompanyPan} onChange={(e) => setEnterpriseCompanyPan(e.target.value)} />
                      <TextInput id="enterprise-gst" labelText="GST Number" size="lg" required value={enterpriseGstNumber} onChange={(e) => setEnterpriseGstNumber(e.target.value)} />
                      <TextInput id="enterprise-fssai" labelText="FSSAI License" size="lg" required value={enterpriseFssaiLicense} onChange={(e) => setEnterpriseFssaiLicense(e.target.value)} />
                      <Select id="enterprise-business-type" labelText="Business Type" size="lg" value={enterpriseBusinessType} onChange={(e) => {
                        const v = e.target.value;
                        setEnterpriseBusinessType(v === 'processor' || v === 'exporter' ? v : 'buyer');
                      }}>
                        <SelectItem value="buyer" text="Buyer" />
                        <SelectItem value="processor" text="Processor" />
                        <SelectItem value="exporter" text="Exporter" />
                      </Select>
                      <TextInput id="enterprise-contact-name" labelText="Contact Person Name" size="lg" required value={enterpriseContactName} onChange={(e) => setEnterpriseContactName(e.target.value)} />
                      <TextInput id="enterprise-contact-designation" labelText="Contact Person Designation" size="lg" required value={enterpriseContactDesignation} onChange={(e) => setEnterpriseContactDesignation(e.target.value)} />
                      <TextInput id="enterprise-address" labelText="Facility Address" size="lg" required value={enterpriseAddress} onChange={(e) => setEnterpriseAddress(e.target.value)} />
                      <TextInput id="enterprise-city" labelText="Facility City" size="lg" required value={enterpriseCity} onChange={(e) => setEnterpriseCity(e.target.value)} />
                      <TextInput id="enterprise-state" labelText="Facility State" size="lg" required value={enterpriseState} onChange={(e) => setEnterpriseState(e.target.value)} />
                      <TextInput id="enterprise-capacity" labelText="Processing Capacity (Optional)" size="lg" value={enterpriseProcessingCapacity} onChange={(e) => setEnterpriseProcessingCapacity(e.target.value)} />
                    </>
                  )}
                  {selectedRole === 'consumer' && (
                    <>
                      <TextInput id="consumer-aadhaar" labelText="Aadhaar Number (Optional)" size="lg" value={consumerAadhaarNumber} onChange={(e) => setConsumerAadhaarNumber(e.target.value)} />
                      <Select id="consumer-organic-only" labelText="Preference: Organic Only" size="lg" value={consumerOrganicOnly} onChange={(e) => setConsumerOrganicOnly(e.target.value === 'yes' ? 'yes' : 'no')}>
                        <SelectItem value="no" text="No" />
                        <SelectItem value="yes" text="Yes" />
                      </Select>
                      <TextInput id="consumer-preferred-regions" labelText="Preferred Regions (comma-separated, optional)" size="lg" value={consumerPreferredRegions} onChange={(e) => setConsumerPreferredRegions(e.target.value)} />
                    </>
                  )}
                  {selectedRole === 'secretary' && (
                    <>
                      <TextInput id="secretary-employee-id" labelText="Employee ID" size="lg" required value={secretaryEmployeeId} onChange={(e) => setSecretaryEmployeeId(e.target.value)} />
                      <TextInput id="secretary-department" labelText="Department" size="lg" required value={secretaryDepartment} onChange={(e) => setSecretaryDepartment(e.target.value)} />
                      <Select id="secretary-id-type" labelText="Identity Document" size="lg" value={secretaryIdType} onChange={(e) => {
                        const next = e.target.value === 'pan' ? 'pan' : 'aadhaar';
                        setSecretaryIdType(next);
                        setSecretaryIdNumber('');
                      }}>
                        <SelectItem value="aadhaar" text="Aadhaar Number" />
                        <SelectItem value="pan" text="PAN Number" />
                      </Select>
                      <TextInput id="secretary-id-number" labelText={secretaryIdType === 'aadhaar' ? 'Aadhaar Number' : 'PAN Number'} size="lg" required value={secretaryIdNumber} onChange={(e) => setSecretaryIdNumber(e.target.value)} />
                      <Select id="secretary-jurisdiction-level" labelText="Jurisdiction Level" size="lg" value={secretaryJurisdictionLevel} onChange={(e) => {
                        const v = e.target.value;
                        setSecretaryJurisdictionLevel(v === 'state' || v === 'national' ? v : 'district');
                      }}>
                        <SelectItem value="district" text="District" />
                        <SelectItem value="state" text="State" />
                        <SelectItem value="national" text="National" />
                      </Select>
                      <TextInput id="secretary-jurisdiction-region" labelText="Jurisdiction Region" size="lg" required value={secretaryJurisdictionRegion} onChange={(e) => setSecretaryJurisdictionRegion(e.target.value)} />
                      <Select id="secretary-perm-approve" labelText="Permission: Approve Stakeholders" size="lg" value={secretaryApproveStakeholders} onChange={(e) => setSecretaryApproveStakeholders(e.target.value === 'yes' ? 'yes' : 'no')}>
                        <SelectItem value="yes" text="Yes" />
                        <SelectItem value="no" text="No" />
                      </Select>
                      <Select id="secretary-perm-audit" labelText="Permission: Audit Access" size="lg" value={secretaryAuditAccess} onChange={(e) => setSecretaryAuditAccess(e.target.value === 'yes' ? 'yes' : 'no')}>
                        <SelectItem value="yes" text="Yes" />
                        <SelectItem value="no" text="No" />
                      </Select>
                      <Select id="secretary-perm-compliance" labelText="Permission: Compliance Control" size="lg" value={secretaryComplianceControl} onChange={(e) => setSecretaryComplianceControl(e.target.value === 'yes' ? 'yes' : 'no')}>
                        <SelectItem value="yes" text="Yes" />
                        <SelectItem value="no" text="No" />
                      </Select>
                    </>
                  )}

                  <Button
                    className="w-full flex justify-center !min-w-full"
                    size="lg"
                    renderIcon={UserFollow}
                    type="submit"
                    disabled={!selectedRole || loading}
                  >
                    {loading ? t('authenticating') : t('continueIdentity')}
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
