'use client';
import React, { useEffect, useState, useRef } from 'react';
import { fetchWithAuth } from '@/utils/api';
import { BsFilter, BsPersonFill, BsChevronDown } from 'react-icons/bs';
import { GrFilter } from 'react-icons/gr';

interface Role {
  id: string;
  name: string;
  description: string | null;
  created_at?: string;
}

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface UserPermission {
  userId: string;
  district?: string;
  status_subcategory: number[];
  complaint_subcategory: number[];
}

interface Policy {
  id: string;
  name: string;
  description: string | null;
  enforce_tfa: boolean;
  admin_access: boolean;
  app_access: boolean;
  roles: string[];
  users: string[];
  created_at?: string;
  permissions?: {
    [userId: string]: {
      district?: string;
      status_subcategory?: number[];
      complaint_subcategory?: number[];
    };
  };
  policy_user_id?: string[]; // Add this field
}

interface District {
  id: number;
  name: string;
}

interface StatusSubCategory {
  id: number;
  name: string;
  status_category: number;
}

interface CollectionPermission {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
  share: boolean;
  customConditions?: {
    id?: string;
    district?: string;
    status_subcategory?: string;
    complaint_subcategory_id?: string;
    // status_subcategory?: string;
    districtId?: string;
    statusSubcategoryId?: string;
  };
}

interface CollectionPermissions {
  [key: string]: CollectionPermission;
}

interface UserPolicy {
  id: string;
  user_id: string;  // Changed to single string
  policy_id: string; // Changed to single string
}

const createEmptyCollectionPermissions = (): CollectionPermissions => {
  return {
    Complaint: { create: false, read: false, update: false, delete: false, share: false, customConditions: {} },
    Complaint_main_category: { create: false, read: false, update: false, delete: false, share: false, customConditions: {} },
    Complaint_sub_category: { create: false, read: false, update: false, delete: false, share: false, customConditions: {} },
    District: { create: false, read: false, update: false, delete: false, share: false, customConditions: {} },
    Status_category: { create: false, read: false, update: false, delete: false, share: false, customConditions: {} },
    Status_subcategory: { create: false, read: false, update: false, delete: false, share: false, customConditions: {} },
    Users: { create: false, read: false, update: false, delete: false, share: false, customConditions: {} },
    notification: { create: true, read: true, update: false, delete: false, share: false, customConditions: {} },
    notification_users: { create: true, read: true, update: false, delete: false, share: false, customConditions: {} },
    user_policies: { create: true, read: true, update: true, delete: true, share: true, customConditions: {} },
    directus_policies: { create: true, read: true, update: true, delete: true, share: true, customConditions: {} },
    directus_permissions: { create: true, read: true, update: true, delete: true, share: true, customConditions: {} },
  };
};

