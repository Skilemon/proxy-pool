import { useEffect } from 'react';
import { useStore } from '../store/useStore';

export default function Toast() {
  const { error, success, setError, setSuccess } = useStore();

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error, setError]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success, setSuccess]);

  if (!error && !success) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 space-y-3">
      {error && (
        <div className="bg-white dark:bg-slate-800 border-l-4 border-red-500 px-6 py-4 rounded-xl shadow-xl flex items-center space-x-4 animate-slide-in min-w-[320px]">
          <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <span className="flex-1 text-slate-900 dark:text-white font-medium">{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors duration-200 cursor-pointer"
            aria-label="关闭"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      
      {success && (
        <div className="bg-white dark:bg-slate-800 border-l-4 border-green-500 px-6 py-4 rounded-xl shadow-xl flex items-center space-x-4 animate-slide-in min-w-[320px]">
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="flex-1 text-slate-900 dark:text-white font-medium">{success}</span>
          <button
            onClick={() => setSuccess(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors duration-200 cursor-pointer"
            aria-label="关闭"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
