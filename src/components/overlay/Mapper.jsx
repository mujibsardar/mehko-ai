// src/components/overlay/Mapper.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";

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
          ctx.strokeStyle = f.id === selectedId ? "#e00" : "#00e";
          ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
        });

      // current drawing
      const d = drawingRef.current;
      if (d) {
        ctx.strokeStyle = "#e00";
        ctx.strokeRect(d.x0, d.y0, d.x1 - d.x0, d.y1 - d.y0);
      }
    };
    img.src = imgUrl;
  }, [imgUrl, overlay, page, selectedId]);

  const onPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: Math.round(e.clientX - rect.left),
      y: Math.round(e.clientY - rect.top),
    };
  };

  const onDown = (e) => {
    const p = onPos(e);
    // select if clicking inside an existing rect
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
    setSelectedId(null);
    drawingRef.current = { x0: p.x, y0: p.y, x1: p.x, y1: p.y };
  };

  const onMove = (e) => {
    if (!drawingRef.current) return;
    const p = onPos(e);
    drawingRef.current = { ...drawingRef.current, x1: p.x, y1: p.y };
    if (imgUrl) setImgUrl((prev) => prev); // trigger redraw
  };

  const onUp = () => {
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
        <canvas
          ref={canvasRef}
          style={{
            border: "1px solid #ccc",
            maxWidth: "100%",
            cursor: "crosshair",
          }}
          onMouseDown={onDown}
          onMouseMove={onMove}
          onMouseUp={onUp}
        />
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
                onChange={(e) => updateSelected({ bg: e.target.checked })}
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
          {overlay.fields.filter((f) => f.page === page).length} fields on this
          page
        </div>
      </div>
    </div>
  );
}
