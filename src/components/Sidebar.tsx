'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaClipboardList, FaHistory, FaListUl, FaStar, FaLayerGroup, FaMapMarkedAlt, FaTags, FaUsers, FaCog, FaSignOutAlt, FaBell, FaNewspaper, FaUserTie } from 'react-icons/fa';
import { IoMdGitNetwork } from 'react-icons/io';
import { IoMenu } from 'react-icons/io5';
import { useAuth } from '@/contexts/AuthContext';

interface SidebarItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  collection: string;
  adminOnly?: boolean;
}

interface PermissionData {
  action: string;
  collection: string;
  policy: string;
  [key: string]: unknown;
}

const Sidebar = () => {
  const pathname = usePathname();
  const [visibleItems, setVisibleItems] = useState<SidebarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { logout } = useAuth();
  
  // Define all possible menu items with their corresponding collections
  const allMenuItems: SidebarItem[] = useMemo(() => [
    { title: 'الشكاوى', href: '/complaints', icon: <FaClipboardList size={20} />, collection: 'Complaint' },
    { title: 'الحالة الزمنية للشكوى', href: '/timeline', icon: <FaHistory size={20} />, collection: 'Complaint_timeline' },
    { title: 'الفئة الأساسية للشكوى', href: '/complaints/main-category', icon: <FaListUl size={20} />, collection: 'Complaint_main_category' },
    { title: 'التقييم على كل شكوى', href: '/complaints/ratings', icon: <FaStar size={20} />, collection: 'Complaint_ratings' },
    { title: 'الفئة الفرعية للشكوى', href: '/complaints/sub-category', icon: <FaLayerGroup size={20} />, collection: 'Complaint_sub_category' },
    { title: 'المحافظات', href: '/governorates', icon: <FaMapMarkedAlt size={20} />, collection: 'District' },
    { title: 'الفئة الأساسية للمعالجة', href: '/status/main-category', icon: <IoMdGitNetwork size={20} />, collection: 'Status_category' },
    { title: 'الفئة الفرعية للمعالجة', href: '/status/sub-category', icon: <FaTags size={20} />, collection: 'Status_subcategory' },
    { title: 'المواطنون', href: '/citizens', icon: <FaUsers size={20} />, collection: 'Users' },
    { title: 'الموظفين', href: '/employees', icon: <FaUserTie size={20} />, collection: 'directus_users'},
    { title: 'الإشعارات', href: '/notifications', icon: <FaBell size={20} />, collection: 'notification', adminOnly: true },
    { title: 'الأخبار', href: '/news', icon: <FaNewspaper size={20} />, collection: 'news', adminOnly: true },
    { title: 'الإعدادات', href: '/settings', icon: <FaCog size={20} />, collection: 'settings' },
  ], []);

  // Check if user is admin based on stored user info
  const isAdmin = useMemo(() => {
    const ADMIN_ROLE_ID = '0FE8C81C-035D-41AC-B3B9-72A35678C558';
    const storedUserInfo = localStorage.getItem('user_info');
    if (storedUserInfo) {
      try {
        const userInfoData = JSON.parse(storedUserInfo);
        return userInfoData?.role === ADMIN_ROLE_ID || userInfoData?.admin_access === true;
      } catch (error) {
        console.error("Error checking admin role:", error);
        return false;
      }
    }
    return false;
  }, []);

  // Effect to load permissions and filter menu items
  useEffect(() => {
    const loadPermissions = async () => {
      try {
        setLoading(true);

        // Get user info from localStorage
        const userInfoStr = localStorage.getItem('user_info');
        if (!userInfoStr) {
          console.log("No user info in localStorage");
          setVisibleItems([]);
          setLoading(false);
          return;
        }

        const token = localStorage.getItem('auth_token');
        if (!token) {
          console.log("No auth token in localStorage");
          setVisibleItems([]);
          setLoading(false);
          return;
        }

        // If user is admin, show all menu items except settings (we'll add it conditionally)
        if (isAdmin) {
          console.log("Admin user detected - showing all menu items");
          setVisibleItems(allMenuItems);
          setLoading(false);
          return;
        }

        const userInfo = JSON.parse(userInfoStr);
        const userId = userInfo.id;
        
        // Step 1: Fetch user's policy ID
        const policiesResponse = await fetch(
          `https://complaint.top-wp.com/items/user_policies?filter[user_id][directus_users_id][_eq]=${userId}&fields=*,policy_id.*,user_id.*`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        if (!policiesResponse.ok) {
          console.error(`Error fetching policies: ${policiesResponse.status} ${policiesResponse.statusText}`);
          throw new Error('Failed to fetch user policies');
        }

        const policiesData = await policiesResponse.json();
        if (!policiesData?.data?.length) {
          console.error("No policy data found in response");
          throw new Error('No policy data found for user');
        }
        
        const policyIdData = policiesData.data[0]?.policy_id;
        let policyId;
        console.log("Policy ID data:", policyIdData);
        
        // Handle the nested structure: policy_id is an array of objects with directus_policies_id
        if (Array.isArray(policyIdData) && policyIdData.length > 0) {
          policyId = policyIdData[0]?.directus_policies_id;
        } else if (typeof policyIdData === 'object' && policyIdData?.directus_policies_id) {
          policyId = policyIdData.directus_policies_id;
        } else if (typeof policyIdData === 'string') {
          policyId = policyIdData;
        }
        
        if (!policyId) {
          console.error("Could not extract a valid policy ID", { policyIdData });
          throw new Error('No policy found for user');
        }

        console.log("Extracted policy ID:", policyId);

        // Step 2: Fetch permissions for this policy
        const permissionsResponse = await fetch(
          `https://complaint.top-wp.com/permissions?filter[policy][_eq]=${policyId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            method: 'GET'
          }
        );
        
        if (!permissionsResponse.ok) {
          console.error(`Error fetching permissions: ${permissionsResponse.status} ${permissionsResponse.statusText}`);
          throw new Error(`Failed to fetch permissions for policy ${policyId}`);
        }
        
        const permissionsData = await permissionsResponse.json();
        if (!permissionsData?.data) {
          console.error("No permissions data found in response");
          throw new Error(`No permissions found for policy ${policyId}`);
        }
        
        // Create a map of collections with read permissions
        const readableCollections = new Set<string>();
        permissionsData.data.forEach((permission: PermissionData) => {
          if (permission.action === 'read') {
            const collection = permission.collection;
            if (collection) {
              readableCollections.add(collection.toLowerCase());
            }
          }
        });

        // Filter menu items based on permissions (excluding settings for non-admins)
        const filteredItems = allMenuItems.filter(item => {
          // Always exclude settings and adminOnly items for non-admins
          if (item.collection === 'settings' || item.adminOnly) return false;
          
          const collectionLower = item.collection.toLowerCase();
          return readableCollections.has(collectionLower);
        });

        // If no items found, show at least complaints if available
        if (filteredItems.length === 0) {
          const complaintsItem = allMenuItems.find(item => item.collection === 'Complaint');
          if (complaintsItem) {
            filteredItems.push(complaintsItem);
          }
        }

        setVisibleItems(filteredItems);
      } catch (error) {
        console.error('Error in loadPermissions:', error);
        setVisibleItems([]);
      } finally {
        setLoading(false);
      }
    };

    loadPermissions();
  }, [allMenuItems, isAdmin]);

  const isActive = (href: string) => pathname === href;

  const handleLogout = () => {
    setVisibleItems([]); 
    logout();
  };

  if (loading) {
    return (
      <div className="w-64 bg-[#4664AD] text-white h-screen fixed right-0 top-0">
        <div className="flex justify-between items-center border-b-4 border-white pb-4 p-4">
          <IoMenu className="h-10 w-10" />
          <img src="/logo.png" alt="Logo" className="w-16 h-14" />
        </div>
        <div className="flex justify-center items-center h-32">
          <div className="text-white text-sm">جاري تحميل القائمة...</div>
        </div>
      </div>
    );
  }

  // Final items to display - include settings only for admins
  const displayItems = isAdmin 
    ? allMenuItems 
    : visibleItems;

  return (
    <div className="w-64 bg-[#4664AD] text-white h-screen fixed right-0 top-0 flex flex-col">
      <div className="flex justify-between items-center border-b-4 border-white pb-4 p-4">
        <IoMenu className="h-10 w-10" />
        <div className="flex flex-col items-end">
          <img src="/logo.png" alt="Logo" className="w-16 h-14" />
          {isAdmin && (
            <div className="bg-yellow-400 text-blue-900 text-xs font-bold px-2 py-0.5 rounded mt-1">
              مسؤول النظام
            </div>
          )}
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto">
        {displayItems.map((item, index) => (
          <Link key={index} href={item.href}>
            <div
              className={`flex items-center justify-between py-4 px-4 mb-2 transition-colors font-cairo ${
                isActive(item.href) ? 'bg-white text-[#4664AD]' : 'hover:bg-[#4B69A8]'
              }`}
            >
              <div className="flex items-center gap-3 px-1">
                <div
                  className={`h-8 w-8 flex items-center justify-center ${
                    isActive(item.href) ? 'text-[#4664AD]' : 'text-white'
                  }`}
                >
                  {item.icon}
                </div>
                <span>{item.title}</span>
              </div>
            </div>
          </Link>
        ))}
      </nav>
      <div className="mt-auto border-t border-white">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-5 py-4 hover:bg-[#4B69A8] transition-colors text-right"
        >
          <FaSignOutAlt size={20} />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;