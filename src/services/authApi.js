import {Linking} from 'react-native';
import {supabase} from '../lib/supabase';

export const AUTH_REDIRECT='polka://auth/callback';
export const PASSWORD_REDIRECT='polka://auth/reset-password';

export async function getSession(){
  const {data,error}=await supabase.auth.getSession();
  if(error)throw error;
  return data.session;
}

export function onAuthStateChange(callback){
  const {data}=supabase.auth.onAuthStateChange((event,session)=>callback?.(event,session));
  return ()=>data.subscription.unsubscribe();
}

export async function signInEmail(email,password){
  const {data,error}=await supabase.auth.signInWithPassword({email:email.trim(),password});
  if(error)throw error;
  return data;
}

export async function signUpEmail(email,password){
  const {data,error}=await supabase.auth.signUp({
    email:email.trim(),
    password,
    options:{emailRedirectTo:AUTH_REDIRECT}
  });
  if(error)throw error;
  return data;
}

export async function verifyEmailOtp(email,token,type='signup'){
  const cleanEmail=email.trim();
  const cleanToken=token.trim();
  try{
    const {data,error}=await supabase.auth.verifyOtp({
      email:cleanEmail,
      token:cleanToken,
      type
    });
    if(error)throw error;
    return data.session;
  }catch(err){
    if(type==='signup'){
      const retry=await supabase.auth.verifyOtp({
        email:cleanEmail,
        token:cleanToken,
        type:'email'
      });
      if(!retry.error&&retry.data?.session)return retry.data.session;
    }
    throw err;
  }
}

export async function resendVerificationOtp(email,type='signup'){
  const {data,error}=await supabase.auth.resend({
    type,
    email:email.trim()
  });
  if(error)throw error;
  return data;
}

export async function signInApple(){
  const {data,error}=await supabase.auth.signInWithOAuth({
    provider:'apple',
    options:{redirectTo:AUTH_REDIRECT,skipBrowserRedirect:true}
  });
  if(error)throw error;
  if(!data?.url)throw new Error('Brak adresu logowania Apple.');
  await Linking.openURL(data.url);
}

export async function signInGoogle(){
  const {data,error}=await supabase.auth.signInWithOAuth({
    provider:'google',
    options:{redirectTo:AUTH_REDIRECT,skipBrowserRedirect:true}
  });
  if(error)throw error;
  if(!data?.url)throw new Error('Brak adresu logowania Google.');
  await Linking.openURL(data.url);
}

function param(url,key){
  try{
    const normalized=url.replace('#','?');
    const query=normalized.split('?')[1]||'';
    return new URLSearchParams(query).get(key);
  }catch{return null;}
}

export async function handleAuthCallback(url){
  if(!url)return null;
  const code=param(url,'code');
  if(code){
    const {data,error}=await supabase.auth.exchangeCodeForSession(code);
    if(error)throw error;
    return data.session;
  }
  const access_token=param(url,'access_token');
  const refresh_token=param(url,'refresh_token');
  if(access_token&&refresh_token){
    const {data,error}=await supabase.auth.setSession({access_token,refresh_token});
    if(error)throw error;
    return data.session;
  }
  return null;
}

export async function signOut(){
  const {error}=await supabase.auth.signOut();
  if(error)throw error;
}

export async function resetPassword(email){
  const {error}=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo:PASSWORD_REDIRECT});
  if(error)throw error;
}

export async function deleteAccount(){
  const {data,error}=await supabase.functions.invoke('delete-account',{body:{confirm:'DELETE_MY_ACCOUNT'}});
  if(error)throw error;
  return data;
}

export async function changePassword(password){
  const {data,error}=await supabase.auth.updateUser({password});
  if(error)throw error;
  return data.user;
}
