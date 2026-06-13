"use client";

import React, { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export default function CustomDropdown({ label, options, value, onChange } : {label: string, options: string[], value: string, onChange: (value: string) => void}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-[#18181b70] border border-[#A1A1A120] rounded-lg px-2 py-1.5 md:py-2 focus:outline-none focus:border-[#A1A1A140] cursor-pointer flex items-center gap-2 min-w-25 md:min-w-31 text-[#F9F9F9] text-xs md:text-[13px] whitespace-nowrap"
      >
        {value}
        <ChevronDown size={16} className="ml-auto" />
      </button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 bg-[#18181b] border border-[#A1A1A120] rounded-lg shadow-lg z-20 min-w-25 md:min-w-31 py-1">
            {options.map((option) => (
              <button
                key={option}
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
                className="w-full px-2 py-2.5 text-left hover:bg-[#FFFFFF10] flex items-center justify-between text-xs md:text-[13px] text-[#F9F9F9] cursor-pointer"
              >
                {option}
                {value === option && (
                  <Check size={15} className="text-[#007acc70]" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}