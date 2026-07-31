import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const EmailGate = ({ proposalSlug, proposalTitle, children }) => {
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const activityInterval = useRef(null);
  const startTime = useRef(Date.now());

  // Check if user already has access
  useEffect(() => {
    const checkAccess = async () => {
      const storedEmail = localStorage.getItem(`proposal_viewer_${proposalSlug}`);
      
      if (storedEmail) {
        try {
          const response = await axios.get(
            `${API_URL}/api/proposals/viewers/check/${proposalSlug}/${encodeURIComponent(storedEmail)}`
          );
          
          if (response.data.has_access) {
            setEmail(storedEmail);
            setName(response.data.name || '');
            setHasAccess(true);
            
            // Re-register to update last viewed
            await axios.post(`${API_URL}/api/proposals/viewers/register`, {
              email: storedEmail,
              name: response.data.name || '',
              company: '',
              proposal_slug: proposalSlug
            });
          }
        } catch (err) {
          console.error('Error checking access:', err);
        }
      }
      
      setIsLoading(false);
    };

    checkAccess();
  }, [proposalSlug]);

  // Track time spent
  useEffect(() => {
    if (hasAccess && email) {
      startTime.current = Date.now();
      
      // Send activity update every 30 seconds
      activityInterval.current = setInterval(async () => {
        const timeSpent = Math.floor((Date.now() - startTime.current) / 1000);
        startTime.current = Date.now();
        
        try {
          await axios.post(`${API_URL}/api/proposals/viewers/activity`, {
            email,
            proposal_slug: proposalSlug,
            time_spent: timeSpent
          });
        } catch (err) {
          console.error('Error tracking activity:', err);
        }
      }, 30000);

      // Send final activity on unmount
      return () => {
        if (activityInterval.current) {
          clearInterval(activityInterval.current);
        }
        
        const timeSpent = Math.floor((Date.now() - startTime.current) / 1000);
        if (timeSpent > 0) {
          axios.post(`${API_URL}/api/proposals/viewers/activity`, {
            email,
            proposal_slug: proposalSlug,
            time_spent: timeSpent
          }).catch(() => {});
        }
      };
    }
  }, [hasAccess, email, proposalSlug]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (!email) {
      setError('Please enter your email address');
      setIsSubmitting(false);
      return;
    }

    if (!name) {
      setError('Please enter your name');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/api/proposals/viewers/register`, {
        email,
        name,
        company: '',
        proposal_slug: proposalSlug
      });

      if (response.data.success) {
        localStorage.setItem(`proposal_viewer_${proposalSlug}`, email);
        setHasAccess(true);
      }
    } catch (err) {
      setError(typeof err.response?.data?.detail === 'string' ? err.response.data.detail : 'Failed to register. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-white">
        <div className="w-10 h-10 border-4 border-[#4169E1] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (hasAccess) {
    return children;
  }

  return (
    <div className="w-screen min-h-screen flex items-center justify-center bg-[#f8fafc] overflow-auto relative px-4 py-8 sm:py-0">
      {/* Background Cloud Shapes - Hidden on very small screens for performance */}
      <svg className="absolute inset-0 w-full h-full hidden sm:block" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#d4e4f7" opacity="0.5" />
          </pattern>
        </defs>
        
        {/* Large cloud shape */}
        <ellipse cx="50%" cy="45%" rx="45%" ry="40%" fill="#e8f1fc" />
        <ellipse cx="30%" cy="35%" rx="20%" ry="18%" fill="#dbeafe" />
        <ellipse cx="70%" cy="35%" rx="18%" ry="16%" fill="#dbeafe" />
        <ellipse cx="50%" cy="25%" rx="15%" ry="12%" fill="#e0ebfa" />
        
        {/* Dot pattern overlay */}
        <rect x="15%" y="10%" width="70%" height="70%" fill="url(#dots)" opacity="0.6" />
      </svg>

      {/* Mobile background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-50 to-white sm:hidden" />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-10">
          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 text-center mb-3">
            View Presentation
          </h1>

          {/* Proposal Title */}
          {proposalTitle && (
            <p className="text-sm text-gray-500 text-center mb-2 px-2">
              {proposalTitle}
            </p>
          )}

          {/* Clear instruction */}
          <p className="text-sm text-gray-600 text-center mb-6 px-2">
            Enter your details below to view the presentation
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg text-gray-900 text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4169E1] focus:border-transparent transition-all"
                data-testid="email-gate-email"
              />
            </div>

            {/* Name Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                required
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg text-gray-900 text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4169E1] focus:border-transparent transition-all"
                data-testid="email-gate-name"
              />
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm text-center"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 sm:py-3.5 px-4 bg-[#4169E1] hover:bg-[#3457c9] active:bg-[#2d4ab3] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base"
              data-testid="email-gate-submit"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Loading...
                </span>
              ) : (
                'View Presentation'
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default EmailGate;
