import React,{useState} from 'react';
import {Alert,KeyboardAvoidingView,Platform,Pressable,ScrollView,StyleSheet,TextInput,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {colors as c,space as sp,radii as r,fonts as f} from './theme';
import {people} from './data';
import {Button,Chip,PageHeading,Surface,Typography} from './ui';

const REASONS=[['harassment','Nękanie'],['hate','Mowa nienawiści'],['sexual','Nieodpowiednie treści'],['spam','Spam'],['impersonation','Podszywanie się'],['other','Inny powód']];

// Reports are explicitly DEMONSTRATIVE until a real Supabase project, authenticated
// session, trusted review queue and report response process have been deployed.
export function ReportForm({target,onCancel,onSave}){
  const [reason,setReason]=useState(null);
  const [details,setDetails]=useState('');
  return <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.page}>
      <Pressable onPress={onCancel} accessibilityRole="button" accessibilityLabel="Wróć"><Ionicons name="arrow-back" size={26} color={c.pink}/></Pressable>
      <PageHeading kicker="TWOJE BEZPIECZEŃSTWO" title="Zgłoś problem."/>
      <Surface><Typography variant="subtitle">{target.label}</Typography><Typography style={s.note}>Wybierz powód. W prototypie zgłoszenie zostanie zapisane tylko do końca tej sesji — NIE trafi do moderacji.</Typography></Surface>
      <View style={s.wrap}>{REASONS.map(([id,label])=><Chip key={id} label={label} selected={reason===id} onPress={()=>setReason(id)}/>)}</View>
      <Typography variant="subtitle" style={{marginTop:sp.md,marginBottom:sp.sm}}>Dodatkowe informacje</Typography>
      <TextInput multiline maxLength={1000} value={details} onChangeText={setDetails} accessibilityLabel="Opis zgłoszenia" placeholder="Co się wydarzyło? (opcjonalnie)" placeholderTextColor={c.muted} style={s.input}/>
      <Button disabled={!reason} title="Zapisz zgłoszenie demo" onPress={()=>onSave({target,reason,details:details.trim()})}/>
      <Typography variant="caption" style={s.note}>Przed uruchomieniem prawdziwych kont formularz zostanie podłączony do prywatnej kolejki zgłoszeń Supabase.</Typography>
    </ScrollView>
  </KeyboardAvoidingView>;
}

export function SafetyCenter({blockedIds,onUnblock,reports,onClose,onReset}){
  const blockedPeople=people.filter(p=>blockedIds.includes(p.id));
  const confirmReset=()=>Alert.alert('Usunąć dane demonstracyjne?','Znikną imię, wybory z onboardingu, polubienia, blokady i zgłoszenia z bieżącej sesji. To nie usuwa konta Supabase, ponieważ nie ma jeszcze logowania ani prawdziwych kont.',[
    {text:'Anuluj',style:'cancel'},
    {text:'Usuń dane demo',style:'destructive',onPress:onReset}
  ]);
  return <ScrollView contentContainerStyle={s.page}>
    <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Wróć do profilu" style={{marginBottom:sp.base}}><Ionicons name="arrow-back" size={26} color={c.pink}/></Pressable>
    <PageHeading kicker="USTAWIENIA" title="Bezpieczeństwo."/>
    <Surface><Typography variant="subtitle">Zablokowane osoby</Typography>
      {blockedPeople.length===0?<Typography style={s.note}>Nie zablokowałaś nikogo.</Typography>:blockedPeople.map(p=><View key={p.id} style={s.row}><Typography style={{flex:1}}>{p.name}</Typography><Pressable accessibilityRole="button" accessibilityLabel={`Odblokuj ${p.name}`} onPress={()=>onUnblock(p.id)}><Typography style={{color:c.pink,fontFamily:f.bold}}>Odblokuj</Typography></Pressable></View>)}
      <Typography variant="caption" style={s.note}>Blokowanie działa tylko w tej sesji prototypu. W wersji produkcyjnej musi być egzekwowane przez RLS.</Typography>
    </Surface>
    <Surface><Typography variant="subtitle">Zgłoszenia demonstracyjne</Typography><Typography style={s.note}>{reports.length} zapisanych lokalnie. Żadne nie zostało wysłane ani rozpatrzone.</Typography></Surface>
    <Surface><Typography variant="subtitle">Twoje konto i dane</Typography><Typography style={s.note}>Nie masz jeszcze konta MyGirl — projekt używa demonstracyjnych danych w pamięci.</Typography><Button title="Usuń dane demonstracyjne" secondary icon="trash-outline" onPress={confirmReset}/></Surface>
    <Typography variant="caption" style={s.note}>Przed publikacją: rzeczywiste usuwanie konta i treści na serwerze, kontakt, polityka prywatności, filtrowanie treści oraz działająca moderacja. Nie są jeszcze dostępne.</Typography>
  </ScrollView>;
}
const s=StyleSheet.create({page:{flexGrow:1,padding:sp.lg,paddingBottom:sp.xxl,backgroundColor:c.canvas},note:{color:c.muted,marginTop:sp.sm,lineHeight:22},wrap:{flexDirection:'row',flexWrap:'wrap',marginBottom:sp.lg},input:{backgroundColor:c.white,borderColor:c.line,borderWidth:1,borderRadius:r.md,minHeight:110,padding:sp.base,marginBottom:sp.lg,textAlignVertical:'top',fontFamily:f.regular,color:c.ink},row:{flexDirection:'row',alignItems:'center',paddingVertical:sp.md,borderBottomWidth:1,borderBottomColor:c.line}});
