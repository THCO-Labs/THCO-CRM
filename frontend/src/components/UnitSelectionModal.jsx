import { 
  Users, 
  TrendingUp, 
  Megaphone, 
  Briefcase, 
  Code, 
  Building2, 
  GraduationCap, 
  Truck,
  Wrench,
  UserCog,
  FolderKanban,
  X
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { useNavigate } from "react-router-dom";

const UNITS = [
  { 
    name: "Talent & Delivery", 
    slug: "talent", 
    icon: Users, 
    gradient: "bg-gradient-to-br from-[#B855E8] to-[#DA67E4]",
  },
  { 
    name: "THCO HR", 
    slug: "thco-hr", 
    icon: UserCog, 
    gradient: "bg-gradient-to-br from-[#8B5CF6] to-[#A78BFA]",
  },
  { 
    name: "Project Management", 
    slug: "project-management", 
    icon: FolderKanban, 
    gradient: "bg-gradient-to-br from-[#14B8A6] to-[#2DD4BF]",
  },
  { 
    name: "IT & THCO Tools", 
    slug: "it-tools", 
    icon: Wrench, 
    gradient: "bg-gradient-to-br from-[#F97316] to-[#FB923C]",
  },
  { 
    name: "Sales & Business Development", 
    slug: "sales", 
    icon: TrendingUp, 
    gradient: "bg-gradient-to-br from-[#38D190] to-[#53E1A3]",
  },
  { 
    name: "Marketing & Brand", 
    slug: "marketing", 
    icon: Megaphone, 
    gradient: "bg-gradient-to-br from-[#FF3D8D] to-[#FF7F7F]",
  },
  { 
    name: "Advisory & Consulting", 
    slug: "advisory", 
    icon: Briefcase, 
    gradient: "bg-gradient-to-br from-[#3B82F6] to-[#60A5FA]",
  },
  { 
    name: "Technology & Build", 
    slug: "technology", 
    icon: Code, 
    gradient: "bg-gradient-to-br from-[#06B6D4] to-[#22D3EE]",
  },
  { 
    name: "Operations & Finance", 
    slug: "operations", 
    icon: Building2, 
    gradient: "bg-gradient-to-br from-[#EF4444] to-[#F87171]",
  },
  { 
    name: "Academy & Learning", 
    slug: "academy", 
    icon: GraduationCap, 
    gradient: "bg-gradient-to-br from-[#F59E0B] to-[#FBBF24]",
  },
  { 
    name: "Client Delivery", 
    slug: "client-delivery", 
    icon: Truck, 
    gradient: "bg-gradient-to-br from-[#EC4899] to-[#F472B6]",
  },
];

const UnitSelectionModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  const handleUnitSelect = (unit) => {
    onClose();
    navigate(`/${unit.slug}/build/new`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-white border-[#EAE7E0] text-gray-900">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100 bg-white">
          <DialogTitle className="text-xl font-semibold text-gray-800">
            Which unit is this tool for?
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500 mt-1">
            Select the business unit where this automation will be used
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto" data-testid="unit-selection-grid">
          {UNITS.map((unit) => {
            const Icon = unit.icon;
            return (
              <button
                key={unit.slug}
                onClick={() => handleUnitSelect(unit)}
                className="flex flex-col items-center p-4 rounded-xl border border-gray-100 hover:border-[#1FB58A]/30 hover:shadow-md transition-all group"
                data-testid={`unit-select-${unit.slug}`}
              >
                <div className={`w-12 h-12 rounded-xl ${unit.gradient} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-700 text-center group-hover:text-[#1FB58A] transition-colors">
                  {unit.name}
                </span>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UnitSelectionModal;
