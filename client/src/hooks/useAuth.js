import { useAuthContext } from '../context/AuthContext.jsx';

/**
 * Hook to consume AuthContext cleanly.
 */
export const useAuth = () => {
  return useAuthContext();
};
