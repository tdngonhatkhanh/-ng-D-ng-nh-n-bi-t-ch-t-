import React from 'react';

interface PHScaleProps {
  ph: number;
}

const PHScale: React.FC<PHScaleProps> = ({ ph }) => {
  // Clamp pH between 0 and 14
  const safePH = Math.min(Math.max(ph, 0), 14);
  
  // Calculate position percentage (0 to 100%)
  const position = (safePH / 14) * 100;

  const getPHColor = (val: number) => {
    if (val < 3) return 'bg-red-500';
    if (val < 5) return 'bg-orange-400';
    if (val < 6.5) return 'bg-yellow-400';
    if (val <= 7.5) return 'bg-green-500';
    if (val < 9) return 'bg-teal-400';
    if (val < 11) return 'bg-blue-500';
    return 'bg-purple-600';
  };

  const getLabel = (val: number) => {
    if (val < 7) return 'Axit';
    if (val === 7) return 'Trung tính';
    return 'Bazơ (Kiềm)';
  };

  return (
    <div className="w-full mt-6 mb-8">
      <div className="flex justify-between text-xs text-gray-500 mb-2 font-mono uppercase tracking-wider">
        <span>0 (Axit mạnh)</span>
        <span>7 (Trung tính)</span>
        <span>14 (Bazơ mạnh)</span>
      </div>
      
      <div className="relative h-6 w-full rounded-full bg-gradient-to-r from-red-600 via-yellow-400 via-green-500 via-blue-500 to-purple-700 shadow-inner">
        {/* Marker */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center transition-all duration-1000 ease-out"
          style={{ left: `${position}%` }}
        >
          <div className={`w-6 h-6 rounded-full border-4 border-white shadow-lg ${getPHColor(safePH)}`}></div>
          <div className="mt-2 bg-gray-900 text-white text-xs font-bold py-1 px-2 rounded shadow-lg whitespace-nowrap">
            pH {safePH.toFixed(1)}
          </div>
        </div>
      </div>

      <div className="text-center mt-8">
        <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getPHColor(safePH)} text-white shadow-sm`}>
          {getLabel(safePH)}
        </span>
      </div>
    </div>
  );
};

export default PHScale;