
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ErdNode, ErdEdge } from '../types';

interface ErdViewerProps {
  nodes: ErdNode[];
  edges: ErdEdge[];
}

// Internal state for nodes to handle dragging without mutating props
interface ViewerNode extends ErdNode {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ViewState {
  x: number;
  y: number;
  scale: number;
}

const NODE_WIDTH = 180;
const HEADER_HEIGHT = 32;
const ROW_HEIGHT = 26;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3.0;

// --- GEOMETRY HELPERS ---

const getNodeHeight = (fieldsLength: number) => HEADER_HEIGHT + (fieldsLength * ROW_HEIGHT) + 4;

const getEdgePath = (source: ViewerNode, target: ViewerNode) => {
  const sx = source.x + source.width / 2;
  const sy = source.y + source.height / 2;
  const tx = target.x + target.width / 2;
  const ty = target.y + target.height / 2;

  const dx = Math.abs(tx - sx) * 0.5;
  const dy = Math.abs(ty - sy) * 0.5;
  
  const isHorizontal = Math.abs(tx - sx) > Math.abs(ty - sy);
  
  let cp1x, cp1y, cp2x, cp2y;
  let startX, startY, endX, endY;

  if (isHorizontal) {
     startX = source.x + (tx > sx ? source.width : 0);
     startY = sy;
     endX = target.x + (tx > sx ? 0 : target.width);
     endY = ty;
     const curvature = Math.max(dx, 60);
     cp1x = startX + (tx > sx ? curvature : -curvature);
     cp1y = startY;
     cp2x = endX + (tx > sx ? -curvature : curvature);
     cp2y = endY;
  } else {
     startX = sx;
     startY = source.y + (ty > sy ? source.height : 0);
     endX = tx;
     endY = target.y + (ty > sy ? 0 : target.height);
     const curvature = Math.max(dy, 60);
     cp1x = startX;
     cp1y = startY + (ty > sy ? curvature : -curvature);
     cp2x = endX;
     cp2y = endY + (ty > sy ? -curvature : curvature);
  }

  return `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;
};

const ErdViewer: React.FC<ErdViewerProps> = ({ nodes: initialNodes, edges }) => {
  const [nodes, setNodes] = useState<ViewerNode[]>([]);
  const [viewState, setViewState] = useState<ViewState>({ x: 0, y: 0, scale: 1 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [history, setHistory] = useState<ViewerNode[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-resize / Center handling on load
  useEffect(() => {
    if (nodes.length === 0 && initialNodes.length > 0) {
      const initialized = initialNodes.map((n, i) => ({
        ...n,
        x: n.x || (i % 3) * 250 + 100,
        y: n.y || Math.floor(i / 3) * 250 + 100,
        width: NODE_WIDTH,
        height: getNodeHeight(n.fields.length)
      }));
      setNodes(initialized);
      addToHistory(initialized);
      
      // Initial Center
      setTimeout(() => centerView(initialized), 100);
    }
  }, [initialNodes]);

  const addToHistory = (newNodes: ViewerNode[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newNodes)));
    // Keep history manageable
    if (newHistory.length > 20) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setNodes(JSON.parse(JSON.stringify(history[historyIndex - 1])));
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setNodes(JSON.parse(JSON.stringify(history[historyIndex + 1])));
    }
  };

  const centerView = (currentNodes: ViewerNode[]) => {
    if (currentNodes.length === 0 || !containerRef.current) return;
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    currentNodes.forEach(n => {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width);
      maxY = Math.max(maxY, n.y + n.height);
    });

    const padding = 100;
    const contentW = maxX - minX + padding * 2;
    const contentH = maxY - minY + padding * 2;
    const containerW = containerRef.current.clientWidth;
    const containerH = containerRef.current.clientHeight;

    const scale = Math.min(Math.min(containerW / contentW, containerH / contentH), 1.2);
    const x = (containerW - contentW * scale) / 2 - minX * scale + padding * scale;
    const y = (containerH - contentH * scale) / 2 - minY * scale + padding * scale;

    setViewState({ x, y, scale });
  };

  const runAutoLayout = () => {
    const simulationNodes = JSON.parse(JSON.stringify(nodes)) as ViewerNode[];
    const iterations = 100;
    const center = { x: 500, y: 400 };

    for (let i = 0; i < iterations; i++) {
      // Repulsion (Node vs Node)
      for (let a = 0; a < simulationNodes.length; a++) {
        for (let b = a + 1; b < simulationNodes.length; b++) {
          const nodeA = simulationNodes[a];
          const nodeB = simulationNodes[b];
          const dx = nodeA.x - nodeB.x;
          const dy = nodeA.y - nodeB.y;
          const distSq = dx * dx + dy * dy || 1;
          const force = 500000 / distSq;
          const dist = Math.sqrt(distSq);
          
          nodeA.x += (dx / dist) * force * 0.1;
          nodeA.y += (dy / dist) * force * 0.1;
          nodeB.x -= (dx / dist) * force * 0.1;
          nodeB.y -= (dy / dist) * force * 0.1;
        }
      }

      // Attraction (Edges)
      edges.forEach(edge => {
        const source = simulationNodes.find(n => n.id === edge.from);
        const target = simulationNodes.find(n => n.id === edge.to);
        if (source && target) {
          const dx = source.x - target.x;
          const dy = source.y - target.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (dist - 250) * 0.05; // Spring length target
          
          source.x -= (dx / dist) * force;
          source.y -= (dy / dist) * force;
          target.x += (dx / dist) * force;
          target.y += (dy / dist) * force;
        }
      });
      
      // Center Gravity (weak)
      simulationNodes.forEach(node => {
          node.x += (center.x - node.x) * 0.005;
          node.y += (center.y - node.y) * 0.005;
      });
    }

    setNodes(simulationNodes);
    addToHistory(simulationNodes);
    centerView(simulationNodes);
  };

  const handleExportPng = () => {
    // 1. Determine bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(n => {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width);
      maxY = Math.max(maxY, n.y + n.height);
    });
    
    const margin = 50;
    minX -= margin; minY -= margin; maxX += margin; maxY += margin;
    const width = maxX - minX;
    const height = maxY - minY;

    // 2. Create Standalone SVG String (vector graphics)
    // We use pure SVG elements here to ensure it renders without HTML/CSS dependencies
    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minX} ${minY} ${width} ${height}">
        <style>
          .node-rect { fill: white; stroke: #cbd5e1; stroke-width: 1px; }
          .header-rect { fill: #f1f5f9; }
          .text-title { font-family: sans-serif; font-weight: bold; font-size: 12px; fill: #334155; text-transform: uppercase; }
          .text-field { font-family: monospace; font-size: 11px; fill: #64748b; }
          .text-pk { font-weight: bold; fill: #0f172a; }
          .edge { stroke: #94a3b8; stroke-width: 2px; fill: none; }
          .pk-icon { fill: #f59e0b; }
        </style>
        <rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="#f8fafc" />
        
        <!-- Edges -->
        ${edges.map(e => {
            const s = nodes.find(n => n.id === e.from);
            const t = nodes.find(n => n.id === e.to);
            if (!s || !t) return '';
            return `<path d="${getEdgePath(s, t)}" class="edge" marker-end="url(#arrow)" />`;
        }).join('')}

        <!-- Definitions -->
        <defs>
            <marker id="arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
            </marker>
        </defs>

        <!-- Nodes -->
        ${nodes.map(n => `
            <g transform="translate(${n.x}, ${n.y})">
                <rect width="${n.width}" height="${n.height}" rx="6" class="node-rect" filter="drop-shadow(0 4px 3px rgb(0 0 0 / 0.07))" />
                <rect width="${n.width}" height="${HEADER_HEIGHT}" rx="6" class="header-rect" />
                <rect y="${HEADER_HEIGHT-5}" width="${n.width}" height="10" fill="#f1f5f9" />
                <text x="${n.width/2}" y="20" text-anchor="middle" class="text-title">${n.label}</text>
                ${n.fields.map((f, i) => {
                    const isPk = f.startsWith('#') || f.includes('KEY');
                    return `
                        <text x="12" y="${HEADER_HEIGHT + 20 + (i * ROW_HEIGHT)}" class="text-field ${isPk ? 'text-pk' : ''}">
                            ${f.replace('#', '')}
                        </text>
                        ${isPk ? `<circle cx="${n.width - 20}" cy="${HEADER_HEIGHT + 16 + (i * ROW_HEIGHT)}" r="3" class="pk-icon"/>` : ''}
                    `;
                }).join('')}
            </g>
        `).join('')}
      </svg>
    `;

    // 3. Convert to PNG via Canvas
    const img = new Image();
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width * 2; // Retina quality
        canvas.height = height * 2;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.scale(2, 2);
            ctx.drawImage(img, 0, 0);
            const pngUrl = canvas.toDataURL("image/png");
            
            const a = document.createElement('a');
            a.href = pngUrl;
            a.download = `erd_diagram_${new Date().toISOString().slice(0,10)}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
        URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  // --- MOUSE HANDLERS ---

  const handleMouseDown = (e: React.MouseEvent, nodeId?: string) => {
    if (nodeId) {
      e.stopPropagation(); 
      setDraggingNodeId(nodeId);
    } else {
      setIsDraggingCanvas(true);
    }
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingNodeId) {
      const dx = (e.clientX - dragStart.x) / viewState.scale;
      const dy = (e.clientY - dragStart.y) / viewState.scale;
      setNodes(prev => prev.map(n => n.id === draggingNodeId ? { ...n, x: n.x + dx, y: n.y + dy } : n));
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (isDraggingCanvas) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setViewState(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    if (draggingNodeId) {
      addToHistory(nodes);
      setDraggingNodeId(null);
    }
    setIsDraggingCanvas(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = -e.deltaY * 0.001;
    const newScale = Math.min(Math.max(viewState.scale + delta, MIN_ZOOM), MAX_ZOOM);
    setViewState(prev => ({ ...prev, scale: newScale }));
  };

  return (
    <div className="w-full h-full bg-ice-50 dark:bg-slate-950 flex flex-col relative overflow-hidden group">
      
      {/* FLOATING TOOLBAR */}
      <div className="absolute top-4 right-4 z-50 flex flex-col gap-2 pointer-events-auto">
        
        {/* Actions */}
        <div className="flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md shadow-lg overflow-hidden backdrop-blur-sm bg-opacity-90 dark:bg-opacity-90">
             <button onClick={handleUndo} disabled={historyIndex <= 0} className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white disabled:opacity-30 border-b border-slate-100 dark:border-slate-800 transition-colors" title="Desfazer">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
            </button>
            <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white disabled:opacity-30 border-b border-slate-100 dark:border-slate-800 transition-colors" title="Refazer">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" /></svg>
            </button>
            <button onClick={runAutoLayout} className="p-2 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 border-b border-slate-100 dark:border-slate-800 transition-colors" title="Auto Layout">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
            </button>
            <button onClick={handleExportPng} className="p-2 text-green-500 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors" title="Exportar PNG">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </button>
        </div>
        
        {/* Zoom */}
        <div className="flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md shadow-lg overflow-hidden backdrop-blur-sm bg-opacity-90 dark:bg-opacity-90">
             <button onClick={() => setViewState(prev => ({...prev, scale: Math.min(prev.scale + 0.2, MAX_ZOOM)}))} className="p-2 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 border-b border-slate-100 dark:border-slate-800 transition-colors" title="Zoom In">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
             </button>
             <button onClick={() => centerView(nodes)} className="p-2 text-xs font-bold text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 border-b border-slate-100 dark:border-slate-800 transition-colors" title="Fit">
                FIT
             </button>
             <button onClick={() => setViewState(prev => ({...prev, scale: Math.max(prev.scale - 0.2, MIN_ZOOM)}))} className="p-2 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors" title="Zoom Out">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" /></svg>
             </button>
        </div>

      </div>

      {/* CANVAS */}
      <div 
        ref={containerRef}
        className="w-full h-full cursor-move active:cursor-grabbing bg-ice-50 dark:bg-slate-950"
        onMouseDown={(e) => handleMouseDown(e)}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <div 
            className="absolute inset-0 pointer-events-none opacity-10 dark:opacity-5 transition-opacity"
            style={{ 
                backgroundSize: `${24 * viewState.scale}px ${24 * viewState.scale}px`,
                backgroundPosition: `${viewState.x}px ${viewState.y}px`,
                backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)'
            }} 
        />

        <svg
            className="w-full h-full overflow-visible"
            style={{ transform: `translate(${viewState.x}px, ${viewState.y}px) scale(${viewState.scale})`, transformOrigin: '0 0' }}
        >
            <defs>
              <marker id="arrow-end" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" className="fill-slate-400 dark:fill-slate-600" />
              </marker>
              <filter id="shadow">
                <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="rgba(0,0,0,0.1)"/>
              </filter>
            </defs>
            
            {/* Edges */}
            {edges.map((edge) => {
                const source = nodes.find(n => n.id === edge.from);
                const target = nodes.find(n => n.id === edge.to);
                if (!source || !target) return null;
                const path = getEdgePath(source, target);
                return (
                    <path key={`${edge.from}-${edge.to}`} d={path} className="stroke-slate-400 dark:stroke-slate-600 stroke-2 fill-none transition-all duration-75" markerEnd="url(#arrow-end)" />
                );
            })}

            {/* Nodes */}
            {nodes.map((node) => (
                <foreignObject
                    key={node.id}
                    x={node.x}
                    y={node.y}
                    width={node.width}
                    height={node.height}
                    className="overflow-visible"
                    onMouseDown={(e) => handleMouseDown(e, node.id)}
                >
                    <div className={`
                        w-full h-full bg-white dark:bg-slate-900 
                        border border-slate-300 dark:border-slate-700 
                        rounded-md shadow-sm select-none
                        ${draggingNodeId === node.id ? 'shadow-2xl ring-2 ring-blue-500 cursor-grabbing z-50' : 'hover:shadow-lg cursor-grab hover:border-blue-400 z-10'}
                        transition-all duration-100 flex flex-col
                    `}>
                        {/* Header */}
                        <div className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-t-md flex items-center justify-center h-[32px] transition-colors group-hover:bg-slate-200 dark:group-hover:bg-slate-800">
                            <span className="text-[11px] font-bold font-mono text-slate-700 dark:text-slate-200 uppercase tracking-tight truncate">
                                {node.label}
                            </span>
                        </div>
                        {/* Fields */}
                        <div className="flex flex-col py-1 bg-white dark:bg-slate-900 rounded-b-md">
                            {node.fields.map((field, idx) => {
                                const isKey = field.startsWith('#') || field.includes('KEY');
                                return (
                                    <div key={idx} className="px-3 h-[26px] flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                        <span className={`text-[10px] font-mono truncate ${isKey ? 'font-bold text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}>
                                            {field.replace('#', '')}
                                        </span>
                                        {isKey && (
                                           <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm" title="Primary Key"></div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </foreignObject>
            ))}
        </svg>

        {/* MiniMap */}
        <div className="absolute bottom-4 right-4 w-32 h-24 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md rounded-md overflow-hidden opacity-50 hover:opacity-100 transition-opacity pointer-events-none">
            <svg className="w-full h-full" viewBox="0 0 2000 2000" preserveAspectRatio="xMidYMid meet">
                 {nodes.map(n => (
                     <rect 
                        key={n.id} 
                        x={n.x + 500}
                        y={n.y + 500} 
                        width={n.width} 
                        height={n.height} 
                        className="fill-slate-400 dark:fill-slate-600"
                     />
                 ))}
                 <rect 
                    x={-viewState.x / viewState.scale + 500}
                    y={-viewState.y / viewState.scale + 500}
                    width={containerRef.current ? containerRef.current.clientWidth / viewState.scale : 100}
                    height={containerRef.current ? containerRef.current.clientHeight / viewState.scale : 100}
                    className="stroke-blue-500 stroke-[10] fill-none"
                 />
            </svg>
        </div>
      </div>
    </div>
  );
};

export default ErdViewer;
