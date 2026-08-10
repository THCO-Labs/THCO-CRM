import { useState } from "react";
import { Plus, Zap } from "lucide-react";
import UnitSelectionModal from "./UnitSelectionModal";
import { FLOWFORGE_ENABLED } from "../config/features";

/**
 * "Build New Tool" action.
 *
 * Sits inline in the header alongside the theme toggle, notifications and the
 * user menu. It was previously a fixed-position floating button, which
 * overlapped page content and drew the eye with a pulsing ripple; as a header
 * control it stays available without competing with the page.
 *
 * The gradient is kept so it still reads as the primary action among the
 * otherwise neutral header icons.
 */
const FlowForgeFAB = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Nothing behind it here: FlowForge needs Supabase and n8n, and this was the
  // most inviting control in the header. See config/features.js.
  if (!FLOWFORGE_ENABLED) return null;

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        title="Build New Tool"
        aria-label="Build New Tool"
        data-testid="flowforge-fab"
        className="
          group relative flex items-center justify-center
          w-9 h-9 rounded-full
          bg-gradient-to-r from-[#1FB58A] to-[#3DDC97]
          text-white shadow-sm shadow-[#1FB58A]/30
          hover:shadow-md hover:brightness-105
          focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1FB58A] focus-visible:ring-offset-2
          transition-all duration-200
        "
      >
        <Plus className="w-[18px] h-[18px] transition-transform duration-200 group-hover:rotate-90" />
        <Zap className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 text-yellow-300" />
      </button>

      <UnitSelectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};

export default FlowForgeFAB;
