import EmailGate from '../components/EmailGate';
import MobileWrapper from '../components/MobileWrapper';
import ProcureAIExecutivePackV3 from './ProcureAIExecutivePackV3';

const ProcureAIExecutivePackV3Public = () => {
  return (
    <EmailGate 
      proposalSlug="procure-ai-executive-v3" 
      proposalTitle="Executive Pack V3 - IHS Towers"
    >
      <MobileWrapper presentationTitle="Executive Pack V3">
        <ProcureAIExecutivePackV3 />
      </MobileWrapper>
    </EmailGate>
  );
};

export default ProcureAIExecutivePackV3Public;
