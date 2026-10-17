import React, { useEffect, useMemo, useState } from 'react';
import AssessmentResults from './AssessmentResults.jsx';

const API = (import.meta.env.VITE_API_BASE || 'http://localhost:8000').replace(/\/$/, '');
const STORE = 'swasthyasaathi-wellness-local-v1';
const THEMES = {
  en: {
    welcome: 'Your healthier everyday starts with awareness.', intro: 'Understand health-associated factors with explainable AI, and build lasting wellness habits — all in one place.',
    home: 'Overview', assess: 'Health assessment', wellness: 'Wellness tracker', about: 'About this project',
    disclaimer: 'Educational demonstration only. This is not a medical diagnosis, screening test, or estimate of future disease.',
    formHeading: 'Your health questionnaire', formDesc: 'Answer all 15 questions to explore how a model trained on the 2015 US health survey interprets similar profiles. No answers are stored by our server.',
    run: 'View educational assessment', running: 'Evaluating your answers…', clear: 'Start a new assessment',
    result: 'Your educational assessment', modelScore: 'Model score (not medical risk)', explanation: 'Main model-influencing factors',
    wellnessHeading: 'Daily wellness log', wellnessDesc: 'Track your own habits. Entries are stored only in this browser on this device.',
    save: 'Save daily entry', date: 'Date', walk: 'Movement (minutes)', water: 'Water (glasses)', sleep: 'Sleep (hours)', note: 'Optional note',
    empty: 'No wellness logs yet. Add your first entry above.', delete: 'Delete all local wellness entries',
    aboutTitle: 'Accessible awareness, responsible AI', back: 'Back to overview',
  },
  hi: {
    welcome: 'बेहतर स्वास्थ्य की शुरुआत जागरूकता से।', intro: 'AI से स्वास्थ्य संबंधी जानकारी समझें और रोज़ की अच्छी आदतें अपनाएँ।',
    home: 'मुख्य पृष्ठ', assess: 'स्वास्थ्य जानकारी', wellness: 'वेलनेस ट्रैकर', about: 'प्रोजेक्ट के बारे में',
    disclaimer: 'केवल शिक्षा हेतु। यह चिकित्सीय निदान, स्क्रीनिंग या भविष्य में बीमारी होने की संभावना नहीं बताता।',
    formHeading: 'स्वास्थ्य प्रश्नावली', formDesc: 'सभी 15 सवालों के जवाब दें। मॉडल अमेरिका के 2015 स्वास्थ्य सर्वेक्षण पर प्रशिक्षित है। जवाब हमारे सर्वर पर सेव नहीं किए जाते।',
    run: 'शैक्षिक परिणाम देखें', running: 'जानकारी का विश्लेषण हो रहा है…', clear: 'नया आकलन',
    result: 'आपका शैक्षिक परिणाम', modelScore: 'मॉडल स्कोर (स्वास्थ्य जोखिम नहीं)', explanation: 'मॉडल को प्रभावित करने वाले कारक',
    wellnessHeading: 'रोज़ का वेलनेस रिकॉर्ड', wellnessDesc: 'अपनी आदतों का रिकॉर्ड रखें। जानकारी सिर्फ़ इसी ब्राउज़र में सेव होती है।',
    save: 'आज की जानकारी सेव करें', date: 'तारीख', walk: 'गतिविधि (मिनट)', water: 'पानी (गिलास)', sleep: 'नींद (घंटे)', note: 'वैकल्पिक नोट',
    empty: 'अभी कोई रिकॉर्ड नहीं। ऊपर पहला रिकॉर्ड जोड़ें।', delete: 'लोकल रिकॉर्ड मिटाएँ',
    aboutTitle: 'आसान जानकारी, ज़िम्मेदार AI', back: 'मुख्य पृष्ठ पर लौटें',
  }
};
const defaultAnswers = () => ({});
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const safeRead = () => {
  try { const v = JSON.parse(localStorage.getItem(STORE) || '[]'); return Array.isArray(v) ? v : []; }
  catch { return []; }
};
const pretty = (v) => Number(v || 0).toLocaleString('en-IN');

