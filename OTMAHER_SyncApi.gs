const OTMAHER_SYNC_SPREADSHEET_ID = '1bcPJFxpg1nPApDAl_Gngp70rGQTOoDnJRtsLLbcYo3s';

/**
 * OTMAHER -> Azura salt-okunur veri servisi.
 * Yalniz PARAMETRELER, BIRIM_FIYATLAR ve RECETELER okunur.
 * Hicbir hucreye yazmaz; Adisyo/API anahtarlarini disari vermez.
 * Erisim anahtari Script Properties > AZURA_SYNC_KEY alanindan okunur.
 */
function doGet(e) {
  try {
    const p = (e && e.parameter) || {};
    const action = String(p.action || 'azura').trim();
    if (action !== 'azura') return otmaherOutput_({ok:false,error:'Gecersiz action'}, e);

    const expectedKey = String(PropertiesService.getScriptProperties().getProperty('AZURA_SYNC_KEY') || '').trim();
    const suppliedKey = String(p.key || '').trim();
    if (!expectedKey) return otmaherOutput_({ok:false,error:'AZURA_SYNC_KEY tanimli degil'}, e);
    if (!suppliedKey || suppliedKey !== expectedKey) return otmaherOutput_({ok:false,error:'Yetkisiz erisim'}, e);

    const ss = SpreadsheetApp.openById(OTMAHER_SYNC_SPREADSHEET_ID);
    const paramsSheet = ss.getSheetByName('PARAMETRELER');
    const pricesSheet = ss.getSheetByName('BIRIM_FIYATLAR');
    const recipesSheet = ss.getSheetByName('RECETELER');
    if (!paramsSheet || !pricesSheet || !recipesSheet) {
      throw new Error('Gerekli OTMAHER sekmelerinden biri bulunamadi.');
    }

    const paramRows = paramsSheet.getRange(1, 1, Math.max(1, paramsSheet.getLastRow()), 2).getValues();
    const paramMap = {};
    paramRows.slice(1).forEach(function(r) {
      if (r[0] !== '') paramMap[String(r[0]).trim()] = r[1];
    });

    const priceRows = pricesSheet.getRange(1, 1, Math.max(1, pricesSheet.getLastRow()), 3).getValues();
    const prices = {};
    priceRows.slice(1).forEach(function(r) {
      if (!r[0]) return;
      const rawName = String(r[0]).trim();
      const name = rawName.replace(/\s*\(kg\)\s*$/i, '').replace('6’lı servis set', "6'lı servis set");
      prices[name] = {unit:String(r[1] || '').trim(), price:Number(r[2]) || 0};
    });

    const lastRecipeRow = recipesSheet.getLastRow();
    const recipeRows = lastRecipeRow > 1
      ? recipesSheet.getRange(2, 1, lastRecipeRow - 1, 19).getValues()
      : [];

    const recipes = recipeRows.filter(function(r) {
      return r[0] && r[1];
    }).map(function(r) {
      return {
        urun:String(r[0]).trim(), boy:String(r[1]).trim(),
        Bonfile:Number(r[2]) || 0, Pirzola:Number(r[3]) || 0,
        Kanat:Number(r[4]) || 0, 'Köfte':Number(r[5]) || 0,
        Marul:Number(r[6]) || 0, Domates:Number(r[7]) || 0,
        'Soğan':Number(r[8]) || 0,
        Ekmek:Number(r[18]) || 0, Ayran:Number(r[17]) || 0
      };
    });

    const packBySize = {};
    recipeRows.filter(function(r) {
      return r[0] && r[1];
    }).forEach(function(r) {
      const boy = String(r[1]).trim();
      if (packBySize[boy]) return;
      packBySize[boy] = {
        'Lavaş':Number(r[9]) || 0,
        'Pilav paketi (120 g)':Number(r[10]) || 0,
        'Sızdırmaz kap':Number(r[11]) || 0,
        'Köpük tabak':Number(r[12]) || 0,
        "6'lı servis set":Number(r[13]) || 0,
        'Poşet':Number(r[14]) || 0
      };
    });

    const out = {
      ok:true,
      source:'OTMAHER - Kopya - Teslimat Senaryosu',
      generatedAt:new Date().toISOString(),
      params:{
        c:Number(paramMap['Komisyon % (c)']) || 0,
        v:Number(paramMap['Satış KDV % (v)']) || 0,
        cv:Number(paramMap['Komisyon KDV %']) || 0,
        katsayi:Number(paramMap['Net gelir katsayısı']) || 0
      },
      prices:prices,
      packBySize:packBySize,
      recipes:recipes
    };
    return otmaherOutput_(out, e);
  } catch (err) {
    return otmaherOutput_({ok:false,error:String(err && err.message || err)}, e);
  }
}

/**
 * Normal JSON veya tarayici icin JSONP dondurur.
 * JSONP kullanimi GitHub Pages -> Apps Script CORS sorununu engeller.
 */
function otmaherOutput_(obj, e) {
  const p = (e && e.parameter) || {};
  const prefix = String(p.prefix || '').trim();
  const json = JSON.stringify(obj);
  if (prefix && /^[A-Za-z_$][0-9A-Za-z_$]*$/.test(prefix)) {
    return ContentService.createTextOutput(prefix + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}
