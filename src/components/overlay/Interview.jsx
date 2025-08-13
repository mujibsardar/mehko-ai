import {useEffect,useState} from "react";

const OVERLAY = {"fields":[
  {"id":"date_of_application","page":0,"rect":[138.0,197.04,227.64,225.84],"type":"text","label":"Date"},
  {"id":"business_name","page":0,"rect":[37.2,261.72,574.92,282.12],"type":"text","label":"Business Name"},
  {"id":"business_address","page":0,"rect":[37.2,291.36,282.72,313.68],"type":"text","label":"Business Address"},
  {"id":"unit","page":0,"rect":[284.52,291.36,323.16,313.68],"type":"text","label":"Unit"},
  {"id":"city","page":0,"rect":[324.96,291.36,516.72,313.68],"type":"text","label":"City"},
  {"id":"zip","page":0,"rect":[518.52,291.36,574.92,313.68],"type":"text","label":"Zip"},
  {"id":"owner_name","page":0,"rect":[37.2,322.92,251.16,344.76],"type":"text","label":"Owner’s Name"},
  {"id":"email","page":0,"rect":[252.96,322.92,453.72,344.76],"type":"text","label":"Email"},
  {"id":"phone","page":0,"rect":[455.52,322.92,574.92,344.76],"type":"text","label":"Phone"},
  {"id":"send_invoice_to_business_address","page":0,"rect":[41.64,383.88,52.68,391.20],"type":"checkbox","label":"Invoice to business address"},
  {"id":"send_invoice_to_other","page":0,"rect":[225.72,383.88,236.76,391.20],"type":"checkbox","label":"Invoice to address below"},
  {"id":"mailing_address","page":0,"rect":[37.2,406.68,251.16,426.24],"type":"text","label":"Mailing Address"},
  {"id":"mailing_unit","page":0,"rect":[252.96,406.68,296.16,426.24],"type":"text","label":"Unit"},
  {"id":"mailing_city","page":0,"rect":[297.96,406.68,476.16,426.24],"type":"text","label":"City"},
  {"id":"mailing_state","page":0,"rect":[477.96,406.68,516.72,426.24],"type":"text","label":"State"},
  {"id":"mailing_zip","page":0,"rect":[518.52,406.68,574.92,426.24],"type":"text","label":"Zip"}
]};

export default function Interview(){
  const [file,setFile]=useState(null);
  const [values,setValues]=useState({});
  const [overlay,setOverlay]=useState({fields:[]});

    useEffect(()=>{  // load once
    fetch("/applications/los_angeles_mehko/overlay.json")
      .then(r=>r.json()).then(setOverlay);
  },[]);

  const onChange = (id, val) => setValues(v => ({...v, [id]: val}));

  const submit = async (e) => {
    e.preventDefault();
    if(!file){ alert("Choose the PDF file first."); return; }
    const fd = new FormData();
    fd.append("file", file);
    fd.append("overlay_json", JSON.stringify(OVERLAY));
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
        {OVERLAY.fields.map(f=>(
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
