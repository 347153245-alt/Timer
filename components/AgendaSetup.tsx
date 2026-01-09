
import React, { useState, useRef, useEffect } from 'react';
import { AgendaItem, RoleType, TimingStatus, SavedMeetingState } from '../types';
import { Plus, Trash2, PlayCircle, ArrowUp, ArrowDown, Bell, Pencil, Save, Mic, RotateCcw, History, FolderOpen, X, Pause, Play } from 'lucide-react';
import { DEFAULT_AGENDA_ITEMS, getTimerConfig } from '../constants';

interface AgendaSetupProps {
  items: AgendaItem[];
  setItems: React.Dispatch<React.SetStateAction<AgendaItem[]>>;
  onStartRole: (index: number) => void;
  isTimerActive: boolean;
  scheduledStart: string;
  setScheduledStart: (time: string) => void;
  actualStart: string;
  setActualStart: (time: string) => void;
  meetingNumber: string;
  setMeetingNumber: (num: string) => void;
  meetingTheme: string;
  setMeetingTheme: (theme: string) => void;
  // Persistence Props
  onSave: () => void;
  savedHistory: SavedMeetingState[];
  onRestore: (state: SavedMeetingState) => void;
}

const AgendaSetup: React.FC<AgendaSetupProps> = ({ 
    items, setItems, onStartRole, isTimerActive,
    scheduledStart, setScheduledStart,
    actualStart, setActualStart,
    meetingNumber, setMeetingNumber,
    meetingTheme, setMeetingTheme,
    onSave, savedHistory, onRestore
}) => {
  const [editingTimeId, setEditingTimeId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const actualTimeInputRef = useRef<HTMLInputElement>(null);

  // Helper to determine status based on time
  const calculateStatus = (actualSeconds: number, type: RoleType, targetMinutes: number): TimingStatus => {
      if (actualSeconds === 0) return TimingStatus.PENDING;
      
      const config = getTimerConfig(type, targetMinutes);
      
      // Rule: 
      // Undertime: < Green
      // Qualified: Green <= time < Bell (Includes Green, Yellow, Red)
      // Overtime: >= Bell (Red + 30s)
      
      if (actualSeconds >= config.bellTime) {
          return TimingStatus.OVERTIME;
      } else if (actualSeconds >= config.greenTime) {
          return TimingStatus.QUALIFIED;
      } else {
          return TimingStatus.UNDERTIME;
      }
  };

  // Interval for Inline Session Timers
  useEffect(() => {
    const intervalId = setInterval(() => {
        // Check if any item is a running SESSION
        const hasRunningSession = items.some(i => i.type === RoleType.SESSION && i.isRunning);
        
        if (hasRunningSession) {
            setItems(currentItems => currentItems.map(item => {
                if (item.type === RoleType.SESSION && item.isRunning) {
                    const now = Date.now();
                    const lastTick = item.lastTick || now;
                    const deltaSeconds = (now - lastTick) / 1000;
                    
                    // Update actual time
                    const newTotal = item.actualTimeSeconds + deltaSeconds;
                    
                    // Update Status
                    const status = calculateStatus(newTotal, item.type, item.targetTimeMinutes);

                    return {
                        ...item,
                        actualTimeSeconds: newTotal,
                        lastTick: now,
                        status: status
                    };
                }
                return item;
            }));
        }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [items, setItems]);

  const updateItem = (index: number, field: keyof AgendaItem, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };
    
    // Auto-update status if time changes manually
    if (field === 'actualTimeSeconds' || field === 'targetTimeMinutes' || field === 'type') {
        const seconds = field === 'actualTimeSeconds' ? value : item.actualTimeSeconds;
        item.status = calculateStatus(seconds, item.type, item.targetTimeMinutes);
    }

    newItems[index] = item;
    setItems(newItems);
  };

  const handleActualTimeSave = (index: number, value: string) => {
      let totalSeconds = 0;
      if (value.includes(':')) {
          const [m, s] = value.split(':').map(Number);
          totalSeconds = (m || 0) * 60 + (s || 0);
      } else {
          // Default to seconds if just a number is entered
          totalSeconds = parseInt(value) || 0;
      }
      updateItem(index, 'actualTimeSeconds', totalSeconds);
      setEditingTimeId(null);
  };

  const addItem = (index: number, type: RoleType) => {
    const isSpeech = type === RoleType.SPEECH;
    const newItem: AgendaItem = {
      id: crypto.randomUUID(),
      roleName: isSpeech ? 'Prepared Speech Speaker' : 'New Role',
      speakerName: '',
      type: type,
      targetTimeMinutes: isSpeech ? 7 : 2,
      actualTimeSeconds: 0,
      status: TimingStatus.PENDING
    };
    
    const newItems = [...items];
    // Insert AFTER the current index
    newItems.splice(index + 1, 0, newItem);
    setItems(newItems);
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === items.length - 1) return;

    const newItems = [...items];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    if (window.confirm("Are you sure you want to delete this agenda item?")) {
        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems);
    }
  };

  const toggleSpeechType = (index: number) => {
      const currentType = items[index].type;
      const newType = currentType === RoleType.SPEECH ? RoleType.OTHER : RoleType.SPEECH;
      updateItem(index, 'type', newType);
  };

  const handleSessionAction = (index: number, action: 'start' | 'pause' | 'resume' | 'reset') => {
      const item = items[index];
      const newItems = [...items];
      
      if (action === 'start' || action === 'resume') {
          newItems[index] = { 
              ...item, 
              isRunning: true, 
              lastTick: Date.now() 
          };
      } else if (action === 'pause') {
          // Update time one last time to be accurate
          newItems[index] = {
              ...item,
              isRunning: false
          };
      } else if (action === 'reset') {
          if (window.confirm(`Are you sure you want to reset the timer for ${item.roleName} to 0?`)) {
               newItems[index] = {
                   ...item,
                   isRunning: false,
                   actualTimeSeconds: 0,
                   status: TimingStatus.PENDING
               };
          } else {
              return; // Cancelled
          }
      }
      setItems(newItems);
  }

  const loadPreset = () => {
    if (items.length > 0 && !window.confirm("This will replace your current agenda. Continue?")) {
        return;
    }
    const presetItems = DEFAULT_AGENDA_ITEMS.map(i => ({
        ...i,
        id: crypto.randomUUID(),
        speakerName: '',
        actualTimeSeconds: 0,
        status: TimingStatus.PENDING,
        isRunning: false
    }));
    setItems(presetItems);
  };

  const addNewAtTop = () => {
      const newItem: AgendaItem = {
        id: crypto.randomUUID(),
        roleName: 'New Role',
        speakerName: '',
        type: RoleType.OTHER,
        targetTimeMinutes: 2,
        actualTimeSeconds: 0,
        status: TimingStatus.PENDING
      };
      setItems([newItem, ...items]);
  };
  
  const getResultBadge = (item: AgendaItem) => {
    if (item.actualTimeSeconds === 0 && !item.isRunning) return <span className="text-gray-300">-</span>;

    const config = getTimerConfig(item.type, item.targetTimeMinutes);
    const t = item.actualTimeSeconds;

    if (t >= config.bellTime) return <span className="flex items-center gap-1 text-xs font-bold text-white bg-tm-burgundy px-2 py-1 rounded"><Bell className="w-3 h-3"/> {'>'} +30s</span>;
    if (t >= config.redTime) return <span className="flex items-center gap-1 text-xs font-bold text-white bg-red-600 px-2 py-1 rounded">RED</span>;
    if (t >= config.yellowTime) return <span className="flex items-center gap-1 text-xs font-bold text-tm-navy bg-tm-yellow px-2 py-1 rounded">YELLOW</span>;
    if (t >= config.greenTime) return <span className="flex items-center gap-1 text-xs font-bold text-white bg-green-600 px-2 py-1 rounded">GREEN</span>;
    
    return <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">UNDER</span>;
  };

  const formatSecondsFull = (seconds: number) => {
    const rounded = Math.round(seconds);
    const m = Math.floor(rounded / 60);
    const s = Math.floor(rounded % 60);
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  };

  const formatSecondsShort = (seconds: number) => {
    const rounded = Math.round(seconds);
    const m = Math.floor(rounded / 60);
    const s = Math.floor(rounded % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleSetNow = () => {
    const now = new Date();
    const timeString = now.toTimeString().substring(0, 5);
    setActualStart(timeString);
  };

  const handleRestoreClick = (state: SavedMeetingState) => {
      if (window.confirm(`Load version from ${new Date(state.timestamp).toLocaleTimeString()}? This will overwrite current data.`)) {
          onRestore(state);
          setShowHistory(false);
      }
  };

  return (
    <div className="max-w-7xl mx-auto w-full p-4 md:p-6 flex flex-col h-full relative">
      
      {/* History Modal */}
      {showHistory && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
                  <div className="flex justify-between items-center p-4 border-b bg-gray-50">
                      <h3 className="text-lg font-bold text-tm-navy flex items-center gap-2">
                          <History className="w-5 h-5" /> Saved History
                      </h3>
                      <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-600">
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  <div className="p-4">
                      {savedHistory.length === 0 ? (
                          <div className="text-center text-gray-400 py-8">No saved versions found.</div>
                      ) : (
                          <ul className="space-y-3">
                              {savedHistory.map((state, idx) => (
                                  <li key={state.timestamp} className="border rounded-lg p-3 hover:bg-gray-50 flex justify-between items-center group">
                                      <div>
                                          <div className="text-sm font-bold text-tm-navy">
                                              {new Date(state.timestamp).toLocaleDateString()} &nbsp;
                                              {new Date(state.timestamp).toLocaleTimeString()}
                                          </div>
                                          <div className="text-xs text-gray-500">
                                              {state.meetingTheme || 'No Theme'} • {state.items.length} items
                                          </div>
                                      </div>
                                      <button 
                                        onClick={() => handleRestoreClick(state)}
                                        className="bg-white border border-tm-navy text-tm-navy px-3 py-1 rounded text-xs font-bold hover:bg-tm-navy hover:text-white transition-colors"
                                      >
                                          Load
                                      </button>
                                  </li>
                              ))}
                          </ul>
                      )}
                  </div>
              </div>
          </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 flex-shrink-0 gap-4">
        <div>
            <h2 className="text-2xl font-bold text-tm-navy">Meeting Agenda</h2>
            <p className="text-tm-grey text-sm">Manage roles and record times.</p>
        </div>

        {/* Meeting Details Section */}
        <div className="flex flex-col gap-3 bg-white p-4 rounded-lg border border-gray-200 shadow-sm w-full md:w-auto">
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex flex-col">
                    <label className="text-xs font-bold text-tm-navy uppercase mb-1">Meeting #</label>
                    <input 
                        type="text" 
                        value={meetingNumber}
                        onChange={(e) => setMeetingNumber(e.target.value)}
                        placeholder="e.g. 100"
                        className="border border-gray-300 rounded px-2 py-1 text-sm focus:border-tm-navy outline-none w-24"
                    />
                </div>
                <div className="flex flex-col flex-1">
                    <label className="text-xs font-bold text-tm-navy uppercase mb-1">Meeting Theme</label>
                    <input 
                        type="text" 
                        value={meetingTheme}
                        onChange={(e) => setMeetingTheme(e.target.value)}
                        placeholder="Enter theme..."
                        className="border border-gray-300 rounded px-2 py-1 text-sm focus:border-tm-navy outline-none w-full md:w-64"
                    />
                </div>
            </div>
            <div className="flex flex-col md:flex-row gap-4 border-t pt-3 mt-1">
                <div className="flex flex-col">
                    <label className="text-xs font-bold text-tm-navy uppercase mb-1">Meeting Scheduled Start</label>
                    <input 
                        type="time" 
                        value={scheduledStart}
                        onChange={(e) => setScheduledStart(e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 text-sm focus:border-tm-navy outline-none"
                    />
                </div>
                <div className="flex flex-col">
                    <label className="text-xs font-bold text-tm-navy uppercase mb-1">Meeting Actual Start</label>
                    <div className="flex gap-2">
                        <input 
                            type="time" 
                            value={actualStart}
                            onChange={(e) => setActualStart(e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1 text-sm focus:border-tm-navy outline-none"
                        />
                        <button 
                            onClick={handleSetNow}
                            className="bg-gray-100 hover:bg-gray-200 text-tm-navy px-2 py-1 rounded text-xs font-bold transition-colors"
                            title="Set to Current Time"
                        >
                            NOW
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 self-start md:self-center items-center">
             <button 
                onClick={onSave}
                className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm"
                title="Save current state"
            >
                <Save className="w-4 h-4" /> Save
            </button>
             <button 
                onClick={() => setShowHistory(true)}
                className="flex items-center gap-2 bg-white text-gray-700 border border-gray-300 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 shadow-sm"
                title="Open Saved Versions"
            >
                <FolderOpen className="w-4 h-4" /> Open
            </button>
            <div className="w-px h-8 bg-gray-300 mx-1"></div>
             <button 
                onClick={loadPreset}
                className="text-tm-navy border border-tm-navy px-3 py-2 rounded-lg text-sm font-semibold hover:bg-tm-light-grey whitespace-nowrap"
            >
                Template
            </button>
            <button 
                onClick={addNewAtTop}
                className="flex items-center gap-2 bg-tm-navy text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-opacity-90 whitespace-nowrap shadow-sm"
            >
                <Plus className="w-4 h-4" /> Add Role
            </button>
        </div>
      </div>

      {/* Header Row */}
      <div className="hidden md:grid grid-cols-12 gap-4 px-3 py-2 text-xs font-bold text-tm-navy uppercase tracking-wider border-b-2 border-gray-200">
        <div className="col-span-2 text-center">Timer Control</div>
        <div className="col-span-3">Role</div>
        <div className="col-span-2">Speaker</div>
        <div className="col-span-1 text-center">Target</div>
        <div className="col-span-2 text-center">Actual</div>
        <div className="col-span-1 text-center">Result</div>
        <div className="col-span-1 text-center">Manage</div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto pb-64">
        {items.length === 0 ? (
            <div className="text-center text-gray-400 py-12 border-2 border-dashed border-gray-200 rounded-xl mt-4">
                No items. Load a template or add a role to start.
            </div>
        ) : (
            <div className="flex flex-col space-y-4">
                {items.map((item, index) => {
                    const isSession = item.type === RoleType.SESSION;
                    return (
                    <React.Fragment key={item.id}>
                        {/* Session Timer Controls Toolbar - Displayed Above the Row */}
                        {isSession && (
                            <div className="bg-indigo-50 border-x border-t border-indigo-200 rounded-t-lg p-2 flex items-center justify-between shadow-sm mt-2 -mb-2 z-10 relative mx-0.5">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider ml-2">Session Timer</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* Start - Show if 0 and not running */}
                                    {item.actualTimeSeconds === 0 && !item.isRunning && (
                                        <button 
                                            onClick={() => handleSessionAction(index, 'start')}
                                            className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-green-700"
                                            title="Start Session Timer"
                                        >
                                            <PlayCircle className="w-3.5 h-3.5" /> Start
                                        </button>
                                    )}

                                    {/* Pause - Show if running */}
                                    {item.isRunning && (
                                        <button 
                                            onClick={() => handleSessionAction(index, 'pause')}
                                            className="flex items-center gap-1 bg-yellow-500 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-yellow-600"
                                            title="Pause Timer"
                                        >
                                            <Pause className="w-3.5 h-3.5" /> Pause
                                        </button>
                                    )}

                                    {/* Resume - Show if paused (time > 0 and not running) */}
                                    {item.actualTimeSeconds > 0 && !item.isRunning && (
                                        <button 
                                            onClick={() => handleSessionAction(index, 'resume')}
                                            className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-blue-700"
                                            title="Resume Timer"
                                        >
                                            <Play className="w-3.5 h-3.5" /> Resume
                                        </button>
                                    )}

                                    {/* Start from Zero (Reset) - Show if time > 0 */}
                                    {item.actualTimeSeconds > 0 && (
                                        <button 
                                            onClick={() => handleSessionAction(index, 'reset')}
                                            className="flex items-center gap-1 bg-red-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-red-700"
                                            title="Reset timer to 0"
                                        >
                                            <RotateCcw className="w-3.5 h-3.5" /> Start from Zero
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className={`relative group ${isSession ? 'mt-0' : ''}`}>
                            <div className={`border rounded-lg transition-all p-3 md:p-2 ${isSession ? 'bg-indigo-50 border-indigo-200 border-t-0 rounded-t-none shadow-sm' : 'bg-white border-gray-200 hover:border-tm-navy hover:shadow-md'}`}>
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                                    
                                    {/* Start Timer Button / Status Indicator */}
                                    <div className="col-span-2 flex justify-center order-first md:order-none">
                                        {isSession ? (
                                            <div className="flex items-center gap-2 px-3 py-2 w-full md:w-auto justify-center">
                                                 {item.isRunning ? (
                                                     <span className="flex items-center gap-1 text-xs font-bold text-green-600 animate-pulse">
                                                         <div className="w-2 h-2 bg-green-600 rounded-full"></div> RUNNING
                                                     </span>
                                                 ) : item.actualTimeSeconds > 0 ? (
                                                     <span className="flex items-center gap-1 text-xs font-bold text-gray-500">
                                                         <div className="w-2 h-2 bg-gray-400 rounded-full"></div> PAUSED
                                                     </span>
                                                 ) : (
                                                     <span className="flex items-center gap-1 text-xs font-bold text-gray-400">
                                                         <div className="w-2 h-2 bg-gray-300 rounded-full"></div> READY
                                                     </span>
                                                 )}
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={() => onStartRole(index)}
                                                disabled={isTimerActive}
                                                className="flex items-center gap-2 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 px-3 py-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors w-full md:w-auto justify-center"
                                                title="Start Timer for this Role"
                                            >
                                                <PlayCircle className="w-5 h-5 fill-green-100" />
                                                <span className="text-xs font-bold uppercase tracking-wider">Start Timer</span>
                                            </button>
                                        )}
                                    </div>

                                    {/* Role Name */}
                                    <div className="col-span-3 flex items-center gap-2">
                                        <div className="flex-1">
                                            <input 
                                                type="text" 
                                                className={`w-full bg-transparent border-b border-transparent focus:border-tm-navy focus:bg-white outline-none px-2 py-1 font-semibold ${isSession ? 'text-indigo-900 font-bold' : 'text-tm-navy'}`}
                                                value={item.roleName}
                                                onChange={(e) => updateItem(index, 'roleName', e.target.value)}
                                                placeholder="Role Name"
                                            />
                                        </div>
                                        {!isSession && (
                                            <button 
                                                onClick={() => toggleSpeechType(index)}
                                                className={`p-1 rounded ${item.type === RoleType.SPEECH ? 'text-tm-navy bg-blue-100' : 'text-gray-300 hover:text-gray-500'}`}
                                                title="Toggle Prepared Speech Timing Rules"
                                            >
                                                <Mic className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Speaker Name */}
                                    <div className="col-span-2">
                                        <input 
                                            type="text" 
                                            className="w-full bg-transparent border-b border-transparent focus:border-tm-navy focus:bg-white outline-none px-2 py-1 text-gray-700"
                                            value={item.speakerName}
                                            onChange={(e) => updateItem(index, 'speakerName', e.target.value)}
                                            placeholder={isSession ? "Session Master (Optional)" : "Name"}
                                        />
                                    </div>

                                    {/* Target Time Input (Minutes only) */}
                                    <div className="col-span-1">
                                        <div className="flex items-center justify-center gap-1">
                                            <input 
                                                type="number" 
                                                min="1"
                                                step="0.5"
                                                className="w-12 text-center bg-transparent border-b border-gray-200 focus:border-tm-navy focus:bg-white outline-none font-mono text-sm"
                                                value={item.targetTimeMinutes}
                                                onChange={(e) => updateItem(index, 'targetTimeMinutes', parseFloat(e.target.value) || 0)}
                                            />
                                            <span className="text-xs text-gray-400">min</span>
                                        </div>
                                    </div>

                                    {/* Actual Time Display / Edit */}
                                    <div className="col-span-2 flex flex-col items-center justify-center">
                                        {editingTimeId === item.id ? (
                                            <div className="flex items-center justify-center gap-2">
                                                <input 
                                                    ref={actualTimeInputRef}
                                                    autoFocus
                                                    type="text"
                                                    className="w-24 text-center border-b border-tm-navy outline-none font-mono text-lg bg-yellow-50"
                                                    defaultValue={formatSecondsShort(item.actualTimeSeconds)}
                                                    onBlur={(e) => handleActualTimeSave(index, e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.currentTarget.blur();
                                                        }
                                                    }}
                                                    placeholder="mm:ss"
                                                />
                                                {/* Explicit Save button to ensure click capture */}
                                                <button 
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        if (actualTimeInputRef.current) {
                                                            handleActualTimeSave(index, actualTimeInputRef.current.value);
                                                        }
                                                    }} 
                                                    className="text-green-600 hover:text-green-800"
                                                >
                                                    <Save className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 group/edit">
                                                <span 
                                                    className={`font-mono text-sm ${item.actualTimeSeconds > 0 ? 'font-bold text-tm-navy' : 'text-gray-400'} ${item.isRunning ? 'animate-pulse text-indigo-700' : ''}`}
                                                >
                                                    {item.actualTimeSeconds > 0 || item.isRunning ? formatSecondsFull(item.actualTimeSeconds) : '0m 00s'}
                                                </span>
                                                {!item.isRunning && (
                                                    <button 
                                                        onClick={() => setEditingTimeId(item.id)}
                                                        className="opacity-0 group-hover/edit:opacity-100 text-gray-400 hover:text-tm-navy transition-all"
                                                        title="Modify Time"
                                                    >
                                                        <Pencil className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Result Badge Column */}
                                    <div className="col-span-1 flex justify-center items-center">
                                        {item.actualTimeSeconds > 0 || item.isRunning ? getResultBadge(item) : <span className="text-gray-200">-</span>}
                                    </div>

                                    {/* Management Buttons */}
                                    <div className="col-span-1 flex justify-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => moveItem(index, 'up')}
                                            disabled={index === 0}
                                            className="p-1 text-tm-navy hover:bg-gray-100 rounded disabled:opacity-20"
                                            title="Move Up"
                                        >
                                            <ArrowUp className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => moveItem(index, 'down')}
                                            disabled={index === items.length - 1}
                                            className="p-1 text-tm-navy hover:bg-gray-100 rounded disabled:opacity-20"
                                            title="Move Down"
                                        >
                                            <ArrowDown className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => removeItem(index)}
                                            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Insert Button Group (Below) - Only show if not a session timer unless it's the last item */}
                            {!isSession && (
                                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 z-10 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity flex gap-2">
                                    <button 
                                        onClick={() => addItem(index, RoleType.SPEECH)}
                                        className="bg-tm-navy text-white text-xs px-3 py-1 rounded-full shadow-md hover:bg-tm-burgundy transition-colors flex items-center gap-1 font-semibold"
                                        title="Add Prepared Speech (2min/1min warning)"
                                    >
                                        <Plus className="w-3 h-3" /> Prepared Speech
                                    </button>
                                    <button 
                                        onClick={() => addItem(index, RoleType.OTHER)}
                                        className="bg-white text-tm-navy border border-tm-navy text-xs px-3 py-1 rounded-full shadow-md hover:bg-gray-50 transition-colors flex items-center gap-1 font-semibold"
                                        title="Add Standard Role (1min/30s warning)"
                                    >
                                        <Plus className="w-3 h-3" /> Other Role
                                    </button>
                                </div>
                            )}
                        </div>
                    </React.Fragment>
                    )
                })}
            </div>
        )}
      </div>
    </div>
  );
};

export default AgendaSetup;
