import React, { useState } from 'react';
import { AgendaItem, RoleType, TimingStatus } from '../types';
import { Plus, Trash2, PlayCircle, ArrowUp, ArrowDown, Bell, Pencil, Save, Mic } from 'lucide-react';
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
}

const AgendaSetup: React.FC<AgendaSetupProps> = ({ 
    items, setItems, onStartRole, isTimerActive,
    scheduledStart, setScheduledStart,
    actualStart, setActualStart
}) => {
  const [editingTimeId, setEditingTimeId] = useState<string | null>(null);

  const updateItem = (index: number, field: keyof AgendaItem, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };
    
    // Auto-update status if time changes manually
    if (field === 'actualTimeSeconds' || field === 'targetTimeMinutes' || field === 'type') {
        const config = getTimerConfig(item.type, item.targetTimeMinutes);
        const seconds = item.actualTimeSeconds;
        
        if (seconds === 0) {
             item.status = TimingStatus.PENDING;
        } else if (seconds >= config.bellTime) {
             item.status = TimingStatus.OVERTIME; 
        } else if (seconds >= config.redTime) {
             item.status = TimingStatus.OVERTIME; 
        } else if (seconds >= config.greenTime) {
             item.status = TimingStatus.QUALIFIED;
        } else {
             item.status = TimingStatus.UNDERTIME;
        }
    }

    newItems[index] = item;
    setItems(newItems);
  };

  const addItem = (index: number) => {
    const newItem: AgendaItem = {
      id: crypto.randomUUID(),
      roleName: 'New Role',
      speakerName: '',
      type: RoleType.OTHER,
      targetTimeMinutes: 2,
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
      // Toggle between SPEECH and OTHER. If it was TABLE_TOPIC, simpler to switch to SPEECH or OTHER.
      // Default behavior: If SPEECH -> OTHER. If OTHER/TT -> SPEECH.
      const newType = currentType === RoleType.SPEECH ? RoleType.OTHER : RoleType.SPEECH;
      updateItem(index, 'type', newType);
  };

  const loadPreset = () => {
    if (items.length > 0 && !window.confirm("This will replace your current agenda. Continue?")) {
        return;
    }
    const presetItems = DEFAULT_AGENDA_ITEMS.map(i => ({
        ...i,
        id: crypto.randomUUID(),
        speakerName: '',
        actualTimeSeconds: 0,
        status: TimingStatus.PENDING
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

  // Helper to parse mm:ss string to seconds
  const handleTimeInput = (index: number, value: string) => {
    let seconds = 0;
    if (value.includes(':')) {
        const parts = value.split(':');
        const m = parseInt(parts[0]) || 0;
        const s = parseInt(parts[1]) || 0;
        seconds = m * 60 + s;
    } else {
        const val = parseFloat(value);
        if (!isNaN(val)) {
             seconds = Math.round(val * 60);
        }
    }
    updateItem(index, 'actualTimeSeconds', seconds);
    setEditingTimeId(null);
  };

  const formatSecondsToInput = (seconds: number) => {
    if (seconds === 0) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };
  
  const getResultBadge = (item: AgendaItem) => {
    if (item.actualTimeSeconds === 0) return <span className="text-gray-300">-</span>;

    const config = getTimerConfig(item.type, item.targetTimeMinutes);
    const t = item.actualTimeSeconds;

    if (t >= config.bellTime) return <span className="flex items-center gap-1 text-xs font-bold text-white bg-tm-burgundy px-2 py-1 rounded"><Bell className="w-3 h-3"/> {'>'} +30s</span>;
    if (t >= config.redTime) return <span className="flex items-center gap-1 text-xs font-bold text-white bg-red-600 px-2 py-1 rounded">RED</span>;
    if (t >= config.yellowTime) return <span className="flex items-center gap-1 text-xs font-bold text-tm-navy bg-tm-yellow px-2 py-1 rounded">YELLOW</span>;
    if (t >= config.greenTime) return <span className="flex items-center gap-1 text-xs font-bold text-white bg-green-600 px-2 py-1 rounded">GREEN</span>;
    
    return <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">UNDER</span>;
  };

  const handleSetNow = () => {
    const now = new Date();
    const timeString = now.toTimeString().substring(0, 5);
    setActualStart(timeString);
  };

  return (
    <div className="max-w-7xl mx-auto w-full p-4 md:p-6 flex flex-col h-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 flex-shrink-0 gap-4">
        <div>
            <h2 className="text-2xl font-bold text-tm-navy">Meeting Agenda</h2>
            <p className="text-tm-grey text-sm">Manage roles and record times.</p>
        </div>

        {/* Meeting Details Section */}
        <div className="flex flex-col sm:flex-row gap-4 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex flex-col">
                <label className="text-xs font-bold text-tm-navy uppercase mb-1">Scheduled Start</label>
                <input 
                    type="time" 
                    value={scheduledStart}
                    onChange={(e) => setScheduledStart(e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 text-sm focus:border-tm-navy outline-none"
                />
            </div>
            <div className="flex flex-col">
                <label className="text-xs font-bold text-tm-navy uppercase mb-1">Actual Start</label>
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

        <div className="flex gap-3">
             <button 
                onClick={loadPreset}
                className="text-tm-navy border border-tm-navy px-4 py-2 rounded-lg text-sm font-semibold hover:bg-tm-light-grey"
            >
                Load Template
            </button>
            <button 
                onClick={addNewAtTop}
                className="flex items-center gap-2 bg-tm-navy text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-opacity-90"
            >
                <Plus className="w-4 h-4" /> Add Role
            </button>
        </div>
      </div>

      {/* Header Row */}
      <div className="hidden md:grid grid-cols-12 gap-4 px-3 py-2 text-xs font-bold text-tm-navy uppercase tracking-wider border-b-2 border-gray-200">
        <div className="col-span-1 text-center">Action</div>
        <div className="col-span-4">Role</div>
        <div className="col-span-3">Speaker</div>
        <div className="col-span-1 text-center">Target</div>
        <div className="col-span-2 text-center">Actual</div>
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
                {items.map((item, index) => (
                    <div key={item.id} className="relative group">
                        <div className="bg-white border border-gray-200 rounded-lg hover:border-tm-navy hover:shadow-md transition-all p-3 md:p-2">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                                
                                {/* Start Timer */}
                                <div className="col-span-1 flex justify-center order-first md:order-none">
                                    <button 
                                        onClick={() => onStartRole(index)}
                                        disabled={isTimerActive}
                                        className="flex flex-col items-center justify-center p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        title="Start Timer"
                                    >
                                        <PlayCircle className="w-8 h-8 md:w-6 md:h-6 fill-green-100" />
                                        <span className="text-[10px] font-bold uppercase mt-1 md:hidden">Start</span>
                                    </button>
                                </div>

                                {/* Role Name */}
                                <div className="col-span-4 flex items-center gap-2">
                                    <div className="flex-1">
                                        <input 
                                            type="text" 
                                            className="w-full bg-transparent border-b border-transparent focus:border-tm-navy focus:bg-white outline-none px-2 py-1 font-semibold text-tm-navy"
                                            value={item.roleName}
                                            onChange={(e) => updateItem(index, 'roleName', e.target.value)}
                                            placeholder="Role Name"
                                        />
                                    </div>
                                    <button 
                                        onClick={() => toggleSpeechType(index)}
                                        className={`p-1 rounded ${item.type === RoleType.SPEECH ? 'text-tm-navy bg-blue-100' : 'text-gray-300 hover:text-gray-500'}`}
                                        title="Toggle Prepared Speech Timing Rules"
                                    >
                                        <Mic className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Speaker Name */}
                                <div className="col-span-3">
                                    <input 
                                        type="text" 
                                        className="w-full bg-transparent border-b border-transparent focus:border-tm-navy focus:bg-white outline-none px-2 py-1 text-gray-700"
                                        value={item.speakerName}
                                        onChange={(e) => updateItem(index, 'speakerName', e.target.value)}
                                        placeholder="Name"
                                    />
                                </div>

                                {/* Target Time Input */}
                                <div className="col-span-1">
                                    <div className="flex items-center justify-center">
                                        <input 
                                            type="number" 
                                            min="1"
                                            className="w-12 text-center bg-transparent border-b border-transparent focus:border-tm-navy focus:bg-white outline-none font-mono text-sm"
                                            value={item.targetTimeMinutes}
                                            onChange={(e) => updateItem(index, 'targetTimeMinutes', parseInt(e.target.value) || 0)}
                                        />
                                        <span className="text-xs text-gray-400 ml-1">min</span>
                                    </div>
                                </div>

                                {/* Actual Time Display / Edit */}
                                <div className="col-span-2 flex flex-col items-center justify-center">
                                    {editingTimeId === item.id ? (
                                        <div className="flex items-center">
                                            <input 
                                                autoFocus
                                                type="text" 
                                                className="w-16 text-center border-b border-tm-navy outline-none font-mono text-sm"
                                                defaultValue={formatSecondsToInput(item.actualTimeSeconds)}
                                                onBlur={(e) => handleTimeInput(index, e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleTimeInput(index, (e.target as HTMLInputElement).value);
                                                }}
                                            />
                                            <button onMouseDown={() => setEditingTimeId(null)} className="ml-1 text-green-600"><Save className="w-4 h-4" /></button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <span className={`font-mono text-sm ${item.actualTimeSeconds > 0 ? 'font-bold' : 'text-gray-400'}`}>
                                                {item.actualTimeSeconds > 0 ? formatSecondsToInput(item.actualTimeSeconds) : '0:00'}
                                            </span>
                                            {item.actualTimeSeconds > 0 && getResultBadge(item)}
                                            <button 
                                                onClick={() => setEditingTimeId(item.id)}
                                                className="text-gray-300 hover:text-tm-navy transition-colors"
                                                title="Modify Time"
                                            >
                                                <Pencil className="w-3 h-3" />
                                            </button>
                                        </div>
                                    )}
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
                        
                        {/* Insert Button (Below) */}
                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-10 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity">
                            <button 
                                onClick={() => addItem(index)}
                                className="bg-tm-navy text-white rounded-full p-1 shadow-md hover:scale-110 transition-transform"
                                title="Add Row Below"
                            >
                                <Plus className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default AgendaSetup;
