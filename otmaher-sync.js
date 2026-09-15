(function(){
  'use strict';
  const URL_KEY='otmaher_sync_url_v1';
  const CACHE_KEY='otmaher_sync_cache_v1';

  function n(v){ const x=parseFloat(String(v??'').replace(',','.')); return Number.isFinite(x)?x:0; }
  function normalizePriceName(name){
    return String(name||'').replace(/\s*\(kg\)\s*$/i,'').replace('6’lı servis set',"6'lı servis set").trim();
  }
  function getUrl(){
    const q=new URLSearchParams(location.search).get('otmaherSync');
    if(q){ localStorage.setItem(URL_KEY,q); return q; }
    return localStorage.getItem(URL_KEY)||'';
  }
  function applyData(data){
    if(!data||data.ok!==true) throw new Error(data?.error||'OTMAHER verisi geçersiz');
    if(typeof STATE==='undefined') throw new Error('Azura STATE bulunamadı');

    if(data.params){
      STATE.params=Object.assign({},STATE.params||{},data.params);
    }
    if(data.prices){
      const merged=Object.assign({},STATE.prices||{});
      Object.entries(data.prices).forEach(([key,val])=>{
        const k=normalizePriceName(key);
        merged[k]={unit:String(val?.unit||merged[k]?.unit||''),price:n(val?.price)};
      });
      STATE.prices=merged;
    }
    if(data.packBySize && Object.keys(data.packBySize).length){
      STATE.packBySize=data.packBySize;
    }
    if(Array.isArray(data.recipes) && data.recipes.length){
      STATE.recipes=data.recipes;
    }

    if(typeof pushParamsToUI==='function') pushParamsToUI();
    if(typeof renderAllUI==='function') renderAllUI();
    if(typeof saveStateSilently==='function') saveStateSilently();
    localStorage.setItem(CACHE_KEY,JSON.stringify(data));
    if(typeof setPill==='function') setPill('OTMAHER ile senkron ✅','ok');
  }
  async function sync(){
    const url=getUrl();
    if(!url) return false;
    try{
      if(typeof setPill==='function') setPill('OTMAHER verisi alınıyor…','warn');
      const sep=url.includes('?')?'&':'?';
      const res=await fetch(url+sep+'action=azura&_='+Date.now(),{method:'GET',cache:'no-store'});
      if(!res.ok) throw new Error('HTTP '+res.status);
      const data=await res.json();
      applyData(data);
      return true;
    }catch(err){
      console.error('OTMAHER sync',err);
      try{
        const cached=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');
        if(cached?.ok){
          applyData(cached);
          if(typeof setPill==='function') setPill('OTMAHER çevrimdışı yedeği','warn');
          return false;
        }
      }catch(_e){}
      if(typeof setPill==='function') setPill('OTMAHER senkron hatası','dng');
      return false;
    }
  }

  window.OTMAHER_SYNC={
    sync,
    setUrl(url){ localStorage.setItem(URL_KEY,String(url||'').trim()); return sync(); },
    clearUrl(){ localStorage.removeItem(URL_KEY); },
    getUrl
  };
  window.addEventListener('load',()=>setTimeout(sync,0));
})();
