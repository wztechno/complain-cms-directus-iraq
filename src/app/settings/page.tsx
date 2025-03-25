'use client';

import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '@/utils/api';
import { BsFilter, BsPersonFill } from 'react-icons/bs';

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
    status_subcategory_id?: string;
    complaint_subcategory_id?: string;
  };
}

interface CollectionPermissions {
  [key: string]: CollectionPermission;
}

// Function to create a default empty permissions object
const createEmptyCollectionPermissions = (): CollectionPermissions => {
  return {
    Complaint: { create: false, read: false, update: false, delete: false, share: false, customConditions: {} },
    Complaint_main_category: { create: false, read: false, update: false, delete: false, share: false, customConditions: {} },
    Complaint_sub_category: { create: false, read: false, update: false, delete: false, share: false, customConditions: {} },
    District: { create: false, read: false, update: false, delete: false, share: false, customConditions: {} },
    Status_category: { create: false, read: false, update: false, delete: false, share: false, customConditions: {} },
    Status_subcategory: { create: false, read: false, update: false, delete: false, share: false, customConditions: {} },
    Users: { create: false, read: false, update: false, delete: false, share: false, customConditions: {} }
  };
};

export default function SettingsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [subCategories, setSubCategories] = useState<StatusSubCategory[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddPolicy, setShowAddPolicy] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);
  const [newPolicy, setNewPolicy] = useState({
    name: '',
    description: '',
    enforce_tfa: false,
    admin_access: false,
    app_access: true,
    roles: [] as string[],
    permissions: {} as { [key: string]: { district?: string; status_subcategory?: number[]; complaint_subcategory?: number[] } }
  });
  const [collectionPermissions, setCollectionPermissions] = useState<CollectionPermissions>(createEmptyCollectionPermissions());
  const [showCustomConditionsModal, setShowCustomConditionsModal] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [customConditionValue, setCustomConditionValue] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [rolesData, policiesData, districtsData, subCategoriesData, usersData] = await Promise.all([
        fetchWithAuth('/roles'),
        fetchWithAuth('/policies'),
        fetchWithAuth('/items/District'),
        fetchWithAuth('/items/Status_subcategory'),
        fetchWithAuth('/users')
      ]);

      setRoles(rolesData.data);
      setPolicies(policiesData.data);
      setDistricts(districtsData.data);
      setSubCategories(subCategoriesData.data.filter((sub: StatusSubCategory) => sub.name !== null));
      setUsers(usersData.data);
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
  
  // Update the handleEditPolicy function to properly initialize userPermissions
  const handleEditPolicy = async (policy: Policy) => {
    setIsEditing(true);
    setEditingPolicyId(policy.id);
    setSelectedRole(policy.roles[0] || '');
    setSelectedUsers(policy.users || []);
  
    // Initialize default permissions (all unchecked)
    const defaultCollectionPermissions: CollectionPermissions = {
      Complaint: { create: false, read: false, update: false, delete: false, share: false, customConditions: {} },
      Complaint_main_category: { create: false, read: false, update: false, delete: false, share: false, customConditions: {} },
      Complaint_sub_category: { create: false, read: false, update: false, delete: false, share: false, customConditions: {} },
      District: { create: false, read: false, update: false, delete: false, share: false, customConditions: {} },
      Status_category: { create: false, read: false, update: false, delete: false, share: false, customConditions: {} },
      Status_subcategory: { create: false, read: false, update: false, delete: false, share: false, customConditions: {} },
      Users: { create: false, read: false, update: false, delete: false, share: false, customConditions: {} }
    };
  
    // Fetch permissions associated with this policy
    try {
      console.log(`Fetching permissions for policy: ${policy.id}`);
      const permissionsResponse = await fetchWithAuth(`/permissions?filter[policy][_eq]=${policy.id}`);
      const permissionsData = permissionsResponse.data;
      
      console.log('Permissions data:', permissionsData);
  
      // Convert permissions to userPermissions format for user-specific permissions
      const userPerms = permissionsData
        .filter((perm: any) => perm.user) // Only include user-specific permissions
        .map((perm: any) => {
          // Extract district from permissions JSON
          const district = perm.permissions?._and?.[0]?.district?._eq;
          // Extract status subcategories and complaint subcategories
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
  
      // Parse permissions for collections
      for (const permission of permissionsData) {
        // Skip user-specific permissions as we already handled them
        if (permission.user) continue;
        
        const { collection, action, permissions: permissionFilters } = permission;
        
        // Make sure collection exists in our state
        if (defaultCollectionPermissions[collection]) {
          // Set the permission to true
          if (action === 'create' || action === 'read' || action === 'update' || action === 'delete' || action === 'share') {
            defaultCollectionPermissions[collection][action as keyof CollectionPermission] = true;
          }
          
          // Handle custom conditions
          if (permissionFilters && Object.keys(permissionFilters).length > 0) {
            console.log(`Custom conditions for ${collection}:`, permissionFilters);
            
            // Extract custom ID or district conditions
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
              // For Complaint, look for district filter
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
  
      // Set the collection permissions state with the parsed values
      console.log('Setting collection permissions:', defaultCollectionPermissions);
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
      roles: policy.roles,
      permissions: policy.permissions || {}
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

  // Add this function to handle custom conditions
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

  // Update the handleSavePolicy function
  const handleSavePolicy = async () => {
    try {
      // Create/Update policy first to get the policy ID
      const initialPolicyData = {
        name: newPolicy.name,
        description: newPolicy.description || null,
        enforce_tfa: newPolicy.enforce_tfa,
        admin_access: newPolicy.admin_access,
        app_access: newPolicy.app_access,
        role: selectedRole,
        users: userPermissions.map(p => p.userId),
        permissions: [] // Start with empty permissions
      };

      // If editing, delete existing permissions first
      if (isEditing && editingPolicyId) {
        try {
          const existingPermissions = await fetchWithAuth(`/permissions?filter[policy][_eq]=${editingPolicyId}`);
          if (existingPermissions.data) {
            await Promise.all(
              existingPermissions.data.map(async (perm: any) => {
                await fetchWithAuth(`/permissions/${perm.id}`, {
                  method: 'DELETE'
                });
              })
            );
          }
        } catch (error) {
          console.error('Error deleting existing permissions:', error);
        }
      }

      // Create/Update policy to get the ID
      const endpoint = isEditing ? `/policies/${editingPolicyId}` : '/policies';
      const method = isEditing ? 'PATCH' : 'POST';

      const policyResponse = await fetchWithAuth(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(initialPolicyData)
      });

      if (!policyResponse.data) {
        throw new Error('Failed to create/update policy');
      }

      // Get the policy ID
      const policyId = isEditing ? editingPolicyId : policyResponse.data.id;
      
      if (!policyId) {
        throw new Error('Policy ID not found');
      }

      // Now create permissions with the policy ID
      const createdPermissionIds: string[] = [];
      
      for (const [collection, actions] of Object.entries(collectionPermissions)) {
        for (const [action, enabled] of Object.entries(actions)) {
          if (action === 'customConditions' || !enabled) continue;

          let permissionData: any = {
            collection,
            action,
            role: selectedRole,
            fields: ["*"],
            policy: policyId // Include the policy ID here
          };

          // Add custom conditions based on collection type
          if (actions.customConditions?.id) {
            if (collection === 'Status_subcategory') {
              permissionData.permissions = {
                _and: [{
                  id: { _eq: actions.customConditions.id }
                }]
              };
            } else if (collection === 'District') {
              permissionData.permissions = {
                _and: [{
                  id: { _eq: actions.customConditions.id }
                }]
              };
            } else if (collection === 'Complaint') {
              permissionData.permissions = {
                _and: [{
                  district: { _eq: actions.customConditions.id }
                }]
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

      // Update the policy with the created permission IDs
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

      // Reset state and refresh data
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
        permissions: {}
      });
      setUserPermissions([]);
      setSelectedUsers([]);
      setSelectedRole('');
      fetchInitialData();
    } catch (error) {
      console.error('Error saving policy:', error);
      alert('حدث خطأ أثناء حفظ السياسة. يرجى المحاولة مرة أخرى.');
    }
  };

  // Add this function to handle opening the custom conditions modal
  const handleOpenCustomConditions = (collection: string) => {
    setSelectedCollection(collection);
    setCustomConditionValue('');
    setShowCustomConditionsModal(true);
  };

  // Add this function to handle saving custom conditions
  const handleSaveCustomConditions = () => {
    if (!selectedCollection || !customConditionValue) return;

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

    setShowCustomConditionsModal(false);
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
                  permissions: {}
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {policies.map((policy) => (
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
                <span className="text-sm text-gray-500">
                  {new Date(policy.created_at || '').toLocaleDateString('ar-EG')}
                </span>
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
                  {policy?.users?.length > 0 && (
                    <div className="flex -space-x-2 rtl:space-x-reverse">
                      {[...Array(Math.min(2, policy?.users?.length || 0))].map((_, index) => (
                        <div
                          key={index}
                          className="w-7 h-7 rounded-full bg-[#4664AD] flex items-center justify-center"
                        >
                          <BsPersonFill size={16} className="text-white" />
                        </div>
                      ))}
                      {policy.users.length > 2 && (
                        <div className="w-7 h-7 rounded-full bg-[#4664AD] flex items-center justify-center">
                          <span className="text-white text-xs font-medium">+{policy.users.length - 2}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
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

              <div>
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
              </div>

              {/* New Permissions Section */}
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
                    { name: 'Complaint_sub_category', label: 'الفئة الفرعية للشكوى', hasCustom: true },
                    { name: 'District', label: 'المحافظة', hasCustom: true },
                    { name: 'Status_category', label: 'الفئة الرئيسية للحالة', hasCustom: true },
                    { name: 'Status_subcategory', label: 'الفئة الفرعية للحالة', hasCustom: true },
                    { name: 'Users', label: 'المستخدمين', hasCustom: false }
                    
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
              {selectedCollection === 'Status_subcategory' && (
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
              )}

              {selectedCollection === 'Complaint' && (
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