
import React, { useState } from 'react';
import { AgendaItem, TimingStatus, RoleType } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Download, RefreshCw, AlertTriangle, Clock, Printer, Activity } from 'lucide-react';
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

  // 2. Session Statistics
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

  const preparedFilter = (i: AgendaItem) => {
      if (i.status === TimingStatus.PENDING) return false;
      const isSpeech = i.type === RoleType.SPEECH;
      const isEvaluator = i.roleName.toLowerCase().includes('evaluator') && !i.roleName.toLowerCase().includes('general');
      return isSpeech || isEvaluator;
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

  const preparedStats = calcSessionStats(preparedFilter);

  // 3. Overall On-Time Rate
  const completedItems = items.filter(i => i.status !== TimingStatus.PENDING);
  const overallQualified = completedItems.filter(i => i.status === TimingStatus.QUALIFIED).length;
  const overallRate = completedItems.length > 0 ? Math.round((overallQualified / completedItems.length) * 100) : 0;

  const pieData = [
    { name: 'Qualified', value: overallQualified, color: TM_COLORS.GREEN },
    { name: 'Overtime', value: completedItems.filter(i => i.status === TimingStatus.OVERTIME).length, color: TM_COLORS.BURGUNDY },
    { name: 'Undertime', value: completedItems.filter(i => i.status === TimingStatus.UNDERTIME).length, color: TM_COLORS.YELLOW }, 
  ].filter(d => d.value > 0);

  // 4. Top Contributors to Lateness (Deviation)
  const deviationItems = completedItems
    .filter(i => i.status === TimingStatus.OVERTIME)
    .map(i => {
        const targetSeconds = i.targetTimeMinutes * 60;
        const diff = Math.abs(i.actualTimeSeconds - targetSeconds);
        return { ...i, deviation: diff };
    })
    .sort((a, b) => b.deviation - a.deviation)
    .slice(0, 3);

  // 5. Generate Analysis Text
  const getAnalysisText = () => {
    const lines = [];
    
    // Punctuality
    if (meetingDelayMinutes > 5) {
        lines.push("The meeting started later than scheduled. A prompt start is encouraged.");
    } else {
        lines.push("Great job starting the meeting on time!");
    }

    // Qualification
    if (overallRate >= 80) {
        lines.push("Time management was excellent today, with most speakers qualifying.");
    } else if (overallRate >= 50) {
        lines.push("Time management was fair, but there is room for improvement.");
    } else {
        lines.push("Many roles did not meet the time requirements. Please watch the signals closely.");
    }

    // Sessions
    if (ttStats.diff > 120) {
        lines.push("Table Topics session significantly exceeded the time limit.");
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
    switch (status) {
        case TimingStatus.QUALIFIED:
            return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 print:bg-transparent print:text-black print:border print:border-green-800 print:px-1 print:py-0 print:text-[8px] print:leading-none">Qualified</span>;
        case TimingStatus.OVERTIME:
            return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 print:bg-transparent print:text-black print:border print:border-red-800 print:px-1 print:py-0 print:text-[8px] print:leading-none">Overtime</span>;
        case TimingStatus.UNDERTIME:
            return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 print:bg-transparent print:text-black print:border print:border-yellow-800 print:px-1 print:py-0 print:text-[8px] print:leading-none">Undertime</span>;
        default:
            return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 print:px-1 print:py-0 print:text-[8px] print:leading-none">Pending</span>;
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

  return (
    <div className="relative max-w-7xl mx-auto w-full p-4 md:p-6 bg-white rounded-xl shadow-lg my-4 md:my-8 flex flex-col h-full overflow-hidden print:shadow-none print:p-0 print:m-0 print:h-auto print:overflow-visible print:w-full">
      
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-tm-navy via-tm-burgundy to-tm-yellow print:h-1"></div>
      <div className="absolute top-0 right-0 w-64 h-64 bg-tm-navy/5 rounded-bl-full -z-0 pointer-events-none print:hidden"></div>
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-tm-burgundy/5 rounded-tr-full -z-0 pointer-events-none print:hidden"></div>

      {/* Report Header */}
      <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end mb-6 border-b pb-4 print:flex-row print:items-end print:mb-1 print:pb-1 print:border-gray-400">
        <div className="w-full">
            <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-2 print:mb-0">
                <h1 className="text-2xl font-extrabold text-tm-navy tracking-tight print:text-lg">
                    汕头国际演讲俱乐部 <span className="text-tm-burgundy">Shantou Toastmasters</span>
                </h1>
                
                <div className="flex items-center gap-2 mt-2 md:mt-0">
                    <span className="text-sm font-semibold text-gray-400 uppercase tracking-wide print:text-[9px]">Date:</span>
                    <input 
                        type="date" 
                        value={reportDate}
                        onChange={(e) => setReportDate(e.target.value)}
                        className="bg-transparent border-b border-gray-300 focus:border-tm-navy outline-none text-tm-navy font-mono font-bold text-sm text-right w-36 print:border-none print:w-auto print:text-right print:text-[10px] print:h-auto print:p-0"
                    />
                </div>
            </div>

            <div className="flex items-baseline gap-2 mb-1 print:mb-0">
                <div className="text-sm font-bold text-tm-grey uppercase tracking-wider print:text-[9px]">
                    Meeting #{meetingNumber || '---'}
                </div>
            </div>
            
            <h2 className="text-3xl font-bold text-tm-navy leading-tight print:text-base print:leading-tight">
                {meetingTheme || 'Toastmasters Meeting'}
            </h2>
            <div className="text-gray-500 mt-1 print:text-[9px] italic print:mt-0">Official Timer Report</div>
        </div>

        <div className="flex gap-2 print:hidden mt-4 md:mt-0 self-end">
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
      </div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden flex-1 min-h-0 print:grid print:grid-cols-12 print:gap-4 print:overflow-visible print:h-auto">
        
        {/* Left Stats Column */}
        <div className="lg:col-span-4 print:col-span-4 flex flex-col gap-4 overflow-y-auto print:overflow-visible print:gap-2">
            
            {/* Punctuality Card */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 print:p-2 print:border-gray-300 print:bg-transparent">
                <div className="flex items-center gap-2 mb-2 text-tm-navy font-bold print:mb-1">
                    <Clock className="w-5 h-5 print:w-3 print:h-3" /> 
                    <span className="print:text-[10px]">Meeting Punctuality</span>
                </div>
                <div className={`text-2xl font-bold ${punctualityColor} mb-2 print:mb-1 print:text-sm`}>
                    {punctualityStatus}
                </div>
                <div className="text-sm text-gray-500 flex justify-between print:text-[8px] print:flex-col print:gap-0.5">
                    <span>Sched: {scheduledStart || '--:--'}</span>
                    <span>Actual: {actualStart || '--:--'}</span>
                </div>
            </div>

            {/* Session Stats (Aggregated) */}
            <div className="grid grid-cols-1 gap-4 print:gap-1.5">
                 <div className="bg-blue-50 p-4 rounded-lg print:p-1.5 print:border print:border-blue-100 print:bg-transparent">
                    <div className="flex justify-between items-end mb-1">
                        <div className="text-xs text-tm-navy font-bold uppercase print:text-[8px]">Speeches</div>
                        <div className={`text-xs font-bold ${preparedStats.diff > 60 ? 'text-red-500' : 'text-green-600'} print:text-[8px]`}>
                            {preparedStats.diff > 0 ? '+' : ''}{formatTime(preparedStats.diff)}
                        </div>
                    </div>
                    <div className="w-full bg-blue-200 h-2 rounded-full overflow-hidden print:h-1">
                        <div className="bg-tm-navy h-full" style={{ width: `${Math.min((preparedStats.actualSec / (preparedStats.targetSec || 1)) * 100, 100)}%` }}></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 flex justify-between print:text-[7px]">
                        <span>Used: {formatTime(preparedStats.actualSec)}</span>
                        <span>Target: {formatTime(preparedStats.targetSec)}</span>
                    </div>
                 </div>

                 <div className="bg-blue-50 p-4 rounded-lg print:p-1.5 print:border print:border-blue-100 print:bg-transparent">
                    <div className="flex justify-between items-end mb-1">
                        <div className="text-xs text-tm-navy font-bold uppercase print:text-[8px]">Table Topics</div>
                        <div className={`text-xs font-bold ${ttStats.diff > 60 ? 'text-red-500' : 'text-green-600'} print:text-[8px]`}>
                            {ttStats.diff > 0 ? '+' : ''}{formatTime(ttStats.diff)}
                        </div>
                    </div>
                    <div className="w-full bg-blue-200 h-2 rounded-full overflow-hidden print:h-1">
                        <div className="bg-tm-navy h-full" style={{ width: `${Math.min((ttStats.actualSec / (ttStats.targetSec || 1)) * 100, 100)}%` }}></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 flex justify-between print:text-[7px]">
                        <span>Used: {formatTime(ttStats.actualSec)}</span>
                        <span>Target: {formatTime(ttStats.targetSec)}</span>
                    </div>
                 </div>
            </div>

            {/* Overall Chart */}
            <div className="bg-white border p-4 rounded-lg flex flex-col items-center print:p-1 print:border-gray-200">
                <h3 className="text-sm font-bold text-tm-navy mb-2 uppercase print:text-[9px] print:mb-0">Role Qualification</h3>
                <div className="w-full h-48 relative print:h-24">
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
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8 print:pb-4">
                        <span className="text-xl font-bold text-gray-700 print:text-xs">{overallRate}%</span>
                    </div>
                </div>
            </div>

            {/* English Analysis Text */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 print:p-2 print:bg-transparent print:border-gray-300">
                 <h3 className="text-sm font-bold text-tm-navy mb-2 flex items-center gap-2 print:mb-1 print:text-[9px]">
                    <Activity className="w-4 h-4 print:w-3 print:h-3" /> Timer's Analysis
                 </h3>
                 <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 print:text-[8px] print:leading-tight">
                    {analysisLines.map((line, idx) => (
                        <li key={idx}>{line}</li>
                    ))}
                 </ul>
            </div>

             {/* Disclaimer */}
            <div className="mt-auto pt-4 print:pt-2">
                 <p className="text-xs text-gray-400 italic text-center print:text-[7px] print:leading-tight">
                    *Only For Reference: This report is a record of time usage during the meeting and does not reflect the speaker's ability or speech quality.
                 </p>
            </div>
        </div>

        {/* Right Details Column (Expands on Print) */}
        <div className="lg:col-span-8 overflow-y-auto pr-2 print:col-span-8 print:overflow-visible print:pr-0">
            
            <h3 className="text-lg font-semibold text-tm-navy mb-4 print:hidden">Detailed Results</h3>
            <div className="bg-white border rounded-lg overflow-hidden print:border-gray-400 print:rounded-none print:border-t print:border-l print:border-r">
                <table className="min-w-full divide-y divide-gray-200 print:divide-gray-400">
                    <thead className="bg-gray-50 print:bg-gray-200">
                        <tr>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider print:text-black print:py-0.5 print:px-1 print:text-[9px] print:h-4">Role / Speaker</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell print:table-cell print:text-black print:py-0.5 print:px-1 print:text-[9px]">Target</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider print:text-black print:py-0.5 print:px-1 print:text-[9px]">Actual</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider print:text-black print:py-0.5 print:px-1 print:text-[9px]">Status</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 print:divide-gray-300">
                        {items.map((item) => (
                            <React.Fragment key={item.id}>
                                <tr className="hover:bg-gray-50 transition-colors border-b last:border-0 print:break-inside-avoid print:border-b-gray-300">
                                    <td className="px-4 py-3 print:py-0.5 print:px-1">
                                        <div className="text-sm font-medium text-gray-900 print:text-[9px] print:font-bold print:leading-tight">{item.roleName}</div>
                                        <div className="text-sm text-gray-500 print:text-[8px] print:leading-none">{item.speakerName}</div>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell print:table-cell print:py-0.5 print:px-1 print:text-[9px] print:leading-tight">
                                        {item.targetTimeMinutes} min
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-mono font-medium text-tm-navy print:py-0.5 print:px-1 print:text-black print:text-[9px] print:leading-tight">
                                        {formatTime(item.actualTimeSeconds)}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap print:py-0.5 print:px-1">
                                        {getStatusBadge(item.status)}
                                    </td>
                                </tr>
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {/* Footer Quote */}
            <div className="mt-8 text-center text-sm font-serif italic text-tm-navy opacity-80 border-t pt-4 print:mt-1 print:pt-1 print:text-[8px] print:border-t-0">
                “Time is like our best meeting guest — when we respect it, everything runs smoothly.”
            </div>
        </div>
      </div>
    </div>
  );
};

export default ReportView;