export default function SettingsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [subCategories, setSubCategories] = useState<StatusSubCategory[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [userPolicies, setUserPolicies] = useState<UserPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddPolicy, setShowAddPolicy] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSearchQuery, setPageSearchQuery] = useState('');
  const [newPolicy, setNewPolicy] = useState({
    name: '',
    description: '',
    enforce_tfa: false,
    admin_access: false,
    app_access: true,
    roles: [] as string[],
    permissions: {} as { [key: string]: { district?: string; status_subcategory?: number[]; complaint_subcategory?: number[] } },
    policy_user_id: [] as string[] // Add this field
  });
  const [collectionPermissions, setCollectionPermissions] = useState<CollectionPermissions>(createEmptyCollectionPermissions());
  const [showCustomConditionsModal, setShowCustomConditionsModal] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [customConditionValue, setCustomConditionValue] = useState('');
  const [customConditionValue2, setCustomConditionValue2] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [rolesData, policiesData, districtsData, subCategoriesData, usersData, userPoliciesResponse] = await Promise.all([
        fetchWithAuth('/roles'),
        fetchWithAuth('/policies'),
        fetchWithAuth('/items/District'),
        fetchWithAuth('/items/Status_subcategory'),
        fetchWithAuth('/users'),
        fetchWithAuth('/items/user_policies')
      ]);

      setRoles(rolesData.data);
      setPolicies(policiesData.data);
      setDistricts(districtsData.data);
      setSubCategories(subCategoriesData.data.filter((sub: StatusSubCategory) => sub.name !== null));
      setUsers(usersData.data);
      // Make sure we extract the data array before setting it to state
      setUserPolicies(userPoliciesResponse.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const handleAddUserToPolicy = () => {
    setUserPermissions([...userPermissions, {
      userId: '',
      district: '',
      status_subcategory: [],
      complaint_subcategory: []
    }]);
  };

  const handleRemoveUserPermission = (index: number) => {
    const updatedPermissions = [...userPermissions];
    const userId = updatedPermissions[index].userId;
    updatedPermissions.splice(index, 1);
    setUserPermissions(updatedPermissions);

    // Remove from selectedUsers
    setSelectedUsers(selectedUsers.filter(id => id !== userId));

    // Remove from newPolicy permissions
    const updatedPermissions2 = { ...newPolicy.permissions };
    delete updatedPermissions2[userId];
    setNewPolicy({
      ...newPolicy,
      permissions: updatedPermissions2
    });
  };

  const handleUserPermissionChange = (index: number, field: keyof UserPermission, value: any) => {
    const updatedPermissions = [...userPermissions];
    const previousUserId = updatedPermissions[index]?.userId;
    
    if (field === 'userId') {
      setSelectedUsers(prev => {
        const updated = prev.filter(id => id !== previousUserId);
        return [...updated, value];
      });
    }
    
    updatedPermissions[index] = {
      ...updatedPermissions[index],
      [field]: value
    };
    
    setUserPermissions(updatedPermissions);

    // Update newPolicy permissions
    const updatedPermissions2 = { ...newPolicy.permissions };
    
    if (field === 'userId') {
      if (previousUserId) {
        delete updatedPermissions2[previousUserId];
      }
      updatedPermissions2[value] = {
        district: updatedPermissions[index].district,
        status_subcategory: updatedPermissions[index].status_subcategory,
        complaint_subcategory: updatedPermissions[index].complaint_subcategory
      };
    } else {
      const currentUserId = updatedPermissions[index].userId;
      if (currentUserId) {
        updatedPermissions2[currentUserId] = {
          ...updatedPermissions2[currentUserId],
          [field]: value
        };
      }
    }
    
    setNewPolicy({
      ...newPolicy,
      permissions: updatedPermissions2
    });
  };

  const handleEditPolicy = async (policy: Policy) => {
    setIsEditing(true);
    setEditingPolicyId(policy.id);
    
    if (Array.isArray(policy.roles) && policy.roles.length > 0) {
      setSelectedRole(policy.roles[0]);
    } else if (typeof policy.roles === 'string') {
      setSelectedRole(policy.roles);
    } else {
      setSelectedRole('');
    }
    
    // Get user IDs from user_policies for this policy
    const policyUserPolicies = userPolicies.filter(up => 
      up.policy_id.includes(policy.id)
    );
    const userIds = policyUserPolicies.flatMap(up => up.user_id);
    
    setSelectedUsers(userIds);
    
    const defaultCollectionPermissions = createEmptyCollectionPermissions();

    try {
      const permissionsResponse = await fetchWithAuth(`/permissions?filter[policy][_eq]=${policy.id}`);
      const permissionsData = permissionsResponse.data;
      
      const userPerms = permissionsData
        .filter((perm: any) => perm.user)
        .map((perm: any) => {
          const district = perm.permissions?._and?.[0]?.district?._eq;
          const statusSubcategories = perm.permissions?._and?.find((p: any) => p.status_subcategory)?._in || [];
          const complaintSubcategories = perm.permissions?._and?.find((p: any) => p.complaint_subcategory)?._in || [];
          
          return {
            userId: perm.user,
            district: district,
            status_subcategory: statusSubcategories,
            complaint_subcategory: complaintSubcategories
          };
        });

      setUserPermissions(userPerms);

      for (const permission of permissionsData) {
        if (permission.user) continue;
        
        const { collection, action, permissions: permissionFilters } = permission;
        
        if (defaultCollectionPermissions[collection]) {
          if (action === 'create' || action === 'read' || action === 'update' || action === 'delete' || action === 'share') {
            defaultCollectionPermissions[collection][action as keyof CollectionPermission] = true;
          }
          
          if (permissionFilters && Object.keys(permissionFilters).length > 0) {
            if (collection === 'Status_subcategory' && permissionFilters._and?.[0]?.id?._eq) {
              defaultCollectionPermissions[collection].customConditions = {
                ...defaultCollectionPermissions[collection].customConditions,
                id: permissionFilters._and[0].id._eq
              };
            } else if (collection === 'District' && permissionFilters._and?.[0]?.id?._eq) {
              defaultCollectionPermissions[collection].customConditions = {
                ...defaultCollectionPermissions[collection].customConditions,
                id: permissionFilters._and[0].id._eq
              };
            } else if (collection === 'Complaint') {
              if (permissionFilters._and?.[0]?.district?._eq) {
                defaultCollectionPermissions[collection].customConditions = {
                  ...defaultCollectionPermissions[collection].customConditions,
                  id: permissionFilters._and[0].district._eq
                };
              }
            }
          }
        }
      }

      setCollectionPermissions(defaultCollectionPermissions);
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }

    setNewPolicy({
      name: policy.name,
      description: policy.description || '',
      enforce_tfa: policy.enforce_tfa,
      admin_access: policy.admin_access,
      app_access: policy.app_access,
      roles: Array.isArray(policy.roles) ? policy.roles : (policy.roles ? [policy.roles] : []),
      permissions: policy.permissions || {},
      policy_user_id: policyUserPolicies.map(up => up.id) // Set the user_policy IDs
    });

    setShowAddPolicy(true);
  };

  const handlePermissionToggle = (collection: string, action: keyof typeof collectionPermissions[string]) => {
    setCollectionPermissions(prev => ({
      ...prev,
      [collection]: {
        ...prev[collection],
        [action]: !prev[collection][action]
      }
    }));
  };

  const handleCustomConditionChange = (collection: string, value: string) => {
    setCollectionPermissions(prev => ({
      ...prev,
      [collection]: {
        ...prev[collection],
        customConditions: {
          ...prev[collection].customConditions,
          id: value
        }
      }
    }));
  };

  const handleSavePolicy = async () => {
    try {
      // 1. Create or update policy
      const policyResponse = await fetchWithAuth(
        isEditing ? `/policies/${editingPolicyId}` : '/policies',
        {
          method: isEditing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newPolicy.name,
            description: newPolicy.description,
            enforce_tfa: newPolicy.enforce_tfa,
            admin_access: newPolicy.admin_access,
            app_access: newPolicy.app_access
          })
        }
      );
  
      const policyId = isEditing ? editingPolicyId : policyResponse.data.id;
  
      if (!policyId) {
        throw new Error('Policy ID not found');
      }

      const createdPermissionIds: string[] = [];
      
      for (const [collection, actions] of Object.entries(collectionPermissions)) {
        for (const [action, enabled] of Object.entries(actions)) {
          if (action === 'customConditions' || !enabled) continue;

          let permissionData: any = {
            collection,
            action,
            role: selectedRole,
            fields: ["*"],
            policy: policyId
          };

          // Handle custom conditions based on collection type
          if (collection === 'Status_subcategory' && actions.customConditions?.id) {
            permissionData.permissions = {
              _and: [{
                id: { _eq: parseInt(actions.customConditions.id) }
              }]
            };
          } else if (collection === 'District' && actions.customConditions?.id) {
            permissionData.permissions = {
              _and: [{
                id: { _eq: parseInt(actions.customConditions.id) }
              }]
            };
          } else if (collection === 'Complaint') {
            const conditions = [];
            
            // Add district condition if specified
            if (actions.customConditions?.districtId) {
              conditions.push({
                district: { _eq: parseInt(actions.customConditions.districtId) }
              });
            }
            
            // Add status subcategory condition if specified
            if (actions.customConditions?.statusSubcategoryId) {
              conditions.push({
                status_subcategory: { _eq: parseInt(actions.customConditions.statusSubcategoryId) }
              });
            }
            
            // Only set permissions if we have at least one condition
            if (conditions.length > 0) {
              permissionData.permissions = {
                _and: conditions
              };
            }
          }

          console.log('Creating permission:', JSON.stringify(permissionData));

          const permissionResponse = await fetchWithAuth('/permissions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(permissionData)
          });

          if (!permissionResponse.data) {
            console.error('Failed to create permission:', permissionResponse);
            continue;
          }

          createdPermissionIds.push(permissionResponse.data.id);
        }
      }

      if (createdPermissionIds.length > 0) {
        const updatePolicyResponse = await fetchWithAuth(`/policies/${policyId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            permissions: createdPermissionIds
          })
        });

        if (!updatePolicyResponse.data) {
          console.error('Failed to update policy with permissions');
        }
      }

      // ---------------------------------------------------------------
      // HANDLE USER POLICY ASSOCIATIONS - FIRST DELETE, THEN CREATE NEW
      // ---------------------------------------------------------------
      // 2. Create new user_policy associations if users are selected
      if (Array.isArray(selectedUsers) && selectedUsers.length > 0) {
        console.log(`Creating ${selectedUsers.length} new user_policy associations`);
        
        // Create data payload
        const data = {
          user_id: selectedUsers,
          policy_id: [policyId]
        };
        
        console.log("Payload for new user_policies:", data);
        
        try {
          await fetchWithAuth('/items/user_policies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          console.log("Successfully created new user_policy associations");
        } catch (error) {
          console.error("Error creating user_policy associations:", error);
        }
      } else {
        console.log("No users selected, skipping user_policy creation");
      }

            // 1. First delete ALL existing user_policies for this policy
            console.log(`Removing all existing user_policies for policy ${policyId}`);
            const existingPolicyUserPolicies = userPolicies.filter(up => 
              up.policy_id && (Array.isArray(up.policy_id) ? 
                up.policy_id.includes(policyId) : 
                up.policy_id === policyId)
            );
            console.log("existingPolicyUserPolicies", existingPolicyUserPolicies);
            // Delete existing user_policies in parallel
            const deletePromises = existingPolicyUserPolicies.map(async (userPolicy) => {
              try {
                console.log(`Deleting user_policy: ${userPolicy.id}`);
                await fetchWithAuth(`/items/user_policies/${userPolicy.id}`, {
                  method: 'DELETE'
                });
                return true;
              } catch (error) {
                console.error(`Error deleting user_policy ${userPolicy.id}:`, error);
                return false;
              }
            });
            // Wait for all deletions to complete
            await Promise.all(deletePromises);
            console.log(`Removed ${existingPolicyUserPolicies.length} existing user_policies`);
      
      // Clear permissions cache and force refresh
      localStorage.removeItem('permissionsCache');
      
      // Fetch updated user_policies to verify changes
      console.log('Fetching updated user_policies to verify changes');
      const updatedUserPoliciesResponse = await fetchWithAuth('/items/user_policies');
      console.log('Updated user_policies response:', updatedUserPoliciesResponse);
      
      // Make sure we extract the data array before setting it to state
      const updatedUserPoliciesData = updatedUserPoliciesResponse?.data || [];
      
      // Delete any orphaned user policies (those without a user_id)
      try {
        console.log('Checking for orphaned user policies with null user_id');
        const orphanedPolicies = updatedUserPoliciesData.filter((policy: any) => 
          !policy.user_id || policy.user_id.length === 0
        );
        
        if (orphanedPolicies.length > 0) {
          console.log(`Found ${orphanedPolicies.length} orphaned user policies, deleting them`);
          
          const deleteOrphanPromises = orphanedPolicies.map(async (policy: any) => {
            try {
              console.log(`Deleting orphaned user_policy: ${policy.id}`);
              await fetchWithAuth(`/items/user_policies/${policy.id}`, {
                method: 'DELETE'
              });
              return true;
            } catch (error) {
              console.error(`Error deleting orphaned user_policy ${policy.id}:`, error);
              return false;
            }
          });
          
          await Promise.all(deleteOrphanPromises);
          console.log('Finished cleaning up orphaned user policies');
        } else {
          console.log('No orphaned user policies found');
        }
      } catch (error) {
        console.error('Error cleaning up orphaned user policies:', error);
      }
      
      // Set only the data array to the state
      setUserPolicies(updatedUserPoliciesData);
      
      // 4. Refresh all data to reflect changes
      await fetchInitialData();
      
      // 5. Reset state and close modal
      setShowAddPolicy(false);
      setIsEditing(false);
      setEditingPolicyId(null);
      setNewPolicy({
        name: '',
        description: '',
        enforce_tfa: false,
        admin_access: false,
        app_access: true,
        roles: [],
        permissions: {},
        policy_user_id: []
      });
      setUserPermissions([]);
      setSelectedUsers([]);
      setSelectedRole('');
      setCollectionPermissions(createEmptyCollectionPermissions());
      
      console.log("Policy saved successfully with updated user assignments");
    } catch (error) {
      console.error('Error saving policy:', error);
      // TODO: Add error toast or UI feedback
      // showToast("Failed to save policy", { type: "error" });
    }
  };
  
  
  
  
  

  const handleOpenCustomConditions = (collection: string) => {
    setSelectedCollection(collection);
    
    // Reset values when opening the modal
    if (collection === 'Complaint') {
      // For complaint, we might have existing values to keep
      const currentConditions = collectionPermissions[collection]?.customConditions || {};
      setCustomConditionValue(currentConditions.districtId || '');
      setCustomConditionValue2(currentConditions.statusSubcategoryId || '');
    } else {
      // For other collections, just use the id field as before
      setCustomConditionValue(collectionPermissions[collection]?.customConditions?.id || '');
      setCustomConditionValue2('');
    }
    
    setShowCustomConditionsModal(true);
  };

  const handleSaveCustomConditions = () => {
    if (!selectedCollection) return;

    if (selectedCollection === 'Complaint') {
      // For Complaint, save both district and status subcategory
      setCollectionPermissions(prev => ({
        ...prev,
        [selectedCollection]: {
          ...prev[selectedCollection],
          customConditions: {
            ...prev[selectedCollection].customConditions,
            districtId: customConditionValue,
            statusSubcategoryId: customConditionValue2
          }
        }
      }));
    } else {
      // For other collections, use the previous logic
      if (!customConditionValue) return;
      
      setCollectionPermissions(prev => ({
        ...prev,
        [selectedCollection]: {
          ...prev[selectedCollection],
          customConditions: {
            ...prev[selectedCollection].customConditions,
            id: customConditionValue
          }
        }
      }));
    }

    setShowCustomConditionsModal(false);
  };

  // Function to get available users (not already selected) with search filter
  const getAvailableUsers = () => {
    if (!searchQuery.trim()) {
      return users.filter(user => !selectedUsers.includes(user.id));
    }

    const searchLower = searchQuery.toLowerCase().trim();
    return users
      .filter(user => !selectedUsers.includes(user.id))
      .filter(user => {
        const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
        const email = (user.email || '').toLowerCase();
        return fullName.includes(searchLower) || email.includes(searchLower);
      });
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUserSelect = (userId: string) => {
    setSelectedUsers([...selectedUsers, userId]);
    setSearchQuery('');
    setIsDropdownOpen(false);
  };

  // Function to filter policies based on search query
  const getFilteredPolicies = () => {
    if (!pageSearchQuery.trim()) {
      return policies;
    }

    const searchLower = pageSearchQuery.toLowerCase().trim();
    return policies.filter(policy => {
      // Get users for this policy
      const policyUsers = userPolicies
        .filter(up => up.policy_id.includes(policy.id))
        .flatMap(up => up.user_id)
        .map(userId => users.find(user => user.id === userId))
        .filter(Boolean) as User[];

      // Check if any user matches the search
      const hasMatchingUser = policyUsers.some(user => {
        const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
        const email = (user.email || '').toLowerCase();
        return fullName.includes(searchLower) || email.includes(searchLower);
      });

      // Check if policy name or description matches
      const policyMatches = 
        policy.name.toLowerCase().includes(searchLower) ||
        (policy.description?.toLowerCase().includes(searchLower) ?? false);

      return hasMatchingUser || policyMatches;
    });
  };

  if (loading) {
    return (
      <div className="p-8 mr-64 flex justify-center items-center min-h-screen">
        <div className="text-xl text-gray-600">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="p-8 mr-64">
      {/* Policies Section */}
      <div>
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">السياسات</h1>
          <div className="flex gap-3">
          <button 
              onClick={() => setShowFilters(!showFilters)}
              className="h-10 w-10 hover:bg-[#4664AD] text-[#4664AD] hover:text-[#F9FAFB] p-2 rounded-lg bg-[#F9FAFB] flex items-center justify-center"
            >
              <GrFilter />
          </button>
            <button 
              onClick={() => {
                setIsEditing(false);
                setEditingPolicyId(null);
                setNewPolicy({
                  name: '',
                  description: '',
                  enforce_tfa: false,
                  admin_access: false,
                  app_access: true,
                  roles: [],
                  permissions: {},
                  policy_user_id: []
                });
                setUserPermissions([]);
                setSelectedUsers([]);
                setSelectedRole('');
                setCollectionPermissions(createEmptyCollectionPermissions());
                setShowAddPolicy(true);
              }}
              className="bg-[#4664AD] text-white px-4 py-2 rounded-lg text-sm"
            >
              إضافة سياسة جديدة
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {showFilters && (
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              value={pageSearchQuery}
              onChange={(e) => setPageSearchQuery(e.target.value)}
              placeholder="ابحث عن سياسة أو مستخدم..."
              className="w-full border border-gray-300 rounded-lg p-2 pr-10 text-right"
              dir="rtl"
            />
            {pageSearchQuery && (
              <button
                onClick={() => setPageSearchQuery('')}
                className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {getFilteredPolicies().map((policy) => {
            // Get users assigned to this policy through user_policies
            const policyUsers = userPolicies
              .filter(up => up.policy_id.includes(policy.id))
              .flatMap(up => up.user_id)
              .map(userId => users.find(user => user.id === userId))
              .filter(Boolean) as User[];

            return (
              <div
                key={policy.id}
                className="bg-white rounded-xl shadow-sm p-4"
              >
                <div className="flex justify-between items-start mb-4">
                  <button 
                    onClick={() => handleEditPolicy(policy)}
                    className="text-[#4664AD] hover:text-[#3A5499] text-sm"
                  >
                    تعديل
                  </button>
                  {/* <span className="text-sm text-gray-500">
                    {new Date(policy.created_at || '').toLocaleDateString('ar-EG')}
                  </span> */}
                </div>

                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">{policy.name}</h3>
                </div>

                {policy.description && (
                  <p className="text-gray-600 text-sm mb-4">{policy.description}</p>
                )}

                <div className="flex justify-between border-t pt-2">
                  <div className="text-sm text-gray-500">
                    {policy.permissions?.district && `المحافظة: ${
                      districts.find(d => d.id.toString() === policy.permissions?.district)?.name
                    }`}
                  </div>
                  <div className="flex items-center">
                    {policyUsers.length > 0 && (
                      <div className="flex -space-x-2 rtl:space-x-reverse">
                        {[...Array(Math.min(2, policyUsers.length))].map((_, index) => (
                          <div
                            key={index}
                            className="w-7 h-7 rounded-full bg-[#4664AD] flex items-center justify-center"
                          >
                            <BsPersonFill size={16} className="text-white" />
                          </div>
                        ))}
                        {policyUsers.length > 2 && (
                          <div className="w-7 h-7 rounded-full bg-[#4664AD] flex items-center justify-center">
                            <span className="text-white text-xs font-medium">+{policyUsers.length - 2}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Updated Add/Edit Policy Modal */}
      {showAddPolicy && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center overflow-y-auto">
          <div className="bg-white max-h-[94vh] overflow-y-auto rounded-lg p-6 w-full max-w-4xl m-4">
            <h2 className="text-2xl font-bold mb-6 text-right">
              {isEditing ? 'تعديل السياسة' : 'إضافة سياسة جديدة'}
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                  اسم السياسة
                </label>
                <input
                  type="text"
                  value={newPolicy.name}
                  onChange={(e) => setNewPolicy({ ...newPolicy, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2 text-right"
                  dir="rtl"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                  الوصف
                </label>
                <textarea
                  value={newPolicy.description}
                  onChange={(e) => setNewPolicy({ ...newPolicy, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2 text-right"
                  rows={3}
                  dir="rtl"
                />
              </div>

              {/* <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                  الدور
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 text-right"
                  dir="rtl"
                >
                  <option value="">اختر الدور</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div> */}

              {/* User Assignment Section */}
              <div className="border rounded-lg p-6 mb-6 bg-white">
                <h3 className="text-xl font-semibold mb-4 text-right">تعيين المستخدمين</h3>
                
                <div className="space-y-4">
                  {/* Searchable Dropdown */}
                  <div className="relative" ref={dropdownRef}>
                    <div 
                      className="flex items-center justify-between border border-gray-300 rounded-lg p-2 cursor-pointer"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setIsDropdownOpen(true);
                        }}
                        placeholder="ابحث عن مستخدم..."
                        className="w-full border-none focus:outline-none text-right"
                        dir="rtl"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <BsChevronDown className={`transform transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>

                    {isDropdownOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {getAvailableUsers().length > 0 ? (
                          getAvailableUsers().map((user) => (
                            <div
                              key={user.id}
                              className="p-2 hover:bg-gray-100 cursor-pointer text-right"
                              onClick={() => handleUserSelect(user.id)}
                            >
                              {user.first_name} {user.last_name} ({user.email})
                            </div>
                          ))
                        ) : (
                          <div className="p-2 text-right text-gray-500">
                            لا يوجد مستخدمين
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* List of assigned users */}
                  <div className="space-y-2">
                    {selectedUsers.map((userId) => {
                      const user = users.find(u => u.id === userId);
                      return (
                        <div key={userId} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                          <div>
                            {user ? (
                              <span>
                                {user.first_name} {user.last_name} ({user.email})
                              </span>
                            ) : (
                              <span>Unknown User (ID: {userId})</span>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              setSelectedUsers(selectedUsers.filter(id => id !== userId));
                              // Also remove from userPermissions if exists
                              const userPermIndex = userPermissions.findIndex(up => up.userId === userId);
                              if (userPermIndex !== -1) {
                                handleRemoveUserPermission(userPermIndex);
                              }
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            حذف
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Permissions Section */}
              <div className="border rounded-lg p-6 mb-6 bg-white">
                <h3 className="text-xl font-semibold mb-4 text-right">صلاحيات الوصول</h3>
                <div className="space-y-4">
                  {/* Add header row for the permission columns */}
                  <div className="grid grid-cols-12 gap-4 items-center mb-2 border-b pb-2">
                    <div className="col-span-4 text-right font-bold">المجموعة</div>
                    <div className="col-span-8 grid grid-cols-6 gap-2">
                      <div className="flex justify-center font-bold">انشاء</div>
                      <div className="flex justify-center font-bold">قراءة</div>
                      <div className="flex justify-center font-bold">تعديل</div>
                      <div className="flex justify-center font-bold">حذف</div>
                      <div className="flex justify-center font-bold">مشاركة</div>
                      <div className="flex justify-center font-bold">تخصيص</div>
                    </div>
                  </div>
                                  
                  {[
                    { name: 'Complaint', label: 'الشكوى', hasCustom: true },
                    { name: 'Complaint_main_category', label: 'الفئة الرئيسية للشكوى', hasCustom: false },
                    { name: 'Complaint_sub_category', label: 'الفئة الفرعية للشكوى', hasCustom: false },
                    { name: 'District', label: 'المحافظة', hasCustom: false },
                    { name: 'Status_category', label: 'الفئة الرئيسية للحالة', hasCustom: false },
                    { name: 'Status_subcategory', label: 'الفئة الفرعية للحالة', hasCustom: false },
                    { name: 'Users', label: 'المستخدمين', hasCustom: false },
                    { name: 'user_policies', label: 'السياسات المخصصة للمستخدم', hasCustom: false },
                    { name: 'directus_policies', label: 'السياسات', hasCustom: false },
                    { name: 'directus_permissions', label: 'الصلاحيات', hasCustom: false },
                    { name: 'notification', label: 'الإشعارات', hasCustom: false },
                    { name: 'notification_users', label: 'المستخدمين المشتركين في الإشعارات', hasCustom: false },
                  ].map((collection) => (
                    <div key={collection.name} className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-4 text-right">{collection.label}</div>
                      <div className="col-span-8 grid grid-cols-6 gap-2">
                        {['create', 'read', 'update', 'delete', 'share'].map((action) => (
                          <div key={action} className="flex justify-center">
                            <button
                              onClick={() => handlePermissionToggle(collection.name, action as keyof typeof collectionPermissions[string])}
                              className={`w-5 h-5 rounded cursor-pointer transition-colors duration-200 ${
                                collectionPermissions[collection.name][action as keyof typeof collectionPermissions[string]]
                                  ? 'bg-[#4664AD] hover:bg-[#3A5499]'
                                  : 'bg-gray-200 hover:bg-gray-300'
                              }`}
                            />
                          </div>
                        ))}
                        {collection.hasCustom && (
                          <div className="flex justify-center">
                            <button
                              onClick={() => handleOpenCustomConditions(collection.name)}
                              className="px-2 py-1 text-xs bg-[#4664AD] text-white rounded hover:bg-[#3A5499]"
                            >
                              تخصيص
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center mt-6">
                <button
                  onClick={() => setShowAddPolicy(false)}
                  className="text-gray-600 hover:text-gray-800"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSavePolicy}
                  className="bg-[#4664AD] text-white px-6 py-2 rounded-lg hover:bg-[#3A5499]"
                >
                  حفظ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Conditions Modal */}
      {showCustomConditionsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-right">
              تخصيص الصلاحيات - {selectedCollection === 'Status_subcategory' ? 'الفئة الفرعية للحالة' :
                                selectedCollection === 'District' ? 'المحافظة' :
                                selectedCollection === 'Complaint' ? 'الشكوى' : ''}
            </h2>

            <div className="space-y-4">
              {/* {selectedCollection === 'Status_subcategory' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                    معرف الفئة الفرعية للحالة
                  </label>
                  <input
                    type="text"
                    value={customConditionValue}
                    onChange={(e) => setCustomConditionValue(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 text-right"
                    placeholder="أدخل معرف الفئة الفرعية"
                    dir="rtl"
                  />
                </div>
              )}

              {selectedCollection === 'District' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                    معرف المحافظة
                  </label>
                  <select
                    value={customConditionValue}
                    onChange={(e) => setCustomConditionValue(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 text-right"
                    dir="rtl"
                  >
                    <option value="">اختر المحافظة</option>
                    {districts.map((district) => (
                      <option key={district.id} value={district.id}>
                        {district.name}
                      </option>
                    ))}
                  </select>
                </div>
              )} */}

              {selectedCollection === 'Complaint' && (
                <div className="space-y-4">
                  {/* District Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                      المحافظة
                    </label>
                    <select
                      value={customConditionValue}
                      onChange={(e) => setCustomConditionValue(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2 text-right"
                      dir="rtl"
                    >
                      <option value="">اختر المحافظة</option>
                      {districts.map((district) => (
                        <option key={district.id} value={district.id}>
                          {district.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Status Subcategory Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                      الفئة الفرعية للحالة
                    </label>
                    <select
                      value={customConditionValue2}
                      onChange={(e) => setCustomConditionValue2(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2 text-right"
                      dir="rtl"
                    >
                      <option value="">اختر الفئة الفرعية للحالة</option>
                      {subCategories.map(sub => (
                        <option key={sub.id} value={sub.id}>{sub.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowCustomConditionsModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSaveCustomConditions}
                  className="px-4 py-2 bg-[#4664AD] text-white rounded-lg"
                >
                  حفظ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
