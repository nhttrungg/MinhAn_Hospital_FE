"use client";
import { useState } from "react";
import { BillingWorkspace } from "@/components/admin/billing-workspace";
import { FamilyPatientFilter } from "./family-patient-filter";

export function PortalInvoices() {
  const [patientId, setPatientId] = useState(0);
  return (
    <div className="space-y-4">
      <FamilyPatientFilter value={patientId} onChange={setPatientId} />
      <BillingWorkspace key={patientId} portal patientId={patientId} />
    </div>
  );
}
