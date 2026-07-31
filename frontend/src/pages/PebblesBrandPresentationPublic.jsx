import EmailGate from "../components/EmailGate";
import PebblesBrandPresentation from "./PebblesBrandPresentation";

export default function PebblesBrandPresentationPublic() {
  return (
    <EmailGate proposalSlug="pebbles-brand" proposalTitle="Pebbles — Brand Identity & Vision">
      <PebblesBrandPresentation />
    </EmailGate>
  );
}
