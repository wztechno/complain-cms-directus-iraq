/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================
// Complaint Management React pages (refactored)
// ============================
// 1. ComplaintPage (detail) + 2. ComplaintPercentageCalculator handled earlier
// 3. ComplaintsPage (listing) below

// -----------------------------------------------
// ComplaintsPage – LIST VIEW WITH FILTERS/PAGING
// -----------------------------------------------

'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  GrFilter
} from 'react-icons/gr';
import {
  FaFileDownload,
  FaPlus,
  FaChevronRight,
  FaChevronLeft
} from 'react-icons/fa';
import ComplaintCard from '@/components/ComplaintCard';
import { fetchWithAuth } from '@/utils/api';
import {
  getUserPermissions,
  complaintMatchesPermissions
} from '@/utils/permissions';
import {
  buildStatusToUserMap,
  StatusToUserMap
} from '@/utils/responsible-users';

const BASE_URL = 'https://complaint.top-wp.com';

// -----------------------------
// Type helpers
// -----------------------------
interface District {
  id: number;
  name: string;
}
interface Complaint {
  id: string;
  title: string;
  description: string;
  Service_type: string;
  district: number | null;
  districtName?: string;
  status_subcategory: string | number;
  completion_percentage: string | number;
  date?: string;
  statusDate?: string;
  status?: string;
  mainCategory?: string;
  responsibleUser?: string;
  [key: string]: any;
  location?: {
    id: number;
    latitude: number;
    longitude: number;
    city: string;
    district: string;
    district_id: number | null;
  };
}
// interface User { firstName: string; lastName: string; }

