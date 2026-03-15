import { useState, useMemo, useRef } from 'react';
import { consolidar, fmt } from '../utils/index';
import { usePhotos, resizeAndStore, getPrizeData, savePrizeData } from '../hooks/usePhotos';

// ---------- helpers ----------
function buildRanking(type, corretores) {
  if (type === 'corretores') {
    return [...corretores].sort((a,b)=>b.preVendas-a.preVendas)
      .map((c,i)=>({ nome:c.corretor, valor:c.preVendas, sub:c.gerente, pos:i+1 }));
  }
  const map = {};
  corretores.forEach(c => {
    const k = type==='gerentes' ? c.gerente : c.superintendente;
    if (!map[k]) map[k]=[];
    map[k].push(c);
  });
  return Object.entries(map)
    .map(([nome,lista])=>{ const cons=consolidar(lista); return {nome, valor:cons.preVendas, sub:`${cons.ativos} ativos`, pos:0}; })
    .sort((a,b)=>b.valor-a.valor)
    .map((it,i)=>({...it, pos:i+1}));
}

// ---------- PersonAvatar ----------
function PersonAvatar({ nome, size, editMode, getPhoto, savePhoto }) {
  const inputRef = useRef();
  const photo = getPhoto(nome);
  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const dataUrl = await resizeAndStore(file, 220);
    savePhoto(nome, dataUrl);
    e.target.value = '';
  }
  return (
    <div className={`person-avatar ${editMode?'editable':''}`}
      style={{width:size,height:size}}
      onClick={()=>editMode&&inputRef.current?.click()}
      title={editMode?`Clique para foto de ${nome}`:nome}>
      {photo
        ? <img src={photo} alt={nome} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}}/>
        : <div className="person-initials">{nome?.split(' ').map(w=>w[0]).slice(0,2).join('')||'?'}</div>}
      {editMode && <div className="person-edit-btn">📷</div>}
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{display:'none'}}/>
    </div>
  );
}

// ---------- PhotoMgrItem ----------
function PhotoMgrItem({ nome, getPhoto, savePhoto }) {
  const inputRef = useRef();
  const photo = getPhoto(nome);
  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const dataUrl = await resizeAndStore(file, 220);
    savePhoto(nome, dataUrl);
    e.target.value = '';
  }
  return (
    <div className="photo-mgr-item">
      <div className="photo-mgr-avatar" onClick={()=>inputRef.current?.click()}>
        {photo
          ? <img src={photo} alt={nome} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}}/>
          : <span className="photo-mgr-initial">{nome.slice(0,1)}</span>}
        <div className="photo-mgr-overlay">📷</div>
      </div>
      <div className="photo-mgr-nome" translate="no">{nome}</div>
      {photo && (
        <button className="photo-mgr-remove" onClick={()=>savePhoto(nome,null)} title="Remover">✕</button>
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{display:'none'}}/>
    </div>
  );
}

// ---------- PrizeCard ----------
function PrizeCard({ pos, prize, editMode, onPrizeChange }) {
  const imgRef = useRef();
  async function handleImg(e) {
    const file = e.target.files[0];
    if (!file) return;
    const dataUrl = await resizeAndStore(file, 280);
    onPrizeChange(pos, {...prize, img:dataUrl, enabled:true});
    e.target.value='';
  }
  if (editMode) return (
    <div className="prize-editor">
      <label className="prize-toggle-label">
        <input type="checkbox" checked={!!prize.enabled}
          onChange={e=>onPrizeChange(pos,{...prize,enabled:e.target.checked})}/>
        &nbsp;Premiação {pos}º
      </label>
      {prize.enabled && (<>
        <div className="prize-img-btn" onClick={()=>imgRef.current?.click()}>
          {prize.img ? <img src={prize.img} alt="prêmio" className="prize-preview-img"/> : <span>📦 Imagem</span>}
        </div>
        <input ref={imgRef} type="file" accept="image/*" onChange={handleImg} style={{display:'none'}}/>
        <input className="prize-text-input" placeholder="Nome do prêmio..."
          value={prize.txt||''} onChange={e=>onPrizeChange(pos,{...prize,txt:e.target.value})}/>
      </>)}
    </div>
  );
  if (!prize.enabled) return null;
  return (
    <div className="prize-display">
      {prize.img && <img src={prize.img} alt="prêmio" className="prize-img"/>}
      {prize.txt && <div className="prize-label">{prize.txt}</div>}
    </div>
  );
}

