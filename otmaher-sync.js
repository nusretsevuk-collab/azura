(function(){
  'use strict';
  const URL_KEY='otmaher_sync_url_v1';
  const CACHE_KEY='otmaher_sync_cache_v1';
  const AUTO_SYNC_MS=5*60*1000;

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

    if(data.params) STATE.params=Object.assign({},STATE.params||{},data.params);
    if(data.prices){
      const merged=Object.assign({},STATE.prices||{});
      Object.entries(data.prices).forEach(([key,val])=>{
        const k=normalizePriceName(key);
        merged[k]={unit:String(val?.unit||merged[k]?.unit||''),price:n(val?.price)};
      });
      STATE.prices=merged;
    }
    if(data.packBySize && Object.keys(data.packBySize).length) STATE.packBySize=data.packBySize;
    if(Array.isArray(data.recipes) && data.recipes.length){
      // Azura mevcut modelinde ekmek hizli hesap alanindan ekleniyor.
      // OTMAHER recetesindeki ekmegi burada ikinci kez maliyete bindirmiyoruz.
      STATE.recipes=data.recipes.map(r=>Object.assign({},r,{Ekmek:0}));
    }

    if(typeof pushParamsToUI==='function') pushParamsToUI();
    if(typeof renderAllUI==='function') renderAllUI();
    // Eski tarayici alan hafizasi, yeni OTMAHER fiyatlarini geri ezmesin.
    if(typeof storeAllFields==='function') storeAllFields();
    if(typeof saveStateSilently==='function') saveStateSilently();
    localStorage.setItem(CACHE_KEY,JSON.stringify(data));
    if(typeof setPill==='function') setPill('OTMAHER ile senkron ✅','ok');
  }

  function jsonp(baseUrl){
    return new Promise((resolve,reject)=>{
      const cb='__otmaherCb_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      const sep=baseUrl.includes('?')?'&':'?';
      const script=document.createElement('script');
      const timer=setTimeout(()=>cleanup(new Error('OTMAHER zaman aşımı')),15000);
      function cleanup(err,data){
        clearTimeout(timer);
        try{ delete window[cb]; }catch(_e){ window[cb]=undefined; }
        script.remove();
        err?reject(err):resolve(data);
      }
      window[cb]=data=>cleanup(null,data);
      script.onerror=()=>cleanup(new Error('OTMAHER bağlantı hatası'));
      script.src=baseUrl+sep+'action=azura&prefix='+encodeURIComponent(cb)+'&_='+Date.now();
      document.head.appendChild(script);
    });
  }

  async function sync(){
    const url=getUrl();
    if(!url) return false;
    try{
      if(typeof setPill==='function') setPill('OTMAHER verisi alınıyor…','warn');
      const data=await jsonp(url);
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

  function startAutoSync(){
    setTimeout(sync,0);
    setInterval(sync,AUTO_SYNC_MS);
  }

  window.OTMAHER_SYNC={
    sync,
    setUrl(url){ localStorage.setItem(URL_KEY,String(url||'').trim()); return sync(); },
    clearUrl(){ localStorage.removeItem(URL_KEY); },
    getUrl
  };

  // Bu dosya iframe yuklendikten sonra eklenebildigi icin sadece window.load'a guvenme.
  if(document.readyState==='loading'){
    window.addEventListener('load',startAutoSync,{once:true});
  }else{
    startAutoSync();
  }
})();