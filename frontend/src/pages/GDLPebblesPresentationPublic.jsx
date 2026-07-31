import EmailGate from "../components/EmailGate";
import GDLPebblesPresentation from "./GDLPebblesPresentation";

export default function GDLPebblesPresentationPublic() {
  return (
    <EmailGate proposalSlug="gdl-pebbles" proposalTitle="GDL × Pebbles — Strategic Assessment">
      <GDLPebblesPresentation />
    </EmailGate>
  );
}
