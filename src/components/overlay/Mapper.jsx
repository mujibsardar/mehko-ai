import {useEffect,useRef,useState} from "react";

export default function Mapper(){
  const [pdfPath,setPdfPath]=useState("applications/los_angeles_mehko/page1.pdf");
  const [page,setPage]=useState(0);
  const [dpi,setDpi]=useState(144);
  const [imgUrl,setImgUrl]=useState("");
  const [m,setM]=useState(null); // metrics
  const [boxes,setBoxes]=useState([]); // {id,type,page,rect:[x0,y0,x1,y1]}
  const [drag,setDrag]=useState(null); // {x0,y0}

  const wrapRef=useRef(null);

  const load = async ()=>{
    const url = `http://127.0.0.1:8081/preview-page?pdf_path=${encodeURIComponent(pdfPath)}&page=${page}&dpi=${dpi}`;
    const met = await fetch(`http://127.0.0.1:8081/page-metrics?pdf_path=${encodeURIComponent(pdfPath)}&page=${page}&dpi=${dpi}`).then(r=>r.json());
    setImgUrl(url); setM(met);
  };

  const pxToPt = (x,y)=> m ? [ x * (m.pointsWidth/m.pixelWidth), y * (m.pointsHeight/m.pixelHeight) ] : [x,y];

  const onMouseDown = (e)=>{
    const r = wrapRef.current.getBoundingClientRect();
    setDrag({x0:e.clientX-r.left, y0:e.clientY-r.top});
  };
  const onMouseMove = (e)=>{
    if(!drag) return;
    const r = wrapRef.current.getBoundingClientRect();
    const x = e.clientX-r.left, y = e.clientY-r.top;
    setDrag({...drag, x1:x, y1:y});
  };
  const onMouseUp = ()=>{
    if(!drag||!m) return setDrag(null);
    const x0=Math.min(drag.x0,drag.x1||drag.x0), y0=Math.min(drag.y0,drag.y1||drag.y0);
    const x1=Math.max(drag.x0,drag.x1||drag.x0), y1=Math.max(drag.y0,drag.y1||drag.y0);
    const [X0,Y0]=pxToPt(x0,y0), [X1,Y1]=pxToPt(x1,y1);
    const id=`field_${boxes.length+1}`;
    setBoxes(b=>[...b,{id,type:"text",page,rect:[+X0.toFixed(2),+Y0.toFixed(2),+X1.toFixed(2),+Y1.toFixed(2)]}]);
    setDrag(null);
  };

  const dl = ()=>{
    const overlay = {fields: boxes};
    const blob = new Blob([JSON.stringify(overlay,null,2)],{type:"application/json"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="overlay.json"; a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  };

  const update = (i,k,v)=>{
    setBoxes(b=>b.map((x,idx)=> idx===i ? {...x, [k]: v} : x));
  };

  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:16,padding:16,fontFamily:"system-ui"}}>
      <div>
        <div style={{display:"flex",gap:8,marginBottom:8}}>
          <input value={pdfPath} onChange={e=>setPdfPath(e.target.value)} style={{flex:1}} />
          <input type="number" value={page} onChange={e=>setPage(+e.target.value)} style={{width:70}}/>
          <input type="number" value={dpi} onChange={e=>setDpi(+e.target.value)} style={{width:70}}/>
          <button onClick={load}>Load</button>
          <button onClick={dl} disabled={!boxes.length}>Download overlay.json</button>
        </div>
        <div ref={wrapRef}
             onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}
             style={{position:"relative",display:"inline-block",border:"1px solid #ddd",cursor:"crosshair"}}>
          {imgUrl && <img src={imgUrl} width={m?.pixelWidth} height={m?.pixelHeight} alt="pdf" draggable={false}/>}
          {/* existing boxes */}
          {boxes.map((b,i)=>{
            if(!m) return null;
            const x0=b.rect[0]*(m.pixelWidth/m.pointsWidth);
            const y0=b.rect[1]*(m.pixelHeight/m.pointsHeight);
            const x1=b.rect[2]*(m.pixelWidth/m.pointsWidth);
            const y1=b.rect[3]*(m.pixelHeight/m.pointsHeight);
            return <div key={i} style={{
              position:"absolute",left:x0,top:y0,width:x1-x0,height:y1-y0,
              border:"2px solid #4A90E2", background:"rgba(74,144,226,0.12)"
            }}/>;
          })}
          {/* live drag */}
          {drag && drag.x1!==undefined && (
            <div style={{
              position:"absolute",left:Math.min(drag.x0,drag.x1),top:Math.min(drag.y0,drag.y1),
              width:Math.abs(drag.x1-drag.x0),height:Math.abs(drag.y1-drag.y0),
              border:"2px dashed #333", background:"rgba(0,0,0,0.05)"
            }}/>
          )}
        </div>
      </div>
      <div style={{display:"grid",gap:8}}>
        <h3>Fields ({boxes.length})</h3>
        {boxes.map((b,i)=>(
          <div key={i} style={{border:"1px solid #eee",padding:8,borderRadius:8,display:"grid",gap:6}}>
            <input value={b.id} onChange={e=>update(i,"id",e.target.value)} />
            <select value={b.type} onChange={e=>update(i,"type",e.target.value)}>
              <option>text</option><option>checkbox</option><option>date</option><option>signature</option>
            </select>
            <small>page {b.page} rect [{b.rect.map(n=>n.toFixed(2)).join(", ")}]</small>
            <button onClick={()=>setBoxes(x=>x.filter((_,j)=>j!==i))}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
