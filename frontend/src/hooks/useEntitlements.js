import { useContext } from 'react';
import AuthContext from '../context/AuthContext';
import { account } from '../lib/api';
import useAsync from './useAsync';

/** Droits de l'utilisateur connecté (null pour un visiteur). Source : GET /api/me/entitlements. */
const useEntitlements = () => {
  const { user } = useContext(AuthContext);
  return useAsync(() => account.entitlements(), [user?._id || user?.id], { enabled: Boolean(user) });
};

export default useEntitlements;
