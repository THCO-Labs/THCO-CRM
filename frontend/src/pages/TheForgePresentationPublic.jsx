import EmailGate from "../components/EmailGate";
import TheForgePresentation from "./TheForgePresentation";

export default function TheForgePresentationPublic() {
  return (
    <EmailGate proposalSlug="the-forge" proposalTitle="THE FORGE — Fire and Memory">
      <TheForgePresentation />
    </EmailGate>
  );
}
