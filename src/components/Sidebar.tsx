'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaClipboardList, FaHistory, FaListUl, FaStar, FaLayerGroup, FaMapMarkedAlt, FaTags, FaUsers, FaCog, FaSignOutAlt } from 'react-icons/fa';
import { IoMdGitNetwork } from 'react-icons/io';
import { IoMenu } from 'react-icons/io5';
import { getUserPermissions, hasPermission, clearPermissionsCache } from '@/utils/permissions';
import { useAuth } from '@/contexts/AuthContext';

interface SidebarItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  collection: string; // Collection name for permission check
}

const Sidebar = () => {
  const pathname = usePathname();
  const activeColor = "#4664AD"; // Sidebar blue color
  const [visibleItems, setVisibleItems] = useState<SidebarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { logout, userInfo } = useAuth();
  
  // Use a ref to track if we've already loaded permissions to prevent infinite loops
  const permissionsLoadedRef = useRef(false);

  // Store previous user ID to detect user changes
  const previousUserIdRef = useRef<string | null>(null);

  // Define all possible menu items with their corresponding collections
  const allMenuItems: SidebarItem[] = useMemo(() => [
    { title: 'الشكاوى', href: '/complaints', icon: <FaClipboardList size={20} />, collection: 'Complaint' },
    { title: 'الحالة الزمنية للشكوى', href: '/timeline', icon: <FaHistory size={20} />, collection: 'ComplaintTimeline' },
    { title: 'الفئة الأساسية للشكوى', href: '/complaints/main-category', icon: <FaListUl size={20} />, collection: 'Complaint_main_category' },
    { title: 'التقييم على كل شكوى', href: '/complaints/ratings', icon: <FaStar size={20} />, collection: 'Complaint_ratings' },
    { title: 'الفئة الفرعية للشكوى', href: '/complaints/sub-category', icon: <FaLayerGroup size={20} />, collection: 'Complaint_sub_category' },
    { title: 'المحافظات', href: '/governorates', icon: <FaMapMarkedAlt size={20} />, collection: 'District' },
    { title: 'الفئة الأساسية للحالة', href: '/status/main-category', icon: <IoMdGitNetwork size={20} />, collection: 'Status_category' },
    { title: 'الفئة الفرعية للحالة', href: '/status/sub-category', icon: <FaTags size={20} />, collection: 'Status_subcategory' },
    { title: 'المواطنون', href: '/citizens', icon: <FaUsers size={20} />, collection: 'Users' },
    // Settings is available to everyone who is logged in
    { title: 'الإعدادات', href: '/settings', icon: <FaCog size={20} />, collection: 'settings' },
  ], []);

  // Check if user is admin based on stored user info
  const isAdmin = useMemo(() => {
    const ADMIN_ROLE_ID = '8A8C7803-08E5-4430-9C56-B2F20986FA56';
    const storedUserInfo = localStorage.getItem('user_info');
    if (storedUserInfo) {
      try {
        const userInfoData = JSON.parse(storedUserInfo);
        return userInfoData?.role?.id === ADMIN_ROLE_ID;
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

        // If user is admin, show all menu items
        if (isAdmin) {
          console.log("Admin user detected - showing all menu items");
          setVisibleItems(allMenuItems);
          setLoading(false);
          return;
        }

        // For regular users, fetch permissions
        const userPermissions = await getUserPermissions();
        console.log("User permissions:", userPermissions);

        // Filter menu items based on permissions
        const filteredItems = allMenuItems.filter(item => {
          // Settings is always visible
          if (item.collection === 'settings') {
            return true;
          }

          // Check if user has read permission for the collection
          const hasAccess = hasPermission(userPermissions, item.collection, 'read');
          console.log(`Checking permission for ${item.collection}: ${hasAccess}`);
          return hasAccess;
        });

        console.log("Filtered menu items:", filteredItems);
        setVisibleItems(filteredItems);
      } catch (error) {
        console.error('Error loading permissions:', error);
        // Show only settings on error
        const settingsItem = allMenuItems.find(item => item.collection === 'settings');
        setVisibleItems(settingsItem ? [settingsItem] : []);
      } finally {
        setLoading(false);
      }
    };

    loadPermissions();
  }, [allMenuItems, isAdmin]);

  // Memoize the isActive function to prevent recreating it on every render
  const isActive = useMemo(() => (href: string) => {
    if (href === '/complaints') {
      return pathname === href || (pathname.startsWith('/complaints/') && !visibleItems.some(item => item.href !== '/complaints' && pathname === item.href));
    }
    return pathname === href;
  }, [pathname, visibleItems]);

  const handleLogout = () => {
    // Reset permissions loaded flag before logout to ensure fresh permissions on next login
    permissionsLoadedRef.current = false;
    previousUserIdRef.current = null;
    setVisibleItems([]); // Clear the visible items
    clearPermissionsCache(); // Clear the permissions cache
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
        {visibleItems.map((item, index) => (
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
      {/* Logout Button */}
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
