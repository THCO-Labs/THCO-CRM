import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Grid, X, Check } from "lucide-react";

const C = {
  bg:"#0B1120",card:"#111827",cardAlt:"#0F1219",
  white:"#F5F5F0",sec:"#6B7280",muted:"#4B5563",body:"#D1D5DB",
  border:"rgba(255,255,255,0.08)",dash:"rgba(255,255,255,0.15)",
  teal:"#1D9E75",tealL:"#5DCAA5",tealD:"#0F3D2E",tealFlow:"#0F6E56",
  coral:"#D85A30",coralL:"#F0997B",coralD:"#2D1810",
  purple:"#6C5CE7",purpleL:"#AFA9EC",purpleD:"#1A1530",
  gray:"#9CA3AF",green:"#4ADE80",amber:"#F59E0B",red:"#EF4444",
};

const css=`
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
.afc2 *{box-sizing:border-box;margin:0;padding:0}
.afc2{font-family:'Inter',sans-serif;background:${C.bg};color:${C.white};overflow:hidden;-webkit-font-smoothing:antialiased}
.pf{font-family:'Playfair Display',serif}
.mono{font-family:'JetBrains Mono',monospace}
@keyframes a2-up{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
@keyframes a2-fade{from{opacity:0}to{opacity:1}}
@keyframes a2-left{from{opacity:0;transform:translateX(-18px)}to{opacity:1;transform:translateX(0)}}
@keyframes a2-scale{from{opacity:0;transform:scale(0.93)}to{opacity:1;transform:scale(1)}}
@keyframes a2-draw{to{stroke-dashoffset:0}}
@keyframes a2-glow{0%,100%{box-shadow:0 0 0 0 rgba(108,92,231,0)}50%{box-shadow:0 0 20px 4px rgba(108,92,231,0.18)}}
@keyframes a2-badge{from{opacity:0;transform:translateY(-3px) scale(0.9)}to{opacity:1;transform:translateY(0) scale(1)}}
.afc2-pg[data-active="true"] .au{animation:a2-up 480ms cubic-bezier(0.22,1,0.36,1) both}
.afc2-pg[data-active="true"] .af{animation:a2-fade 480ms cubic-bezier(0.22,1,0.36,1) both}
.afc2-pg[data-active="true"] .al{animation:a2-left 480ms cubic-bezier(0.22,1,0.36,1) both}
.afc2-pg[data-active="true"] .as{animation:a2-scale 480ms cubic-bezier(0.22,1,0.36,1) both}
.afc2-pg[data-active="false"] .au,.afc2-pg[data-active="false"] .af,.afc2-pg[data-active="false"] .al,.afc2-pg[data-active="false"] .as{opacity:0}
.a2-pill{display:inline-block;padding:5px 14px;border:1px solid ${C.teal};border-radius:2px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:${C.teal};margin-bottom:16px}
.a2-card{background:${C.card};border:1px solid ${C.border};border-radius:2px;padding:18px}
.a2-grid{position:fixed;inset:0;z-index:200;background:rgba(11,17,32,0.97);backdrop-filter:blur(12px);display:flex;flex-wrap:wrap;gap:10px;padding:48px;overflow-y:auto;align-content:flex-start}
.a2-grid .th{width:calc(12.5% - 9px);aspect-ratio:16/9;background:${C.card};border:1px solid ${C.border};border-radius:2px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px;color:${C.sec};transition:all 200ms}
.a2-grid .th:hover{border-color:${C.white};color:${C.white};transform:scale(1.04)}
.a2-grid .th.on{border-color:${C.teal};color:${C.teal}}
.svg-draw2{stroke-dashoffset:var(--len);stroke-dasharray:var(--len);animation:a2-draw var(--dur,600ms) ease-out var(--del,0ms) both}
.pulse2{animation:a2-glow 1.4s ease-in-out 1}
.nav2{width:32px;height:32px;background:rgba(255,255,255,0.03);border:1px solid ${C.border};border-radius:2px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 200ms}
.nav2:hover:not(:disabled){background:rgba(255,255,255,0.06);border-color:rgba(255,255,255,0.15)}
.nav2:disabled{opacity:0.15;cursor:default}
`;

const dl=(ms)=>({animationDelay:`${ms}ms`});