// -----------------------------
// Main component
// -----------------------------
export default function ComplaintsPage() {
  /* UI + filter state */
  const [showFilters, setShowFilters] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    governorate: '',
    title: '',
    startDate: '',
    endDate: '',
    serviceType: '',
    status: '',
    completion: '',
    id: ''
  });

  /* data state */
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [districts, setDistricts] = useState<District[]>([]);
  const [statusList, setStatusList] = useState<string[]>([]);
  const [completionList, setCompletionList] = useState<string[]>([]);
  const [titleList, setTitleList] = useState<string[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [filtered, setFiltered] = useState<Complaint[]>([]);

  /* paging */
  const perPage = 10;
  const pageSlice = (arr: Complaint[]) => {
    const start = (currentPage - 1) * perPage;
    return arr.slice(start, start + perPage);
  };

  /* ------------------------------------------------
   * Master fetch routine
   * ------------------------------------------------*/
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      /* 1️⃣ user perms + isAdmin */
      const perms = await getUserPermissions();
      const info = JSON.parse(localStorage.getItem('user_info') || '{}');
      const ADMIN_ROLE = '8A8C7803-08E5-4430-9C56-B2F20986FA56';
      const admin = info?.role === ADMIN_ROLE;
      setIsAdmin(admin);

      /* 2️⃣ responsible-user map */
      const statusToUser = await buildStatusToUserMap();

      /* 3️⃣ districts list */
      const districtResp = await fetchWithAuth('/items/District?filter[active][_eq]=true');
      const districtsData = districtResp?.data ?? [];
      setDistricts(districtsData);
      const districtMapTyped = new Map<number, string>();
      districtsData.forEach((d: District) => districtMapTyped.set(d.id, d.name));

      const locationResp = await fetch('https://complaint.top-wp.com/items/location');
      const locationRespJson = await locationResp.json();
      const locationData = locationRespJson?.data ?? [];
      // id → { latitude, longitude }
      const locationMap = new Map<number, { latitude: number; longitude: number }>();
      locationData.forEach((loc: any) =>
        locationMap.set(loc.id, { latitude: loc.latitude, longitude: loc.longitude })
      );

      /* 4️⃣ complaints core list */
      let url = '/items/Complaint';
      if (!admin && perms) {
        const f: string[] = [];
        if (perms.districtIds?.length) f.push(`district={${perms.districtIds.join(',')}}`);
        if (perms.statusSubcategoryIds?.length) f.push(`status_subcategory={${perms.statusSubcategoryIds.join(',')}}`);
        if (f.length) url += `?filter[_or]=[${f.join(',')}]`;
      }
      const compResp = await fetchWithAuth(url);
      const compArr: Complaint[] = await enrichComplaints(compResp.data, districtMapTyped, statusToUser, locationMap);

      /* 5️⃣ build filter dropdown data */
      setTitleList(unique(compArr.map((c) => c.title || '')));
      setStatusList(unique(compArr.map((c) => c.status || '')));
      setCompletionList(unique(compArr.map((c) => String(c.completion_percentage || ''))).sort((a, b) => +a - +b));

      /* 6️⃣ commit */
      setComplaints(compArr);
      setFiltered(compArr);
    } catch (e) {
      console.error(e);
      setComplaints([]);
      setFiltered([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ------------------------------------------------
   * Filtering logic
   * ------------------------------------------------*/
  useEffect(() => {
    let out = [...complaints];
    const f = filters;
    if (f.id) out = out.filter((c) => String(c.id).includes(f.id));
    if (f.governorate) out = out.filter((c) => c.districtName === f.governorate);
    if (f.title) out = out.filter((c) => c.title === f.title);
    if (f.status) out = out.filter((c) => c.status === f.status);
    if (f.completion) out = out.filter((c) => String(c.completion_percentage) === f.completion);
    if (f.serviceType)
      out = out.filter((c) =>
        f.serviceType === 'خدمات فردية' || f.serviceType === 'خدمات عامة'
          ? c.Service_type === f.serviceType
          : c.Service_type === f.serviceType
      );
    if (f.startDate)
      out = out.filter((c) => new Date(c.statusDate || c.date || 0) >= new Date(f.startDate));
    if (f.endDate)
      out = out.filter((c) => new Date(c.statusDate || c.date || 0) <= new Date(f.endDate));
    setFiltered(sortByDate(out));
    setCurrentPage(1);
  }, [filters, complaints]);

  /* ------------------------------------------------
   * Helpers
   * ------------------------------------------------*/
  const unique = <T,>(arr: T[]) => Array.from(new Set(arr.filter(Boolean)));

  const sortByDate = (arr: Complaint[]) =>
    [...arr].sort((a, b) => new Date(b.statusDate || b.date || 0).getTime() - new Date(a.statusDate || a.date || 0).getTime());

  async function enrichComplaints(
    data: any[],
    districtMap: Map<number, string>,
    statusUser: StatusToUserMap,
    locationMap: Map<number, { latitude: number; longitude: number }>
  ): Promise<Complaint[]> {
    // Handle ID-only array => fetch objects
    if (data.length && (typeof data[0] === 'string' || typeof data[0] === 'number')) {
      const batchFetch = async (id: string | number) => {
        const r = await fetch(`${BASE_URL}/items/Complaint/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
        });
        return r.ok ? (await r.json()).data : null;
      };
      data = (await Promise.all(data.map(batchFetch))).filter(Boolean);
    }

    // status subcategory meta (once)
    const subRes = await fetch(
      'https://complaint.top-wp.com/items/Status_subcategory?fields=*,status_category.*'
    ).then((r) => r.json());

    return sortByDate(
      data.map((c: any) => {
        const distName = c.district ? districtMap.get(Number(c.district)) : undefined;
        const subMeta = subRes.data.find((s: any) => String(s.id) === String(c.status_subcategory));
        const respUser = statusUser[String(c.status_subcategory)] ?? 'غير محدد';
        let locationObj = c.location;
        if (locationObj && typeof locationObj !== 'object') {
          // relation stored as id → look up full coords
          const coords = locationMap.get(Number(locationObj));
          if (coords) locationObj = { id: Number(locationObj), ...coords };
        }
        return {
          ...c,
          districtName: distName ?? 'غير محدد',
          mainCategory: subMeta?.status_category?.name ?? null,
          responsibleUser: respUser,
          location: locationObj ?? null
        } as Complaint;
      })
    );
  }

  /* ------------------------------------------------
   * CSV export helper
   * ------------------------------------------------*/
  const exportCsv = useCallback((scope: 'all' | 'selected') => {
    if (typeof window === 'undefined') return; // Guard against server-side execution
  
    const list = scope === 'all' ? filtered : filtered.filter((c) => selectedIds.includes(c.id));
    if (!list.length) return alert('لا توجد شكاوى للتصدير');
  
    const rows = [
      ['ID', 'العنوان', 'الوصف', 'نوع الخدمة', 'المحافظة', 'نسبة الإكمال', 'التاريخ', 'الموقع'],
      ...list.map((c) => {
        const mapLink = c.location?.latitude && c.location?.longitude
          ? `"=HYPERLINK(""https://www.google.com/maps?q=${c.location.latitude},${c.location.longitude}"", ""عرض الموقع"")"`
          : '';
  
        return [
          c.id,
          `"${c.title || ''}"`,
          `"${c.description || ''}"`,
          `"${c.Service_type || ''}"`,
          `"${c.districtName || ''}"`,
          c.completion_percentage || 0,
          c.date || '',
          mapLink,
        ];
      }),
    ]
      .map((r) => r.join(','))
      .join('\n');
  
    const blob = new Blob(['\uFEFF' + rows], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `complaints_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setShowExportOptions(false);
  }, [filtered, selectedIds]);
  

  /* ------------------------------------------------
   * Render helpers
   * ------------------------------------------------*/
  const pageComplaints = useMemo(() => pageSlice(filtered), [filtered, currentPage]);
  const totalPages = Math.ceil(filtered.length / perPage) || 1;

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  /* ------------------------------------------------
   * JSX
   * ------------------------------------------------*/

  console.log("complaints",complaints);

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <main className="flex-1 p-8 mr-64">
        {/* Header */}
        <Header
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          isAdmin={isAdmin}
          selectedCount={selectedIds.length}
          onExport={exportCsv}
        />

        {/* Filters */}
        {showFilters && (
          <Filters
            districts={districts}
            titles={titleList}
            statuses={statusList}
            completions={completionList}
            isAdmin={isAdmin}
            filters={filters}
            setFilters={setFilters}
          />
        )}

        {/* Content */}
        {loading ? (
          <EmptyState text="جاري تحميل البيانات..." />
        ) : !filtered.length ? (
          <EmptyState text="لا توجد شكاوى" sub="قد يكون هذا بسبب عدم وجود شكاوى مسجلة، أو بسبب عدم وجود صلاحيات للوصول إلى الشكاوى المتاحة." />
        ) : (
          <>
            <Grid complaints={pageComplaints} selected={selectedIds} onSelect={toggleSelect} />
            <Pagination
              current={currentPage}
              totalPages={totalPages}
              onPrev={() => setCurrentPage((p) => Math.max(1, p - 1))}
              onNext={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              rangeText={`عرض ${(currentPage - 1) * perPage + 1} - ${Math.min(
                currentPage * perPage,
                filtered.length
              )} من ${filtered.length} شكوى`}
            />
          </>
        )}
      </main>
    </div>
  );
}

// -----------------------------------------------
// Sub components (Header, Filters, Grid, Pagination, Empty)
// -----------------------------------------------
// import { GrFilter } from 'react-icons/gr';
// import { FaFileDownload, FaPlus, FaChevronRight, FaChevronLeft } from 'react-icons/fa';

const Header = ({
  showFilters,
  setShowFilters,
  isAdmin,
  selectedCount,
  onExport
}: any) => (
  <div className="flex justify-between items-center mb-8">
    <h1 className="text-3xl font-bold">قائمة الشكاوى</h1>
    <div className="flex gap-4">
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="h-10 w-10 hover:bg-[#4664AD] text-[#4664AD] hover:text-[#F9FAFB] p-2 rounded-lg bg-[#F9FAFB] flex items-center justify-center"
      >
        <GrFilter />
      </button>
      <a
        href="/complaints/create"
        className="bg-[#4664AD] hover:bg-[#F9FAFB] hover:text-[#4664AD] text-[#F9FAFB] px-4 py-2 rounded-lg flex items-center gap-2"
      >
        <FaPlus size={14} /> انشاء شكوى
      </a>
      <ExportDropdown selectedCount={selectedCount} onExport={onExport} />
    </div>
  </div>
);

interface ExportDropdownProps {
  selectedCount: number;
  onExport: (scope: 'all' | 'selected') => void;
}

const ExportDropdown: React.FC<ExportDropdownProps> = ({ selectedCount, onExport }) => {
  return (
    <div className="relative">
      <button
        onClick={() => onExport('all')}
        className="bg-[#4664AD] text-white px-4 py-2 rounded-lg hover:bg-[#3A5499] flex items-center gap-2"
      >
        <FaFileDownload />
        <span>تصدير الكل</span>
      </button>
      {selectedCount > 0 && (
        <button
          onClick={() => onExport('selected')}
          className="mt-2 bg-[#4664AD] text-white px-4 py-2 rounded-lg hover:bg-[#3A5499] flex items-center gap-2"
        >
          <FaFileDownload />
          <span>تصدير {selectedCount} مختارة</span>
        </button>
      )}
    </div>
  );
};

interface FiltersProps {
  districts: District[];
  titles: string[];
  statuses: string[];
  completions: string[];
  isAdmin: boolean;
  filters: {
    id: string;
    governorate: string;
    title: string;
    status: string;
    completion: string;
    serviceType: string;
    startDate: string;
    endDate: string;
  };
  setFilters: React.Dispatch<React.SetStateAction<{
    id: string;
    governorate: string;
    title: string;
    status: string;
    completion: string;
    serviceType: string;
    startDate: string;
    endDate: string;
  }>>;
}

const Filters: React.FC<FiltersProps> = ({
  districts,
  titles,
  statuses,
  completions,
  isAdmin,
  filters,
  setFilters
}) => {
  return (
    <div className="bg-white rounded-lg p-6 shadow mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <FLT label="رقم الشكوى">
          <input
            type="text"
            value={filters.id}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFilters((f) => ({ ...f, id: e.target.value }))
            }
            className="w-full border border-gray-300 p-2 rounded text-right"
            placeholder="ابحث برقم الشكوى"
          />
        </FLT>

        <FLT label="المحافظة">
          <Select
            value={filters.governorate}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setFilters((f) => ({ ...f, governorate: e.target.value }))
            }
            list={districts.map((d) => d.name)}
          />
        </FLT>

        <FLT label="عنوان الشكوى">
          <Select
            value={filters.title}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setFilters((f) => ({ ...f, title: e.target.value }))
            }
            list={titles}
          />
        </FLT>

        <FLT label="نوع الخدمة">
          <select
            value={filters.serviceType}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setFilters((f) => ({ ...f, serviceType: e.target.value }))
            }
            className="w-full border border-gray-300 p-2 rounded text-right"
          >
            <option value="">الكل</option>
            <option value="خدمات فردية">خدمات فردية</option>
            <option value="خدمات عامة">خدمات عامة</option>
          </select>
        </FLT>

        <FLT label="الحالة">
          <Select
            value={filters.status}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setFilters((f) => ({ ...f, status: e.target.value }))
            }
            list={statuses}
          />
        </FLT>

        <FLT label="نسبة الإنجاز">
          <Select
            value={filters.completion}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setFilters((f) => ({ ...f, completion: e.target.value }))
            }
            list={completions}
            suffix="%"
          />
        </FLT>

        <FLT label="من تاريخ">
          <input
            type="date"
            value={filters.startDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFilters((f) => ({ ...f, startDate: e.target.value }))
            }
            className="w-full border border-gray-300 p-2 rounded"
          />
        </FLT>

        <FLT label="إلى تاريخ">
          <input
            type="date"
            value={filters.endDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFilters((f) => ({ ...f, endDate: e.target.value }))
            }
            className="w-full border border-gray-300 p-2 rounded"
          />
        </FLT>
      </div>
    </div>
  );
};

