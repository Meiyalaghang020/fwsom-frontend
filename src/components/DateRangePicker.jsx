import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon } from '@heroicons/react/24/outline';

const DateRangePicker = ({ 
  startDate, 
  endDate, 
  onDateChange, 
  placeholder = "Select date range",
  className = "" 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [nextMonth, setNextMonth] = useState(new Date());
  const [selectedRange, setSelectedRange] = useState({ start: null, end: null });
  const [hoverDate, setHoverDate] = useState(null);
  const dropdownRef = useRef(null);

  // Predefined date ranges
  const predefinedRanges = [
    { label: 'Today', value: 'today' },
    { label: 'Last 3 Days', value: 'last3days' },
    { label: 'Last 7 Days', value: 'last7days' },
    { label: 'Last 30 Days', value: 'last30days' },
    { label: 'Last 90 Days', value: 'last90days' },
    { label: 'Last Year', value: 'lastyear' }
  ];

  // Initialize months
  useEffect(() => {
    const now = new Date();
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setNextMonth(new Date(now.getFullYear(), now.getMonth() + 1, 1));
  }, []);

  // Initialize selected range from props
  useEffect(() => {
    if (startDate && endDate) {
      setSelectedRange({
        start: new Date(startDate),
        end: new Date(endDate)
      });
    } else {
      // Clear internal state when props are null
      setSelectedRange({ start: null, end: null });
    }
  }, [startDate, endDate]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getDisplayText = () => {
    if (selectedRange.start && selectedRange.end) {
      return `${formatDate(selectedRange.start)} to ${formatDate(selectedRange.end)}`;
    }
    return placeholder;
  };

  const getPredefinedRange = (value) => {
    const today = new Date();
    const start = new Date();
    const end = new Date();

    switch (value) {
      case 'today':
        return { start: today, end: today };
      case 'last3days':
        start.setDate(today.getDate() - 2);
        return { start, end: today };
      case 'last7days':
        start.setDate(today.getDate() - 6);
        return { start, end: today };
      case 'last30days':
        start.setDate(today.getDate() - 29);
        return { start, end: today };
      case 'last90days':
        start.setDate(today.getDate() - 89);
        return { start, end: today };
      case 'lastyear':
        start.setFullYear(today.getFullYear() - 1);
        return { start, end: today };
      default:
        return { start: null, end: null };
    }
  };

  const [selectedPredefined, setSelectedPredefined] = useState(null);

  const handlePredefinedRange = (value) => {
    const range = getPredefinedRange(value);
    setSelectedRange(range);
    setSelectedPredefined(value);
    if (onDateChange) {
      onDateChange(range.start, range.end);
    }
    setIsOpen(false);
  };

  const handleDateClick = (date) => {
    if (!selectedRange.start || (selectedRange.start && selectedRange.end)) {
      // Start new selection
      setSelectedRange({ start: date, end: null });
    } else if (selectedRange.start && !selectedRange.end) {
      // Complete selection
      const start = selectedRange.start;
      const end = date;
      
      if (start <= end) {
        setSelectedRange({ start, end });
        if (onDateChange) {
          onDateChange(start, end);
        }
      } else {
        setSelectedRange({ start: end, end: start });
        if (onDateChange) {
          onDateChange(end, start);
        }
      }
    }
  };

  const isDateInRange = (date) => {
    if (!selectedRange.start) return false;
    
    if (selectedRange.end) {
      return date >= selectedRange.start && date <= selectedRange.end;
    }
    
    if (hoverDate && hoverDate >= selectedRange.start) {
      return date >= selectedRange.start && date <= hoverDate;
    }
    
    return date.getTime() === selectedRange.start.getTime();
  };

  const isDateRangeStart = (date) => {
    return selectedRange.start && date.getTime() === selectedRange.start.getTime();
  };

  const isDateRangeEnd = (date) => {
    if (selectedRange.end) {
      return date.getTime() === selectedRange.end.getTime();
    }
    if (hoverDate && selectedRange.start && hoverDate >= selectedRange.start) {
      return date.getTime() === hoverDate.getTime();
    }
    return false;
  };

  const navigateMonth = (direction, isNext = false) => {
    if (isNext) {
      setNextMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + direction, 1));
    } else {
      setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + direction, 1));
      setNextMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + direction, 1));
    }
  };

  const renderCalendar = (month, isNext = false) => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const firstDay = new Date(year, monthIndex, 1);
    const lastDay = new Date(year, monthIndex + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const current = new Date(startDate);

    // Generate 42 days (6 weeks)
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    const monthNames = [
      'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
      'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
    ];

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div className="flex-1 min-w-0">
        {/* Month Header */}
        <div className="flex items-center justify-between mb-3">
          {!isNext && (
            <button
              type="button"
              onClick={() => navigateMonth(-1)}
              className="p-2 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors"
              title="Previous month"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
          )}
          
          <div className="text-sm font-semibold text-slate-800 min-w-[100px] text-center">
            {monthNames[monthIndex]} {year}
          </div>
          
          {isNext && (
            <button
              type="button"
              onClick={() => navigateMonth(1, true)}
              className="p-2 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors"
              title="Next month"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          )}
          
          {!isNext && <div className="w-8" />}
          {isNext && <div className="w-8" />}
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {dayNames.map(day => (
            <div key={day} className="text-xs text-slate-500 text-center py-0.5 font-medium">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-0.5">
          {days.map((day, index) => {
            const isCurrentMonth = day.getMonth() === monthIndex;
            const isToday = day.toDateString() === new Date().toDateString();
            const inRange = isDateInRange(day);
            const isStart = isDateRangeStart(day);
            const isEnd = isDateRangeEnd(day);

            return (
              <button
                key={index}
                type="button"
                onClick={() => isCurrentMonth && handleDateClick(day)}
                onMouseEnter={() => isCurrentMonth && setHoverDate(day)}
                onMouseLeave={() => setHoverDate(null)}
                disabled={!isCurrentMonth}
                className={`
                  h-7 w-7 text-xs rounded transition-all duration-200 relative
                  ${!isCurrentMonth 
                    ? 'text-slate-300 cursor-not-allowed' 
                    : 'text-slate-700 hover:bg-blue-50 hover:text-blue-600 cursor-pointer'
                  }
                  ${isToday && isCurrentMonth ? 'font-bold border border-blue-400' : ''}
                  ${inRange && isCurrentMonth && !isStart && !isEnd ? 'bg-blue-100 text-blue-700' : ''}
                  ${(isStart || isEnd) && isCurrentMonth ? 'bg-blue-600 text-white font-semibold shadow-md' : ''}
                `}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const handleApply = () => {
    setIsOpen(false);
  };

  const handleCancel = () => {
    // Reset to original values
    if (startDate && endDate) {
      setSelectedRange({
        start: new Date(startDate),
        end: new Date(endDate)
      });
    } else {
      setSelectedRange({ start: null, end: null });
    }
    setSelectedPredefined(null);
    setIsOpen(false);
  };

  const handleClear = () => {
    setSelectedRange({ start: null, end: null });
    setSelectedPredefined(null);
    if (onDateChange) {
      onDateChange(null, null);
    }
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm border border-slate-300 rounded-md bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-300"
      >
        <span className={selectedRange.start && selectedRange.end ? 'text-slate-900' : 'text-slate-500'}>
          {getDisplayText()}
        </span>
        <CalendarIcon className="h-4 w-4 text-slate-400" />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 w-[600px]">
          <div className="flex">
            {/* Predefined Ranges Sidebar */}
            <div className="w-48 bg-slate-50 p-4 border-r border-slate-200 rounded-l-lg flex-shrink-0">
              <div className="space-y-1">
                {predefinedRanges.map((range) => (
                  <button
                    key={range.value}
                    type="button"
                    onClick={() => handlePredefinedRange(range.value)}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                      selectedPredefined === range.value
                        ? 'bg-blue-100 text-blue-700 font-medium border border-blue-200'
                        : 'text-slate-700 hover:bg-blue-50 hover:text-blue-600'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Calendar Section */}
            <div className="flex-1 p-3">
              <div className="flex gap-4">
                {renderCalendar(currentMonth)}
                {renderCalendar(nextMonth, true)}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50 transition-colors"
                >
                  Clear Selection
                </button>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleApply}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;