// ---------- PodiumSlot ----------
const SLOT_COLORS = {
  1: { border:'#f5c542', glow:'rgba(245,197,66,.6)', platform:'linear-gradient(180deg,#c8a200 0%,#7a5e00 100%)', medal:'/logo-ouro.jpeg' },
  2: { border:'#00cfff', glow:'rgba(0,180,255,.5)', platform:'linear-gradient(180deg,#00a8cc 0%,#005a78 100%)', medal:'/logo-prata-bg.jpg' },
  3: { border:'#ff6644', glow:'rgba(255,90,50,.5)', platform:'linear-gradient(180deg,#cc4422 0%,#7a2210 100%)', medal:'/logo-bronze.jpeg' },
};
const HEIGHTS = { 1:120, 2:80, 3:60 };
const AVATAR_SIZES = { 1:110, 2:90, 3:80 };
const FLOAT_DELAYS = { 1:'0s', 2:'0.4s', 3:'0.8s' };

function PodiumSlot({ item, pos, editMode, getPhoto, savePhoto, prize, onPrizeChange }) {
  const c = SLOT_COLORS[pos];
  return (
    <div className={`podium-slot podium-pos-${pos}`}>
      {/* Prize */}
      <PrizeCard pos={pos} prize={prize} editMode={editMode} onPrizeChange={onPrizeChange}/>
      {/* Floating person */}
      <div className="podium-float" style={{animationDelay: FLOAT_DELAYS[pos]}}>
        <div className="podium-avatar-ring" style={{
          boxShadow:`0 0 0 3px ${c.border}, 0 0 25px ${c.glow}, 0 0 50px ${c.glow}`}}>
          <PersonAvatar nome={item?.nome||'?'} size={AVATAR_SIZES[pos]}
            editMode={editMode} getPhoto={getPhoto} savePhoto={savePhoto}/>
        </div>
        <div className="podium-name" style={{color:c.border}} translate="no">{item?.nome||'—'}</div>
        <div className="podium-score">{item?.valor??0}<span className="podium-score-sub"> PV</span></div>
      </div>
      {/* Platform */}
      <div className="podium-platform" style={{
        height:HEIGHTS[pos], background:c.platform,
        border:`2px solid ${c.border}`,
        boxShadow:`0 0 24px ${c.glow}, inset 0 0 12px rgba(255,255,255,.08)`}}>
        <img src={c.medal} alt="" className="platform-medal"/>
        <div className="platform-num">{pos===1?'🥇':pos===2?'🥈':'🥉'}</div>
      </div>
    </div>
  );
}

