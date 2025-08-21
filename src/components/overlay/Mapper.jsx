// src/components/overlay/Mapper.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import AIFieldMapper from "../ai/AIFieldMapper";

// API prefix
const API = "/api";

// Preview DPI + unit converters
const PREVIEW_DPI = 144; // image rendered at 144 dpi
const ptToPx = (n) => n * (PREVIEW_DPI / 72); // points -> pixels
const pxToPt = (n) => n * (72 / PREVIEW_DPI); // pixels -> points
const rectPtToPx = (r = [0, 0, 0, 0]) => [
  ptToPx(r[0]),
  ptToPx(r[1]),
  ptToPx(r[2]),
  ptToPx(r[3]),
];
const rectPxToPt = (r = [0, 0, 0, 0]) => [
  pxToPt(r[0]),
  pxToPt(r[1]),
  pxToPt(r[2]),
  pxToPt(r[3]),
];

export default function Mapper() {
  const { user, loading } = useAuth();

  // Check if user is authenticated and is admin
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || user.email !== "avansardar@outlook.com") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600 mb-4">Admin privileges required.</p>
          <p className="text-sm text-gray-500">
            Only authorized users can access this area.
          </p>
          <Link
            to="/dashboard"
            className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Support both route param styles: /admin/mapper/:app/:form and /admin/mapper/:appId/:formId
  const params = useParams();
  const app = params.app || params.appId;
  const form = params.form || params.formId;

  const [overlay, setOverlay] = useState({ fields: [] });
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);
  const [imgUrl, setImgUrl] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [showAIMapper, setShowAIMapper] = useState(false);
  const [editMode, setEditMode] = useState(false); // New: Field placement mode
  const [draggedField, setDraggedField] = useState(null); // New: Track field being dragged
  const [resizeHandle, setResizeHandle] = useState(null); // New: Track resize handle
  const canvasRef = useRef(null);
  const drawingRef = useRef(null);

  // Load template (convert saved points -> screen pixels)
  useEffect(() => {
    (async () => {
      const res = await fetch(`${API}/apps/${app}/forms/${form}/template`);
      const tpl = await res.json();
      const fields = Array.isArray(tpl?.fields)
        ? tpl.fields.map((f) => ({ ...f, rect: rectPtToPx(f.rect) }))
        : [];
      setOverlay({ fields });
    })();
  }, [app, form]);

  // Load metrics + preview for current page
  useEffect(() => {
    const q = (obj) => new URLSearchParams(obj).toString();
    async function load() {
      const m = await fetch(
        `${API}/apps/${app}/forms/${form}/page-metrics?${q({
          page,
          dpi: PREVIEW_DPI,
        })}`
      ).then((r) => r.json());
      setMetrics(m);
      setPages(m.pages || 1);

      const blob = await fetch(
        `${API}/apps/${app}/forms/${form}/preview-page?${q({
          page,
          dpi: PREVIEW_DPI,
        })}`
      ).then((r) => r.blob());
      setImgUrl(URL.createObjectURL(blob));
    }
    load();
    return () => setImgUrl(null);
  }, [app, form, page]);

  // Draw background + boxes
  useEffect(() => {
    if (!imgUrl || !canvasRef.current) return;
    const img = new Image();
    img.onload = () => {
      const c = canvasRef.current;
      const ctx = c.getContext("2d");
      c.width = img.width;
      c.height = img.height;
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0);
      ctx.lineWidth = 2;

      // existing fields on this page
      overlay.fields
        .filter((f) => Number(f.page || 0) === Number(page))
        .forEach((f) => {
          const [x0, y0, x1, y1] = f.rect;
          const isSelected = f.id === selectedId;
          const isAIField = f.id.startsWith('ai_field_');
          
          // Different colors for different field types
          if (isSelected) {
            ctx.strokeStyle = "#e00"; // Red for selected
            ctx.lineWidth = 3;
          } else if (isAIField) {
            ctx.strokeStyle = "#00a"; // Blue for AI fields
            ctx.lineWidth = 2;
          } else {
            ctx.strokeStyle = "#0a0"; // Green for manual fields
            ctx.lineWidth = 2;
          }
          
          ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
          
          // Draw resize handles in edit mode
          if (editMode && isSelected) {
            const handleSize = 6;
            ctx.fillStyle = "#e00";
            // Corner handles
            ctx.fillRect(x0 - handleSize/2, y0 - handleSize/2, handleSize, handleSize);
            ctx.fillRect(x1 - handleSize/2, y0 - handleSize/2, handleSize, handleSize);
            ctx.fillRect(x0 - handleSize/2, y1 - handleSize/2, handleSize, handleSize);
            ctx.fillRect(x1 - handleSize/2, y1 - handleSize/2, handleSize, handleSize);
            // Edge handles
            ctx.fillRect((x0 + x1)/2 - handleSize/2, y0 - handleSize/2, handleSize, handleSize);
            ctx.fillRect((x0 + x1)/2 - handleSize/2, y1 - handleSize/2, handleSize, handleSize);
            ctx.fillRect(x0 - handleSize/2, (y0 + y1)/2 - handleSize/2, handleSize, handleSize);
            ctx.fillRect(x1 - handleSize/2, (y0 + y1)/2 - handleSize/2, handleSize, handleSize);
          }
          
          // Draw field label
          if (isSelected || editMode) {
            ctx.fillStyle = "#000";
            ctx.font = "12px Arial";
            ctx.fillText(f.label || f.id, x0, y0 - 5);
          }
        });

      // current drawing
      const d = drawingRef.current;
      if (d) {
        ctx.strokeStyle = "#e00";
        ctx.strokeRect(d.x0, d.y0, d.x1 - d.x0, d.y1 - d.y0);
      }
    };
    img.src = imgUrl;
  }, [imgUrl, overlay, page, selectedId, editMode]);

  const onPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: Math.round(e.clientX - rect.left),
      y: Math.round(e.clientY - rect.top),
    };
  };

  const onDown = (e) => {
    const p = onPos(e);
    
    if (editMode) {
      // In edit mode, handle field dragging and resizing
      const hit = overlay.fields.find(
        (f) =>
          f.page === page &&
          p.x >= f.rect[0] &&
          p.x <= f.rect[2] &&
          p.y >= f.rect[1] &&
          p.y <= f.rect[3]
      );
      
      if (hit) {
        setSelectedId(hit.id);
        
        // Check if clicking on resize handle
        const [x0, y0, x1, y1] = hit.rect;
        const handleSize = 6;
        
        // Corner handles
        if (p.x >= x0 - handleSize/2 && p.x <= x0 + handleSize/2 && 
            p.y >= y0 - handleSize/2 && p.y <= y0 + handleSize/2) {
          setResizeHandle('nw'); // Northwest corner
        } else if (p.x >= x1 - handleSize/2 && p.x <= x1 + handleSize/2 && 
                   p.y >= y0 - handleSize/2 && p.y <= y0 + handleSize/2) {
          setResizeHandle('ne'); // Northeast corner
        } else if (p.x >= x0 - handleSize/2 && p.x <= x0 + handleSize/2 && 
                   p.y >= y1 - handleSize/2 && p.y <= y1 + handleSize/2) {
          setResizeHandle('sw'); // Southwest corner
        } else if (p.x >= x1 - handleSize/2 && p.x <= x1 + handleSize/2 && 
                   p.y >= y1 - handleSize/2 && p.y <= y1 + handleSize/2) {
          setResizeHandle('se'); // Southeast corner
        } else {
          // Edge handles or center - start dragging
          setDraggedField({ id: hit.id, offsetX: p.x - x0, offsetY: p.y - y0 });
        }
        return;
      }
    } else {
      // Normal mode - select if clicking inside an existing rect
      const hit = overlay.fields.find(
        (f) =>
          f.page === page &&
          p.x >= f.rect[0] &&
          p.x <= f.rect[2] &&
          p.y >= f.rect[1] &&
          p.y <= f.rect[3]
      );
      if (hit) {
        setSelectedId(hit.id);
        drawingRef.current = null;
        return;
      }
    }
    
    setSelectedId(null);
    if (!editMode) {
      drawingRef.current = { x0: p.x, y0: p.y, x1: p.x, y1: p.y };
    }
  };

  const onMove = (e) => {
    const p = onPos(e);
    
    if (editMode && draggedField) {
      // Handle field dragging
      setOverlay((o) => {
        const i = o.fields.findIndex((f) => f.id === draggedField.id);
        if (i === -1) return o;
        
        const field = o.fields[i];
        const newRect = [
          p.x - draggedField.offsetX,
          p.y - draggedField.offsetY,
          p.x - draggedField.offsetX + (field.rect[2] - field.rect[0]),
          p.y - draggedField.offsetY + (field.rect[3] - field.rect[1])
        ];
        
        const fields = o.fields.slice();
        fields[i] = { ...field, rect: newRect };
        return { ...o, fields };
      });
      return;
    }
    
    if (editMode && resizeHandle && selectedId) {
      // Handle field resizing
      setOverlay((o) => {
        const i = o.fields.findIndex((f) => f.id === selectedId);
        if (i === -1) return o;
        
        const field = o.fields[i];
        const [x0, y0, x1, y1] = field.rect;
        let newRect = [...field.rect];
        
        switch (resizeHandle) {
          case 'nw':
            newRect = [p.x, p.y, x1, y1];
            break;
          case 'ne':
            newRect = [x0, p.y, p.x, y1];
            break;
          case 'sw':
            newRect = [p.x, y0, x1, p.y];
            break;
          case 'se':
            newRect = [x0, y0, p.x, p.y];
            break;
        }
        
        // Ensure positive dimensions
        if (newRect[2] > newRect[0] && newRect[3] > newRect[1]) {
          const fields = o.fields.slice();
          fields[i] = { ...field, rect: newRect };
          return { ...o, fields };
        }
        return o;
      });
      return;
    }
    
    if (!editMode && drawingRef.current) {
      drawingRef.current = { ...drawingRef.current, x1: p.x, y1: p.y };
      if (imgUrl) setImgUrl((prev) => prev); // trigger redraw
    }
  };

  const onUp = () => {
    if (editMode) {
      // Clear drag/resize state
      setDraggedField(null);
      setResizeHandle(null);
      return;
    }
    
    const d = drawingRef.current;
    if (!d) return;
    drawingRef.current = null;
    const rect = [
      Math.min(d.x0, d.x1),
      Math.min(d.y0, d.y1),
      Math.max(d.x0, d.x1),
      Math.max(d.y0, d.y1),
    ];
    const id = `f_${overlay.fields.length + 1}`;
    const field = {
      id,
      label: id,
      page,
      type: "text",
      rect, // keep in px in UI; convert on save
      fontSize: 11,
      align: "left",
      shrink: true,
    };
    setOverlay((o) => ({ ...o, fields: [...o.fields, field] }));
    setSelectedId(id);
  };

  async function save() {
    // Persist a copy converted to POINTS
    const overlayToSave = {
      ...overlay,
      fields: (overlay.fields || []).map((f) => ({
        ...f,
        rect: rectPxToPt(f.rect),
      })),
    };
    const fd = new FormData();
    fd.append("overlay_json", JSON.stringify(overlayToSave));
    const r = await fetch(`${API}/apps/${app}/forms/${form}/template`, {
      method: "POST",
      body: fd,
    });
    if (!r.ok) return alert("Save failed");
  }

  function updateSelected(patch) {
    setOverlay((o) => {
      const i = o.fields.findIndex((f) => f.id === selectedId);
      if (i === -1) return o;
      const next = { ...o.fields[i], ...patch };
      const fields = o.fields.slice();
      fields[i] = next;
      return { ...o, fields };
    });
    if (Object.prototype.hasOwnProperty.call(patch, "id")) {
      setSelectedId(patch.id || selectedId);
    }
  }

  function delSelected() {
    if (!selectedId) return;
    setOverlay((o) => ({
      ...o,
      fields: o.fields.filter((f) => f.id !== selectedId),
    }));
    setSelectedId(null);
  }

  const selected = useMemo(
    () => overlay.fields.find((f) => f.id === selectedId) || null,
    [overlay, selectedId]
  );

  // New: Toggle edit mode
  const toggleEditMode = () => {
    setEditMode(!editMode);
    if (editMode) {
      setDraggedField(null);
      setResizeHandle(null);
    }
  };

  // New: Get field statistics
  const fieldStats = useMemo(() => {
    const pageFields = overlay.fields.filter((f) => f.page === page);
    const aiFields = pageFields.filter((f) => f.id.startsWith('ai_field_'));
    const manualFields = pageFields.filter((f) => !f.id.startsWith('ai_field_'));
    
    return {
      total: pageFields.length,
      ai: aiFields.length,
      manual: manualFields.length
    };
  }, [overlay, page]);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 320px",
        gap: 12,
        padding: 12,
      }}
    >
      <div>
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <strong>Mapper</strong>
          <code>
            {app}/{form}
          </code>
          <button onClick={save}>Save</button>
          <button
            onClick={() => setShowAIMapper(true)}
            style={{
              background: "linear-gradient(135deg, #10b981, #059669)",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "6px",
              fontWeight: "600",
              cursor: "pointer",
              marginLeft: "8px",
            }}
          >
            🤖 AI Field Detection
          </button>
          <button
            onClick={toggleEditMode}
            style={{
              background: editMode ? "#dc2626" : "#3b82f6",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "6px",
              fontWeight: "600",
              cursor: "pointer",
              marginLeft: "8px",
            }}
          >
            {editMode ? "✋ Exit Edit Mode" : "✏️ Edit Fields"}
          </button>
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              gap: 6,
              alignItems: "center",
            }}
          >
            <button
              disabled={page <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              ◀ Prev
            </button>
            <div>
              Page {page + 1} / {pages}
            </div>
            <button
              disabled={page >= pages - 1}
              onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
            >
              Next ▶
            </button>
          </div>
        </div>
        
        {/* Edit Mode Instructions */}
        {editMode && (
          <div style={{
            background: "#fef3c7",
            border: "1px solid #f59e0b",
            borderRadius: "6px",
            padding: "8px 12px",
            marginBottom: "8px",
            fontSize: "14px"
          }}>
            <strong>✏️ Edit Mode Active:</strong> 
            {editMode && draggedField ? " Drag fields to reposition" : 
             editMode && resizeHandle ? " Resize field by dragging handles" :
             " Click and drag fields to move, drag handles to resize"}
          </div>
        )}
        
        <div
          style={{
            border: "1px solid #ccc",
            maxHeight: "70vh",
            overflow: "auto",
            backgroundColor: "#f9f9f9",
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              cursor: editMode ? "move" : "crosshair",
              display: "block",
            }}
            onMouseDown={onDown}
            onMouseMove={onMove}
            onMouseUp={onUp}
          />
        </div>
      </div>

      {/* Editor */}
      <div style={{ border: "1px solid #eee", padding: 10, borderRadius: 8 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Field</div>
        {!selected && <div style={{ color: "#666" }}>Click a box to edit</div>}
        {selected && (
          <div style={{ display: "grid", gap: 8 }}>
            <label>
              <div>ID</div>
              <input
                value={selected.id}
                onChange={(e) => updateSelected({ id: e.target.value })}
              />
            </label>
            <label>
              <div>Label</div>
              <input
                value={selected.label || ""}
                onChange={(e) => updateSelected({ label: e.target.value })}
              />
            </label>
            <label>
              <div>Type</div>
              <select
                value={selected.type || "text"}
                onChange={(e) => updateSelected({ type: e.target.value })}
              >
                <option value="text">text</option>
                <option value="checkbox">checkbox</option>
              </select>
            </label>
            <label>
              <div>Font Size</div>
              <input
                type="number"
                value={selected.fontSize || 11}
                onChange={(e) =>
                  updateSelected({ fontSize: Number(e.target.value || 11) })
                }
              />
            </label>
            <label>
              <div>Align</div>
              <select
                value={selected.align || "left"}
                onChange={(e) => updateSelected({ align: e.target.value })}
              >
                <option>left</option>
                <option>center</option>
                <option>right</option>
              </select>
            </label>
            <label>
              <input
                type="checkbox"
                checked={!!selected.shrink}
                onChange={(e) => updateSelected({ shrink: e.target.checked })}
              />
              <span style={{ marginLeft: 6 }}>Shrink to fit</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={!!selected.uppercase}
                onChange={(e) =>
                  updateSelected({ uppercase: e.target.checked })
                }
              />
              <span style={{ marginLeft: 6 }}>Uppercase</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={!!selected.bg}
                onChange={(e) =>
                  updateSelected({ bg: e.target.checked })
                }
              />
              <span style={{ marginLeft: 6 }}>White-out BG</span>
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={delSelected} style={{ color: "#a00" }}>
                Delete
              </button>
              <button onClick={() => updateSelected({}) || save()}>Save</button>
            </div>
          </div>
        )}
        <hr style={{ margin: "12px 0" }} />
        <div>
          <div style={{ marginBottom: "8px" }}>
            <strong>Field Statistics:</strong>
          </div>
          <div style={{ fontSize: "14px", color: "#666" }}>
            <div>📊 Total: {fieldStats.total}</div>
            <div>🤖 AI Detected: {fieldStats.ai}</div>
            <div>✏️ Manual: {fieldStats.manual}</div>
          </div>
        </div>
      </div>

      {/* AI Field Mapper Modal */}
      {showAIMapper && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              maxWidth: "800px",
              width: "100%",
              maxHeight: "90vh",
              overflow: "auto",
              position: "relative",
            }}
          >
            <button
              onClick={() => setShowAIMapper(false)}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "#f3f4f6",
                border: "none",
                borderRadius: "50%",
                width: "32px",
                height: "32px",
                cursor: "pointer",
                fontSize: "18px",
              }}
            >
              ✕
            </button>
            <AIFieldMapper
              app={app}
              form={form}
              onMappingComplete={(newOverlay) => {
                setOverlay(newOverlay);
                setShowAIMapper(false);
                // Auto-enable edit mode after AI detection for field placement
                setEditMode(true);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
