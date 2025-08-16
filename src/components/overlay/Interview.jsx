import {useEffect,useState} from "react";

export default function Interview(){
  const [file,setFile]=useState(null);
  const [values,setValues]=useState({});
  const [overlay,setOverlay]=useState({fields:[]});

  useEffect(()=>{  // load once
    console.log("values keys", Object.keys(values));
    console.log("overlay ids", (overlay.fields||[]).map(f=>f.id));
    fetch("/applications/los_angeles_mehko/overlay.json")
      .then(r=>r.json()).then(setOverlay);
  },[]);

  const onChange = (id, val) => setValues(v => ({...v, [id]: val}));

  const submit = async (e) => {
    e.preventDefault();
    if(!file){ alert("Choose the PDF file first."); return; }
    const fd = new FormData();
    fd.append("file", file);
    fd.append("overlay_json", JSON.stringify(overlay));
    fd.append("answers_json", JSON.stringify(values));
    const res = await fetch("http://127.0.0.1:8081/fill-overlay", { method: "POST", body: fd });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "filled.pdf"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{maxWidth:720, margin:"20px auto", fontFamily:"system-ui, Arial"}}>
      <h2>MEHKO Interview (Page 1)</h2>
      <div style={{margin:"12px 0"}}>
        <label><b>PDF file:</b>{" "}
          <input type="file" accept="application/pdf" onChange={e=>setFile(e.target.files?.[0]||null)} />
        </label>
      </div>
      <form onSubmit={submit} style={{display:"grid", gap:10}}>
        {overlay.fields.map(f=>(
          <label key={f.id} style={{display:"grid", gap:6}}>
            <span>{f.label || f.id}</span>
            {f.type==="checkbox" ? (
              <input type="checkbox"
                     checked={!!values[f.id]}
                     onChange={e=>onChange(f.id, e.target.checked)} />
            ) : (
              <input type="text"
                     value={values[f.id]||""}
                     onChange={e=>onChange(f.id, e.target.value)}
                     style={{padding:8, border:"1px solid #ccc", borderRadius:6}} />
            )}
          </label>
        ))}
        <button type="submit" style={{display:'inline-block',padding:'10px 14px',borderRadius:8}}>
            Download Filled PDF
        </button>
      </form>
    </div>
  );
}
