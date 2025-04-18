import React, { useState, useEffect } from 'react';

interface CompletionPercentageEditorProps {
  initialValue: number;
  onSave: (percentage: number) => Promise<void>;
  isEditable?: boolean;
  className?: string;
}

const CompletionPercentageEditor: React.FC<CompletionPercentageEditorProps> = ({
  initialValue = 0,
  onSave,
  isEditable = true,
  className = '',
}) => {
  const [percentage, setPercentage] = useState(initialValue);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update local percentage when initialValue changes
  useEffect(() => {
    setPercentage(initialValue);
  }, [initialValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value)) {
      // Constrain between 0 and 100
      const constrainedValue = Math.min(100, Math.max(0, value));
      setPercentage(constrainedValue);
      setError(null);
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPercentage(parseInt(e.target.value));
    setError(null);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSave(percentage);
      setIsEditing(false);
      setError(null);
    } catch (err) {
      setError('فشل في حفظ التغييرات. يرجى المحاولة مرة أخرى.');
      console.error('Error saving percentage:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const getColorClass = () => {
    if (percentage < 30) return 'bg-red-500';
    if (percentage < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // Display-only view
  if (!isEditing) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center mb-1">
          <div className="text-sm font-medium ml-2">نسبة الإنجاز:</div>
          <div className="text-sm font-bold">{percentage}%</div>
          {isEditable && (
            <button
              onClick={() => setIsEditing(true)}
              className="mr-4 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              تعديل
            </button>
          )}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full ${getColorClass()}`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </div>
    );
  }

  // Editing view
  return (
    <div className={`${className} p-3 border border-gray-300 rounded-lg bg-gray-50`}>
      <div className="text-sm font-medium mb-2">تعديل نسبة الإنجاز</div>
      
      {/* Slider */}
      <input
        type="range"
        min="0"
        max="100"
        value={percentage}
        onChange={handleSliderChange}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
      />
      
      <div className="flex items-center mt-2">
        {/* Number input */}
        <div className="flex items-center border border-gray-300 rounded-md overflow-hidden bg-white">
          <input
            type="number"
            min="0"
            max="100"
            value={percentage}
            onChange={handleInputChange}
            className="w-16 py-1 px-2 text-center focus:outline-none"
          />
          <div className="bg-gray-100 px-2 py-1 text-gray-700">%</div>
        </div>
        
        {/* Progress visual indicator */}
        <div className="flex-grow mx-3">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full ${getColorClass()}`}
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-3 py-1 bg-green-600 text-white rounded-md text-sm disabled:bg-gray-400"
          >
            {isSaving ? 'جاري الحفظ...' : 'حفظ'}
          </button>
          <button
            onClick={() => {
              setIsEditing(false);
              setPercentage(initialValue); // Reset to original value
              setError(null);
            }}
            disabled={isSaving}
            className="mr-2 px-3 py-1 bg-gray-300 text-gray-700 rounded-md text-sm disabled:bg-gray-200"
          >
            إلغاء
          </button>
        </div>
      </div>
      
      {/* Error message */}
      {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
    </div>
  );
};

export default CompletionPercentageEditor; 