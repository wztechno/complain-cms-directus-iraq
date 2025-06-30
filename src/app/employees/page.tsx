'use client';

import React, { useState, useEffect } from 'react';
import { FaPlus, FaEye, FaEyeSlash } from 'react-icons/fa';
import { GrFilter } from 'react-icons/gr';
import PermissionGuard from '@/components/PermissionGuard';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  password?: string;
  role: string;
  status: string;
  last_access?: string;
  language?: string;
}

interface Role {
  id: string;
  name: string;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const [filters, setFilters] = useState({
    name: '',
    email: '',
    role: '',
    status: '',
  });

  const [newEmployee, setNewEmployee] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role: '',
  });

  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetchEmployeesAndRoles();
  }, []);

  useEffect(() => {
    handleFilter();
  }, [filters]);

  const fetchEmployeesAndRoles = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Fetch employees from the API endpoint
      const employeesResponse = await fetch('https://complaint.top-wp.com/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!employeesResponse.ok) {
        throw new Error('Failed to fetch employees');
      }

      const employeesData = await employeesResponse.json();

      // Fetch roles from Directus API
      const rolesResponse = await fetch('https://complaint.top-wp.com/roles', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!rolesResponse.ok) {
        throw new Error('Failed to fetch roles');
      }

      const rolesData = await rolesResponse.json();

      setEmployees(employeesData.data || []);
      setFilteredEmployees(employeesData.data || []);
      setRoles(rolesData.data || []);
    } catch (error) {
      console.error('Error fetching employees or roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    let filtered = [...employees];

    if (filters.name) {
      filtered = filtered.filter(emp =>
        `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(filters.name.toLowerCase())
      );
    }

    if (filters.email) {
      filtered = filtered.filter(emp =>
        emp.email.toLowerCase().includes(filters.email.toLowerCase())
      );
    }

    if (filters.role) {
      filtered = filtered.filter(emp => emp.role === filters.role);
    }

    if (filters.status) {
      filtered = filtered.filter(emp => emp.status === filters.status);
    }

    setFilteredEmployees(filtered);
  };

  const handleAddEmployee = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('https://complaint.top-wp.com/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: newEmployee.first_name,
          last_name: newEmployee.last_name,
          email: newEmployee.email,
          password: newEmployee.password,
          role: newEmployee.role,
          status: 'active',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create employee');
      }

      // Reset form and close modal
      setNewEmployee({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        role: '',
      });
      setShowAddModal(false);
      
      // Refresh the employees list
      fetchEmployeesAndRoles();
    } catch (error) {
      console.error('Error creating employee:', error);
      alert('حدث خطأ أثناء إضافة الموظف');
    }
  };

  const getRoleName = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    return role ? role.name : 'غير محدد';
  };

  const formatLastAccess = (lastAccess: string | undefined) => {
    if (!lastAccess) return 'لم يسجل دخول';
    return new Date(lastAccess).toLocaleDateString('ar-EG');
  };

  if (loading) {
    return (
      <div className="p-8 mr-64 flex justify-center items-center min-h-screen">
        <div className="text-xl text-gray-600">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <PermissionGuard requiredPermissions={[{ resource: 'directus_users', action: 'read' }]}>
      <div className="p-8 mr-64">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">الموظفين</h1>
          <div className="flex gap-4">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="h-10 w-10 hover:bg-[#4664AD] text-[#4664AD] hover:text-[#F9FAFB] p-2 rounded-lg bg-[#F9FAFB] flex items-center justify-center"
            >
              <GrFilter />
            </button>
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-[#4664AD] hover:bg-[#F9FAFB] hover:text-[#4664AD] text-[#F9FAFB] px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <FaPlus />
              إضافة موظف
            </button>
          </div>
        </div>

        {/* Filters Section */}
        {showFilters && (
          <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                  الاسم
                </label>
                <input
                  type="text"
                  value={filters.name}
                  onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-md p-2 text-right"
                  placeholder="بحث بالاسم..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                  البريد الإلكتروني
                </label>
                <input
                  type="text"
                  value={filters.email}
                  onChange={(e) => setFilters({ ...filters, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-md p-2 text-right"
                  placeholder="بحث بالبريد الإلكتروني..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                  الدور
                </label>
                <select
                  value={filters.role}
                  onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                  className="w-full border border-gray-300 rounded-md p-2 text-right"
                >
                  <option value="">كل الأدوار</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                  الحالة
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full border border-gray-300 rounded-md p-2 text-right"
                >
                  <option value="">كل الحالات</option>
                  <option value="active">نشط</option>
                  <option value="inactive">غير نشط</option>
                  <option value="invited">مدعو</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Employees Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmployees.map((employee) => (
            <div
              key={employee.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="text-gray-500 text-sm">
                  {formatLastAccess(employee.last_access)}
                </div>
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  employee.status === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {employee.status === 'active' ? 'نشط' : 'غير نشط'}
                </div>
              </div>

              <h3 className="text-xl font-semibold mb-2">
                {employee.first_name} {employee.last_name}
              </h3>
              <p className="text-gray-600 mb-2">{employee.email}</p>
              <p className="text-sm text-gray-500 mb-4">
                الدور: {getRoleName(employee.role)}
              </p>
              
              {employee.language && (
                <p className="text-sm text-gray-500">
                  اللغة: {employee.language}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Add Employee Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h2 className="text-2xl font-bold mb-4 text-right">إضافة موظف جديد</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                    الاسم الأول *
                  </label>
                  <input
                    type="text"
                    value={newEmployee.first_name}
                    onChange={(e) => setNewEmployee({ ...newEmployee, first_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-md p-2 text-right"
                    placeholder="الاسم الأول"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                    الاسم الأخير *
                  </label>
                  <input
                    type="text"
                    value={newEmployee.last_name}
                    onChange={(e) => setNewEmployee({ ...newEmployee, last_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-md p-2 text-right"
                    placeholder="الاسم الأخير"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                    البريد الإلكتروني *
                  </label>
                  <input
                    type="email"
                    value={newEmployee.email}
                    onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                    className="w-full border border-gray-300 rounded-md p-2"
                    placeholder="example@domain.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                    كلمة المرور *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newEmployee.password}
                      onChange={(e) => setNewEmployee({ ...newEmployee, password: e.target.value })}
                      className="w-full border border-gray-300 rounded-md p-2 pr-10"
                      placeholder="كلمة المرور"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500"
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 text-right mb-1">
                    الدور *
                  </label>
                  <select
                    value={newEmployee.role}
                    onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })}
                    className="w-full border border-gray-300 rounded-md p-2 text-right"
                    required
                  >
                    <option value="">اختر الدور</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={handleAddEmployee}
                  disabled={!newEmployee.first_name || !newEmployee.last_name || !newEmployee.email || !newEmployee.password || !newEmployee.role}
                  className="flex-1 bg-[#4664AD] hover:bg-[#3a5491] text-white px-4 py-2 rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  إضافة
                </button>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setNewEmployee({
                      first_name: '',
                      last_name: '',
                      email: '',
                      password: '',
                      role: '',
                    });
                  }}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
} 