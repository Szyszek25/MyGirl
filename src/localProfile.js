// Device-local prototype storage. NOT authentication or Supabase; do not store secrets here.
import AsyncStorage from '@react-native-async-storage/async-storage';
import {File,Paths} from 'expo-file-system';
import {clearCached} from './cache';

const KEY='mygirl:local-profile:v1';
const AVATAR='mygirl-avatar.jpg';

export async function loadLocalProfile(){
  const raw=await AsyncStorage.getItem(KEY);
  if(!raw)return null;
  try{
    const parsed=JSON.parse(raw);
    if(!parsed||typeof parsed.name!=='string'||!Array.isArray(parsed.interests))return null;
    const savedPhoto=new File(Paths.document,AVATAR);
    return {...parsed,photo:savedPhoto.exists?savedPhoto.uri:null};
  }catch{return null;}
}

export async function saveLocalProfile(profile){
  const photoUri=profile.photo;
  let persistedPhoto=null;
  if(photoUri){
    const source=new File(photoUri);
    if(!source.exists)throw new Error('Nie udało się odczytać wybranego zdjęcia. Wybierz je ponownie.');
    const destination=new File(Paths.document,AVATAR);
    const temporary=new File(Paths.document,'mygirl-avatar-next.jpg');
    if(temporary.exists)temporary.delete();
    await source.copy(temporary);
    if(destination.exists)destination.delete();
    await temporary.move(destination);
    persistedPhoto=destination.uri;
  }
  const clean={...profile,photo:null}; // Image is a separate file, never a base64 value in AsyncStorage.
  await AsyncStorage.setItem(KEY,JSON.stringify(clean));
  return {...clean,photo:persistedPhoto};
}

export async function deleteLocalProfile(){
  await AsyncStorage.removeItem(KEY);
  for(const name of [AVATAR,'mygirl-avatar-next.jpg']){
    const file=new File(Paths.document,name);
    if(file.exists)file.delete();
  }
  // Erase organization drafts together with the local user profile.
  await clearCached('partner-draft');
}