// ---------- Main Component ----------
export function P6_Ranking({ data }) {
  const { corretores } = data;
  const { getPhoto, savePhoto } = usePhotos();
  const [category, setCategory] = useState('corretores');
  const [editMode, setEditMode] = useState(false);
  const [showPhotoMgr, setShowPhotoMgr] = useState(false);
  const [prizes, setPrizes] = useState(()=>({ 1:getPrizeData(1), 2:getPrizeData(2), 3:getPrizeData(3) }));

  function handlePrizeChange(pos, d) {
    savePrizeData(pos, d);
    setPrizes(p => ({ ...p, [pos]: d }));
  }

  const ranking = useMemo(()=>buildRanking(category, corretores), [category, corretores]);
  // Podium visual order: 2nd (left) | 1st (center) | 3rd (right)
  const slotOrder = [
    { item: ranking[1], pos: 2 },
    { item: ranking[0], pos: 1 },
    { item: ranking[2], pos: 3 },
  ];
  const rest = ranking.slice(3, 8);
  const periodo = corretores[0] ? `${corretores[0].dataInicio} a ${corretores[0].dataFim}` : '';
  const allNames = useMemo(() => {
    const corretoresNomes = [...new Set(corretores.map(c => c.corretor))].filter(Boolean).sort();
    const gerentesNomes   = [...new Set(corretores.map(c => c.gerente))].filter(Boolean).sort();
    const supersNomes     = [...new Set(corretores.map(c => c.superintendente))].filter(Boolean).sort();
    return { corretores: corretoresNomes, gerentes: gerentesNomes, supers: supersNomes };
  }, [corretores]);

  return (
    <div className="page ranking-page">
      {/* Header */}
      <div className="rank-top-bar">
        <img src="/trophy.png" className="rank-trophy-sm" alt=""/>
        <div className="rank-header-text">
          <div className="rank-title">PÓDIO DE EXCELÊNCIA</div>
          <div className="rank-sub">Equipe GARRA · Vendas Imobiliárias {periodo && `· ${periodo}`}</div>
        </div>
        <img src="/trophy.png" className="rank-trophy-sm rank-flip" alt=""/>
      </div>

      {/* Controls */}
      <div className="rank-controls">
        <div className="rank-cats">
          {[{id:'corretores',l:'👤 Corretores'},{id:'gerentes',l:'👥 Gerentes'},{id:'supers',l:'🏢 Supers'}].map(cat=>(
            <button key={cat.id} className={`btn-cat ${category===cat.id?'active':''}`}
              onClick={()=>setCategory(cat.id)}>{cat.l}</button>
          ))}
        </div>
        <div className="rank-actions">
          <button className={`btn-cat ${editMode?'active':''}`} onClick={()=>setEditMode(e=>!e)}>
            {editMode?'✅ Salvar':'⚙️ Editar'}
          </button>
          <button className="btn-cat" onClick={()=>setShowPhotoMgr(s=>!s)}>
            📷 Fotos
          </button>
        </div>
      </div>

      {editMode && (
        <div className="edit-hint">
          ✏️ Modo edição — clique nos avatares para adicionar fotos · Configure prêmios por posição
        </div>
      )}

      {/* ===== PODIUM ARENA ===== */}
      <div className="podium-arena">
        {/* Stars */}
        <div className="podium-stars"/>
        {/* Neon rings */}
        <div className="neon-ring nr-1"/><div className="neon-ring nr-2"/><div className="neon-ring nr-3"/>
        {/* Stage */}
        <div className="podium-stage">
          {slotOrder.map(({item,pos})=>(
            <PodiumSlot key={pos} item={item} pos={pos}
              editMode={editMode} getPhoto={getPhoto} savePhoto={savePhoto}
              prize={prizes[pos]} onPrizeChange={handlePrizeChange}/>
          ))}
        </div>
        {/* Base plate */}
        <div className="podium-base-plate">
          PÓDIO DE EXCELÊNCIA — EQUIPE GARRA — VENDAS IMOBILIÁRIAS
        </div>
      </div>

      {/* Rest of ranking */}
      {rest.length>0 && (
        <div className="rank-rest-card">
          <div className="rank-rest-title">📋 Classificação Geral</div>
          {rest.map(item=>(
            <div key={item.nome} className="rank-rest-row">
              <span className="rank-rest-pos">{item.pos}º</span>
              <div className="rr-avatar">
                {getPhoto(item.nome)
                  ? <img src={getPhoto(item.nome)} alt="" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'50%'}}/>
                  : <span>{item.nome.slice(0,1)}</span>}
              </div>
              <span className="rank-rest-nome" translate="no">{item.nome}</span>
              <span className="rank-rest-sub">{item.sub}</span>
              <span className="rank-rest-val">{item.valor} PV</span>
            </div>
          ))}
        </div>
      )}

      {/* Photo Manager */}
      {showPhotoMgr && (
        <div className="photo-mgr">
          <div className="photo-mgr-title">📷 Gerenciar Fotos dos Colaboradores</div>
          <div className="photo-mgr-hint">Clique em qualquer avatar para fazer upload · Fotos salvas no navegador</div>

          <div className="photo-mgr-sections">
            {[
              { label: '🏢 Superintendentes', names: allNames.supers },
              { label: '👥 Gerentes',          names: allNames.gerentes },
              { label: '👤 Corretores',        names: allNames.corretores },
            ].map(sec => (
              <div key={sec.label} className="photo-mgr-section">
                <div className="photo-mgr-section-title">{sec.label}</div>
                <div className="photo-mgr-grid">
                  {sec.names.map(nome => (
                    <PhotoMgrItem key={nome} nome={nome} getPhoto={getPhoto} savePhoto={savePhoto}/>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