function Icon({ name, size = 20, ...props }) {
  const paths = {
    heart: <><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></>,
    home: <><path d="m3 10 9-7 9 7v11H3z"/><path d="M9 21v-7h6v7"/></>,
    activity: <><path d="M3 12h4l3-8 4 16 3-8h4"/></>,
    leaf: <><path d="M20 4c-9 0-16 4-16 12a5 5 0 0 0 5 5c8 0 12-7 11-17Z"/><path d="M6 18c3-4 6-6 11-9"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/></>,
    arrow: <><path d="M5 12h14m-6-6 6 6-6 6"/></>,
    shield: <><path d="M12 2 4 5v6c0 6 3.5 9 8 11 4.5-2 8-5 8-11V5Z"/><path d="m9 12 2 2 4-4"/></>,
    check: <><path d="m5 12 4 4L19 6"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    chart: <><path d="M4 20V4M4 20h16M8 17v-5m5 5V7m5 10V9"/></>,
    brain: <><path d="M12 7a4 4 0 0 0-7-2 4 4 0 0 0-1 6 4 4 0 0 0 1 7 4 4 0 0 0 7 2Zm0 0a4 4 0 0 1 7-2 4 4 0 0 1 1 6 4 4 0 0 1-1 7 4 4 0 0 1-7 2Z"/><path d="M12 7v13"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name] || paths.heart}</svg>;
}

function Logo(){return <span className="logo"><span className="logo-mark"><Icon name="heart" size={22}/></span><span><strong>SwasthyaSaathi</strong><small>Health & well-being</small></span></span>}
function Note({children}){return <div className="note"><Icon name="info" size={18}/><div>{children}</div></div>}
function PageHead({eyebrow,title,desc}){return <div className="page-head"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{desc}</p></div>}

