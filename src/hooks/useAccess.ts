import { useState, useEffect } from 'react';
import { getUserPermissions, hasPermission, UserPermissionsData } from '@/utils/permissions';

/**
 * Hook to check if the current user has access to perform an action on a collection
 * @param collection The collection to check access for
 * @param action The action to check (create, read, update, delete, share)
 * @returns Object containing loading state, hasAccess boolean, and permissions data
 */
export function useAccess(collection: string, action: string) {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [permissions, setPermissions] = useState<UserPermissionsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        setLoading(true);
        const userPermissions = await getUserPermissions();
        setPermissions(userPermissions);
        setIsAdmin(userPermissions.isAdmin);
        
        const access = hasPermission(userPermissions, collection, action);
        setHasAccess(access);
        setLoading(false);
      } catch (err) {
        console.error('Error checking permissions:', err);
        setError('Failed to check permissions');
        setHasAccess(false);
        setLoading(false);
      }
    };

    checkAccess();
  }, [collection, action]);

  return { loading, hasAccess, permissions, error, isAdmin };
}

/**
 * Hook to check if the current user has access to one or more permissions
 * @param checks Array of permission checks to perform
 * @returns Object containing loading state, results for each check, and permissions data
 */
export function useMultipleAccess(checks: Array<{ collection: string; action: string }>) {
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [permissions, setPermissions] = useState<UserPermissionsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Use string representation of checks as dependency to avoid rerenders with identical checks
  const checksString = JSON.stringify(checks);

  useEffect(() => {
    const checkMultipleAccess = async () => {
      try {
        setLoading(true);
        const userPermissions = await getUserPermissions();
        setPermissions(userPermissions);
        setIsAdmin(userPermissions.isAdmin);
        
        const accessResults: Record<string, boolean> = {};
        const parsedChecks = JSON.parse(checksString);
        
        parsedChecks.forEach(({ collection, action }: { collection: string; action: string }) => {
          const key = `${collection}:${action}`;
          accessResults[key] = hasPermission(userPermissions, collection, action);
        });
        
        setResults(accessResults);
        setLoading(false);
      } catch (err) {
        console.error('Error checking multiple permissions:', err);
        setError('Failed to check permissions');
        setLoading(false);
      }
    };

    checkMultipleAccess();
  }, [checksString]); // Use checksString instead of checks

  // Helper to check if a specific permission is granted
  const can = (collection: string, action: string): boolean => {
    const key = `${collection}:${action}`;
    return results[key] || false;
  };

  return { loading, results, can, permissions, error, isAdmin };
} 