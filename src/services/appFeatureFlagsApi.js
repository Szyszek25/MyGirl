import AsyncStorage from '@react-native-async-storage/async-storage';
import {supabase} from '../lib/supabase';

const CACHE_KEY='polka_app_feature_flags_v1';
const DEFAULT_FLAGS={
  auth_google:false,
  auth_apple:false
};

export async function loadAppFeatureFlags(){
  let cached=DEFAULT_FLAGS;
  try{
    const raw=await AsyncStorage.getItem(CACHE_KEY);
    if(raw)cached={...DEFAULT_FLAGS,...JSON.parse(raw)};
  }catch{}

  try{
    const {data,error}=await supabase.from('app_feature_flags').select('key,enabled');
    if(error)throw error;
    const remote={...DEFAULT_FLAGS};
    (data||[]).forEach(row=>{ if(row?.key in remote)remote[row.key]=!!row.enabled; });
    await AsyncStorage.setItem(CACHE_KEY,JSON.stringify(remote)).catch(()=>{});
    return remote;
  }catch{
    return cached;
  }
}

export {DEFAULT_FLAGS as defaultAppFeatureFlags};
