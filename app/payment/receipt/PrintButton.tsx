"use client";

import { Printer } from 'lucide-react';

export function PrintButton() {
  return (
    <div className="mt-8 flex justify-center print:hidden">
      <button 
        onClick={() => window.print()}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-medium transition duration-200"
      >
        <Printer className="w-5 h-5" />
        Print / Download PDF
      </button>
    </div>
  );
}
