import React,{useState} from 'react';
import {Alert,KeyboardAvoidingView,Platform,Pressable,ScrollView,StyleSheet,TextInput,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {colors as c,fonts as f,radii as r,space as sp} from './theme';
import {Button,Typography} from './ui';
import {changePassword,resetPassword} from './services/authApi';

export default function ResetPasswordScreen({onClose,email=''}) {
  const [password,setPassword]=useState('');
  const [confirm,setConfirm]=useState('');
  const [busy,setBusy]=useState(false);
  const [done,setDone]=useState(false);
  const valid=password.length>=8&&password===confirm;

  const save=async()=>{
    if(!valid||busy)return;
    setBusy(true);
    try{
      await changePassword(password);
      setDone(true);
    }catch(error){
      Alert.alert('Nie udało się zmienić hasła',error.message||'Spróbuj ponownie.');
    }finally{setBusy(false);}
  };

  const sendReset=async()=>{
    if(!email)return Alert.alert('Brak e-maila','To konto nie ma adresu e-mail do wysłania linku resetującego.');
    setBusy(true);
    try{
      await resetPassword(email);
      Alert.alert('Wysłano link','Sprawdź skrzynkę e-mail.');
    }catch(error){
      Alert.alert('Nie udało się wysłać linku',error.message||'Spróbuj ponownie.');
    }finally{setBusy(false);}
  };

  return <KeyboardAvoidingView style={s.root} behavior={Platform.OS==='ios'?'padding':'height'}>
    <View style={s.header}>
      <Pressable onPress={onClose} style={s.icon}><Ionicons name="close" size={24} color={c.ink}/></Pressable>
      <Typography style={s.headerTitle}>Hasło</Typography>
      <View style={s.icon}/>
    </View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
      <View style={s.lock}><Ionicons name="key-outline" size={30} color={c.pink}/></View>
      <Typography style={s.title}>{done?'Hasło zmienione':'Zmień hasło'}</Typography>
      <Typography style={s.copy}>{done?'Nowe hasło jest już aktywne na Twoim koncie Polki.':'Ustaw nowe hasło do konta. Minimum 8 znaków.'}</Typography>
      {!done&&<>
        <TextInput value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete="new-password" placeholder="Nowe hasło" placeholderTextColor={c.muted} style={s.input}/>
        <TextInput value={confirm} onChangeText={setConfirm} secureTextEntry autoCapitalize="none" autoComplete="new-password" placeholder="Powtórz hasło" placeholderTextColor={c.muted} style={s.input}/>
        <Button title={busy?'Zapisywanie…':'Zmień hasło'} disabled={!valid||busy} onPress={save}/>
        <Pressable disabled={busy} onPress={sendReset} style={s.link}><Typography style={s.linkText}>Wyślij link resetujący na e-mail</Typography></Pressable>
      </>}
      {done&&<Button title="Gotowe" onPress={onClose}/>}
      {!!email&&<Typography style={s.note}>Konto: {email}</Typography>}
    </ScrollView>
  </KeyboardAvoidingView>;
}

const s=StyleSheet.create({
  root:{flex:1,backgroundColor:c.canvas},
  header:{height:60,paddingHorizontal:12,backgroundColor:c.white,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:c.line,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  icon:{width:40,height:40,borderRadius:20,alignItems:'center',justifyContent:'center'},
  headerTitle:{fontFamily:f.bold,fontSize:16,color:c.ink},
  content:{padding:sp.lg},
  lock:{width:62,height:62,borderRadius:20,backgroundColor:c.blush,alignItems:'center',justifyContent:'center',marginTop:22},
  title:{fontFamily:f.bold,fontSize:32,lineHeight:36,letterSpacing:-1.2,color:c.ink,marginTop:20},
  copy:{fontFamily:f.regular,fontSize:15,lineHeight:22,color:c.muted,marginTop:10,marginBottom:22},
  input:{height:54,borderRadius:r.md,borderWidth:1,borderColor:c.line,backgroundColor:c.white,paddingHorizontal:sp.base,fontFamily:f.regular,fontSize:16,color:c.ink,marginBottom:12},
  link:{height:46,alignItems:'center',justifyContent:'center',marginTop:8},
  linkText:{fontFamily:f.semibold,fontSize:13,color:c.pink},
  note:{fontFamily:f.regular,fontSize:11,lineHeight:17,color:c.muted,marginTop:16}
});
