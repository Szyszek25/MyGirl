import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache public UI drafts/preferences ONLY. No auth tokens, private messages, images or PII.
const PREFIX='mygirl:public-cache:v1:';
const MAX_BYTES=16_000;
const validKey=key=>typeof key==='string'&&/^[a-zA-Z0-9_-]{1,64}$/.test(key);
const storageKey=key=>{if(!validKey(key))throw new Error('Nieprawidłowy klucz pamięci.');return PREFIX+key;};

export async function readCached(key,now=Date.now()){
  const id=storageKey(key);
  const raw=await AsyncStorage.getItem(id);
  if(!raw)return null;
  try{
    const entry=JSON.parse(raw);
    if(entry?.version!==1||!Number.isFinite(entry.expiresAt)||entry.expiresAt<=now){
      await AsyncStorage.removeItem(id);
      return null;
    }
    return entry.value??null;
  }catch{
    await AsyncStorage.removeItem(id);
    return null;
  }
}

export async function writeCached(key,value,ttlMs,now=Date.now()){
  const id=storageKey(key);
  if(!Number.isFinite(ttlMs)||ttlMs<=0||ttlMs>30*24*60*60*1000)throw new Error('Nieprawidłowy czas ważności.');
  const raw=JSON.stringify({version:1,expiresAt:now+ttlMs,value});
  if(raw.length>MAX_BYTES)throw new Error('Zbyt duży wpis pamięci.');
  await AsyncStorage.setItem(id,raw);
}

export async function clearCached(key){await AsyncStorage.removeItem(storageKey(key));}