function App(){
  const [tab,setTab] = useState('home');
  const [lang,setLang] = useState('en');
  const t = THEMES[lang];
  const [metadata,setMetadata] = useState(null);
  const [loadError,setLoadError] = useState('');
  const [answers,setAnswers] = useState({});
  const [result,setResult] = useState(null);
  const [busy,setBusy] = useState(false);
  const [apiError,setApiError] = useState('');
  const [logs,setLogs] = useState(safeRead);
  const [entry,setEntry] = useState({date:today(),walk:30,water:6,sleep:7,note:''});
  const [toast,setToast] = useState('');

  useEffect(()=>{
    let alive = true;
    fetch(`${API}/api/metadata`).then(async r => {if(!r.ok)throw new Error(`HTTP ${r.status}`); return r.json()})
      .then(v=>{if(alive){setMetadata(v); setAnswers(defaultAnswers())}})
      .catch(()=>{if(alive)setLoadError('Backend not connected. Start the FastAPI server on port 8000, then refresh.')});
    return ()=>{alive=false};
  },[]);
  const stats = useMemo(()=>{
    const last7 = logs.filter(l => (new Date(`${today()}T12:00:00`) - new Date(`${l.date}T12:00:00`))/86400000 < 7 && l.date<=today());
    const movement=last7.reduce((s,l)=>s+Number(l.walk||0),0);
    const avgSleep=last7.length ? (last7.reduce((s,l)=>s+Number(l.sleep||0),0)/last7.length).toFixed(1) : '—';
    return {last7,movement,avgSleep};
  },[logs]);
  const navigate = (name) => {setTab(name);window.scrollTo({top:0,behavior:'smooth'})};
  function updateAnswer(name,value){setAnswers(old=>({...old,[name]:value===''?'':Number(value)}));setResult(null)}
  async function assess(ev){
    ev.preventDefault(); setApiError('');setBusy(true);setResult(null);
    try{
      const response = await fetch(`${API}/api/assess`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({answers})});
      const payload = await response.json();
      if(!response.ok) throw new Error(typeof payload.detail==='string'?payload.detail:JSON.stringify(payload.detail));
      setResult(payload);
      setTimeout(()=>document.getElementById('result')?.scrollIntoView({behavior:'smooth',block:'start'}),80);
    }catch(e){setApiError(e.message || 'Assessment service could not be reached.')}finally{setBusy(false)}
  }
  function saveLog(ev){
    ev.preventDefault();
    const next = {date:entry.date,walk:Number(entry.walk),water:Number(entry.water),sleep:Number(entry.sleep),note:entry.note.slice(0,200)};
    if(!next.date || next.walk<0 || next.walk>1440 || next.water<0 || next.water>50 || next.sleep<0 || next.sleep>24){setToast('Please enter valid values.');return;}
    const updated = [...logs.filter(l=>l.date!==next.date),next].sort((a,b)=>b.date.localeCompare(a.date));
    try{localStorage.setItem(STORE,JSON.stringify(updated));setLogs(updated);setToast('Entry saved locally ✓')}
    catch{setToast('Browser storage is unavailable. No entry was saved.')}
  }
  function clearLogs(){if(window.confirm('Delete all wellness entries saved in this browser?')){localStorage.removeItem(STORE);setLogs([]);setToast('Browser entries deleted.')}}
  const nav = [{id:'home',label:t.home,icon:'home'},{id:'assess',label:t.assess,icon:'brain'},{id:'wellness',label:t.wellness,icon:'activity'},{id:'about',label:t.about,icon:'info'}];
  return <div className="layout">
    <aside className="sidebar"><Logo/><p className="nav-caption">WORKSPACE</p><nav aria-label="Primary navigation">{nav.map(n=><button key={n.id} className={`nav-item ${tab===n.id?'active':''}`} onClick={()=>navigate(n.id)}><Icon name={n.icon} size={19}/>{n.label}</button>)}</nav>
      <div className="sidebar-foot"><div className="sdg-mark"><span>3</span><div><strong>GOOD HEALTH</strong><small>AND WELL-BEING</small></div></div><small>Aligned with UN Sustainable Development Goal 3</small></div>
    </aside>
    <div className="page-area"><header className="topbar"><span className="top-status"><span className="status-dot"/>AI-powered wellness awareness</span><div className="top-actions"><span className="privacy-pill"><Icon name="shield" size={15}/> Privacy-first MVP</span><button className="language" onClick={()=>setLang(x=>x==='en'?'hi':'en')}>{lang==='en'?'हिन्दी':'English'}</button></div></header>
    <div className="mobile-nav" aria-label="Mobile navigation">{nav.map(n=><button key={n.id} className={tab===n.id?'selected':''} onClick={()=>navigate(n.id)}><Icon name={n.icon} size={18}/><span>{n.label}</span></button>)}</div>
    <main className="content">
    {loadError && <div className="error-block" role="alert">{loadError}</div>}
    {tab==='home' && <>
      <div className="hero"><div className="hero-content"><span className="hero-tag"><Icon name="leaf" size={15}/> WELLNESS, MADE UNDERSTANDABLE</span><h1>{t.welcome}</h1><p>{t.intro}</p><button className="btn light" onClick={()=>navigate('assess')}>{t.assess} <Icon name="arrow" size={18}/></button></div><div className="hero-art" aria-hidden="true"><div className="pulse-circle"><Icon name="heart" size={64}/><div className="pulse-wave">⌁</div></div><span className="floating-badge badge-one">✦ AI insights</span><span className="floating-badge badge-two">♡ Your journey</span></div></div>
      <div className="section-heading"><div><span className="eyebrow">YOUR SPACE</span><h2>Wellness at a glance</h2></div><span className="subtle">Based on your local entries</span></div>
      <div className="stat-grid"><Stat icon="activity" title="Movement · last 7 days" value={`${pretty(stats.movement)} min`} tone="teal"/><Stat icon="clock" title="Avg. sleep · logged days" value={`${stats.avgSleep}${stats.avgSleep==='—'?'':' h'}`} tone="blue"/><Stat icon="chart" title="Entries · last 7 days" value={String(stats.last7.length)} tone="orange"/></div>
      <div className="two-cols"><article className="panel"><div className="panel-heading"><div><span className="eyebrow">EXPLORE</span><h3>Learn about your health factors</h3></div><span className="panel-icon teal"><Icon name="brain"/></span></div><p>Complete an anonymous questionnaire and explore which features influence the trained model. Your answers are not stored on the server.</p><button className="text-btn" onClick={()=>navigate('assess')}>Start assessment <Icon name="arrow" size={17}/></button></article>
      <article className="panel"><div className="panel-heading"><div><span className="eyebrow">CONSISTENCY</span><h3>Build healthy habits</h3></div><span className="panel-icon orange"><Icon name="leaf"/></span></div><p>Track activity, sleep, and hydration locally. See patterns over the past seven days and take small steps toward personal goals.</p><button className="text-btn" onClick={()=>navigate('wellness')}>Open wellness tracker <Icon name="arrow" size={17}/></button></article></div>
      <Note>{t.disclaimer}</Note>
    </>}
    {tab==='assess' && <>
      <PageHead eyebrow="AI · HEALTH EDUCATION" title={t.formHeading} desc={t.formDesc}/>
      <Note>{t.disclaimer}</Note>
      {!metadata ? <div className="panel">{loadError?'Assessment requires a running backend.':'Loading questionnaire…'}</div> :
      <form onSubmit={assess} className="assessment-form">{['Basics','Medical history','Habits','Well-being'].map((group,gi)=><section className="panel form-group" key={group}><div className="form-group-head"><span className="step">0{gi+1}</span><div><h3>{group}</h3><p>{group==='Medical history'?'Answer only from your known history. Do not guess.':'Select the option that best describes you.'}</p></div></div><div className="form-grid">{metadata.fields.filter(f=>f.group===group).map(f=><label className="field" key={f.name}><span className="field-label">{lang==='hi'?f.hi:f.label}</span>{f.type==='number'?<input type="number" required min={f.min} max={f.max} step={f.name==='BMI'?0.1:1} value={answers[f.name]??''} onChange={e=>updateAnswer(f.name,e.target.value)}/>:<select required value={answers[f.name]??''} onChange={e=>updateAnswer(f.name,e.target.value)}><option value="" disabled>{lang==='hi'?'उत्तर चुनें…':'Select an answer…'}</option>{f.options.map(o=><option key={o.value} value={o.value}>{lang==='hi'?o.hi:o.label}</option>)}</select>}{f.help&&<span className="field-help">{f.help}</span>}</label>)}</div></section>)}<div className="form-bottom"><div className="tiny-lock"><Icon name="shield" size={17}/> No assessment history saved</div><button className="btn primary" disabled={busy || !metadata}>{busy?t.running:t.run}<Icon name="arrow" size={18}/></button></div></form>}
      {apiError&&<div className="error-block" role="alert">{apiError}</div>}
      {result && <AssessmentResults
        result={result}
        lang={lang}
        fields={metadata?.fields || []}
        onReset={() => { setResult(null); setAnswers(defaultAnswers()); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
        onWellness={() => navigate('wellness')}
      />}
    </>}
    {tab==='wellness' && <><PageHead eyebrow="PERSONAL WELLNESS" title={t.wellnessHeading} desc={t.wellnessDesc}/><div className="two-cols wellness-columns"><div className="panel"><h3>Add or update a daily entry</h3><p className="caption">Adding an entry for an existing date replaces it.</p><form className="wellness-form" onSubmit={saveLog}><label className="field"><span className="field-label">{t.date}</span><input type="date" value={entry.date} max={today()} required onChange={e=>setEntry(x=>({...x,date:e.target.value}))}/></label><div className="form-grid"><label className="field"><span className="field-label">{t.walk}</span><input type="number" min="0" max="1440" required value={entry.walk} onChange={e=>setEntry(x=>({...x,walk:e.target.value}))}/></label><label className="field"><span className="field-label">{t.water}</span><input type="number" min="0" max="50" required value={entry.water} onChange={e=>setEntry(x=>({...x,water:e.target.value}))}/></label><label className="field"><span className="field-label">{t.sleep}</span><input type="number" min="0" max="24" step="0.5" required value={entry.sleep} onChange={e=>setEntry(x=>({...x,sleep:e.target.value}))}/></label></div><label className="field"><span className="field-label">{t.note}</span><textarea maxLength={200} rows={3} value={entry.note} onChange={e=>setEntry(x=>({...x,note:e.target.value}))} placeholder="How did you feel today?"/></label><button className="btn primary" type="submit">{t.save}<Icon name="check" size={18}/></button></form></div><div className="panel"><span className="eyebrow">LAST 7 DAYS</span><h3>Movement trends</h3><MovementChart logs={logs}/><div className="summary-line"><span>Total tracked movement</span><strong>{pretty(stats.movement)} min</strong></div><div className="summary-line"><span>Logged days this week</span><strong>{stats.last7.length}</strong></div></div></div><section className="panel entries"><div className="panel-heading"><h3>Recent entries</h3>{logs.length>0&&<button className="danger-link" onClick={clearLogs}>{t.delete}</button>}</div>{!logs.length?<p className="muted">{t.empty}</p>:<div className="entry-list">{logs.slice(0,10).map(l=><div className="entry-row" key={l.date}><span className="entry-icon"><Icon name="activity" size={20}/></span><div className="entry-body"><strong>{new Date(`${l.date}T12:00:00`).toLocaleDateString(lang==='hi'?'hi-IN':'en-IN',{dateStyle:'medium'})}</strong><small>{l.walk} min movement · {l.water} glasses · {l.sleep} h sleep</small>{l.note&&<small>{l.note}</small>}</div><span className="entry-done"><Icon name="check" size={17}/></span></div>)}</div>}</section><Note>This is a self-reported habit journal, not medical monitoring. Information is saved using browser localStorage and can be lost when site data is cleared. Avoid entering sensitive medical details in notes.</Note>{toast&&<div role="status" className="toast">{toast}</div>}</>}
    {tab==='about' && <><PageHead eyebrow="ABOUT THE PROJECT" title={t.aboutTitle} desc="SwasthyaSaathi is an internship MVP aligned with UN Sustainable Development Goal 3: Good Health and Well-Being."/><div className="two-cols"><article className="panel"><span className="panel-icon teal"><Icon name="heart"/></span><h3>Our purpose</h3><p>Make data-driven health information understandable, and offer a private space to track general well-being habits. The project explores AI transparency rather than replacing healthcare professionals.</p></article><article className="panel"><span className="panel-icon blue"><Icon name="shield"/></span><h3>Privacy by design</h3><p>Survey answers are processed temporarily by the API, never saved to a server database. Wellness logs are local to your browser, and you can delete them at any time. This MVP has no accounts.</p></article></div><section className="panel about-panel"><span className="eyebrow">DATA & MODEL</span><h3>How this works</h3><p>Our dataset is the CDC BRFSS 2015 Diabetes Health Indicators binary export. The original survey reflects US respondents. The target identifies self-reported diabetes or prediabetes status; it is not a measured medical diagnosis or a future disease outcome.</p><p>We intentionally exclude sex, income, education, and US-specific healthcare-access variables from the public questionnaire. Our model compares Logistic Regression, Random Forest and XGBoost. Explanations describe model behavior only and do not show causal relationships.</p><a className="external" href="https://archive.ics.uci.edu/dataset/891/cdc+diabetes+health+indicators" target="_blank" rel="noopener noreferrer">Explore the public dataset ↗</a><div className="about-meta"><span>SDG Target 3.4</span><span>Responsible AI</span><span>Education-first</span><span>Hindi + English</span></div></section><Note>{t.disclaimer}</Note></>}
    </main><footer className="footer">© SwasthyaSaathi · Internship learning project <span>Made for health awareness, not diagnosis</span></footer></div>
  </div>
}
function Stat({icon,title,value,tone}){return <div className="stat-card"><span className={`stat-icon ${tone}`}><Icon name={icon} size={22}/></span><span className="stat-title">{title}</span><strong>{value}</strong><span className="stat-foot">Self-reported activity</span></div>}
function MovementChart({logs}){const days=Array.from({length:7},(_,i)=>{const date=new Date();date.setDate(date.getDate()-(6-i));const stamp=date.toLocaleDateString('en-CA');return {label:date.toLocaleDateString('en',{weekday:'short'}),value:Number(logs.find(l=>l.date===stamp)?.walk||0)}});const max=Math.max(30,...days.map(d=>d.value));return <div className="bar-chart">{days.map((d,i)=><div className="bar-column" key={i}><div className="bar-well" title={`${d.label}: ${d.value} minutes`}><div className="bar-fill" style={{height:`${(d.value/max)*100}%`}}/></div><span>{d.label}</span></div>)}</div>}
export default App;
