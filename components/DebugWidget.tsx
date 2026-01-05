
import React, { useState, useEffect, useRef } from 'react';

interface DebugWidgetProps {
  isOpen: boolean;
  onClose: () => void;
}

const DebugWidget: React.FC<DebugWidgetProps> = ({ isOpen, onClose }) => {
  const [position, setPosition] = useState({ x: 20, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [inspectorActive, setInspectorActive] = useState(false);
  const [selectedElement, setSelectedElement] = useState<{
    tagName: string;
    classes: string;
    width: string;
    height: string;
    color: string;
    bg: string;
    element: HTMLElement;
  } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  
  const widgetRef = useRef<HTMLDivElement>(null);

  // Capture Console Errors
  useEffect(() => {
    const originalError = console.error;
    console.error = (...args) => {
      setErrors(prev => [...prev.slice(-4), args.map(String).join(' ')]);
      originalError.apply(console, args);
    };
    return () => { console.error = originalError; };
  }, []);

  // Draggable Logic
  const handleMouseDown = (e: React.MouseEvent) => {
    if (widgetRef.current && widgetRef.current.contains(e.target as Node)) {
        // Only drag if clicking header
        const header = widgetRef.current.querySelector('.debug-header');
        if (header && header.contains(e.target as Node)) {
            setIsDragging(true);
            setDragOffset({
                x: e.clientX - position.x,
                y: e.clientY - position.y
            });
        }
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        });
      }
    };
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Inspector Logic
  useEffect(() => {
    if (!inspectorActive) return;

    const handleMouseOver = (e: MouseEvent) => {
      e.stopPropagation();
      const target = e.target as HTMLElement;
      if (widgetRef.current && widgetRef.current.contains(target)) return;
      target.style.outline = '2px solid #ef4444';
    };

    const handleMouseOut = (e: MouseEvent) => {
      e.stopPropagation();
      const target = e.target as HTMLElement;
      target.style.outline = '';
    };

    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const target = e.target as HTMLElement;
      if (widgetRef.current && widgetRef.current.contains(target)) return;

      const compStyles = window.getComputedStyle(target);
      setSelectedElement({
        tagName: target.tagName.toLowerCase(),
        classes: target.className,
        width: compStyles.width,
        height: compStyles.height,
        color: compStyles.color,
        bg: compStyles.backgroundColor,
        element: target
      });
      
      target.style.outline = '';
      setInspectorActive(false); // Stop inspecting after pick
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      document.removeEventListener('click', handleClick, true);
    };
  }, [inspectorActive]);

  const updateStyle = (prop: string, value: string) => {
    if (selectedElement && selectedElement.element) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (selectedElement.element.style as any)[prop] = value;
        // Force re-read? Not strictly needed for visual update
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={widgetRef}
      onMouseDown={handleMouseDown}
      className="fixed z-[100] w-64 bg-slate-900/95 backdrop-blur-md border border-slate-700 shadow-2xl rounded-md overflow-hidden flex flex-col font-mono text-[10px] text-slate-300"
      style={{ left: position.x, top: position.y }}
    >
      <div className="debug-header px-3 py-2 bg-slate-800 border-b border-slate-700 flex justify-between items-center cursor-move select-none">
        <span className="font-bold text-yellow-500">🛠 DEBUGGER</span>
        <button onClick={onClose} className="hover:text-white">✕</button>
      </div>

      <div className="p-3 space-y-3">
        {/* Inspector Control */}
        <div>
            <button 
                onClick={() => setInspectorActive(!inspectorActive)}
                className={`w-full py-1.5 px-2 border rounded-sm flex items-center justify-center gap-2 ${inspectorActive ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse' : 'bg-slate-800 border-slate-600 hover:bg-slate-700'}`}
            >
               <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
               {inspectorActive ? 'SELECT ELEMENT...' : 'INSPECT ELEMENT'}
            </button>
        </div>

        {/* Selected Element Details */}
        {selectedElement && (
            <div className="space-y-2 border-t border-slate-700 pt-2">
                <div className="font-bold text-blue-400 break-all">{selectedElement.tagName.toUpperCase()}</div>
                <div className="text-slate-500 break-all leading-tight">{selectedElement.classes.substring(0, 50)}...</div>
                
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label>Color</label>
                        <input className="w-full bg-slate-800 border border-slate-700 px-1" defaultValue={selectedElement.color} onChange={(e) => updateStyle('color', e.target.value)} />
                    </div>
                    <div>
                        <label>Bg</label>
                        <input className="w-full bg-slate-800 border border-slate-700 px-1" defaultValue={selectedElement.bg} onChange={(e) => updateStyle('backgroundColor', e.target.value)} />
                    </div>
                </div>
            </div>
        )}

        {/* Console Errors */}
        <div className="border-t border-slate-700 pt-2">
            <span className="font-bold text-red-400 mb-1 block">Last Errors</span>
            <div className="h-20 overflow-y-auto bg-slate-950 p-1 rounded border border-slate-800">
                {errors.length === 0 ? <span className="text-slate-600 italic">No errors captured.</span> : 
                 errors.map((e, i) => <div key={i} className="text-red-500 border-b border-slate-800 pb-1 mb-1 last:border-0">{e}</div>)
                }
            </div>
        </div>
      </div>
    </div>
  );
};

export default DebugWidget;
