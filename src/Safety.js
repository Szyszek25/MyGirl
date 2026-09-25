import React,{useState} from 'react';
import {Alert,KeyboardAvoidingView,Platform,Pressable,ScrollView,StyleSheet,TextInput,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {colors as c,space as sp,radii as r,fonts as f} from './theme';
import {people} from './data';
import {Button,Chip,PageHeading,Surface,Typography} from './ui';

const REASONS=[['harassment','Nękanie'],['hate','Mowa nienawiści'],['sexual','Nieodpowiednie treści'],['spam','Spam'],['impersonation','Podszywanie się'],['other','Inny powód']];

export function ReportForm({target,onCancel,onSave,online=false}){
  const [reason,setReason]=useState(null);
  const [details,setDetails]=useState('');
  return <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.page}>
      <Pressable onPress={onCancel} accessibilityRole="button" accessibilityLabel="Wróć"><Ionicons name="arrow-back" size={26} color={c.pink}/></Pressable>
      <PageHeading kicker="TWOJE BEZPIECZEŃSTWO" title="Zgłoś problem."/>
      <Surface><Typography variant="subtitle">{target.label}</Typography><Typography style={s.note}>{online?'Wybierz powód. Zgłoszenie zostanie zapisane w prywatnej kolejce Polki.':'Wybierz powód. W trybie lokalnym zgłoszenie pozostaje tylko na tym urządzeniu.'}</Typography></Surface>
      <View style={s.wrap}>{REASONS.map(([id,label])=><Chip key={id} label={label} selected={reason===id} onPress={()=>setReason(id)}/>)}</View>
      <Typography variant="subtitle" style={{marginTop:sp.md,marginBottom:sp.sm}}>Dodatkowe informacje</Typography>
      <TextInput multiline maxLength={1000} value={details} onChangeText={setDetails} accessibilityLabel="Opis zgłoszenia" placeholder="Co się wydarzyło? (opcjonalnie)" placeholderTextColor={c.muted} style={s.input}/>
      <Button disabled={!reason} title={online?'Wyślij zgłoszenie':'Zapisz lokalnie'} onPress={()=>onSave({target,reason,details:details.trim()})}/>
      <Typography variant="caption" style={s.note}>{online?'Zgłoszenia są prywatne i nie są widoczne dla innych użytkowniczek.':'Po zalogowaniu zgłoszenia mogą być wysyłane do backendu Polki.'}</Typography>
    </ScrollView>
  </KeyboardAvoidingView>;
}

export function SafetyCenter({blockedIds,onUnblock,reports,onClose,onReset,online=false}){
  const blockedPeople=people.filter(p=>blockedIds.includes(p.id));
  const confirmReset=()=>Alert.alert('Usunąć lokalny profil?','Profil, zdjęcie i odpowiedzi znikną z pamięci tej aplikacji. Wpisy, blokady oraz zgłoszenia demonstracyjne zostaną wyczyszczone. Nie masz jeszcze konta Supabase do usunięcia.',[
    {text:'Anuluj',style:'cancel'},
    {text:'Usuń lokalne dane',style:'destructive',onPress:onReset}
  ]);
  return <ScrollView contentContainerStyle={s.page}>
    <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Wróć do profilu" style={{marginBottom:sp.base}}><Ionicons name="arrow-back" size={26} color={c.pink}/></Pressable>
    <PageHeading kicker="USTAWIENIA" title="Bezpieczeństwo."/>
    <Surface><Typography variant="subtitle">Zablokowane osoby</Typography>
      {blockedPeople.length===0?<Typography style={s.note}>Nie zablokowałaś nikogo.</Typography>:blockedPeople.map(p=><View key={p.id} style={s.row}><Typography style={{flex:1}}>{p.name}</Typography><Pressable accessibilityRole="button" accessibilityLabel={`Odblokuj ${p.name}`} onPress={()=>onUnblock(p.id)}><Typography style={{color:c.pink,fontFamily:f.bold}}>Odblokuj</Typography></Pressable></View>)}
      <Typography variant="caption" style={s.note}>{online?'Blokady są zapisane na koncie i respektowane przez RLS przy profilach, zaproszeniach i treściach.':'Blokady w trybie lokalnym obowiązują tylko na tym urządzeniu.'}</Typography>
    </Surface>
    <Surface><Typography variant="subtitle">{online?'Moje zgłoszenia':'Zgłoszenia lokalne'}</Typography><Typography style={s.note}>{reports.length} zapisanych zgłoszeń.{online?' Status zgłoszenia może zmienić moderator Polki.':' Nie są wysyłane do serwera.'}</Typography></Surface>
    <Surface><Typography variant="subtitle">Twój profil i dane</Typography><Typography style={s.note}>{online?'Profil i media konta są przechowywane w Supabase z RLS. Pełne usunięcie konta znajduje się w Ustawieniach.':'Dane profilu są przechowywane lokalnie na urządzeniu.'}</Typography>{!online&&<Button title="Usuń profil i dane z urządzenia" secondary icon="trash-outline" onPress={confirmReset}/>}</Surface>
    <Typography variant="caption" style={s.note}>{online?'Nie podawaj danych wrażliwych w publicznych postach. W razie zagrożenia skorzystaj ze zgłoszenia i blokady.':'Tryb lokalny służy do demonstracji interfejsu.'}</Typography>
  </ScrollView>;
}
const s=StyleSheet.create({page:{flexGrow:1,padding:sp.lg,paddingBottom:sp.xxl,backgroundColor:c.canvas},note:{color:c.muted,marginTop:sp.sm,lineHeight:22},wrap:{flexDirection:'row',flexWrap:'wrap',marginBottom:sp.lg},input:{backgroundColor:c.white,borderColor:c.line,borderWidth:1,borderRadius:r.md,minHeight:110,padding:sp.base,marginBottom:sp.lg,textAlignVertical:'top',fontFamily:f.regular,color:c.ink},row:{flexDirection:'row',alignItems:'center',paddingVertical:sp.md,borderBottomWidth:1,borderBottomColor:c.line}});
