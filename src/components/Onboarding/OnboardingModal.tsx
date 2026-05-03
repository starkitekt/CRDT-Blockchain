'use client';

import { useState } from 'react';
import {
  ComposedModal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  TextInput,
  Select,
  SelectItem,
  Stack,
  InlineNotification,
  Toggle,
} from '@carbon/react';

interface OnboardingModalProps {
  role: string;
  userName?: string;
  onComplete: () => void;
}

export default function OnboardingModal({ role, userName, onComplete }: OnboardingModalProps) {
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [step, setStep]         = useState(1);

  // Shared identity
  const [idType, setIdType]     = useState<'aadhaar' | 'pan'>('aadhaar');
  const [idNumber, setIdNumber] = useState('');

  // Farmer
  const [kisanCard, setKisanCard]         = useState('');
  const [village, setVillage]             = useState('');
  const [district, setDistrict]           = useState('');
  const [farmerState, setFarmerState]     = useState('');
  const [capacity, setCapacity]           = useState('');
  const [organicCertified, setOrganicCertified] = useState(false);

  // Warehouse
  const [warehouseName, setWarehouseName]   = useState('');
  const [regNumber, setRegNumber]           = useState('');
  const [address, setAddress]               = useState('');
  const [city, setCity]                     = useState('');
  const [locationState, setLocationState]   = useState('');
  const [pincode, setPincode]               = useState('');
  const [storageCapacity, setStorageCapacity] = useState('');
  const [currentUtilization, setCurrentUtilization] = useState('');
  const [tempControlled, setTempControlled] = useState(false);
  const [humidityControl, setHumidityControl] = useState(false);

  // Lab
  const [labName, setLabName]           = useState('');
  const [fssaiLabNo, setFssaiLabNo]     = useState('');
  const [certifications, setCertifications] = useState('');
  const [purityTest, setPurityTest]     = useState(true);
  const [adulterationTest, setAdulterationTest] = useState(true);
  const [moistureTest, setMoistureTest] = useState(true);
  const [labAddress, setLabAddress]     = useState('');
  const [labCity, setLabCity]           = useState('');
  const [labState, setLabState]         = useState('');

  // Officer
  const [employeeId, setEmployeeId]             = useState('');
  const [department, setDepartment]             = useState('');
  const [authorityLevel, setAuthorityLevel]     = useState<'regional' | 'state' | 'national'>('regional');
  const [labAffiliation, setLabAffiliation]     = useState('');

  // Enterprise
  const [companyName, setCompanyName]     = useState('');
  const [gstNumber, setGstNumber]         = useState('');
  const [fssaiLicense, setFssaiLicense]   = useState('');
  const [companyPan, setCompanyPan]       = useState('');
  const [businessType, setBusinessType]   = useState<'buyer' | 'processor' | 'exporter'>('buyer');
  const [contactName, setContactName]     = useState('');
  const [contactDesignation, setContactDesignation] = useState('');
  const [facilityAddress, setFacilityAddress] = useState('');
  const [facilityCity, setFacilityCity]   = useState('');
  const [facilityState, setFacilityState] = useState('');
  const [processingCapacity, setProcessingCapacity] = useState('');

  // Secretary
  const [secEmployeeId, setSecEmployeeId]       = useState('');
  const [secDepartment, setSecDepartment]       = useState('');
  const [jurisdictionLevel, setJurisdictionLevel] = useState<'district' | 'state' | 'national'>('district');
  const [jurisdictionRegion, setJurisdictionRegion] = useState('');
  const [approveStakeholders, setApproveStakeholders] = useState(true);
  const [auditAccess, setAuditAccess]           = useState(true);
  const [complianceControl, setComplianceControl] = useState(true);

  // Consumer
  const [consumerAadhaar, setConsumerAadhaar]   = useState('');
  const [organicOnly, setOrganicOnly]           = useState(false);
  const [preferredRegions, setPreferredRegions] = useState('');

  const totalSteps = ['farmer', 'warehouse', 'lab', 'enterprise'].includes(role) ? 2 : 1;

  const buildPayload = () => {
    if (role === 'farmer') return {
      aadhaarNumber: idType === 'aadhaar' ? idNumber : undefined,
      panNumber:     idType === 'pan'     ? idNumber.toUpperCase() : undefined,
      kisanCard:     kisanCard || undefined,
      farmLocation:  { village, district, state: farmerState },
      honeyProductionCapacity: capacity ? Number(capacity) : undefined,
      organicCertified,
    };
    if (role === 'warehouse') return {
      warehouseName,
      registrationNumber: regNumber,
      aadhaarNumber: idType === 'aadhaar' ? idNumber : undefined,
      panNumber:     idType === 'pan'     ? idNumber.toUpperCase() : undefined,
      location: { address, city, state: locationState, pincode },
      storageCapacity:    storageCapacity ? Number(storageCapacity) : undefined,
      currentUtilization: currentUtilization ? Number(currentUtilization) : undefined,
      temperatureControlled: tempControlled,
      humidityControl,
    };
    if (role === 'lab') return {
      labName,
      fssaiLabNumber: fssaiLabNo,
      aadhaarNumber:  idType === 'aadhaar' ? idNumber : undefined,
      panNumber:      idType === 'pan'     ? idNumber.toUpperCase() : undefined,
      certifications: certifications.split(',').map(s => s.trim()).filter(Boolean),
      testingCapabilities: { purityTest, adulterationTest, moistureTest },
      location: { address: labAddress, city: labCity, state: labState },
    };
    if (role === 'officer') return {
      employeeId,
      department,
      aadhaarNumber: idType === 'aadhaar' ? idNumber : undefined,
      panNumber:     idType === 'pan'     ? idNumber.toUpperCase() : undefined,
      authorityLevel,
      labAffiliation: labAffiliation || undefined,
    };
    if (role === 'enterprise') return {
      companyName,
      gstNumber,
      fssaiLicense,
      companyPan: companyPan.toUpperCase(),
      businessType,
      contactPerson: { name: contactName, designation: contactDesignation },
      facilityLocation: { address: facilityAddress, city: facilityCity, state: facilityState },
      processingCapacity: processingCapacity ? Number(processingCapacity) : undefined,
    };
    if (role === 'secretary') return {
      employeeId:    secEmployeeId,
      department:    secDepartment,
      aadhaarNumber: idType === 'aadhaar' ? idNumber : undefined,
      panNumber:     idType === 'pan'     ? idNumber.toUpperCase() : undefined,
      jurisdiction:  { level: jurisdictionLevel, region: jurisdictionRegion },
      permissions:   { approveStakeholders, auditAccess, complianceControl },
    };
    if (role === 'consumer') return {
      aadhaarNumber: consumerAadhaar || undefined,
      preferences:   { organicOnly, preferredRegions: preferredRegions.split(',').map(s => s.trim()).filter(Boolean) },
    };
    return {};
  };

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/onboarding', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(buildPayload()),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setError(data.error ?? 'Submission failed'); return; }
      onComplete();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Inline identity fields — never extracted as a component to avoid remount-on-render focus loss
  const identitySelect = (
    <Select id="ob-id-type" labelText="Identity Document" size="lg" value={idType}
      onChange={(e) => { setIdType(e.target.value === 'pan' ? 'pan' : 'aadhaar'); setIdNumber(''); }}>
      <SelectItem value="aadhaar" text="Aadhaar Number" />
      <SelectItem value="pan"     text="PAN Number" />
    </Select>
  );
  const identityInput = (
    <TextInput id="ob-id-number" size="lg" required
      labelText={idType === 'aadhaar' ? 'Aadhaar Number' : 'PAN Number'}
      placeholder={idType === 'aadhaar' ? '12-digit Aadhaar' : 'ABCDE1234F'}
      value={idNumber} onChange={(e) => setIdNumber(e.target.value)} />
  );

  const renderStep = () => {
    if (role === 'farmer') {
      if (step === 1) return (
        <Stack gap={5}>
          {identitySelect}{identityInput}
          <TextInput id="ob-kisan" size="lg" labelText="Kisan Card (Optional)" value={kisanCard} onChange={(e) => setKisanCard(e.target.value)} />
        </Stack>
      );
      return (
        <Stack gap={5}>
          <TextInput id="ob-village"  size="lg" required labelText="Village"  value={village}     onChange={(e) => setVillage(e.target.value)} />
          <TextInput id="ob-district" size="lg" required labelText="District" value={district}    onChange={(e) => setDistrict(e.target.value)} />
          <TextInput id="ob-state"    size="lg" required labelText="State"    value={farmerState} onChange={(e) => setFarmerState(e.target.value)} />
          <TextInput id="ob-capacity" size="lg" labelText="Honey Production Capacity (kg, optional)" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
          <Toggle id="ob-organic" labelText="Organic Certified" labelA="No" labelB="Yes" toggled={organicCertified} onToggle={setOrganicCertified} />
        </Stack>
      );
    }
    if (role === 'warehouse') {
      if (step === 1) return (
        <Stack gap={5}>
          <TextInput id="ob-wh-name" size="lg" required labelText="Warehouse Name" value={warehouseName} onChange={(e) => setWarehouseName(e.target.value)} />
          <TextInput id="ob-wh-reg"  size="lg" required labelText="Registration / WDRA License Number" value={regNumber} onChange={(e) => setRegNumber(e.target.value)} />
          {identitySelect}{identityInput}
        </Stack>
      );
      return (
        <Stack gap={5}>
          <TextInput id="ob-wh-addr"    size="lg" required labelText="Address"                       value={address}            onChange={(e) => setAddress(e.target.value)} />
          <TextInput id="ob-wh-city"    size="lg" required labelText="City"                          value={city}               onChange={(e) => setCity(e.target.value)} />
          <TextInput id="ob-wh-state"   size="lg" required labelText="State"                         value={locationState}      onChange={(e) => setLocationState(e.target.value)} />
          <TextInput id="ob-wh-pin"     size="lg" required labelText="Pincode"                       value={pincode}            onChange={(e) => setPincode(e.target.value)} />
          <TextInput id="ob-wh-storage" size="lg" required labelText="Storage Capacity (kg)"         value={storageCapacity}    onChange={(e) => setStorageCapacity(e.target.value)} />
          <TextInput id="ob-wh-util"    size="lg"          labelText="Current Utilization % (optional)" value={currentUtilization} onChange={(e) => setCurrentUtilization(e.target.value)} />
          <Toggle id="ob-wh-temp"     labelText="Temperature Controlled" labelA="No" labelB="Yes" toggled={tempControlled}  onToggle={setTempControlled} />
          <Toggle id="ob-wh-humidity" labelText="Humidity Control"       labelA="No" labelB="Yes" toggled={humidityControl} onToggle={setHumidityControl} />
        </Stack>
      );
    }
    if (role === 'lab') {
      if (step === 1) return (
        <Stack gap={5}>
          <TextInput id="ob-lab-name"  size="lg" required labelText="Lab Name"         value={labName}   onChange={(e) => setLabName(e.target.value)} />
          <TextInput id="ob-lab-fssai" size="lg" required labelText="FSSAI Lab Number" value={fssaiLabNo} onChange={(e) => setFssaiLabNo(e.target.value)} />
          {identitySelect}{identityInput}
          <TextInput id="ob-lab-certs" size="lg" labelText="Certifications (comma-separated, optional)" value={certifications} onChange={(e) => setCertifications(e.target.value)} />
        </Stack>
      );
      return (
        <Stack gap={5}>
          <p className="text-sm font-semibold text-text-primary">Testing Capabilities</p>
          <Toggle id="ob-purity"       labelText="Purity Test"       labelA="No" labelB="Yes" toggled={purityTest}       onToggle={setPurityTest} />
          <Toggle id="ob-adulteration" labelText="Adulteration Test" labelA="No" labelB="Yes" toggled={adulterationTest} onToggle={setAdulterationTest} />
          <Toggle id="ob-moisture"     labelText="Moisture Test"     labelA="No" labelB="Yes" toggled={moistureTest}     onToggle={setMoistureTest} />
          <TextInput id="ob-lab-addr"  size="lg" required labelText="Address" value={labAddress} onChange={(e) => setLabAddress(e.target.value)} />
          <TextInput id="ob-lab-city"  size="lg" required labelText="City"    value={labCity}    onChange={(e) => setLabCity(e.target.value)} />
          <TextInput id="ob-lab-state" size="lg" required labelText="State"   value={labState}   onChange={(e) => setLabState(e.target.value)} />
        </Stack>
      );
    }
    if (role === 'officer') return (
      <Stack gap={5}>
        <TextInput id="ob-off-emp"  size="lg" required labelText="Employee ID" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} />
        <TextInput id="ob-off-dept" size="lg" required labelText="Department"  value={department} onChange={(e) => setDepartment(e.target.value)} />
        {identitySelect}{identityInput}
        <Select id="ob-off-auth" size="lg" labelText="Authority Level" value={authorityLevel}
          onChange={(e) => { const v = e.target.value; setAuthorityLevel(v === 'state' || v === 'national' ? v : 'regional'); }}>
          <SelectItem value="regional" text="Regional" />
          <SelectItem value="state"    text="State" />
          <SelectItem value="national" text="National" />
        </Select>
        <TextInput id="ob-off-lab" size="lg" labelText="Lab Affiliation (optional)" value={labAffiliation} onChange={(e) => setLabAffiliation(e.target.value)} />
      </Stack>
    );
    if (role === 'enterprise') {
      if (step === 1) return (
        <Stack gap={5}>
          <TextInput id="ob-ent-name"  size="lg" required labelText="Company Name"  value={companyName}  onChange={(e) => setCompanyName(e.target.value)} />
          <TextInput id="ob-ent-gst"   size="lg" required labelText="GST Number"    value={gstNumber}    onChange={(e) => setGstNumber(e.target.value)} />
          <TextInput id="ob-ent-fssai" size="lg" required labelText="FSSAI License" value={fssaiLicense} onChange={(e) => setFssaiLicense(e.target.value)} />
          <TextInput id="ob-ent-pan"   size="lg" required labelText="Company PAN"   value={companyPan}   onChange={(e) => setCompanyPan(e.target.value)} />
          <Select id="ob-ent-type" size="lg" labelText="Business Type" value={businessType}
            onChange={(e) => { const v = e.target.value; setBusinessType(v === 'processor' || v === 'exporter' ? v : 'buyer'); }}>
            <SelectItem value="buyer"     text="Buyer" />
            <SelectItem value="processor" text="Processor" />
            <SelectItem value="exporter"  text="Exporter" />
          </Select>
        </Stack>
      );
      return (
        <Stack gap={5}>
          <TextInput id="ob-ent-cname"  size="lg" required labelText="Contact Person Name"        value={contactName}        onChange={(e) => setContactName(e.target.value)} />
          <TextInput id="ob-ent-cdesig" size="lg" required labelText="Contact Person Designation" value={contactDesignation} onChange={(e) => setContactDesignation(e.target.value)} />
          <TextInput id="ob-ent-faddr"  size="lg" required labelText="Facility Address"           value={facilityAddress}    onChange={(e) => setFacilityAddress(e.target.value)} />
          <TextInput id="ob-ent-fcity"  size="lg" required labelText="Facility City"              value={facilityCity}       onChange={(e) => setFacilityCity(e.target.value)} />
          <TextInput id="ob-ent-fstate" size="lg" required labelText="Facility State"             value={facilityState}      onChange={(e) => setFacilityState(e.target.value)} />
          <TextInput id="ob-ent-proc"   size="lg"          labelText="Processing Capacity (optional)" value={processingCapacity} onChange={(e) => setProcessingCapacity(e.target.value)} />
        </Stack>
      );
    }
    if (role === 'secretary') return (
      <Stack gap={5}>
        <TextInput id="ob-sec-emp"  size="lg" required labelText="Employee ID" value={secEmployeeId} onChange={(e) => setSecEmployeeId(e.target.value)} />
        <TextInput id="ob-sec-dept" size="lg" required labelText="Department"  value={secDepartment} onChange={(e) => setSecDepartment(e.target.value)} />
        {identitySelect}{identityInput}
        <Select id="ob-sec-jlevel" size="lg" labelText="Jurisdiction Level" value={jurisdictionLevel}
          onChange={(e) => { const v = e.target.value; setJurisdictionLevel(v === 'state' || v === 'national' ? v : 'district'); }}>
          <SelectItem value="district" text="District" />
          <SelectItem value="state"    text="State" />
          <SelectItem value="national" text="National" />
        </Select>
        <TextInput id="ob-sec-jregion" size="lg" required labelText="Jurisdiction Region" value={jurisdictionRegion} onChange={(e) => setJurisdictionRegion(e.target.value)} />
        <Toggle id="ob-sec-approve"    labelText="Approve Stakeholders" labelA="No" labelB="Yes" toggled={approveStakeholders} onToggle={setApproveStakeholders} />
        <Toggle id="ob-sec-audit"      labelText="Audit Access"         labelA="No" labelB="Yes" toggled={auditAccess}         onToggle={setAuditAccess} />
        <Toggle id="ob-sec-compliance" labelText="Compliance Control"   labelA="No" labelB="Yes" toggled={complianceControl}   onToggle={setComplianceControl} />
      </Stack>
    );
    if (role === 'consumer') return (
      <Stack gap={5}>
        <TextInput id="ob-con-aadhaar" size="lg" labelText="Aadhaar Number (optional)" value={consumerAadhaar} onChange={(e) => setConsumerAadhaar(e.target.value)} />
        <Toggle id="ob-con-organic" labelText="Preference: Organic Only" labelA="No" labelB="Yes" toggled={organicOnly} onToggle={setOrganicOnly} />
        <TextInput id="ob-con-regions" size="lg" labelText="Preferred Regions (comma-separated, optional)" value={preferredRegions} onChange={(e) => setPreferredRegions(e.target.value)} />
      </Stack>
    );
    return null;
  };

  const ROLE_LABELS: Record<string, string> = {
    farmer:     'Farmer',
    warehouse:  'Warehouse Operator',
    lab:        'Laboratory',
    officer:    'Quality Officer',
    enterprise: 'Enterprise',
    secretary:  'Government Secretary',
    consumer:   'Consumer',
  };

  return (
    <ComposedModal open preventCloseOnClickOutside size="md">
      <ModalHeader
        title={`Complete Your Profile — ${ROLE_LABELS[role] ?? role}`}
        label={userName ? `Welcome, ${userName}` : 'One-time setup'}
        closeModal={() => {}}
      />
      <ModalBody hasScrollingContent style={{ maxHeight: '60vh', overflowY: 'auto', paddingBottom: '1rem' }}>
        <Stack gap={6}>
          <p className="text-sm text-text-secondary">
            Please fill in the details below to activate your account. This is a one-time step.
          </p>

          {totalSteps > 1 && (
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              {Array.from({ length: totalSteps }, (_, i) => (
                <span key={i} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                  ${i + 1 === step ? 'bg-primary text-white' : i + 1 < step ? 'bg-success text-white' : 'bg-layer-02 text-text-secondary'}`}>
                  {i + 1}
                </span>
              ))}
              <span className="ml-1">Step {step} of {totalSteps}</span>
            </div>
          )}

          {error && (
            <InlineNotification kind="error" title="Error" subtitle={error}
              onCloseButtonClick={() => setError(null)} lowContrast />
          )}

          {renderStep()}
        </Stack>
      </ModalBody>
      <ModalFooter>
        {step > 1 && (
          <Button kind="secondary" onClick={() => setStep(s => s - 1)} disabled={loading}>
            Back
          </Button>
        )}
        {step < totalSteps ? (
          <Button kind="primary" onClick={() => setStep(s => s + 1)}>
            Next
          </Button>
        ) : (
          <Button kind="primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Submitting…' : 'Submit & Continue'}
          </Button>
        )}
      </ModalFooter>
    </ComposedModal>
  );
}
