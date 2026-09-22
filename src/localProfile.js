// Device-local prototype only. Never store tokens, credentials or secret keys here.
import AsyncStorage from '@react-native-async-storage/async-storage';
import {File,Paths} from 'expo-file-system';
import {clearCached} from './cache';

const KEY='mygirl:local-profile:v1';
const AVATAR='mygirl-avatar.jpg';
const TEMP='mygirl-avatar-next.jpg';
const avatar=()=>new File(Paths.document,AVATAR);

export async function loadLocalProfile(){
  const raw=await AsyncStorage.getItem(KEY);
  if(!raw)return null;
  try{
    const profile=JSON.parse(raw);
    if(!profile||typeof profile.name!=='string'||!Array.isArray(profile.interests))return null;
    const file=avatar();
    // An explicit removal must win over a leftover photo file. Old saved profiles
    // did not have this flag; retain compatibility with their stored photo.
    const hasPhoto=profile.hasPhoto===true||(profile.hasPhoto===undefined&&file.exists);
    return {...profile,photo:hasPhoto&&file.exists?file.uri:null};
  }catch{return null;}
}

export async function saveLocalProfile(profile){
  if(!profile||typeof profile.name!=='string'||profile.name.trim().length<2)
    throw new Error('Imię musi mieć co najmniej 2 znaki.');
  const file=avatar();
  const photo=profile.photo||null;
  const replacing=!!photo&&photo!==file.uri;
  const temporary=new File(Paths.document,TEMP);
  if(replacing){
    const source=new File(photo);
    if(!source.exists)throw new Error('Wybrane zdjęcie nie istnieje. Wybierz je ponownie.');
    if(temporary.exists)temporary.delete();
    await source.copy(temporary);
  }
  try{
    // Never copy a saved avatar onto itself when editing only text.
    if(replacing){
      if(file.exists)file.delete();
      await temporary.move(file);
    }
    const clean={...profile,name:profile.name.trim(),photo:null,hasPhoto:!!photo};
    await AsyncStorage.setItem(KEY,JSON.stringify(clean));
    if(!photo&&file.exists)file.delete();
    return {...clean,photo:photo?file.uri:null};
  }finally{
    if(temporary.exists)temporary.delete();
  }
}

export async function deleteLocalProfile(){
  await AsyncStorage.removeItem(KEY);
  // A new user on the same device must never inherit an organization's draft.
  await clearCached('partner-draft');
  for(const name of [AVATAR,TEMP]){
    const file=new File(Paths.document,name);
    if(file.exists)file.delete();
  }
}
