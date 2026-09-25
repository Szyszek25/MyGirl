import {Platform} from 'react-native';
import * as Notifications from 'expo-notifications';
import {supabase} from '../lib/supabase';

Notifications.setNotificationHandler({
  handleNotification:async()=>({
    shouldShowBanner:true,
    shouldShowList:true,
    shouldPlaySound:true,
    shouldSetBadge:true
  })
});

async function currentUserId(){
  const {data,error}=await supabase.auth.getUser();
  if(error||!data?.user?.id)throw new Error('Zaloguj się, aby włączyć powiadomienia.');
  return data.user.id;
}

export async function enablePushNotifications(){
  if(Platform.OS==='web')throw new Error('Push w tej wersji działa na iOS i Androidzie.');

  if(Platform.OS==='android'){
    await Notifications.setNotificationChannelAsync('default',{
      name:'Polka',
      importance:Notifications.AndroidImportance.HIGH,
      vibrationPattern:[0,180,90,180],
      lightColor:'#B8325A',
      sound:'default'
    });
  }

  let permission=await Notifications.getPermissionsAsync();
  if(permission.status!=='granted'){
    permission=await Notifications.requestPermissionsAsync({
      ios:{allowAlert:true,allowBadge:true,allowSound:true}
    });
  }
  if(permission.status!=='granted')throw new Error('Powiadomienia nie zostały włączone w systemie.');

  const userId=await currentUserId();
  const tokenResult=await Notifications.getExpoPushTokenAsync();
  const token=tokenResult?.data;
  if(!token)throw new Error('Nie udało się pobrać tokenu push. Dla buildów EAS skonfiguruj projectId.');

  const {error}=await supabase.from('push_tokens').upsert({
    user_id:userId,
    expo_push_token:token,
    platform:Platform.OS,
    active:true,
    device_label:null
  },{onConflict:'user_id,expo_push_token'});
  if(error)throw error;

  return token;
}

export async function disablePushNotifications(){
  if(Platform.OS==='web')return;
  const userId=await currentUserId();
  const {error}=await supabase.from('push_tokens')
    .update({active:false})
    .eq('user_id',userId);
  if(error)throw error;
}

export async function refreshPushToken(){
  if(Platform.OS==='web')return null;
  const permission=await Notifications.getPermissionsAsync();
  if(permission.status!=='granted')return null;
  try{return await enablePushNotifications()}catch{return null}
}

export function listenForNotificationTap(handler){
  if(Platform.OS==='web')return ()=>{};
  const sub=Notifications.addNotificationResponseReceivedListener(response=>{
    handler?.(response.notification.request.content.data||{});
  });
  return ()=>sub.remove();
}

export function listenForPushTokenRoll(){
  if(Platform.OS==='web')return ()=>{};
  const sub=Notifications.addPushTokenListener(()=>{void refreshPushToken()});
  return ()=>sub.remove();
}
