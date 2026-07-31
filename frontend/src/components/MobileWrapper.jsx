import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Monitor, RotateCcw, ChevronRight, ChevronLeft } from 'lucide-react';

const MobileWrapper = ({ children, presentationTitle }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [showAnyway, setShowAnyway] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      const mobile = window.innerWidth < 768;
      const landscape = window.innerWidth > window.innerHeight;
      setIsMobile(mobile);
      setIsLandscape(landscape);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    window.addEventListener('orientationchange', checkDevice);
    
    return () => {
      window.removeEventListener('resize', checkDevice);
      window.removeEventListener('orientationchange', checkDevice);
    };
  }, []);

  // If not mobile or user chose to show anyway in landscape, show the presentation
  if (!isMobile || (showAnyway && isLandscape)) {
    return children;
  }

  // If mobile and landscape, show with a hint
  if (isMobile && isLandscape && !showAnyway) {
    return (
      <div className="w-screen h-screen bg-[#1E2761] flex flex-col items-center justify-center p-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 max-w-md"
        >
          <div className="w-12 h-12 rounded-full bg-teal-500/20 flex items-center justify-center mx-auto mb-4">
            <Monitor className="w-6 h-6 text-teal-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">
            Ready to View
          </h2>
          <p className="text-white/70 text-sm mb-6">
            {presentationTitle || 'This presentation'} is optimized for larger screens. 
            You can continue viewing in landscape mode.
          </p>
          <button
            onClick={() => setShowAnyway(true)}
            className="w-full py-3 px-4 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-lg transition-colors"
          >
            View Presentation
          </button>
        </motion.div>
      </div>
    );
  }

  // Mobile portrait mode - suggest rotating
  return (
    <div className="w-screen h-screen bg-[#1E2761] flex flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-sm"
      >
        {/* Rotate phone icon */}
        <motion.div 
          className="w-20 h-20 mx-auto mb-6 relative"
          animate={{ rotate: [0, 90, 90, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
        >
          <div className="w-12 h-20 border-4 border-white/50 rounded-xl mx-auto relative">
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-4 h-1 bg-white/30 rounded-full" />
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 border-2 border-white/30 rounded-full" />
          </div>
          <RotateCcw className="w-6 h-6 text-teal-400 absolute -right-2 top-1/2 -translate-y-1/2" />
        </motion.div>

        <h2 className="text-2xl font-semibold text-white mb-3">
          Rotate Your Device
        </h2>
        <p className="text-white/70 text-base mb-8">
          For the best viewing experience, please rotate your phone to landscape mode.
        </p>

        {/* Presentation info */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-6">
          <p className="text-sm text-white/50 mb-1">Viewing</p>
          <p className="text-white font-medium">{presentationTitle || 'Presentation'}</p>
        </div>

        {/* Alternative: View on desktop */}
        <div className="flex items-center justify-center gap-2 text-white/50 text-sm">
          <Monitor className="w-4 h-4" />
          <span>Best viewed on desktop</span>
        </div>
      </motion.div>
    </div>
  );
};

export default MobileWrapper;
