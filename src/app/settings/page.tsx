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
  subcategories?: string[];
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
      subcategories?: string[];
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
    permissions: {} as { [key: string]: { district?: string; subcategories?: string[] } }
  });

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
    setUserPermissions([...userPermissions, { userId: '', district: '', subcategories: [] }]);
  };

  const handleUserPermissionChange = (index: number, field: keyof UserPermission, value: any) => {
    const updatedPermissions = [...userPermissions];
    if (field === 'userId') {
      updatedPermissions[index] = {
        ...updatedPermissions[index],
        [field]: value
      };
      setSelectedUsers([...selectedUsers, value]);
    } else {
      updatedPermissions[index] = {
        ...updatedPermissions[index],
        [field]: value
      };
    }
    setUserPermissions(updatedPermissions);

    // Update newPolicy permissions
    const updatedPermissions2 = { ...newPolicy.permissions };
    updatedPermissions2[updatedPermissions[index].userId] = {
      district: updatedPermissions[index].district,
      subcategories: updatedPermissions[index].subcategories
    };
    setNewPolicy({
      ...newPolicy,
      permissions: updatedPermissions2
    });
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

  const handleEditPolicy = (policy: Policy) => {
    setIsEditing(true);
    setEditingPolicyId(policy.id);
    setSelectedRole(policy.roles[0] || '');
    setSelectedUsers(policy.users || []);
    
    // Convert policy permissions to userPermissions format
    const permissions = policy.permissions || {};
    const userPerms = Object.entries(permissions).map(([userId, perm]) => ({
      userId,
      district: perm.district || '',
      subcategories: perm.subcategories || []
    }));
    setUserPermissions(userPerms);
    
    setNewPolicy({
      name: policy.name,
      description: policy.description || '',
      enforce_tfa: policy.enforce_tfa,
      admin_access: policy.admin_access,
      app_access: policy.app_access,
      roles: policy.roles,
      permissions: permissions
    });
    
    setShowAddPolicy(true);
  };

  const handleSavePolicy = async () => {
    try {
      // Format the policy data according to the API requirements
      const policyData = {
        name: newPolicy.name,
        description: newPolicy.description,
        enforce_tfa: newPolicy.enforce_tfa,
        admin_access: newPolicy.admin_access,
        app_access: newPolicy.app_access,
        role: selectedRole, // Single role instead of array
        users: userPermissions.map(permission => ({
          id: permission.userId,
          district: permission.district,
          subcategories: permission.subcategories || []
        }))
      };

      const endpoint = isEditing ? `/policies/${editingPolicyId}` : '/policies';
      const method = isEditing ? 'PATCH' : 'POST';

      await fetchWithAuth(endpoint, {
        method,
        body: JSON.stringify(policyData)
      });

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
      // Show error message to user
      alert('حدث خطأ أثناء حفظ السياسة. يرجى المحاولة مرة أخرى.');
    }
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
      {/* Roles Section */}
      <div className="mb-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">الأدوار</h1>
          <div className="flex gap-3">
            <button className="bg-[#4664AD] text-white px-4 py-2 rounded-lg text-sm">
              تصدير البيانات
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map((role) => (
            <div
              key={role.id}
              className="bg-white rounded-xl shadow-sm p-4"
            >
              <div className="flex justify-between items-start mb-4">
                <button className="text-gray-400">
                  <span className="text-xl">⋮</span>
                </button>
                <span className="text-sm text-gray-500">
                  {new Date(role.created_at || '').toLocaleDateString('ar-EG')}
                </span>
              </div>

              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">{role.name}</h3>
              </div>

              {role.description && (
                <p className="text-gray-600 text-sm mb-4">{role.description}</p>
              )}
            </div>
          ))}
        </div>
      </div>

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
                  {policy.users.length > 0 && (
                    <div className="flex -space-x-2 rtl:space-x-reverse">
                      {[...Array(Math.min(2, policy.users.length))].map((_, index) => (
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {isEditing ? 'تعديل السياسة' : 'إضافة سياسة جديدة'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  اسم السياسة
                </label>
                <input
                  type="text"
                  value={newPolicy.name}
                  onChange={(e) => setNewPolicy({ ...newPolicy, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الوصف
                </label>
                <textarea
                  value={newPolicy.description}
                  onChange={(e) => setNewPolicy({ ...newPolicy, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الدور
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2"
                >
                  <option value="">اختر الدور</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
              </div>

              {/* User Permissions Section */}
              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">صلاحيات المستخدمين</h3>
                  <button
                    onClick={handleAddUserToPolicy}
                    className="bg-[#4664AD] text-white px-3 py-1 rounded-lg text-sm"
                  >
                    إضافة مستخدم
                  </button>
                </div>

                {userPermissions.map((permission, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg mb-4">
                    <div className="flex justify-between items-start mb-3">
                      <button
                        onClick={() => handleRemoveUserPermission(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        ✕
                      </button>
                      <span className="text-sm font-medium">مستخدم {index + 1}</span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          المستخدم
                        </label>
                        <select
                          value={permission.userId}
                          onChange={(e) => handleUserPermissionChange(index, 'userId', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg p-2"
                        >
                          <option value="">اختر المستخدم</option>
                          {users
                            .filter(user => !selectedUsers.includes(user.id) || user.id === permission.userId)
                            .map((user) => (
                              <option key={user.id} value={user.id}>
                                {user.first_name} {user.last_name} ({user.email})
                              </option>
                            ))
                          }
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          المحافظة
                        </label>
                        <select
                          value={permission.district}
                          onChange={(e) => handleUserPermissionChange(index, 'district', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg p-2"
                        >
                          <option value="">اختر المحافظة</option>
                          {districts.map((district) => (
                            <option key={district.id} value={district.id.toString()}>
                              {district.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          الفئات الفرعية للحالة
                        </label>
                        <select
                          multiple
                          value={permission.subcategories}
                          onChange={(e) => handleUserPermissionChange(
                            index,
                            'subcategories',
                            Array.from(e.target.selectedOptions, option => option.value)
                          )}
                          className="w-full border border-gray-300 rounded-lg p-2"
                          size={3}
                        >
                          {subCategories.map((subCategory) => (
                            <option key={subCategory.id} value={subCategory.id.toString()}>
                              {subCategory.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newPolicy.enforce_tfa}
                  onChange={(e) => setNewPolicy({ ...newPolicy, enforce_tfa: e.target.checked })}
                  id="enforce_tfa"
                />
                <label htmlFor="enforce_tfa" className="text-sm">
                  تفعيل المصادقة الثنائية
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newPolicy.admin_access}
                  onChange={(e) => setNewPolicy({ ...newPolicy, admin_access: e.target.checked })}
                  id="admin_access"
                />
                <label htmlFor="admin_access" className="text-sm">
                  صلاحيات المسؤول
                </label>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
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
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSavePolicy}
                  className="px-4 py-2 bg-[#4664AD] text-white rounded-lg"
                >
                  {isEditing ? 'حفظ التغييرات' : 'إضافة'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 