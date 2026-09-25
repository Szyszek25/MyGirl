import {Platform} from 'react-native';
import Constants, {ExecutionEnvironment} from 'expo-constants';
import {supabase} from '../lib/supabase';

const isExpoGo = Constants.appOwnership === 'expo' || Constants.executionEnvironment === ExecutionEnvironment?.StoreClient;

let Notifications = null;
if (!isExpoGo && Platform.OS !== 'web') {
  try {
    Notifications = require('expo-notifications');
    Notifications?.setNotificationHandler?.({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true
      })
    });
  } catch {
    Notifications = null;
  }
}

async function currentUserId() {
  const {data, error} = await supabase.auth.getUser();
  if (error || !data?.user?.id) throw new Error('Zaloguj się, aby włączyć powiadomienia.');
  return data.user.id;
}

export async function enablePushNotifications() {
  if (Platform.OS === 'web') throw new Error('Push w tej wersji działa na iOS i Androidzie.');
  if (isExpoGo || !Notifications) {
    throw new Error('Powiadomienia push w Expo Go nie są już wspierane przez Expo. Działają w gotowym buildzie (EAS).');
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Polka',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 180, 90, 180],
      lightColor: '#CE0459',
      sound: 'default'
    });
  }

  let permission = await Notifications.getPermissionsAsync();
  if (permission.status !== 'granted') {
    permission = await Notifications.requestPermissionsAsync({
      ios: {allowAlert: true, allowBadge: true, allowSound: true}
    });
  }
  if (permission.status !== 'granted') throw new Error('Powiadomienia nie zostały włączone w systemie.');

  const userId = await currentUserId();
  const tokenResult = await Notifications.getExpoPushTokenAsync();
  const token = tokenResult?.data;
  if (!token) throw new Error('Nie udało się pobrać tokenu push.');

  const {error} = await supabase.from('push_tokens').upsert({
    user_id: userId,
    expo_push_token: token,
    platform: Platform.OS,
    active: true,
    device_label: null
  }, {onConflict: 'user_id,expo_push_token'});
  if (error) throw error;

  return token;
}

export async function disablePushNotifications() {
  if (Platform.OS === 'web' || isExpoGo || !Notifications) return;
  const userId = await currentUserId();
  const {error} = await supabase.from('push_tokens')
    .update({active: false})
    .eq('user_id', userId);
  if (error) throw error;
}

export async function refreshPushToken() {
  if (Platform.OS === 'web' || isExpoGo || !Notifications) return null;
  const permission = await Notifications.getPermissionsAsync();
  if (permission.status !== 'granted') return null;
  try { return await enablePushNotifications(); } catch { return null; }
}

export function listenForNotificationTap(handler) {
  if (Platform.OS === 'web' || isExpoGo || !Notifications) return () => {};
  try {
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      handler?.(response.notification.request.content.data || {});
    });
    return () => sub.remove();
  } catch {
    return () => {};
  }
}

export function listenForPushTokenRoll() {
  if (Platform.OS === 'web' || isExpoGo || !Notifications) return () => {};
  try {
    const sub = Notifications.addPushTokenListener(() => { void refreshPushToken(); });
    return () => sub.remove();
  } catch {
    return () => {};
  }
}
