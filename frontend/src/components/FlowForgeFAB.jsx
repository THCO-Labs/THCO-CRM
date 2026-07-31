import { useState } from "react";
import { Plus, Zap } from "lucide-react";
import UnitSelectionModal from "./UnitSelectionModal";

const FlowForgeFAB = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="fixed top-20 right-6 z-50 group"
        data-testid="flowforge-fab"
      >
        {/* Button with gradient and animation */}
        <div className={`
          flex items-center gap-2 
          bg-gradient-to-r from-[#1FB58A] to-[#3DDC97] 
          text-white font-medium 
          rounded-full shadow-lg shadow-[#1FB58A]/30
          hover:shadow-xl hover:scale-105
          transition-all duration-300 ease-out
          ${isHovered ? "pr-5 pl-4" : "p-4"}
        `}>
          <div className="relative">
            <Plus className={`w-6 h-6 transition-transform duration-300 ${isHovered ? "rotate-90" : ""}`} />
            <Zap className="absolute -top-1 -right-1 w-3 h-3 text-yellow-300 animate-pulse" />
          </div>
          
          {/* Expandable text */}
          <span className={`
            whitespace-nowrap overflow-hidden transition-all duration-300
            ${isHovered ? "max-w-[120px] opacity-100" : "max-w-0 opacity-0"}
          `}>
            Build New Tool
          </span>
        </div>

        {/* Ripple effect on hover */}
        <div className={`
          absolute inset-0 rounded-full
          bg-gradient-to-r from-[#1FB58A] to-[#3DDC97]
          opacity-0 group-hover:opacity-30
          animate-ping
          transition-opacity duration-300
        `} />
      </button>

      {/* Unit Selection Modal */}
      <UnitSelectionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
};

export default FlowForgeFAB;
