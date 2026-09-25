// Device-local prototype only. Never store tokens, credentials or secret keys here.
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Platform} from 'react-native';
import {File,Paths} from 'expo-file-system';
import {clearCached} from './cache';

const KEY='mygirl:local-profile:v1';
const AVATAR='mygirl-avatar.jpg';
const TEMP='mygirl-avatar-next.jpg';
const isWeb = Platform.OS === 'web';
const avatar=()=>{
  if (isWeb || !Paths || !Paths.document) return null;
  try { return new File(Paths.document, AVATAR); } catch { return null; }
};

export async function loadLocalProfile(){
  const raw=await AsyncStorage.getItem(KEY);
  if(!raw)return null;
  try{
    const profile=JSON.parse(raw);
    if(!profile||typeof profile.name!=='string'||!Array.isArray(profile.interests))return null;
    if (isWeb) return profile;
    const file=avatar();
    if (!file) return profile;
    const hasPhoto=profile.hasPhoto===true||(profile.hasPhoto===undefined&&file.exists);
    return {...profile,photo:hasPhoto&&file.exists?file.uri:null};
  }catch{return null;}
}

export async function saveLocalProfile(profile){
  if(!profile||typeof profile.name!=='string'||profile.name.trim().length<2)
    throw new Error('Imię musi mieć co najmniej 2 znaki.');
  if (isWeb) {
    const clean={...profile,name:profile.name.trim()};
    await AsyncStorage.setItem(KEY,JSON.stringify(clean));
    return clean;
  }
  const file=avatar();
  if (!file) {
    const clean={...profile,name:profile.name.trim()};
    await AsyncStorage.setItem(KEY,JSON.stringify(clean));
    return clean;
  }
  const photo=profile.photo||null;
  const replacing=!!photo&&photo!==file.uri;
  const temporary=Paths?.document ? new File(Paths.document,TEMP) : null;
  if(replacing && temporary){
    const source=new File(photo);
    if(!source.exists)throw new Error('Wybrane zdjęcie nie istnieje. Wybierz je ponownie.');
    if(temporary.exists)temporary.delete();
    await source.copy(temporary);
  }
  try{
    if(replacing && temporary){
      if(file.exists)file.delete();
      await temporary.move(file);
    }
    const clean={...profile,name:profile.name.trim(),photo:null,hasPhoto:!!photo};
    await AsyncStorage.setItem(KEY,JSON.stringify(clean));
    if(!photo&&file.exists)file.delete();
    return {...clean,photo:photo?file.uri:null};
  }finally{
    if(temporary && temporary.exists)temporary.delete();
  }
}

export async function deleteLocalProfile(){
  await AsyncStorage.removeItem(KEY);
  await clearCached('partner-draft');
  if (isWeb || !Paths || !Paths.document) return;
  for(const name of [AVATAR,TEMP]){
    try {
      const file=new File(Paths.document,name);
      if(file.exists)file.delete();
    } catch {}
  }
}
