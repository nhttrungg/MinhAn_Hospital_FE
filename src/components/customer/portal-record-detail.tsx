import { EncounterDetail } from "@/components/admin/encounter-detail";
import { OnlineMedicationOrder } from "./online-medication-order";
import { PortalRecordEngagement } from "./portal-record-engagement";
export function PortalRecordDetail({ id }: { id: number }) {
  return (
    <div className="space-y-5">
      <EncounterDetail id={id} portal />
      <OnlineMedicationOrder encounterId={id} />
      <PortalRecordEngagement id={id} />
    </div>
  );
}
