import EmailGate from "../components/EmailGate";
import SagicorProgressDashboard from "./SagicorProgressDashboard";

export default function SagicorProgressDashboardPublic() {
  return (
    <EmailGate proposalSlug="sagicor-progress" proposalTitle="Sagicor Progress Dashboard">
      <SagicorProgressDashboard />
    </EmailGate>
  );
}