const usePhase=(active,_,intervals)=>{
  const[p,setP]=useState(0);
  useEffect(()=>{
    if(!active){setP(0);return;}
    const ts=intervals.map((t,i)=>setTimeout(()=>setP(i+1),t));
    return()=>ts.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[active]);
  return p;
};

const Hdr=()=>(
  <div style={{position:"absolute",top:0,left:0,right:0,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"18px 40px",zIndex:5}}>
    <span style={{fontSize:12,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase"}}>AFC</span>
    <span style={{fontSize:11,color:C.muted}}>Cross-Border Treasury System</span>
  </div>
);
const Badge=({text,d=0,color})=><div className="af a2-pill" style={{...dl(d),...(color?{borderColor:color,color}:{})}}>{text}</div>;
const Card=({children,d=0,style={}})=><div className="au a2-card" style={{...dl(d),...style}}>{children}</div>;

/* ======= SLIDE 1: TITLE ======= */
const S1=({active})=>{
  const p=usePhase(active,6,[0,300,600,900,1100,1300]);
  return(
    <div style={{height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",position:"relative"}}>
      <Hdr/>
      {p>=1&&<h1 className="af pf" style={{fontSize:"clamp(36px,4vw,48px)",fontWeight:700,maxWidth:720,lineHeight:1.15}}>Cross-Border Treasury and Settlement System</h1>}
      {p>=2&&<p className="au" style={{fontSize:"clamp(15px,1.5vw,18px)",color:C.sec,marginTop:16,maxWidth:640,lineHeight:1.6}}>A Private Payment and Settlement Platform for AFC's Portfolio Companies</p>}
      {p>=3&&<div className="af" style={{width:60,height:1,background:C.purple,margin:"24px auto"}}/>}
      {p>=4&&<p className="af" style={{fontSize:14,fontWeight:500}}>Africa Finance Corporation</p>}
      {p>=5&&<p className="af" style={{fontSize:12,color:C.muted,marginTop:10}}>Prepared by THCO | March 2026</p>}
      {p>=6&&<p className="af" style={{fontSize:12,color:C.muted,marginTop:8,position:"absolute",bottom:44}}>$16 billion in assets. 36 countries. 44 member states.</p>}
    </div>
  );
};

/* ======= SLIDE 2: QUOTE ======= */
const S2=()=>(
  <div style={{height:"100%",display:"flex",alignItems:"center",justifyContent:"center",padding:"0 clamp(40px,12vw,220px)",position:"relative"}}>
    <Hdr/>
    <p className="au pf" style={{...dl(400),fontSize:"clamp(22px,2.5vw,28px)",fontStyle:"italic",lineHeight:1.65,textAlign:"center",maxWidth:720}}>
      "Your portfolio companies have the cash. The problem is it is stuck in the wrong currencies, in the wrong countries, at the wrong time."
    </p>
  </div>
);

/* ======= SLIDE 3: PROBLEM ======= */
const S3=()=>{
  const cards=[{n:"Trapped NGN",c:"Nigeria",b:"Depreciating"},{n:"Trapped GHS",c:"Ghana",b:"Illiquid"},{n:"Trapped XOF",c:"Gabon",b:"Cannot move"},{n:"Trapped EGP",c:"Egypt",b:"Bank queues"}];
  return(
    <div style={{height:"100%",display:"flex",alignItems:"center",padding:"0 40px",gap:32,position:"relative"}}>
      <Hdr/>
      <div style={{flex:"0 0 54%"}}>
        <Badge text="THE PROBLEM" d={200}/>
        <h2 className="au pf" style={{...dl(300),fontSize:"clamp(26px,3vw,36px)",fontWeight:700,lineHeight:1.2,marginBottom:20}}>$16 Billion in Assets. Massive Monthly Cash Flows. And the Money Cannot Move.</h2>
        {["AFC's portfolio companies generate enormous revenues across 36 African countries. Power plants collect naira. Ports collect CFA francs. Gold mines earn dollars. Toll roads earn shillings.","But that cash is trapped. A company in Nigeria cannot easily pay a supplier in Rwanda. A company in Gabon cannot easily settle an obligation in Ghana. Each entity goes through local banks, pays 3-5% FX spreads, waits days for SWIFT settlements, and competes for scarce dollar liquidity.","The local cash is not an asset. It is a liquidity problem. It is depreciating while it sits. And it is slowing down AFC's entire portfolio."].map((t,i)=>(
          <p key={i} className="au" style={{...dl(500+i*150),fontSize:14,color:C.body,lineHeight:1.8,marginBottom:8}}>{t}</p>
        ))}
      </div>
      <div style={{flex:1}}>
        {cards.map((c,i)=>(
          <Card key={i} d={1200+i*180} style={{marginBottom:10,padding:"12px 16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><p style={{fontSize:14,fontWeight:600}}>{c.n}</p><p style={{fontSize:12,color:C.sec}}>{c.c}</p></div>
              <span className="mono" style={{fontSize:10,color:C.red,background:`${C.red}15`,padding:"3px 10px",borderRadius:2,fontWeight:500}}>{c.b}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

/* ======= SLIDE 4: WHAT AFC WANTS ======= */
const S4=({active})=>{
  const p=usePhase(active,6,[400,800,1200,1600,2000,2800]);
  const lines=["AFC wants its treasury in dollars.","Dollars earn yield. Dollars do not depreciate. Dollars are liquid globally.","But AFC's portfolio generates local currency every day, across every country.","What if there was a system to move that local currency between portfolio companies who need it, convert the excess back to dollars, and keep the treasury earning 4%?"];
  return(
    <div style={{height:"100%",display:"flex",flexDirection:"column",justifyContent:"center",padding:"0 clamp(40px,8vw,120px)",position:"relative"}}>
      <Hdr/>
      <h2 className="au pf" style={{...dl(200),fontSize:"clamp(28px,3vw,36px)",fontWeight:700,marginBottom:24}}>AFC Does Not Want to Hold Local Currency.</h2>
      {lines.map((l,i)=>p>i&&<p key={i} className="au" style={{fontSize:16,color:C.body,lineHeight:1.8,marginBottom:8}}>{l}</p>)}
      {p>=5&&<p className="au" style={{fontSize:20,fontWeight:700,marginTop:24}}>That is what AFC asked us to design.</p>}
    </div>
  );
};

/* ======= SLIDE 5: PAPSS REFERENCE ======= */
const S5=()=>(
  <div style={{height:"100%",display:"flex",flexDirection:"column",justifyContent:"center",padding:"0 40px",position:"relative"}}>
    <Hdr/>
    <Badge text="THE REFERENCE" d={200}/>
    <h2 className="au pf" style={{...dl(300),fontSize:"clamp(26px,2.8vw,34px)",fontWeight:700,marginBottom:20}}>A Private PAPSS. Built for AFC's Portfolio.</h2>
    <div style={{display:"flex",gap:24}}>
      <div className="au" style={{...dl(500),flex:1,borderLeft:`2px solid ${C.gray}`,paddingLeft:18}}>
        <p style={{fontSize:16,fontWeight:600,color:C.gray,marginBottom:8}}>PAPSS (Public)</p>
        <p style={{fontSize:14,color:C.body,lineHeight:1.7,marginBottom:12}}>Pan-African Payment and Settlement System. Continental infrastructure. Government-backed. Experimental. Slow-moving. Designed for interbank settlements across 54 countries.</p>
        {["Multi-year rollout","Requires central bank adoption","Talk-heavy, limited real volume"].map((t,i)=><p key={i} style={{fontSize:13,color:C.muted,marginBottom:4}}>{t}</p>)}
      </div>
      <div className="au" style={{...dl(600),flex:1,borderLeft:`2px solid ${C.purple}`,paddingLeft:18}}>
        <p style={{fontSize:16,fontWeight:600,color:C.purple,marginBottom:8}}>AFC's System (Private)</p>
        <p style={{fontSize:14,color:C.body,lineHeight:1.7,marginBottom:12}}>Portfolio-specific treasury platform. AFC owns the companies. AFC controls the accounts. No central bank dependencies. Deployable immediately.</p>
        {["4-5 company pilot in months","AFC controls both ends of every transaction","Action-oriented, real cash flows from day one"].map((t,i)=><p key={i} style={{fontSize:13,color:C.white,marginBottom:4}}>{t}</p>)}
      </div>
    </div>
    <Card d={1000} style={{marginTop:16,padding:14}}>
      <p style={{fontSize:13,color:C.body}}>PAPSS was the inspiration. AFC's version is faster, simpler, and backed by $16 billion in real assets.</p>
    </Card>
  </div>
);

/* ======= SLIDE 6: HERO FLOWCHART ======= */
const S6=({active})=>{
  const p=usePhase(active,12,[0,1000,1600,2100,3000,3500,4200,5000,5400,5900,6500,7000]);
  const[dims,setDims]=useState({w:1840,h:620});
  const cRef=useCallback(n=>{if(n){const r=n.getBoundingClientRect();setDims({w:r.width,h:r.height});}},[]);
  const{w,h}=dims;

  // Y positions proportional to container height
  const Y=f=>Math.round(h*f);
  const trsY=Y(0.02), trsH=62;          // Row 1: USD Treasury
  const platY=Y(0.22), platH=Y(0.32);   // Row 2: Platform container
  const funcY=platY+44;                   // Function boxes inside platform
  const funcH=42;
  const crossY=funcY+funcH+10;           // Cross arrows inside platform
  const compY=Y(0.66), compH=48;         // Row 3: Portfolio companies
  const labelY=Y(0.82);                  // Row 5: Summary labels
  const remY=Y(0.10);                    // Side: Remittance provider

  // X centers
  const trsX=w/2;
  const compW=160,compG=14;
  const compS=(w*0.82-(4*compW+3*compG))/2+w*0.09;
  const compCx=[0,1,2,3].map(i=>compS+compW/2+i*(compW+compG));
  const funcW=185,funcG=16;
  const funcS=(w*0.82-(3*funcW+2*funcG))/2+w*0.09;
  const funcCx=[0,1,2].map(i=>funcS+funcW/2+i*(funcW+funcG));
  const remX=w*0.91;

  return(
    <div style={{height:"100%",display:"flex",flexDirection:"column",padding:"46px 40px 0",position:"relative"}}>
      <Hdr/>
      <p className="af" style={{...dl(0),fontSize:18,fontWeight:600,marginBottom:6}}>The architecture</p>
      <div ref={cRef} style={{position:"relative",flex:1,marginBottom:54}}>

        {/* SVG ARROWS */}
        <svg width={w} height={h} style={{position:"absolute",top:0,left:0,pointerEvents:"none",zIndex:2,overflow:"visible"}}>
          <defs>
            <marker id="mp" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M2 1L8 5L2 9" fill="none" stroke={C.purple} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></marker>
            <marker id="mt" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M2 1L8 5L2 9" fill="none" stroke={C.tealFlow} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></marker>
            <marker id="mc" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M2 1L8 5L2 9" fill="none" stroke={C.coral} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></marker>
          </defs>

          {/* Arrow A1: Treasury down-left to Platform (solid purple) */}
          {p>=2&&<>
            <line x1={trsX-120} y1={trsY+trsH} x2={w*0.15} y2={platY}
              stroke={C.purple} strokeWidth={1.5} markerEnd="url(#mp)"
              className="svg-draw2" style={{"--len":Math.hypot(trsX-120-w*0.15,platY-trsY-trsH),"--dur":"600ms","--del":"0ms"}}/>
            <text x={(trsX-120+w*0.15)/2-40} y={(trsY+trsH+platY)/2} fill={C.muted} fontSize="9" fontFamily="Inter"
              opacity="0" style={{animation:"a2-fade 300ms ease-out 600ms both"}}>Dollar reserve backs the system</text>
          </>}

          {/* Arrow A2: Platform up-right to Treasury (dashed purple) */}
          {p>=2&&<>
            <line x1={w*0.85} y1={platY} x2={trsX+120} y2={trsY+trsH}
              stroke={C.purple} strokeWidth={1.5} strokeDasharray="5 4" markerEnd="url(#mp)"
              className="svg-draw2" style={{"--len":Math.hypot(w*0.85-trsX-120,platY-trsY-trsH),"--dur":"600ms","--del":"0ms"}}/>
            <text x={(w*0.85+trsX+120)/2+10} y={(trsY+trsH+platY)/2} fill={C.muted} fontSize="9" fontFamily="Inter"
              opacity="0" style={{animation:"a2-fade 300ms ease-out 600ms both"}}>Excess converts back to USD</text>
          </>}

          {/* Arrows B1-B4: Companies UP to Platform */}
          {p>=7&&compCx.map((x,i)=>{
            const toX=w*0.09+(i+0.5)*(w*0.82/4);
            return <line key={`b${i}`} x1={x} y1={compY} x2={toX} y2={platY+platH}
              stroke={C.tealFlow} strokeWidth={1.5} markerEnd="url(#mt)"
              className="svg-draw2" style={{"--len":Math.hypot(x-toX,compY-platY-platH),"--dur":"500ms","--del":`${i*80}ms`}}/>;
          })}
          {p>=7&&<text x={w/2} y={compY-8} fill={C.muted} fontSize="9" fontFamily="Inter" textAnchor="middle"
            opacity="0" style={{animation:"a2-fade 300ms ease-out 400ms both"}}>Local currency from operations</text>}

          {/* Arrow C1: Platform right to Remittance (teal) */}
          {p>=9&&<line x1={w*0.09+w*0.82} y1={remY+24} x2={remX-75} y2={remY+24}
            stroke={C.tealFlow} strokeWidth={1.5} markerEnd="url(#mt)"
            className="svg-draw2" style={{"--len":Math.abs(remX-75-w*0.09-w*0.82),"--dur":"500ms","--del":"0ms"}}/>}
          {p>=9&&<text x={(w*0.09+w*0.82+remX-75)/2} y={remY+18} fill={C.muted} fontSize="8" fontFamily="Inter" textAnchor="middle"
            opacity="0" style={{animation:"a2-fade 300ms ease-out 500ms both"}}>Surplus local currency</text>}

          {/* Arrow C2: Remittance up then left to Treasury (purple L-shape) */}
          {p>=10&&<path d={`M${remX} ${remY} L${remX} ${trsY+trsH/2} L${trsX+180} ${trsY+trsH/2}`}
            fill="none" stroke={C.purple} strokeWidth={1.5} markerEnd="url(#mp)"
            className="svg-draw2" style={{"--len":Math.abs(remY-trsY-trsH/2)+Math.abs(remX-trsX-180),"--dur":"600ms","--del":"0ms"}}/>}
          {p>=10&&<text x={(remX+trsX+180)/2} y={trsY+trsH/2-6} fill={C.purple} fontSize="10" fontFamily="JetBrains Mono"
            opacity="0" style={{animation:"a2-fade 300ms ease-out 600ms both"}}>USD</text>}

          {/* Cross-arrows inside platform */}
          {p>=5&&<>
            <line x1={funcCx[0]+70} y1={crossY+4} x2={funcCx[1]-70} y2={crossY+4}
              stroke={C.coral} strokeWidth={1} strokeDasharray="4 3" markerEnd="url(#mc)"
              className="svg-draw2" style={{"--len":140,"--dur":"400ms","--del":"0ms"}}/>
            <text x={(funcCx[0]+funcCx[1])/2} y={crossY-2} fill={C.muted} fontSize="8" fontFamily="Inter" textAnchor="middle"
              opacity="0" style={{animation:"a2-fade 200ms ease-out 400ms both"}}>Segilola pays ARISE's vendor</text>
            <line x1={funcCx[1]-70} y1={crossY+16} x2={funcCx[0]+70} y2={crossY+16}
              stroke={C.coral} strokeWidth={1} strokeDasharray="4 3" markerEnd="url(#mc)"
              className="svg-draw2" style={{"--len":140,"--dur":"400ms","--del":"200ms"}}/>
            <text x={(funcCx[0]+funcCx[1])/2} y={crossY+28} fill={C.muted} fontSize="8" fontFamily="Inter" textAnchor="middle"
              opacity="0" style={{animation:"a2-fade 200ms ease-out 600ms both"}}>ARISE pays Segilola's supplier</text>
          </>}
        </svg>

        {/* ROW 1: USD Treasury */}
        {p>=1&&<div className="as pulse2" style={{position:"absolute",top:trsY,left:trsX-180,width:360,zIndex:3,background:C.purpleD,border:`1.5px solid ${C.purple}`,borderRadius:12,padding:"12px 20px",textAlign:"center"}}>
          <p style={{fontSize:16,fontWeight:600,color:C.purpleL}}>AFC USD Treasury</p>
          <p className="mono" style={{fontSize:13,color:C.green,marginTop:2}}>~4% yield</p>
          <p style={{fontSize:11,color:C.muted,marginTop:1}}>The anchor</p>
        </div>}

        {/* ROW 2: Platform container */}
        {p>=3&&<div className="af" style={{position:"absolute",top:platY,left:"9%",width:"82%",height:platH,border:`1px dashed ${C.dash}`,borderRadius:16,zIndex:1}}>
          <div style={{textAlign:"center",paddingTop:6}}>
            <p style={{fontSize:15,fontWeight:600}}>AFC's Private Settlement Platform</p>
            <p style={{fontSize:10,color:C.muted,marginTop:1}}>Portfolio companies log in, request transfers, see balances</p>
          </div>
        </div>}

        {/* Function boxes inside platform */}
        {p>=4&&<div style={{position:"absolute",top:funcY,left:0,right:0,display:"flex",gap:funcG,justifyContent:"center",zIndex:3}}>
          {[["Match requests","Route between companies",C.teal,C.tealL],["Track ledger","Benchmark rates, audit trail",C.gray,C.gray],["Sell excess FX","To remittance providers",C.coral,C.coralL]].map(([t,s,c,cl],i)=>(
            <div key={i} className="as" style={{...dl(i*150),width:funcW,height:funcH,background:C.card,borderLeft:`2px solid ${c}`,borderRadius:8,padding:"8px 12px"}}>
              <p style={{fontSize:12,fontWeight:600,color:cl}}>{t}</p>
              <p style={{fontSize:10,color:c,marginTop:1}}>{s}</p>
            </div>
          ))}
        </div>}

        {/* ROW 3: Portfolio companies */}
        {p>=6&&<div style={{position:"absolute",top:compY,left:0,right:0,display:"flex",gap:compG,justifyContent:"center",zIndex:3}}>
          {[["Segilola","Nigeria, NGN"],["Pecan Energies","Ghana, GHS"],["ARISE IIP","Gabon, XOF"],["Infinity Power","Egypt, EGP"]].map(([n,s],i)=>(
            <div key={i} className="as" style={{...dl(i*150),width:compW,height:compH,background:C.tealD,border:`0.5px solid ${C.teal}`,borderRadius:8,padding:"8px 12px",textAlign:"center",display:"flex",flexDirection:"column",justifyContent:"center"}}>
              <p style={{fontSize:12,fontWeight:600,color:C.tealL}}>{n}</p>
              <p style={{fontSize:10,color:C.teal,marginTop:1}}>{s}</p>
            </div>
          ))}
        </div>}

        {/* SIDE: Remittance provider */}
        {p>=8&&<div className="as" style={{position:"absolute",top:remY,left:remX-75,width:150,zIndex:3,background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 10px",textAlign:"center"}}>
          <p style={{fontSize:11,fontWeight:600}}>Remittance providers</p>
          <p style={{fontSize:10,color:C.sec}}>Buy excess local FX</p>
        </div>}

        {/* ROW 5: Summary labels */}
        {p>=11&&<div className="af" style={{position:"absolute",top:labelY,left:0,right:0,display:"flex",justifyContent:"center",gap:32,zIndex:3}}>
          <span style={{fontSize:11,color:C.green}}>No spread between portfolio companies</span>
          <span style={{fontSize:11,color:C.purpleL}}>Excess local cash converts back to USD</span>
          <span style={{fontSize:11,color:C.purpleL}}>Dollar treasury earns yield while system operates</span>
        </div>}

        {/* LEGEND */}
        {p>=12&&<div className="af" style={{...dl(0),position:"absolute",top:4,right:0,fontSize:10,color:C.muted,zIndex:4}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}><div style={{width:6,height:6,borderRadius:"50%",background:C.purple}}/><span>USD / Dollar flows</span></div>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}><div style={{width:6,height:6,borderRadius:"50%",background:C.teal}}/><span>Local currency / Portfolio</span></div>
          <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:6,height:6,borderRadius:"50%",background:C.coral}}/><span>Cross-border payments</span></div>
        </div>}
      </div>
    </div>
  );
};

/* ======= SLIDE 7: WHY DOLLARS AT TOP ======= */
const S7=({active})=>(
  <div style={{height:"100%",display:"flex",alignItems:"center",padding:"0 40px",gap:32,position:"relative"}}>
    <Hdr/>
    <div style={{flex:"0 0 52%"}}>
      <Badge text="THE ANCHOR" d={200} color={C.purple}/>
      <h2 className="au pf" style={{...dl(300),fontSize:"clamp(26px,2.8vw,34px)",fontWeight:700,marginBottom:16}}>Why the Dollar Treasury Comes First</h2>
      {["AFC does not want to accumulate local currency. Every day that naira, cedis, or CFA francs sit in an account, they are exposed to depreciation, inflation, and illiquidity.","Dollars are different. Dollars earn yield. At current rates, AFC's dollar treasury earns approximately 4% annually just by sitting in short-term instruments.","The system is designed so that local currency is transient. It flows in from portfolio company operations, gets used for cross-border payments between portfolio companies, and the excess converts back to dollars through remittance providers.","The dollar treasury at the top is not the destination. It is the starting point. It is the reserve that backs the entire system."].map((t,i)=>(
        <p key={i} className="au" style={{...dl(500+i*150),fontSize:14,color:C.body,lineHeight:1.8,marginBottom:8}}>{t}</p>
      ))}
    </div>
    <div style={{flex:1,display:"flex",flexDirection:"column",gap:16}}>
      <Card d={1200} style={{borderTop:`2px solid ${C.purple}`,textAlign:"center",padding:"24px 20px"}}>
        <p style={{fontSize:11,fontWeight:600,textTransform:"uppercase",color:C.muted,letterSpacing:"0.06em"}}>DOLLAR TREASURY YIELD</p>
        <span className="mono" style={{fontSize:48,fontWeight:600,color:C.green,display:"block",marginTop:6}}>~4%</span>
        <p style={{fontSize:13,color:C.body,marginTop:4}}>Annual yield on USD holdings</p>
      </Card>
      <Card d={1500} style={{borderTop:`2px solid ${C.red}`,textAlign:"center",padding:"24px 20px"}}>
        <p style={{fontSize:11,fontWeight:600,textTransform:"uppercase",color:C.muted,letterSpacing:"0.06em"}}>LOCAL CURRENCY DEPRECIATION</p>
        <span className="mono" style={{fontSize:32,fontWeight:600,color:C.red,display:"block",marginTop:6}}>-15 to -40%</span>
        <p style={{fontSize:13,color:C.body,marginTop:4}}>Annual depreciation across NGN, GHS, EGP</p>
      </Card>
    </div>
  </div>
);

/* ======= SLIDE 8: TWO FLOWS ======= */
const S8=()=>(
  <div style={{height:"100%",display:"flex",flexDirection:"column",justifyContent:"center",padding:"0 40px",position:"relative"}}>
    <Hdr/>
    <Badge text="THE TWO FLOWS" d={200}/>
    <h2 className="au pf" style={{...dl(300),fontSize:"clamp(26px,2.8vw,34px)",fontWeight:700,marginBottom:18}}>Money Flows Up. Payments Flow Across.</h2>
    <div style={{display:"flex",gap:24}}>
      <div className="au" style={{...dl(500),flex:1,borderLeft:`2px solid ${C.purple}`,paddingLeft:18}}>
        <p style={{fontSize:18,fontWeight:600,color:C.purple,marginBottom:8}}>Flow 1: Up to Dollars</p>
        <p style={{fontSize:14,color:C.body,lineHeight:1.7,marginBottom:12}}>AFC's share of portfolio returns, dividends, interest, loan repayments, converts to USD and flows up into the treasury. This is AFC's money. It earns yield.</p>
        {["Segilola: AFC's share of gold revenue converts to USD","ARISE: Quarterly dividend on AFC's 21% stake converts to USD","Infinity Power: Interest on AFC's debt facility converts to USD"].map((t,i)=><Card key={i} d={800+i*150} style={{padding:"8px 12px",marginBottom:6,borderLeft:`2px solid ${C.purple}`}}><span style={{fontSize:12,color:C.body}}>{t}</span></Card>)}
      </div>
      <div className="au" style={{...dl(600),flex:1,borderLeft:`2px solid ${C.coral}`,paddingLeft:18}}>
        <p style={{fontSize:18,fontWeight:600,color:C.coral,marginBottom:8}}>Flow 2: Across Between Companies</p>
        <p style={{fontSize:14,color:C.body,lineHeight:1.7,marginBottom:12}}>Portfolio companies need to pay suppliers in other countries. They use AFC's platform. Local currency moves horizontally. No spread. No bank. No SWIFT.</p>
        {["Segilola wants to pay a supplier in Rwanda","ARISE wants to pay an obligation in Nigeria","A Rwandan company wants to pay someone in Ghana"].map((t,i)=><Card key={i} d={900+i*150} style={{padding:"8px 12px",marginBottom:6,borderLeft:`2px solid ${C.coral}`}}><span style={{fontSize:12,color:C.body}}>{t}</span></Card>)}
      </div>
    </div>
    <Card d={1500} style={{marginTop:14,padding:12}}>
      <p style={{fontSize:13,color:C.body}}>Flow 1 fills the dollar treasury. Flow 2 serves the portfolio. They operate simultaneously.</p>
    </Card>
  </div>
);

/* ======= SLIDE 9: PLATFORM ======= */
const S9=({active})=>{
  const p=usePhase(active,5,[200,1000,2200,3500,4500]);
  const reqs=[["Segilola (Nigeria)","Send NGN 200M equivalent to Rwandan supplier"],["ARISE IIP (Gabon)","Pay Nigerian equipment vendor NGN 150M"],["Rwandan portfolio co.","Pay Ghanaian partner GHS 30M"]];
  return(
    <div style={{height:"100%",display:"flex",flexDirection:"column",justifyContent:"center",padding:"0 40px",position:"relative"}}>
      <Hdr/>
      <Badge text="THE PLATFORM" d={100}/>
      <h2 className="au pf" style={{...dl(150),fontSize:"clamp(26px,2.8vw,34px)",fontWeight:700,marginBottom:6}}>What Portfolio Companies See</h2>
      <p className="au" style={{...dl(200),fontSize:15,color:C.body,marginBottom:16,lineHeight:1.7}}>Portfolio companies log into a platform tied to AFC's treasury. They see balances and request cross-border payments.</p>
      {p>=1&&<div style={{display:"flex",gap:12,marginBottom:14}}>
        {reqs.map(([h,d],i)=><Card key={i} d={i*150} style={{flex:1,borderLeft:`2px solid ${C.coral}`,padding:"12px 14px"}}><p style={{fontSize:13,fontWeight:600,color:C.coralL}}>{h}</p><p style={{fontSize:12,color:C.body,marginTop:4}}>{d}</p></Card>)}
      </div>}
      {p>=2&&<div className="af" style={{border:`1px dashed ${C.dash}`,borderRadius:12,padding:"14px 20px",marginBottom:14,textAlign:"center"}}>
        <p style={{fontSize:14,fontWeight:600}}>AFC Settlement Platform</p>
        <div style={{display:"flex",gap:16,justifyContent:"center",marginTop:10}}>
          {["Check balances","Match requests","Execute locally"].map((t,i)=><div key={i} className="a2-card" style={{padding:"8px 16px"}}><p style={{fontSize:12,fontWeight:500}}>{t}</p></div>)}
        </div>
      </div>}
      {p>=3&&<div style={{display:"flex",gap:12,marginBottom:14}}>
        {reqs.map(([_,__],i)=>{
          const sup=["Rwandan supplier paid in RWF","Nigerian vendor paid in NGN","Ghanaian partner paid in GHS"][i];
          return <div key={i} className="au a2-card" style={{...dl(i*200),flex:1,padding:"10px 14px",display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:18,height:18,borderRadius:"50%",border:`1.5px solid ${C.teal}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Check size={10} color={C.teal}/></div>
            <span style={{fontSize:12,color:C.body}}>{sup}</span>
          </div>;
        })}
      </div>}
      {p>=4&&<div className="au" style={{display:"flex",gap:24,justifyContent:"center",marginTop:8}}>
        {[["3","Cross-border payments",C.white],["0","Banks involved",C.green],["0","Spreads paid",C.green],["0","SWIFT fees",C.green]].map(([v,l,c],i)=>(
          <div key={i} style={{textAlign:"center"}}>
            <span className="mono" style={{fontSize:28,fontWeight:600,color:c}}>{v}</span>
            <p style={{fontSize:11,color:C.muted,marginTop:3}}>{l}</p>
          </div>
        ))}
      </div>}
    </div>
  );
};

/* ======= SLIDE 10: NO SPREAD ======= */
const S10=({active})=>{
  const p=usePhase(active,4,[400,800,1200,2000]);
  return(
    <div style={{height:"100%",display:"flex",flexDirection:"column",justifyContent:"center",padding:"0 clamp(40px,8vw,120px)",position:"relative"}}>
      <Hdr/>
      <h2 className="au pf" style={{...dl(200),fontSize:"clamp(28px,3vw,36px)",fontWeight:700,marginBottom:24}}>Within the Portfolio, There Is No Spread.</h2>
      {["When Segilola pays ARISE through AFC's platform, nobody pays a spread. The money moves between AFC's own accounts. It is a ledger entry, not a bank transaction.","AFC is not a fintech trying to make money from its portfolio companies. AFC is a service provider making its own investments more liquid.","The only time a spread exists is when AFC sells excess local currency to remittance providers. And in that case, AFC is the one gaining."].map((t,i)=>p>i&&<p key={i} className="au" style={{fontSize:16,color:C.body,lineHeight:1.8,marginBottom:10}}>{t}</p>)}
      {p>=4&&<p className="au" style={{fontSize:18,fontWeight:700,marginTop:20}}>This is not a revenue line. It is a portfolio service.</p>}
    </div>
  );
};

/* ======= SLIDE 11: REMITTANCE RELEASE VALVE ======= */
const S11=({active})=>{
  const p=usePhase(active,3,[200,1200,2600]);
  return(
    <div style={{height:"100%",display:"flex",flexDirection:"column",justifyContent:"center",padding:"0 40px",position:"relative"}}>
      <Hdr/>
      <Badge text="THE RELEASE VALVE" d={200} color={C.purple}/>
      <h2 className="au pf" style={{...dl(300),fontSize:"clamp(26px,2.8vw,34px)",fontWeight:700,marginBottom:6}}>Converting What Nobody Needs Back to Dollars</h2>
      <p className="au" style={{...dl(400),fontSize:15,color:C.body,marginBottom:16,lineHeight:1.7}}>After all cross-portfolio payments are matched, surplus local currency gets sold to remittance providers.</p>
      {p>=1&&<div style={{display:"flex",gap:24,alignItems:"center",marginBottom:16}}>
        <Card d={0} style={{flex:1,borderLeft:`2px solid ${C.teal}`,padding:14}}>
          <p style={{fontSize:14,fontWeight:600,color:C.tealL}}>AFC has</p>
          <p style={{fontSize:13,color:C.body,marginTop:4}}>Surplus NGN, GHS, XOF, EGP. Sitting idle. Depreciating.</p>
        </Card>
        <div style={{textAlign:"center",flexShrink:0,fontSize:22,color:C.purple}}>&harr;</div>
        <Card d={200} style={{flex:1,borderLeft:`2px solid ${C.purple}`,padding:14}}>
          <p style={{fontSize:14,fontWeight:600,color:C.purpleL}}>Remittance companies need</p>
          <p style={{fontSize:13,color:C.body,marginTop:4}}>NGN, GHS, XOF, EGP for diaspora payouts. Currently buying from banks.</p>
        </Card>
      </div>}
      {p>=2&&<div style={{display:"flex",gap:14,marginBottom:14}}>
        {[["NGN","4.0B"],["GHS","590M"],["XOF","2.3B"],["EGP","1.2B"]].map(([c,v],i)=>(
          <Card key={i} d={i*150} style={{flex:1,textAlign:"center",borderTop:`2px solid ${C.purple}`,padding:14}}>
            <p className="mono" style={{fontSize:20,fontWeight:600}}>{c} {v} sold</p>
            <p style={{fontSize:10,color:C.purpleL,marginTop:3}}>Back to USD Treasury</p>
          </Card>
        ))}
      </div>}
      {p>=3&&<p className="af" style={{...dl(0),fontSize:12,color:C.muted,textAlign:"center"}}>Small buffers retained. The rest becomes dollars earning 4%.</p>}
    </div>
  );
};

/* ======= SLIDE 12: LEDGER ======= */
const S12=({active})=>{
  const p=usePhase(active,2,[2500,4000]);
  const rows=[["Segilola","RWF equiv. to Rwandan supplier","CBK mid-rate","Netted vs next repayment"],["ARISE IIP","NGN 150M to Nigerian vendor","NAFEM mid-rate","Netted vs next dividend"],["Rwandan co.","GHS 30M to Ghanaian partner","BOG reference rate","Quarterly cash settlement"]];
  const settled=[0];
  return(
    <div style={{height:"100%",display:"flex",flexDirection:"column",justifyContent:"center",padding:"0 40px",position:"relative"}}>
      <Hdr/>
      <Badge text="THE LEDGER" d={200}/>
      <h2 className="au pf" style={{...dl(300),fontSize:"clamp(26px,2.8vw,34px)",fontWeight:700,marginBottom:6}}>Tracking Every Movement</h2>
      <p className="au" style={{...dl(400),fontSize:15,color:C.body,marginBottom:16,lineHeight:1.7}}>Every cross-portfolio payment creates a ledger entry at the official benchmark rate.</p>
      <div className="au" style={{...dl(600),borderRadius:2,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"110px 1fr 1fr 1fr 80px",fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.06em",color:C.muted,padding:"10px 14px",background:C.card,borderBottom:`1px solid ${C.border}`}}>
          <span>Company</span><span>Payment Made</span><span>Rate Used</span><span>Settlement</span><span>Status</span>
        </div>
        {rows.map(([co,pay,rate,method],i)=>(
          <div key={i} className="au" style={{...dl(800+i*200),display:"grid",gridTemplateColumns:"110px 1fr 1fr 1fr 80px",fontSize:13,padding:"10px 14px",background:i%2===0?C.card:C.cardAlt,borderBottom:`1px solid ${C.border}`,alignItems:"center"}}>
            <span style={{fontWeight:600}}>{co}</span>
            <span style={{color:C.body}}>{pay}</span>
            <span style={{color:C.body}}>{rate}</span>
            <span style={{color:C.body}}>{method}</span>
            <span className="mono" style={{fontSize:10,padding:"3px 8px",borderRadius:2,textAlign:"center",transition:"all 400ms",background:p>=1&&settled.includes(i)?`${C.teal}20`:`${C.amber}20`,color:p>=1&&settled.includes(i)?C.teal:C.amber,fontWeight:500}}>{p>=1&&settled.includes(i)?"Settled":"Pending"}</span>
          </div>
        ))}
      </div>
      <Card d={1600} style={{marginTop:14,padding:12}}>
        <p style={{fontSize:13,color:C.body}}>Benchmark rates satisfy transfer pricing. No preferential rates. No regulatory risk. Portfolio companies pay zero spread.</p>
      </Card>
    </div>
  );
};

/* ======= SLIDE 13: CONCRETE EXAMPLE ======= */
const S13=({active})=>{
  const p=usePhase(active,5,[200,1000,2000,3500,4500]);
  return(
    <div style={{height:"100%",display:"flex",flexDirection:"column",padding:"54px 40px 0",position:"relative"}}>
      <Hdr/>
      <Badge text="EXAMPLE" d={100}/>
      <h2 className="au pf" style={{...dl(150),fontSize:"clamp(24px,2.5vw,32px)",fontWeight:700,marginBottom:12}}>How It Works: Segilola, ARISE, and Rwanda</h2>
      <div style={{flex:1,position:"relative"}}>
        {p>=1&&<div style={{display:"flex",gap:20,justifyContent:"center"}}>
          {[["Segilola (Nigeria)","Has NGN","Needs to pay Rwandan supplier"],["ARISE IIP (Gabon)","Has XOF","Needs to pay Nigerian vendor"],["Rwandan co.","Has RWF","Needs to pay Ghanaian partner"]].map(([n,h,nd],i)=>(
            <Card key={i} d={i*150} style={{width:240,borderTop:`2px solid ${C.teal}`,padding:12}}>
              <p style={{fontSize:13,fontWeight:600,color:C.tealL}}>{n}</p>
              <p style={{fontSize:12,color:C.body,marginTop:3}}>{h}</p>
              <p style={{fontSize:11,color:C.sec,marginTop:2}}>{nd}</p>
            </Card>
          ))}
        </div>}
        {p>=2&&<div className="af" style={{margin:"16px auto",width:"72%",border:`1px dashed ${C.dash}`,borderRadius:16,padding:"12px 20px",textAlign:"center"}}>
          <p style={{fontSize:14,fontWeight:600,marginBottom:8}}>AFC Settlement Platform</p>
          <div style={{display:"flex",gap:12,justifyContent:"center"}}>
            {["Nigeria (NGN)","Gabon (XOF)","Rwanda (RWF)","Ghana (GHS)"].map((a,i)=><div key={i} className="a2-card" style={{padding:"6px 14px"}}><p style={{fontSize:11,fontWeight:600}}>{a}</p></div>)}
          </div>
          {p>=3&&<p className="af" style={{...dl(600),fontSize:12,color:C.green,marginTop:8,fontWeight:500}}>No bank. No spread. No SWIFT.</p>}
        </div>}
        {p>=4&&<div style={{display:"flex",gap:20,justifyContent:"center"}}>
          {["Rwandan supplier paid in RWF","Nigerian vendor paid in NGN","Ghanaian partner paid in GHS"].map((s,i)=>(
            <Card key={i} d={i*150} style={{width:230,borderTop:`2px solid ${C.coral}`,padding:10}}>
              <p style={{fontSize:12,fontWeight:600,color:C.coralL}}>{s}</p>
            </Card>
          ))}
        </div>}
        {p>=5&&<div className="au" style={{...dl(200),textAlign:"center",marginTop:14}}>
          <p style={{fontSize:12,color:C.purpleL}}>Excess back to dollars, earning 4%.</p>
        </div>}
      </div>
    </div>
  );
};

/* ======= SLIDE 14: NETWORK EFFECT ======= */
const S14=({active})=>{
  const bars=[{l:"5 companies",t:15,p:85},{l:"10",t:30,p:70},{l:"20",t:45,p:55},{l:"36 countries",t:65,p:35}];
  return(
    <div style={{height:"100%",display:"flex",alignItems:"center",padding:"0 40px",gap:32,position:"relative"}}>
      <Hdr/>
      <div style={{flex:"0 0 46%"}}>
        <h2 className="au pf" style={{...dl(200),fontSize:"clamp(26px,2.8vw,34px)",fontWeight:700,marginBottom:16}}>More Companies. More Matches. Less Leakage.</h2>
        {["With 4 companies, some payments match. With 10, the ratio increases. With 20+, the majority of local currency moves internally. With 36 countries, the system becomes self-sustaining.","Every company that joins makes it more liquid for every other company."].map((t,i)=>(
          <p key={i} className="au" style={{...dl(400+i*150),fontSize:15,color:C.body,lineHeight:1.8,marginBottom:10}}>{t}</p>
        ))}
        <p className="au" style={{...dl(900),fontSize:18,fontWeight:700,marginTop:16}}>It is a network effect applied to treasury management.</p>
      </div>
      <div style={{flex:1}}>
        <div style={{display:"flex",gap:18,alignItems:"flex-end",height:240}}>
          {bars.map((b,i)=>(
            <div key={i} className="au" style={{...dl(500+i*200),flex:1,display:"flex",flexDirection:"column",alignItems:"center"}}>
              <span className="mono" style={{fontSize:14,fontWeight:600,marginBottom:6}}>{b.t}%</span>
              <div style={{width:"100%",height:220,background:`${C.white}06`,borderRadius:2,position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",bottom:0,width:"100%",height:active?`${b.t}%`:"0%",background:`linear-gradient(to top,${C.teal},${C.tealFlow})`,transition:`height 1s cubic-bezier(0.22,1,0.36,1) ${500+i*200}ms`,borderRadius:"2px 2px 0 0"}}/>
                <div style={{position:"absolute",bottom:active?`${b.t}%`:"0%",width:"100%",height:active?`${b.p}%`:"0%",background:`${C.purple}25`,transition:`all 1s cubic-bezier(0.22,1,0.36,1) ${500+i*200}ms`}}/>
              </div>
              <span style={{fontSize:11,color:C.sec,marginTop:6}}>{b.l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ======= SLIDE 15: WHAT TO BUILD ======= */
const S15=()=>{
  const cards=[{n:"01",t:"Treasury Dashboard",d:"Real-time dollar treasury and local currency balances.",c:C.purple},{n:"02",t:"Payment Request Portal",d:"Portfolio companies log in, submit cross-border requests.",c:C.coral},{n:"03",t:"Matching Engine",d:"Pair requests against balances. Route optimally. Execute locally.",c:C.teal},{n:"04",t:"Ledger and Settlement",d:"Track positions, rates, schedules. Transfer pricing compliant.",c:C.gray}];
  return(
    <div style={{height:"100%",display:"flex",flexDirection:"column",justifyContent:"center",padding:"0 40px",position:"relative"}}>
      <Hdr/>
      <Badge text="THE BUILD" d={200} color={C.purple}/>
      <h2 className="au pf" style={{...dl(300),fontSize:"clamp(28px,3vw,36px)",fontWeight:700,marginBottom:24}}>Four Components. One Platform.</h2>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        {cards.map((c,i)=>(
          <Card key={i} d={500+i*200} style={{borderTop:`2px solid ${c.c}`,padding:"18px 20px"}}>
            <span className="mono" style={{fontSize:24,color:c.c,fontWeight:600}}>{c.n}</span>
            <p style={{fontSize:15,fontWeight:600,marginTop:6,marginBottom:8}}>{c.t}</p>
            <p style={{fontSize:13,color:C.body,lineHeight:1.6}}>{c.d}</p>
          </Card>
        ))}
      </div>
      <p className="af" style={{...dl(1400),fontSize:13,color:C.muted,marginTop:18}}>This is a technology build. AFC wants a platform, not a consulting recommendation.</p>
    </div>
  );
};

/* ======= SLIDE 16: BUSINESS CASE ======= */
const S16=()=>(
  <div style={{height:"100%",display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",padding:"0 40px",position:"relative"}}>
    <Hdr/>
    <h2 className="au pf" style={{...dl(200),fontSize:"clamp(28px,3vw,36px)",fontWeight:700,marginBottom:24}}>The Business Case</h2>
    <div style={{display:"flex",gap:20,marginBottom:20,width:"100%",maxWidth:800}}>
      <Card d={400} style={{flex:1,textAlign:"center",borderTop:`2px solid ${C.red}`,padding:"18px 16px"}}>
        <p style={{fontSize:11,fontWeight:600,textTransform:"uppercase",color:C.muted,letterSpacing:"0.06em"}}>LOCAL CURRENCY DEPRECIATION</p>
        <span className="mono" style={{fontSize:32,fontWeight:600,color:C.red,display:"block",marginTop:6}}>-15 to -40%</span>
        <p style={{fontSize:12,color:C.body,marginTop:4}}>Every day cash sits in local accounts, it loses value</p>
      </Card>
      <Card d={600} style={{flex:1,textAlign:"center",borderTop:`2px solid ${C.amber}`,padding:"18px 16px"}}>
        <p style={{fontSize:11,fontWeight:600,textTransform:"uppercase",color:C.muted,letterSpacing:"0.06em"}}>FX CONVERSION COST</p>
        <span className="mono" style={{fontSize:32,fontWeight:600,color:C.amber,display:"block",marginTop:6}}>3-5%</span>
        <p style={{fontSize:12,color:C.body,marginTop:4}}>Paid independently on every cross-border payment</p>
      </Card>
    </div>
    <div style={{display:"flex",gap:20,marginBottom:20,width:"100%",maxWidth:800}}>
      <Card d={800} style={{flex:1,textAlign:"center",borderTop:`2px solid ${C.green}`,padding:"18px 16px"}}>
        <p style={{fontSize:11,fontWeight:600,textTransform:"uppercase",color:C.muted,letterSpacing:"0.06em"}}>INTERNAL TRANSFERS</p>
        <span className="mono" style={{fontSize:32,fontWeight:600,color:C.green,display:"block",marginTop:6}}>0%</span>
        <p style={{fontSize:12,color:C.body,marginTop:4}}>No bank, no SWIFT, instant ledger</p>
      </Card>
      <Card d={1000} style={{flex:1,textAlign:"center",borderTop:`2px solid ${C.purple}`,padding:"18px 16px"}}>
        <p style={{fontSize:11,fontWeight:600,textTransform:"uppercase",color:C.muted,letterSpacing:"0.06em"}}>DOLLAR TREASURY YIELD</p>
        <span className="mono" style={{fontSize:32,fontWeight:600,color:C.green,display:"block",marginTop:6}}>~4%</span>
        <p style={{fontSize:12,color:C.body,marginTop:4}}>On every dollar held instead of local currency</p>
      </Card>
    </div>
    <p className="au mono" style={{...dl(1300),fontSize:"clamp(16px,1.8vw,22px)",fontWeight:500,textAlign:"center",maxWidth:700,lineHeight:1.5}}>The value is not spread capture. The value is unlocking trapped liquidity and keeping the treasury earning yield.</p>
  </div>
);

/* ======= SLIDE 17: COMPARISON TABLE ======= */
const S17=()=>{
  const rows=[["Who uses it","Each company independently","Banks across 54 countries","AFC portfolio companies"],["Who controls it","Local banks","Central banks, AFREXIM","AFC treasury"],["Speed","2-3 days (SWIFT)","Variable","Instant (ledger entry)"],["Cost","3-5% spread","Reduced but bank-mediated","0% within portfolio"],["Deployment","N/A","Multi-year rollout","Pilot in months"],["Data","No portfolio visibility","Interbank data","Full treasury dashboard"],["Motivation","Bank profit","Continental integration","Portfolio liquidity"],["Network effect","None","Requires central banks","Each company improves matching"]];
  return(
    <div style={{height:"100%",display:"flex",flexDirection:"column",justifyContent:"center",padding:"0 40px",position:"relative"}}>
      <Hdr/>
      <h2 className="au pf" style={{...dl(200),fontSize:"clamp(26px,2.8vw,34px)",fontWeight:700,marginBottom:20}}>How This Compares</h2>
      <div className="au" style={{...dl(400),borderRadius:2,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"130px 1fr 1fr 1fr",fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em",padding:"10px 14px",background:C.card,borderBottom:`1px solid ${C.border}`}}>
          <span/><span style={{color:C.muted}}>Current State</span><span style={{color:C.muted}}>Public PAPSS</span><span style={{color:C.white}}>AFC Private Platform</span>
        </div>
        {rows.map(([label,c1,c2,c3],i)=>(
          <div key={i} className="au" style={{...dl(600+i*70),display:"grid",gridTemplateColumns:"130px 1fr 1fr 1fr",fontSize:12,padding:"8px 14px",background:i%2===0?C.card:C.cardAlt,borderBottom:`1px solid ${C.border}`}}>
            <span style={{color:C.sec,fontWeight:500}}>{label}</span>
            <span style={{color:C.muted}}>{c1}</span>
            <span style={{color:C.muted}}>{c2}</span>
            <span style={{color:C.white,fontWeight:500}}>{c3}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ======= SLIDE 18: TIMELINE ======= */
const S18=()=>{
  const ms=[{d:"March 2026",t:"Architecture delivered",s:"This presentation. AFC reviews.",c:C.purple,active:true},{d:"April 2026",t:"Pilot design",s:"Select 4-5 companies. Map banks. Identify remittance partners."},{d:"Q2 2026",t:"Treasury dashboard live",s:"Real-time dollar and local currency balances."},{d:"Q3 2026",t:"Platform launched",s:"First cross-border requests. First internal matches."},{d:"Q4 2026",t:"Remittance partnerships active",s:"Excess conversion operational. First full cycle."},{d:"2027",t:"Full portfolio rollout",s:"36 countries. PAPSS-level infrastructure, privately operated.",c:C.purple,big:true}];
  return(
    <div style={{height:"100%",display:"flex",flexDirection:"column",justifyContent:"center",padding:"0 40px",position:"relative"}}>
      <Hdr/>
      <Badge text="TIMELINE" d={200}/>
      <h2 className="au pf" style={{...dl(300),fontSize:"clamp(28px,3vw,36px)",fontWeight:700,marginBottom:24}}>Implementation Roadmap</h2>
      <div style={{position:"relative",paddingLeft:32}}>
        <div className="af" style={{...dl(400),position:"absolute",left:6,top:0,bottom:0,width:1,background:C.border}}/>
        {ms.map((m,i)=>(
          <div key={i} className="al" style={{...dl(500+i*200),display:"flex",gap:16,marginBottom:14,position:"relative"}}>
            <div style={{position:"absolute",left:-30,top:6,width:m.big?13:11,height:m.big?13:11,borderRadius:"50%",background:m.active?C.white:m.c||C.card,border:`2px solid ${m.c||C.sec}`}}/>
            <div>
              <span className="mono" style={{fontSize:13,color:m.c||C.sec,fontWeight:500}}>{m.d}</span>
              <p style={{fontSize:m.big?15:14,fontWeight:m.big?700:500,marginTop:2}}>{m.t}</p>
              <p style={{fontSize:12,color:C.muted,marginTop:2,lineHeight:1.5}}>{m.s}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ======= SLIDE 19: NEXT STEPS ======= */
const S19=()=>{
  const steps=["AFC reviews treasury architecture and this presentation","Identify 4-5 portfolio companies for pilot (recommend Segilola, ARISE, Infinity Power, Pecan)","Map current bank relationships and FX costs in pilot countries","Identify licensed remittance partners in Nigeria, Ghana, Gabon, Egypt","THCO scopes the technology build: dashboard, portal, matching engine, ledger","Regulatory review: intercompany settlement structure in each jurisdiction","Define benchmark rate methodology and transfer pricing documentation","Pilot kickoff targeting Q2 2026"];
  return(
    <div style={{height:"100%",display:"flex",flexDirection:"column",justifyContent:"center",padding:"0 clamp(40px,8vw,120px)",position:"relative"}}>
      <Hdr/>
      <h2 className="au pf" style={{...dl(200),fontSize:"clamp(28px,3vw,36px)",fontWeight:700,marginBottom:24}}>Next Steps</h2>
      {steps.map((s,i)=>(
        <div key={i} className="au" style={{...dl(400+i*120),display:"flex",alignItems:"baseline",gap:16,marginBottom:12}}>
          <span className="mono" style={{fontSize:16,fontWeight:600,width:26,flexShrink:0}}>{i+1}</span>
          <span style={{fontSize:15,color:C.body,lineHeight:1.5}}>{s}</span>
        </div>
      ))}
    </div>
  );
};

/* ======= SLIDE 20: CLOSING QUOTE ======= */
const S20=({active})=>{
  const p=usePhase(active,2,[0,1200]);
  return(
    <div style={{height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",padding:"0 clamp(40px,12vw,200px)",position:"relative"}}>
      <Hdr/>
      {p>=1&&<p className="au pf" style={{fontSize:"clamp(22px,2.5vw,28px)",fontStyle:"italic",lineHeight:1.65,maxWidth:720}}>
        "They are not looking at this like a fintech that wants to make money for investors. It is just a service they are offering their portfolio companies."
      </p>}
      {p>=2&&<p className="au" style={{...dl(400),fontSize:14,color:C.muted,marginTop:28,maxWidth:620,lineHeight:1.6}}>The system pays for itself by keeping the treasury in dollars earning yield, while the portfolio operates fluidly across 36 countries.</p>}
    </div>
  );
};

/* ======= SLIDE 21: CLOSING CRESCENDO ======= */
const S21=({active})=>{
  const p=usePhase(active,5,[0,800,1600,2400,3400]);
  const lines=["AFC has the portfolio.","The local currency is already flowing.","The matching opportunities are already there.","The dollar treasury is waiting to earn yield."];
  return(
    <div style={{height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",position:"relative"}}>
      <Hdr/>
      {lines.map((l,i)=>p>i&&<p key={i} className="au pf" style={{fontSize:"clamp(22px,2.5vw,28px)",fontWeight:700,marginBottom:12,lineHeight:1.4}}>{l}</p>)}
      {p>=5&&<p className="au pf" style={{fontSize:"clamp(26px,2.8vw,32px)",fontWeight:700,marginTop:24}}>We recommend building the platform now.</p>}
    </div>
  );
};

/* ======= SLIDE 22: END CARD ======= */
const S22=()=>(
  <div style={{height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",position:"relative"}}>
    <Hdr/>
    <p className="af" style={{...dl(400),fontSize:16,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase"}}>THCO</p>
    <div className="af" style={{...dl(700),width:40,height:1,background:C.purple,margin:"18px auto"}}/>
    <p className="af" style={{...dl(900),fontSize:14,color:C.muted}}>Cross-Border Treasury and Settlement System</p>
    <p className="af" style={{...dl(1100),fontSize:13,color:C.muted,marginTop:4}}>Prepared for Africa Finance Corporation</p>
    <div className="au" style={{...dl(1400),marginTop:36}}>
      <p style={{fontSize:14,fontWeight:500}}>Ayo Omomia</p>
      <p style={{fontSize:12,color:C.muted,marginTop:4}}>Senior Partner and Co-Founder, THCO</p>
    </div>
  </div>
);

/* ======= ENGINE ======= */
const SLIDES=[S1,S2,S3,S4,S5,S6,S7,S8,S9,S10,S11,S12,S13,S14,S15,S16,S17,S18,S19,S20,S21,S22];
const TOTAL=SLIDES.length;

export default function AFCTreasuryV2Presentation(){
  const[cur,setCur]=useState(0);
  const[grid,setGrid]=useState(false);
  const go=useCallback(i=>{if(i>=0&&i<TOTAL&&i!==cur)setCur(i);},[cur]);

  useEffect(()=>{
    const h=e=>{
      if(grid&&e.key==="Escape"){setGrid(false);return;}
      if(e.key==="Escape"){setGrid(true);return;}
      if(e.key==="ArrowRight"||e.key==="ArrowDown"||e.key===" "){e.preventDefault();go(cur+1);}
      if(e.key==="ArrowLeft"||e.key==="ArrowUp"){e.preventDefault();go(cur-1);}
      if(e.key==="f"||e.key==="F"){document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen?.();}
    };
    window.addEventListener("keydown",h);
    return()=>window.removeEventListener("keydown",h);
  },[cur,go,grid]);

  useEffect(()=>{
    let sx=0;
    const ts=e=>{sx=e.touches[0].clientX;};
    const te=e=>{const dx=sx-e.changedTouches[0].clientX;if(Math.abs(dx)>60){dx>0?go(cur+1):go(cur-1);}};
    window.addEventListener("touchstart",ts,{passive:true});
    window.addEventListener("touchend",te,{passive:true});
    return()=>{window.removeEventListener("touchstart",ts);window.removeEventListener("touchend",te);};
  },[cur,go]);

  return(
    <div className="afc2" style={{width:"100vw",height:"100vh",position:"relative",overflow:"hidden"}} data-testid="afc-treasury-v2">
      <style>{css}</style>
      <div style={{position:"fixed",top:0,left:0,right:0,height:2,background:`${C.white}08`,zIndex:60}}>
        <div style={{height:"100%",background:C.white,width:`${((cur+1)/TOTAL)*100}%`,transition:"width 300ms ease-out",opacity:0.5}}/>
      </div>
      {SLIDES.map((SC,i)=>(
        <div key={i} className="afc2-pg" data-active={i===cur?"true":"false"} data-testid={`afc2-slide-${i+1}`} style={{position:"absolute",inset:0,zIndex:i===cur?10:0,opacity:i===cur?1:0,visibility:i===cur?"visible":"hidden",transition:"opacity 300ms ease"}}>
          <SC active={i===cur}/>
        </div>
      ))}
      <div style={{position:"fixed",bottom:16,left:"50%",transform:"translateX(-50%)",zIndex:50,display:"flex",alignItems:"center",gap:12}}>
        <button className="nav2" onClick={()=>go(cur-1)} disabled={cur===0} data-testid="afc2-prev"><ChevronLeft size={14} color={C.white}/></button>
        <button className="nav2" onClick={()=>go(cur+1)} disabled={cur===TOTAL-1} data-testid="afc2-next"><ChevronRight size={14} color={C.white}/></button>
      </div>
      <span className="mono" style={{position:"fixed",bottom:18,right:32,fontSize:11,color:C.muted,zIndex:50}}>{String(cur+1).padStart(2,"0")} / {TOTAL}</span>
      <button onClick={()=>setGrid(true)} style={{position:"fixed",bottom:18,left:32,background:"transparent",border:"none",cursor:"pointer",opacity:0.4,zIndex:50}} data-testid="afc2-grid"><Grid size={15} color={C.white}/></button>
      {grid&&(
        <div className="a2-grid" onClick={()=>setGrid(false)}>
          <div style={{position:"absolute",top:16,right:16,cursor:"pointer",zIndex:210}} onClick={()=>setGrid(false)}><X size={22} color={C.sec}/></div>
          {SLIDES.map((_,i)=>(
            <div key={i} className={`th ${i===cur?"on":""}`} onClick={e=>{e.stopPropagation();setCur(i);setGrid(false);}}>{String(i+1).padStart(2,"0")}</div>
          ))}
        </div>
      )}
    </div>
  );
}
