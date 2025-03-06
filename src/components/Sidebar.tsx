import React from 'react';
import Link from 'next/link';
import { FaClipboardList, FaHistory, FaListUl, FaStar, FaLayerGroup, FaMapMarkedAlt, FaTags, FaUsers, FaCog } from 'react-icons/fa';
import { IoMdGitNetwork } from 'react-icons/io';
import { IoMenu } from 'react-icons/io5';

interface SidebarItem {
  title: string;
  href: string;
  icon: React.ReactNode;
}

const Sidebar = () => {
  const menuItems: SidebarItem[] = [
    { title: 'الشكاوى', href: '/complaints', icon: <FaClipboardList size={20} /> },
    { title: 'الحالة الزمنية للشكوى', href: '/timeline', icon: <FaHistory size={20} /> },
    { title: 'الفئة الأساسية للشكوى', href: '/complaints/main-category', icon: <FaListUl size={20} /> },
    { title: 'التقييم على كل شكوى', href: '/complaints/ratings', icon: <FaStar size={20} /> },
    { title: 'الفئة الفرعية للشكوى', href: '/complaints/sub-category', icon: <FaLayerGroup size={20} /> },
    { title: 'المحافظات', href: '/governorates', icon: <FaMapMarkedAlt size={20} /> },
    { title: 'الفئة الأساسية للحالة', href: '/status/main-category', icon: <IoMdGitNetwork size={20} /> },
    { title: 'الفئة الفرعية للحالة', href: '/status/sub-category', icon: <FaTags size={20} /> },
    { title: 'المواطنون', href: '/citizens', icon: <FaUsers size={20} /> },
    { title: 'الإعدادات', href: '/settings', icon: <FaCog size={20} /> },
  ];

  return (
    <div className="w-64 bg-[#4664AD] text-white h-screen fixed right-0 top-0">
      <div className="flex justify-between  items-center border-b-4 border-white pb-4 p-4">
        <IoMenu className="h-10 w-10" />
        <img src="/logo.png" alt="Logo" className="w-16 h-14" />
      </div>
      <nav className='p-4'>
        {menuItems.map((item, index) => (
          <Link 
            key={index} 
            href={item.href}
            className="flex  items-center justify-between py-2 hover:bg-[#4B69A8] rounded-lg mb-2 transition-colors font-cairo"
          >
            <div className="flex items-center gap-3">
              <div className='h-8 w-8 flex items-center justify-center'>{item.icon}</div>
              <span>{item.title}</span>
            </div>
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar; 