import React,{useState} from 'react';
import {KeyboardAvoidingView,Platform,Pressable,StyleSheet,TextInput,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {colors as c,fonts as f,radii as r,space as sp} from './theme';
import {Button,Typography} from './ui';

export default function ResetPasswordScreen({onClose}){
  const [email,setEmail]=useState('');
  const [sent,setSent]=useState(false);
  const valid=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  return <KeyboardAvoidingView style={s.root} behavior={Platform.OS==='ios'?'padding':undefined}>
    <View style={s.header}><Pressable onPress={onClose} style={s.icon}><Ionicons name="arrow-back" size={24} color={c.ink}/></Pressable><Typography style={s.headerTitle}>Resetuj hasło</Typography><View style={s.icon}/></View>
    <View style={s.content}>
      <View style={s.lock}><Ionicons name="lock-open-outline" size={30} color={c.pink}/></View>
      <Typography style={s.title}>{sent?'Sprawdź skrzynkę':'Nie pamiętasz hasła?'}</Typography>
      <Typography style={s.copy}>{sent?'Ekran jest gotowy pod Supabase Auth. Po podłączeniu backendu link resetujący będzie wysyłany na podany adres.':'Wpisz e-mail przypisany do konta. Produkcyjnie wyślemy na niego bezpieczny link do ustawienia nowego hasła.'}</Typography>
      {!sent&&<TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="twoj@email.pl" placeholderTextColor={c.muted} style={s.input}/>}
      {!sent?<Button title="Wyślij link do resetu" disabled={!valid} onPress={()=>setSent(true)}/>:<Button title="Wróć do ustawień" onPress={onClose}/>}
      <Typography style={s.note}>Ten prototyp nie ma jeszcze podłączonego produkcyjnego konta online, więc na tym etapie żadna wiadomość e-mail nie jest faktycznie wysyłana.</Typography>
    </View>
  </KeyboardAvoidingView>;
}

const s=StyleSheet.create({
  root:{flex:1,backgroundColor:c.canvas},header:{height:60,paddingHorizontal:12,backgroundColor:c.white,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:c.line,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},icon:{width:40,height:40,borderRadius:20,alignItems:'center',justifyContent:'center'},headerTitle:{fontFamily:f.bold,fontSize:16,color:c.ink},content:{padding:sp.lg},lock:{width:62,height:62,borderRadius:20,backgroundColor:c.blush,alignItems:'center',justifyContent:'center',marginTop:22},title:{fontFamily:f.bold,fontSize:32,lineHeight:36,letterSpacing:-1.2,color:c.ink,marginTop:20},copy:{fontFamily:f.regular,fontSize:15,lineHeight:22,color:c.muted,marginTop:10,marginBottom:22},input:{height:54,borderRadius:r.md,borderWidth:1,borderColor:c.line,backgroundColor:c.white,paddingHorizontal:sp.base,fontFamily:f.regular,fontSize:16,color:c.ink,marginBottom:12},note:{fontFamily:f.regular,fontSize:11,lineHeight:17,color:c.muted,marginTop:16}
});