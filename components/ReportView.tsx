import React from 'react';
import { AgendaItem, TimingStatus, RoleType } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Download, RefreshCw, AlertTriangle, Clock } from 'lucide-react';
import { TM_COLORS } from '../constants';

interface ReportViewProps {
  items: AgendaItem[];
  onReset: () => void;
  scheduledStart: string;
  actualStart: string;
}

const ReportView: React.FC<ReportViewProps> = ({ items, onReset, scheduledStart, actualStart }) => {
  
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

  // 2. Session Statistics (Duration Based)
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

  // Prepared Session: Prepared Speeches (Type=Speech) AND Evaluators (Name contains 'Evaluator' or inferred)
  // Since we removed Type selector, we rely on the `type` property being set correctly in background or user toggling Speech icon.
  // We also include Evaluators by name.
  const preparedFilter = (i: AgendaItem) => {
      if (i.status === TimingStatus.PENDING) return false;
      const isSpeech = i.type === RoleType.SPEECH;
      const isEvaluator = i.roleName.toLowerCase().includes('evaluator') && !i.roleName.toLowerCase().includes('general');
      return isSpeech || isEvaluator;
  };

  const ttFilter = (i: AgendaItem) => {
      if (i.status === TimingStatus.PENDING) return false;
      // Includes specific TT type or name-based fallback
      return i.type === RoleType.TABLE_TOPIC || i.roleName.toLowerCase().includes('table topic');
  };

  const preparedStats = calcSessionStats(preparedFilter);
  const ttStats = calcSessionStats(ttFilter);

  // 3. Overall On-Time Rate (Individual Qualification)
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
    .filter(i => i.status !== TimingStatus.QUALIFIED)
    .map(i => {
        const targetSeconds = i.targetTimeMinutes * 60;
        const diff = Math.abs(i.actualTimeSeconds - targetSeconds);
        return { ...i, deviation: diff };
    })
    .sort((a, b) => b.deviation - a.deviation)
    .slice(0, 2);


  // --- Formatters ---
  const formatTime = (seconds: number) => {
    const m = Math.floor(Math.abs(seconds) / 60);
    const s = Math.abs(seconds) % 60;
    return `${m}m ${s}s`;
  };

  const getStatusBadge = (status: TimingStatus) => {
    switch (status) {
        case TimingStatus.QUALIFIED:
            return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Qualified</span>;
        case TimingStatus.OVERTIME:
            return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Overtime</span>;
        case TimingStatus.UNDERTIME:
            return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Undertime</span>;
        default:
            return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Pending</span>;
    }
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
    rows.push(['Scheduled Start', scheduledStart]);
    rows.push(['Actual Start', actualStart]);
    rows.push(['Overall Qualification Rate', `${overallRate}%`]);
    rows.push(['Prepared Session Variance', `${preparedStats.diff > 0 ? '+' : '-'}${formatTime(preparedStats.diff)}`]);
    rows.push(['Table Topics Variance', `${ttStats.diff > 0 ? '+' : '-'}${formatTime(ttStats.diff)}`]);

    const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `TM_Report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto w-full p-4 md:p-6 bg-white rounded-xl shadow-lg my-4 md:my-8 flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <div>
            <h2 className="text-2xl md:text-3xl font-bold text-tm-navy">Timer Report</h2>
            <p className="text-gray-500">Shantou Toastmasters Meeting Summary</p>
        </div>
        <div className="flex gap-2">
             <button 
                onClick={downloadCSV}
                className="flex items-center gap-2 text-tm-navy border border-tm-navy px-3 py-2 rounded-lg hover:bg-tm-light-grey text-sm font-semibold"
            >
                <Download className="w-4 h-4" /> <span className="hidden md:inline">Export CSV</span>
            </button>
            <button 
                onClick={onReset}
                className="flex items-center gap-2 bg-tm-navy text-white px-3 py-2 rounded-lg hover:bg-opacity-90 text-sm font-semibold"
            >
                <RefreshCw className="w-4 h-4" /> <span className="hidden md:inline">New</span>
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden flex-1 min-h-0">
        
        {/* Left Stats Column */}
        <div className="lg:col-span-4 flex flex-col gap-4 overflow-y-auto">
            
            {/* Punctuality Card */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div className="flex items-center gap-2 mb-2 text-tm-navy font-bold">
                    <Clock className="w-5 h-5" /> Meeting Punctuality
                </div>
                <div className={`text-2xl font-bold ${punctualityColor} mb-2`}>
                    {punctualityStatus}
                </div>
                <div className="text-sm text-gray-500 flex justify-between">
                    <span>Scheduled: {scheduledStart || '--:--'}</span>
                    <span>Actual: {actualStart || '--:--'}</span>
                </div>
            </div>

            {/* Session Stats (Aggregated) */}
            <div className="grid grid-cols-1 gap-4">
                 <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex justify-between items-end mb-1">
                        <div className="text-xs text-tm-navy font-bold uppercase">Prepared Speeches & Evaluators</div>
                        <div className={`text-xs font-bold ${preparedStats.diff > 60 ? 'text-red-500' : 'text-green-600'}`}>
                            {preparedStats.diff > 0 ? '+' : ''}{formatTime(preparedStats.diff)}
                        </div>
                    </div>
                    <div className="w-full bg-blue-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-tm-navy h-full" style={{ width: `${Math.min((preparedStats.actualSec / (preparedStats.targetSec || 1)) * 100, 100)}%` }}></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 flex justify-between">
                        <span>Used: {formatTime(preparedStats.actualSec)}</span>
                        <span>Target: {formatTime(preparedStats.targetSec)}</span>
                    </div>
                 </div>

                 <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex justify-between items-end mb-1">
                        <div className="text-xs text-tm-navy font-bold uppercase">Table Topics Session</div>
                        <div className={`text-xs font-bold ${ttStats.diff > 60 ? 'text-red-500' : 'text-green-600'}`}>
                            {ttStats.diff > 0 ? '+' : ''}{formatTime(ttStats.diff)}
                        </div>
                    </div>
                    <div className="w-full bg-blue-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-tm-navy h-full" style={{ width: `${Math.min((ttStats.actualSec / (ttStats.targetSec || 1)) * 100, 100)}%` }}></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 flex justify-between">
                        <span>Used: {formatTime(ttStats.actualSec)}</span>
                        <span>Target: {formatTime(ttStats.targetSec)}</span>
                    </div>
                 </div>
            </div>

            {/* Overall Chart */}
            <div className="bg-white border p-4 rounded-lg flex flex-col items-center">
                <h3 className="text-sm font-bold text-tm-navy mb-2 uppercase">Role Qualification Rate</h3>
                <div className="w-full h-48 relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={60}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" height={36} iconSize={10} wrapperStyle={{fontSize: '10px'}}/>
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                        <span className="text-xl font-bold text-gray-700">{overallRate}%</span>
                    </div>
                </div>
            </div>

            {/* Lateness Contributors */}
            {deviationItems.length > 0 && (
                <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                    <h3 className="text-sm font-bold text-tm-burgundy mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" /> Significant Deviations
                    </h3>
                    <ul className="space-y-3">
                        {deviationItems.map((item, idx) => (
                            <li key={idx} className="bg-white p-2 rounded shadow-sm">
                                <div className="flex justify-between items-start">
                                    <span className="text-sm font-bold text-gray-800 truncate block max-w-[120px]">{item.speakerName || item.roleName}</span>
                                    <span className="text-xs font-mono text-red-600 font-bold">
                                        Off by {formatTime(item.deviation)}
                                    </span>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    Target: {item.targetTimeMinutes}m | Actual: {formatTime(item.actualTimeSeconds)}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>

        {/* Right Details Column */}
        <div className="lg:col-span-8 overflow-y-auto pr-2">
            <h3 className="text-lg font-semibold text-tm-navy mb-4">Detailed Results</h3>
            <div className="bg-white border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Role / Speaker</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Target</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Actual</th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {items.map((item) => (
                            <React.Fragment key={item.id}>
                                <tr className="hover:bg-gray-50 transition-colors border-b last:border-0">
                                    <td className="px-4 py-3">
                                        <div className="text-sm font-medium text-gray-900">{item.roleName}</div>
                                        <div className="text-sm text-gray-500">{item.speakerName}</div>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                                        {item.targetTimeMinutes} min
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-mono font-medium text-tm-navy">
                                        {formatTime(item.actualTimeSeconds)}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        {getStatusBadge(item.status)}
                                    </td>
                                </tr>
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ReportView;
