'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { complaintMatchesPermissions } from '@/utils/permissions';
import { fetchWithAuth } from '@/utils/api';

interface PermissionGuardProps {
  children: React.ReactNode;
  requiredPermissions: {
    resource: string;
    action: 'read' | 'create' | 'update' | 'delete';
  }[];
  complaintData?: ComplaintData; // Updated to use proper type
}

interface ComplaintData {
    id: number;
    title: string;
    description: string;
    Service_type: string;
    governorate_name: string;
    street_name_or_number: string;
    status_subcategory: number | null;
    Complaint_Subcategory: number | null;
    district: number | null;
    completion_percentage: number;
    note?: string;
    user?: { full_name: string };
    image?: string | null;
    video?: string | null;
    voice?: string | null;
    files?: string[] | string | null;
    file?: string[] | string | null;
    status?: 'قيد المراجعة' | 'منجزة';
    location?: {
      id: number;
      latitude: number;
      longitude: number;
      city: string;
      district: string;
      district_id: number | null;
    };
    [key: string]: unknown;
}

interface Permission {
  id: string;
  role: string | null;
  collection: string;
  action: 'read' | 'create' | 'update' | 'delete' | '*';
  permissions: {
    _and?: Array<{
      district?: { _eq?: number };
      status_subcategory?: { _in?: number[] };
      complaint_subcategory?: { _in?: number[] };
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  };
  validation: Record<string, unknown>;
  presets: Record<string, unknown>;
  fields: string[];
}

export default function PermissionGuard({ children, requiredPermissions, complaintData }: PermissionGuardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const ADMIN_ROLE_ID = '0FE8C81C-035D-41AC-B3B9-72A35678C558';
        let userId = null;
        // Check admin status first
        const storedUserInfo = localStorage.getItem('user_info');
        if (storedUserInfo) {
          const userInfoData = JSON.parse(storedUserInfo);
          console.log("userInfoData", userInfoData);
            userId = userInfoData?.id;
          const isAdmin = userInfoData?.role === ADMIN_ROLE_ID;
          console.log("admin", isAdmin);
          
          if (isAdmin) {
            setHasAccess(true);
            setLoading(false);
            return;
          }
        }
        console.log("userId", userId);
        if (!userId) {
          setHasAccess(false);
          setLoading(false);
          return;
        }

        // Get user's policies
        const userPoliciesResponse = await fetchWithAuth(`/items/user_policies?filter[user_id][directus_users_id][_eq]=${userId}&fields=*,policy_id.*,user_id.*`);
        // const userPolicies: UserPolicy[] = userPoliciesResponse.data.filter((policy: UserPolicy) => 
        //   policy.user_id.includes(userId)
        // );
        const userPolicies = userPoliciesResponse.data;
        console.log("Raw user policies response:", userPoliciesResponse);
        console.log("User policies data:", userPolicies);
        
        if (!userPolicies || !userPolicies.length) {
          console.log("No user policies found");
          setHasAccess(false);
          setLoading(false);
          return;
        }

        // Log the structure of the first policy for debugging
        console.log("First user policy structure:", JSON.stringify(userPolicies[0], null, 2));

        // Extract policy IDs from the response with robust handling
        const policyIds: string[] = [];
        for (const userPolicy of userPolicies) {
          if (userPolicy.policy_id) {
            // Handle the nested structure: policy_id is an array of objects with directus_policies_id
            const policyIdData = userPolicy.policy_id;
            let policyId;
            
            if (Array.isArray(policyIdData) && policyIdData.length > 0) {
              policyId = policyIdData[0]?.directus_policies_id;
            } else if (typeof policyIdData === 'object' && policyIdData?.directus_policies_id) {
              policyId = policyIdData.directus_policies_id;
            } else if (typeof policyIdData === 'string') {
              policyId = policyIdData;
            }
            
            if (policyId && !policyIds.includes(String(policyId))) {
              policyIds.push(String(policyId));
              console.log(`Added policy ID: ${policyId}`);
            }
          }
        }

        if (policyIds.length === 0) {
          console.log("No valid policy IDs found in user policies");
          setHasAccess(false);
          setLoading(false);
          return;
        }

        console.log(`Extracted policy IDs: ${policyIds.join(', ')}`);

        // Regular permission checks for non-admin users
        const permissionChecks = await Promise.all(
          requiredPermissions.map(async (reqPerm) => {
            console.log(`Checking permission for resource: ${reqPerm.resource}, action: ${reqPerm.action}`);
            
            // Check permissions across all user policies
            for (const policyId of policyIds) {
              // Get permissions for this policy and collection
              const permissionsResponse = await fetchWithAuth(
                `/permissions?filter[policy][_eq]=${policyId}&filter[collection][_eq]=${reqPerm.resource}`
              );
              console.log(`Permissions response for policy ${policyId}, collection ${reqPerm.resource}:`, permissionsResponse);
              const permissions = permissionsResponse.data;
              
              if (!permissions || !Array.isArray(permissions)) {
                console.log(`No permissions array found for ${reqPerm.resource}`);
                continue;
              }
              
              // Check if any permission matches the required action
              const hasPermission = permissions.some((perm: Permission) => {
                console.log(`Checking permission:`, perm);
                const actionMatch = perm.action === reqPerm.action || perm.action === '*';
                console.log(`Action match for ${perm.action} vs ${reqPerm.action}: ${actionMatch}`);
                return actionMatch;
              });

              if (hasPermission) {
                console.log(`Found matching permission for ${reqPerm.resource}:${reqPerm.action}`);
                return true;
              }
            }
            
            console.log(`No matching permission found for ${reqPerm.resource}:${reqPerm.action}`);
            return false;
          })
        );

        console.log("Permission check results:", permissionChecks);
        
        // User needs all required permissions
        const hasAllPermissions = permissionChecks.every(Boolean);
        console.log("Has all permissions:", hasAllPermissions);

        // If basic permissions pass and this is a complaint page, check complaint-specific permissions
        if (hasAllPermissions && complaintData) {
          // Get all permissions for complaint collection
          const complaintPermissions = await Promise.all(
            policyIds.map(async (policyId) => {
              const response = await fetchWithAuth(
                `/permissions?filter[policy][_eq]=${policyId}&filter[collection][_eq]=Complaint`
              );
              return response.data;
            })
          );

          const flatPermissions = complaintPermissions.flat();
          console.log("Complaint permissions:", flatPermissions);
          const hasComplaintAccess = complaintMatchesPermissions(complaintData, flatPermissions);
          console.log("Has complaint access:", hasComplaintAccess);
          setHasAccess(hasComplaintAccess);
        } else {
          setHasAccess(hasAllPermissions);
        }

      } catch (error) {
        console.error('Error checking permissions:', error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkPermissions();
  }, [requiredPermissions, complaintData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 mr-64 flex justify-center items-center">
        <div className="text-xl text-gray-600">جاري التحقق من الصلاحيات...</div>
      </div>
    );
  }

  if (!hasAccess) {
    router.push('/unauthorized');
    return null;
  }

  return <>{children}</>;
} 