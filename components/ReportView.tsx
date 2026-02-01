
import React, { useState } from 'react';
import { AgendaItem, TimingStatus, RoleType } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Download, RefreshCw, AlertTriangle, Clock, Printer, Activity, Eye, X } from 'lucide-react';
import { TM_COLORS } from '../constants';

interface ReportViewProps {
  items: AgendaItem[];
  onReset: () => void;
  scheduledStart: string;
  actualStart: string;
  meetingNumber: string;
  meetingTheme: string;
}

const ReportView: React.FC<ReportViewProps> = ({ items, onReset, scheduledStart, actualStart, meetingNumber, meetingTheme }) => {
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));
  const [isPreview, setIsPreview] = useState(false);

  // --- Data Calculations ---

  // 1. Meeting Punctuality
  let meetingDelayMinutes = 0;
  let punctualityStatus = 'On Time';
  let punctualityColor = 'text-green-600';
  
  if (scheduledStart && actualStart) {
    const today = new Date().toISOString().slice(0, 10);
    const sDate = new Date(`${today}T${scheduledStart}:00`);
    const aDate = new Date(`${today}T${actualStart}:00`);
    const diffMs = aDate.getTime() - sDate.getTime();
    meetingDelayMinutes = Math.floor(diffMs / 60000);

    if (meetingDelayMinutes > 0) {
        punctualityStatus = `Delayed ${meetingDelayMinutes} min`;
        punctualityColor = 'text-red-600';
    } else if (meetingDelayMinutes < 0) {
        punctualityStatus = `Early ${Math.abs(meetingDelayMinutes)} min`;
        punctualityColor = 'text-blue-600';
    }
  }

  // 2. Session Statistics (Used for Table Topics Analysis)
  const calcSessionStats = (filterFn: (i: AgendaItem) => boolean) => {
      const sessionItems = items.filter(filterFn);
      const totalTargetSeconds = sessionItems.reduce((acc, i) => acc + (i.targetTimeMinutes * 60), 0);
      const totalActualSeconds = sessionItems.reduce((acc, i) => acc + i.actualTimeSeconds, 0);
      
      const diff = totalActualSeconds - totalTargetSeconds;
      const status = diff > 60 ? 'Overtime' : (diff < -60 ? 'Undertime' : 'On Time');
      
      return {
          count: sessionItems.length,
          targetSec: totalTargetSeconds,
          actualSec: totalActualSeconds,
          status,
          diff
      };
  };

  // Determine Table Topics Stats
  const ttSessionItem = items.find(i => i.type === RoleType.SESSION);
  let ttStats;

  if (ttSessionItem && ttSessionItem.actualTimeSeconds > 0) {
      const targetSec = ttSessionItem.targetTimeMinutes * 60;
      const actualSec = ttSessionItem.actualTimeSeconds;
      const diff = actualSec - targetSec;
      
      ttStats = {
          count: 1,
          targetSec,
          actualSec,
          status: ttSessionItem.status,
          diff
      };
  } else {
      const ttFallbackFilter = (i: AgendaItem) => {
          if (i.status === TimingStatus.PENDING) return false;
          return (i.type === RoleType.TABLE_TOPIC || (i.roleName.toLowerCase().includes('table topic') && i.type !== RoleType.SESSION));
      };
      ttStats = calcSessionStats(ttFallbackFilter);
  }

  // 3. Overall On-Time Rate
  const completedItems = items.filter(i => i.status !== TimingStatus.PENDING);
  const overallQualified = completedItems.filter(i => i.status === TimingStatus.QUALIFIED).length;
  const overallRate = completedItems.length > 0 ? Math.round((overallQualified / completedItems.length) * 100) : 0;

  const pieData = [
    { name: 'Qualified', value: overallQualified, color: TM_COLORS.GREEN },
    { name: 'Overtime', value: completedItems.filter(i => i.status === TimingStatus.OVERTIME).length, color: TM_COLORS.BURGUNDY },
    { name: 'Undertime', value: completedItems.filter(i => i.status === TimingStatus.UNDERTIME).length, color: TM_COLORS.YELLOW }, 
  ].filter(d => d.value > 0);

  // 4. Generate Analysis Text
  const getAnalysisText = () => {
    const lines = [];
    
    // Punctuality
    if (meetingDelayMinutes > 5) {
        lines.push("Meeting started late. Prompt starts encouraged.");
    } else {
        lines.push("Great job starting on time!");
    }

    // Qualification
    if (overallRate >= 85) {
        lines.push("Excellent time management by most speakers!");
    } else if (overallRate >= 60) {
        lines.push("Fair time management; room for improvement.");
    } else {
        lines.push("Many roles missed time targets. Watch signals.");
    }

    // Sessions
    if (ttStats.diff > 120) {
        lines.push("Table Topics exceeded time limit significantly.");
    }

    return lines;
  };
  const analysisLines = getAnalysisText();

  // --- Formatters ---
  const formatTime = (seconds: number) => {
    const rounded = Math.round(seconds);
    const m = Math.floor(Math.abs(rounded) / 60);
    const s = Math.abs(rounded) % 60;
    return `${m}m ${s}s`;
  };

  const getStatusBadge = (status: TimingStatus) => {
    // Shared classes for print and preview
    const badgeBase = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    const printBase = "print:bg-transparent print:text-black print:border print:px-1 print:py-0 print:text-[8px] print:leading-none print:w-auto print:whitespace-nowrap";
    const previewBase = isPreview ? "bg-transparent text-black border px-1 py-0 text-[8px] leading-none whitespace-nowrap" : "";

    switch (status) {
        case TimingStatus.QUALIFIED:
            return <span className={`${badgeBase} bg-green-100 text-green-800 ${printBase} print:border-green-800 ${previewBase} ${isPreview ? 'border-green-800' : ''}`}>Qualified</span>;
        case TimingStatus.OVERTIME:
            return <span className={`${badgeBase} bg-red-100 text-red-800 ${printBase} print:border-red-800 ${previewBase} ${isPreview ? 'border-red-800' : ''}`}>Overtime</span>;
        case TimingStatus.UNDERTIME:
            return <span className={`${badgeBase} bg-yellow-100 text-yellow-800 ${printBase} print:border-yellow-800 ${previewBase} ${isPreview ? 'border-yellow-800' : ''}`}>Undertime</span>;
        default:
            return <span className={`${badgeBase} bg-gray-100 text-gray-800 ${printBase} ${previewBase}`}>Pending</span>;
    }
  };

  const handlePrint = () => {
      window.print();
  };

  const downloadCSV = () => {
    const headers = ['Role', 'Speaker', 'Target Time', 'Actual Time', 'Status'];
    const rows = items.map(item => [
        item.roleName,
        item.speakerName,
        `${item.targetTimeMinutes} min`,
        formatTime(item.actualTimeSeconds),
        item.status
    ]);
    
    // Add Summary at bottom
    rows.push([]);
    rows.push(['--- SUMMARY ---']);
    rows.push(['Club', 'Shantou Toastmasters']);
    rows.push(['Date', reportDate]);
    rows.push(['Meeting #', meetingNumber]);
    rows.push(['Theme', meetingTheme]);
    rows.push(['Scheduled Start', scheduledStart]);
    rows.push(['Actual Start', actualStart]);
    rows.push(['Overall Qualification Rate', `${overallRate}%`]);

    const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `TM_Report_${reportDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Layout Classes ---
  // If isPreview is true, we mimic the 'print:' styles on screen
  const containerClasses = isPreview 
    ? "fixed inset-0 z-50 bg-gray-900/95 overflow-y-auto flex justify-center p-4 md:p-8" 
    : "relative max-w-7xl mx-auto w-full p-4 md:p-6 bg-white rounded-xl shadow-lg my-4 md:my-8 flex flex-col h-full overflow-hidden print:shadow-none print:p-0 print:m-0 print:h-auto print:overflow-visible print:w-full";

  const paperClasses = isPreview
    ? "w-[210mm] min-h-[297mm] bg-white shadow-2xl p-[10mm] relative flex flex-col" 
    : "flex flex-col h-full w-full";

  const headerRowClass = isPreview
     ? "flex flex-row justify-between items-end mb-1 pb-1 border-b border-gray-400"
     : "relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end mb-6 border-b pb-4 print:flex-row print:items-end print:mb-1 print:pb-1 print:border-gray-400";

  const gridClasses = isPreview
     ? "grid grid-cols-12 gap-4"
     : "relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden flex-1 min-h-0 print:grid print:grid-cols-12 print:gap-4 print:overflow-visible print:h-auto";

  // Text sizes for preview
  const txt = {
      base: isPreview ? 'text-[9px]' : 'text-sm print:text-[9px]',
      lg: isPreview ? 'text-lg' : 'text-2xl print:text-lg',
      xl: isPreview ? 'text-xl' : 'text-3xl print:text-base',
      xs: isPreview ? 'text-[8px]' : 'text-xs print:text-[8px]',
      xxs: isPreview ? 'text-[7px]' : 'text-[10px] print:text-[7px]',
  }

  return (
    <div className={containerClasses}>
      {/* Close Preview Button */}
      {isPreview && (
          <button 
            onClick={() => setIsPreview(false)}
            className="fixed top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors z-50"
            title="Close Preview"
          >
              <X className="w-8 h-8" />
          </button>
      )}

      <div className={paperClasses}>
        {/* Decorative Elements (Hide in Preview/Print if desired, but let's keep simple lines) */}
        {!isPreview && (
            <>
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-tm-navy via-tm-burgundy to-tm-yellow print:h-1"></div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-tm-navy/5 rounded-bl-full -z-0 pointer-events-none print:hidden"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-tm-burgundy/5 rounded-tr-full -z-0 pointer-events-none print:hidden"></div>
            </>
        )}
        {isPreview && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-tm-navy via-tm-burgundy to-tm-yellow"></div>}

        {/* Report Header */}
        <div className={headerRowClass}>
            <div className="w-full">
                <div className={`flex flex-col md:flex-row md:justify-between md:items-start mb-2 ${isPreview ? 'mb-0 flex-row justify-between' : 'print:mb-0 print:flex-row print:justify-between'}`}>
                    <h1 className={`${txt.lg} font-extrabold text-tm-navy tracking-tight leading-tight`}>
                        汕头国际演讲俱乐部 <span className="text-tm-burgundy">Shantou Toastmasters</span>
                    </h1>
                    
                    <div className="flex items-center gap-2 mt-2 md:mt-0 print:mt-0">
                        <span className={`${txt.base} font-semibold text-gray-400 uppercase tracking-wide`}>Date:</span>
                        {/* Date Input/Display */}
                        {isPreview ? (
                             <span className="font-mono font-bold text-tm-navy text-[10px]">{reportDate}</span>
                        ) : (
                            <input 
                                type="date" 
                                value={reportDate}
                                onChange={(e) => setReportDate(e.target.value)}
                                className="bg-transparent border-b border-gray-300 focus:border-tm-navy outline-none text-tm-navy font-mono font-bold text-sm text-right w-36 print:border-none print:w-auto print:text-right print:text-[10px] print:h-auto print:p-0"
                            />
                        )}
                    </div>
                </div>

                <div className={`flex items-baseline gap-2 mb-1 ${isPreview ? 'mb-0' : 'print:mb-0'}`}>
                    <div className={`${txt.base} font-bold text-tm-grey uppercase tracking-wider`}>
                        Meeting #{meetingNumber || '---'}
                    </div>
                </div>
                
                <h2 className={`${txt.xl} font-bold text-tm-navy leading-tight`}>
                    {meetingTheme || 'Toastmasters Meeting'}
                </h2>
                <div className={`text-gray-500 mt-1 italic ${txt.xs} ${isPreview ? 'mt-0' : 'print:mt-0'}`}>Official Timer Report</div>
            </div>

            {!isPreview && (
                <div className="flex gap-2 print:hidden mt-4 md:mt-0 self-end">
                    <button 
                        onClick={() => setIsPreview(true)}
                        className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg hover:bg-indigo-100 text-sm font-semibold transition-colors"
                        title="Preview Print Layout"
                    >
                        <Eye className="w-4 h-4" /> Preview
                    </button>
                    <button 
                        onClick={handlePrint}
                        className="flex items-center gap-2 bg-gray-100 text-tm-navy px-3 py-2 rounded-lg hover:bg-gray-200 text-sm font-semibold transition-colors"
                    >
                        <Printer className="w-4 h-4" /> Print
                    </button>
                    <button 
                        onClick={downloadCSV}
                        className="flex items-center gap-2 text-tm-navy border border-tm-navy px-3 py-2 rounded-lg hover:bg-tm-light-grey text-sm font-semibold transition-colors"
                    >
                        <Download className="w-4 h-4" /> Export
                    </button>
                    <button 
                        onClick={onReset}
                        className="flex items-center gap-2 bg-tm-navy text-white px-3 py-2 rounded-lg hover:bg-opacity-90 text-sm font-semibold transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" /> Reset
                    </button>
                </div>
            )}
        </div>

        <div className={gridClasses}>
            
            {/* Left Stats Column */}
            <div className={`lg:col-span-4 flex flex-col gap-4 overflow-y-auto ${isPreview ? 'col-span-4 overflow-visible gap-2' : 'print:col-span-4 print:overflow-visible print:gap-2'}`}>
                
                {/* Punctuality Card */}
                <div className={`bg-slate-50 p-4 rounded-lg border border-slate-100 ${isPreview ? 'p-2 border-gray-300 bg-transparent' : 'print:p-2 print:border-gray-300 print:bg-transparent'}`}>
                    <div className={`flex items-center gap-2 mb-2 text-tm-navy font-bold ${isPreview ? 'mb-1' : 'print:mb-1'}`}>
                        <Clock className={`w-5 h-5 flex-shrink-0 ${isPreview ? 'w-3 h-3' : 'print:w-3 print:h-3'}`} /> 
                        <span className={txt.base}>Meeting Punctuality</span>
                    </div>
                    <div className={`font-bold ${punctualityColor} mb-2 ${isPreview ? 'text-sm mb-1' : 'text-2xl print:mb-1 print:text-sm'}`}>
                        {punctualityStatus}
                    </div>
                    <div className={`text-gray-500 flex justify-between ${isPreview ? 'text-[8px] flex-col gap-0.5' : 'text-sm print:text-[8px] print:flex-col print:gap-0.5'}`}>
                        <span>Sched: {scheduledStart || '--:--'}</span>
                        <span>Actual: {actualStart || '--:--'}</span>
                    </div>
                </div>

                {/* Overall Chart */}
                <div className={`bg-white border p-4 rounded-lg flex flex-col items-center ${isPreview ? 'p-1 border-gray-200' : 'print:p-1 print:border-gray-200'}`}>
                    <h3 className={`font-bold text-tm-navy mb-2 uppercase ${isPreview ? 'text-[9px] mb-0' : 'text-sm print:text-[9px] print:mb-0'}`}>Role Qualification</h3>
                    <div className={`w-full relative ${isPreview ? 'h-24' : 'h-48 print:h-24'}`}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius="60%"
                                    outerRadius="80%"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} iconSize={8} wrapperStyle={{fontSize: '9px'}}/>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className={`absolute inset-0 flex items-center justify-center pointer-events-none pb-8 ${isPreview ? 'pb-4' : 'print:pb-4'}`}>
                            <span className={`font-bold text-gray-700 ${isPreview ? 'text-xs' : 'text-xl print:text-xs'}`}>{overallRate}%</span>
                        </div>
                    </div>
                </div>

                {/* English Analysis Text */}
                <div className={`bg-gray-50 p-4 rounded-lg border border-gray-200 ${isPreview ? 'p-2 bg-transparent border-gray-300' : 'print:p-2 print:bg-transparent print:border-gray-300'}`}>
                    <h3 className={`font-bold text-tm-navy mb-2 flex items-center gap-2 ${isPreview ? 'mb-1 text-[9px]' : 'text-sm print:mb-1 print:text-[9px]'}`}>
                        <Activity className={`w-4 h-4 flex-shrink-0 ${isPreview ? 'w-3 h-3' : 'print:w-3 print:h-3'}`} /> Timer's Analysis
                    </h3>
                    <ul className={`list-disc list-inside space-y-1 text-gray-700 ${isPreview ? 'text-[8px] leading-tight' : 'text-sm print:text-[8px] print:leading-tight'}`}>
                        {analysisLines.map((line, idx) => (
                            <li key={idx}>{line}</li>
                        ))}
                    </ul>
                </div>

                {/* Disclaimer */}
                <div className={`mt-auto pt-4 ${isPreview ? 'pt-2' : 'print:pt-2'}`}>
                    <p className={`text-gray-400 italic text-center ${txt.xxs} leading-tight`}>
                        *Only For Reference: This report is a record of time usage during the meeting and does not reflect the speaker's ability or speech quality.
                    </p>
                </div>
            </div>

            {/* Right Details Column */}
            <div className={`lg:col-span-8 overflow-y-auto pr-2 ${isPreview ? 'col-span-8 overflow-visible pr-0' : 'print:col-span-8 print:overflow-visible print:pr-0'}`}>
                
                <h3 className={`font-semibold text-tm-navy mb-4 ${isPreview ? 'hidden' : 'text-lg print:hidden'}`}>Detailed Results</h3>
                <div className={`bg-white border rounded-lg overflow-hidden ${isPreview ? 'border-gray-400 rounded-none border-t border-l border-r' : 'print:border-gray-400 print:rounded-none print:border-t print:border-l print:border-r'}`}>
                    <table className={`min-w-full divide-y divide-gray-200 ${isPreview ? 'divide-gray-400' : 'print:divide-gray-400'}`}>
                        <thead className={`bg-gray-50 ${isPreview ? 'bg-gray-200' : 'print:bg-gray-200'}`}>
                            <tr>
                                <th scope="col" className={`px-4 py-3 text-left font-bold text-gray-500 uppercase tracking-wider ${isPreview ? 'text-black py-0.5 px-1 text-[9px] h-4' : 'text-xs print:text-black print:py-0.5 print:px-1 print:text-[9px] print:h-4'}`}>Role / Speaker</th>
                                <th scope="col" className={`px-4 py-3 text-left font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell ${isPreview ? 'table-cell text-black py-0.5 px-1 text-[9px]' : 'text-xs print:table-cell print:text-black print:py-0.5 print:px-1 print:text-[9px]'}`}>Target</th>
                                <th scope="col" className={`px-4 py-3 text-left font-bold text-gray-500 uppercase tracking-wider ${isPreview ? 'text-black py-0.5 px-1 text-[9px]' : 'text-xs print:text-black print:py-0.5 print:px-1 print:text-[9px]'}`}>Actual</th>
                                <th scope="col" className={`px-4 py-3 text-left font-bold text-gray-500 uppercase tracking-wider ${isPreview ? 'text-black py-0.5 px-1 text-[9px]' : 'text-xs print:text-black print:py-0.5 print:px-1 print:text-[9px]'}`}>Status</th>
                            </tr>
                        </thead>
                        <tbody className={`bg-white divide-y divide-gray-200 ${isPreview ? 'divide-gray-300' : 'print:divide-gray-300'}`}>
                            {items.map((item) => (
                                <React.Fragment key={item.id}>
                                    <tr className={`hover:bg-gray-50 transition-colors border-b last:border-0 ${isPreview ? 'break-inside-avoid border-b-gray-300' : 'print:break-inside-avoid print:border-b-gray-300'}`}>
                                        <td className={`px-4 py-3 ${isPreview ? 'py-0.5 px-1' : 'print:py-0.5 print:px-1'}`}>
                                            <div className={`font-medium text-gray-900 ${isPreview ? 'text-[9px] font-bold leading-tight' : 'text-sm print:text-[9px] print:font-bold print:leading-tight'}`}>{item.roleName}</div>
                                            <div className={`text-gray-500 ${isPreview ? 'text-[8px] leading-none' : 'text-sm print:text-[8px] print:leading-none'}`}>{item.speakerName}</div>
                                        </td>
                                        <td className={`px-4 py-3 whitespace-nowrap text-gray-500 hidden md:table-cell ${isPreview ? 'table-cell py-0.5 px-1 text-[9px] leading-tight' : 'text-sm print:table-cell print:py-0.5 print:px-1 print:text-[9px] print:leading-tight'}`}>
                                            {item.targetTimeMinutes} min
                                        </td>
                                        <td className={`px-4 py-3 whitespace-nowrap font-mono font-medium text-tm-navy ${isPreview ? 'py-0.5 px-1 text-black text-[9px] leading-tight' : 'text-sm print:py-0.5 print:px-1 print:text-black print:text-[9px] print:leading-tight'}`}>
                                            {formatTime(item.actualTimeSeconds)}
                                        </td>
                                        <td className={`px-4 py-3 whitespace-nowrap ${isPreview ? 'py-0.5 px-1' : 'print:py-0.5 print:px-1'}`}>
                                            {getStatusBadge(item.status)}
                                        </td>
                                    </tr>
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                {/* Footer Quote */}
                <div className={`mt-8 text-center font-serif italic text-tm-navy opacity-80 border-t pt-4 ${isPreview ? 'mt-1 pt-1 text-[8px] border-t-0' : 'text-sm print:mt-1 print:pt-1 print:text-[8px] print:border-t-0'}`}>
                    “Time is like our best meeting guest — when we respect it, everything runs smoothly.”
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ReportView;