const FLT = ({ label, children }: any) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 text-right mb-1">{label}</label>
    {children}
  </div>
);

interface GridProps {
  complaints: Complaint[];
  selected: string[];
  onSelect: (id: string) => void;
}

const Grid: React.FC<GridProps> = ({ complaints, selected, onSelect }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {complaints.map((c) => (
      <div key={c.id}>
        <ComplaintCard
          id={c.id}
          title={c.title || 'بدون عنوان'}
          status={c.status || 'غير محدد'}
          mainCategory={c.mainCategory || 'غير محدد'}
          type={c.Service_type || 'غير محدد'}
          location={c.districtName || 'غير محدد'}
          progress={Number(c.completion_percentage) || 0}
          issue={c.description || 'لا يوجد وصف'}
          isSelected={selected.includes(c.id)}
          onSelect={onSelect}
          responsibleUser={c.responsibleUser}
        />
      </div>
    ))}
  </div>
);

const Pagination = ({ current, totalPages, onPrev, onNext, rangeText }: any) => (
  <div className="mt-8 flex justify-between items-center">
    <div className="text-sm text-gray-600">{rangeText}</div>
    <div className="flex gap-2">
      <button onClick={onPrev} disabled={current === 1} className={`p-2 rounded-lg ${current === 1 ? 'bg-gray-200 text-gray-400' : 'bg-[#4664AD] text-white'}`}>
        <FaChevronRight />
      </button>
      <div className="flex items-center justify-center px-4 py-2 bg-white rounded-lg shadow-sm">
        {current} / {totalPages}
      </div>
      <button onClick={onNext} disabled={current === totalPages} className={`p-2 rounded-lg ${current === totalPages ? 'bg-gray-200 text-gray-400' : 'bg-[#4664AD] text-white'}`}>
        <FaChevronLeft />
      </button>
    </div>
  </div>
);

const EmptyState = ({ text, sub }: any) => (
  <div className="flex flex-col justify-center items-center h-64 text-center">
    <div className="text-xl text-gray-500 mb-2">{text}</div>
    {sub && <div className="text-md text-gray-400 max-w-md">{sub}</div>}
  </div>
);

// Add styles using Tailwind classes instead of global styles
const Select = ({ list, suffix = '', ...rest }: any) => (
  <select
    className="w-full border border-gray-300 rounded-md p-2 text-right"
    {...rest}
  >
    {list.map((item: string) => (
      <option key={item} value={item}>
        {item}
        {suffix}
      </option>
    ))}
  </select>
);

// Move export functionality to a client-side component
const ExportButton: React.FC<{ onExport: () => void }> = ({ onExport }) => {
  const handleExport = useCallback(() => {
    if (typeof window === 'undefined') return;
    onExport();
  }, [onExport]);

  return (
    <button onClick={handleExport}>
      <FaFileDownload className="ml-2" />
      تصدير
    </button>
  );
};
