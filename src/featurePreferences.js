import AsyncStorage from '@react-native-async-storage/async-storage';

export const FEATURE_PREFS_KEY='polka_feature_preferences_v1';

export const defaultFeaturePreferences={
  polkaCare:true,
  cycleMeetingContext:true,
  zodiacMeetingContext:true,
  zodiacSign:'Lew',
  supportChat:true
};

export async function loadFeaturePreferences(){
  try{
    const raw=await AsyncStorage.getItem(FEATURE_PREFS_KEY);
    if(!raw)return defaultFeaturePreferences;
    return {...defaultFeaturePreferences,...JSON.parse(raw)};
  }catch{
    return defaultFeaturePreferences;
  }
}

export async function saveFeaturePreferences(next){
  const value={...defaultFeaturePreferences,...next};
  await AsyncStorage.setItem(FEATURE_PREFS_KEY,JSON.stringify(value));
  return value;
}
