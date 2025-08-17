import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";

const API = "http://127.0.0.1:8081";

export default function Mapper() {
  const { app, form } = useParams();
  const [imgUrl, setImgUrl] = useState(null);
  const [overlay, setOverlay] = useState({ fields: [] });
  const [page] = useState(0);
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(null); // {x0,y0,x1,y1}
  const [scale, setScale] = useState(1);

  const pdfPath = useMemo(
    () => `applications/${app}/${form}/form.pdf`,
    [app, form]
  );

  // load preview (server renders PNG) + template
  useEffect(() => {
    const q = new URLSearchParams({
      pdf_path: pdfPath,
      page: String(page),
      dpi: "144",
    });
    fetch(`${API}/preview-page?${q.toString()}`)
      .then((r) => r.blob())
      .then((b) => setImgUrl(URL.createObjectURL(b)));
    fetch(`${API}/apps/${app}/forms/${form}/template`)
      .then((r) => r.json())
      .then((tpl) => setOverlay(tpl?.fields ? tpl : { fields: [] }));
  }, [app, form, pdfPath, page]);

  // draw image + boxes
  useEffect(() => {
    if (!imgUrl || !canvasRef.current) return;
    const img = new Image();
    img.onload = () => {
      const c = canvasRef.current;
      const ctx = c.getContext("2d");
      c.width = img.width;
      c.height = img.height;
      setScale(1); // 1 px == 1 px from preview
      ctx.drawImage(img, 0, 0);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#00e";
      overlay.fields.forEach((f) => {
        if (f.page !== page) return;
        const [x0, y0, x1, y1] = f.rect;
        ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
      });
      if (drawing) {
        const { x0, y0, x1, y1 } = drawing;
        ctx.strokeStyle = "#e00";
        ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
      }
    };
    img.src = imgUrl;
  }, [imgUrl, overlay, page, drawing]);

  function pos(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale,
    };
  }

  function onMouseDown(e) {
    const p = pos(e);
    setDrawing({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
  }
  function onMouseMove(e) {
    if (!drawing) return;
    const p = pos(e);
    setDrawing({ ...drawing, x1: p.x, y1: p.y });
  }
  function onMouseUp() {
    if (!drawing) return;
    const { x0, y0, x1, y1 } = drawing;
    const rect = [x0, y0, x1, y1].map((v) => Math.max(0, Math.round(v)));
    const id = `f_${overlay.fields.length + 1}`;
    const field = {
      id,
      page,
      type: "text",
      rect,
      fontSize: 11,
      align: "left",
      shrink: true,
    };
    setOverlay((o) => ({ ...o, fields: [...o.fields, field] }));
    setDrawing(null);
  }

  async function save() {
    const fd = new FormData();
    fd.append("overlay_json", JSON.stringify(overlay));
    const r = await fetch(`${API}/apps/${app}/forms/${form}/template`, {
      method: "POST",
      body: fd,
    });
    if (!r.ok) alert("Save failed");
  }

  return (
    <div style={{ padding: 12, display: "grid", gap: 8 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <strong>Mapper</strong>
        <span>app:</span>
        <code>{app}</code>
        <span>form:</span>
        <code>{form}</code>
        <button onClick={save}>Save</button>
        <a href={`/interview/${app}/${form}`} style={{ marginLeft: 8 }}>
          Open Interview
        </a>
      </div>
      <canvas
        ref={canvasRef}
        style={{
          border: "1px solid #ccc",
          maxWidth: "100%",
          cursor: "crosshair",
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
      />
      <details>
        <summary>{overlay.fields.length} fields</summary>
        <pre style={{ maxHeight: 240, overflow: "auto" }}>
          {JSON.stringify(overlay, null, 2)}
        </pre>
      </details>
    </div>
  );
}
