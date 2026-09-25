import React,{useEffect,useState} from 'react';
import {Alert,KeyboardAvoidingView,Platform,Pressable,ScrollView,StyleSheet,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {readCached,writeCached,clearCached} from './cache';
import {colors as c,fonts as f,space as sp} from './theme';
import {Button,Chip,Field,PageHeading,Surface,Typography} from './ui';

const KEY='partner-draft';
const WEEK=7*24*60*60*1000;
const TYPES=['Kawiarnia / lokal','Organizacja','Koło / społeczność','Wydarzenia','Inny biznes'];
const empty=()=>({name:'',city:'Warszawa',type:TYPES[0],about:'',offerTitle:'',offerText:''});

// This screen only creates a local draft. Organization ownership, role grants,
// publishing and moderation MUST be verified server-side before release.
export default function PartnerPanel({onClose}){
  const [draft,setDraft]=useState(empty);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [notice,setNotice]=useState('');
  useEffect(()=>{let alive=true;readCached(KEY).then(value=>{
    if(alive&&value&&typeof value.name==='string')setDraft({...empty(),...value});
  }).catch(()=>{if(alive)setNotice('Nie udało się odczytać szkicu.');}).finally(()=>{if(alive)setLoading(false);});
    return ()=>{alive=false;};
  },[]);
  const change=(field,value,max=300)=>setDraft(prev=>({...prev,[field]:value.slice(0,max)}));
  const save=async()=>{
    if(draft.name.trim().length<2){setNotice('Podaj nazwę organizacji (minimum 2 znaki).');return;}
    setSaving(true);setNotice('');
    try{await writeCached(KEY,{...draft,name:draft.name.trim()},WEEK);setNotice('Szkic zapisany na urządzeniu na maksymalnie 7 dni. Nic nie zostało opublikowane.');}
    catch{setNotice('Nie udało się zapisać szkicu. Sprawdź pamięć telefonu.');}
    finally{setSaving(false);}
  };
  const erase=()=>Alert.alert('Usunąć szkic?','Znikną zapisane lokalnie dane panelu. Nie dotyczy to żadnej organizacji online.',[
    {text:'Anuluj',style:'cancel'},
    {text:'Usuń',style:'destructive',onPress:async()=>{try{await clearCached(KEY);setDraft(empty());setNotice('Szkic usunięty.');}catch{setNotice('Nie udało się usunąć szkicu.');}}}
  ]);
  return <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.page}>
      <Pressable accessibilityRole="button" accessibilityLabel="Wróć do profilu" onPress={onClose} style={s.back}><Ionicons name="arrow-back" size={24} color={c.pink}/><Typography style={{color:c.pink,fontFamily:f.bold}}>Wróć</Typography></Pressable>
      <PageHeading kicker="POLKA / PARTNERZY" title="Twoje miejsce. Nasza społeczność."/>
      <Typography style={s.lead}>Zaplanuj wizytówkę kawiarni, organizacji lub koła oraz propozycję dla dziewczyn w Twoim mieście.</Typography>
      <Surface><Typography variant="subtitle" style={s.title}>1. Twoja organizacja</Typography>
        <Field label="Nazwa" value={draft.name} onChangeText={v=>change('name',v,80)} placeholder="Np. Kawiarnia przy parku"/>
        <Typography style={s.label}>Typ profilu</Typography>
        <View style={s.wrap}>{TYPES.map(t=><Chip key={t} label={t} selected={draft.type===t} onPress={()=>change('type',t,50)}/>)}</View>
        <Field label="Miasto" value={draft.city} onChangeText={v=>change('city',v,100)} placeholder="Warszawa"/>
        <Field label="O Was" value={draft.about} onChangeText={v=>change('about',v,500)} multiline placeholder="Co robicie i dla kogo?"/>
      </Surface>
      <Surface><Typography variant="subtitle" style={s.title}>2. Propozycja dla społeczności</Typography>
        <Field label="Tytuł" value={draft.offerTitle} onChangeText={v=>change('offerTitle',v,100)} placeholder="Np. Czwartkowa kawa i nowe znajomości"/>
        <Field label="Opis" value={draft.offerText} onChangeText={v=>change('offerText',v,500)} multiline placeholder="Co, gdzie, dla kogo?"/>
      </Surface>
      <Surface><Typography variant="subtitle" style={s.title}>Podgląd wizytówki</Typography>
        <View style={s.previewIcon}><Ionicons name="storefront-outline" color={c.pink} size={27}/></View>
        <Typography variant="heading">{draft.name.trim()||'Nazwa Twojego miejsca'}</Typography>
        <Typography style={s.muted}>{draft.type} · {draft.city.trim()||'Miasto'}</Typography>
        <Typography>{draft.about.trim()||'Tutaj pojawi się krótki opis organizacji.'}</Typography>
        {!!draft.offerTitle.trim()&&<View style={s.offer}><Typography variant="subtitle">{draft.offerTitle}</Typography><Typography>{draft.offerText||'Opis propozycji'}</Typography></View>}
      </Surface>
      <Button title={saving?'Zapisywanie…':'Zapisz szkic na telefonie'} disabled={saving||loading} onPress={save} icon="save-outline"/>
      <Button title="Usuń szkic" onPress={erase} secondary style={{marginTop:sp.sm}} icon="trash-outline"/>
      {!!notice&&<Typography accessibilityRole="alert" style={s.notice}>{notice}</Typography>}
      <Typography variant="caption" style={s.muted}>To lokalny szkic panelu, nie aktywne konto firmowe. Przed uruchomieniem online wymagane są weryfikacja właściciela, role pracowników, moderacja ofert, limity publikacji i osobne polityki RLS. Nie wpisuj tu prywatnych danych ani haseł.</Typography>
    </ScrollView>
  </KeyboardAvoidingView>;
}
const s=StyleSheet.create({page:{padding:sp.lg,paddingBottom:sp.xxl,backgroundColor:c.canvas,flexGrow:1},back:{flexDirection:'row',alignItems:'center',gap:sp.sm,marginBottom:sp.lg},lead:{fontSize:17,color:c.muted,marginBottom:sp.lg,lineHeight:25},title:{marginBottom:sp.base},label:{fontFamily:f.semibold,marginBottom:sp.sm},wrap:{flexDirection:'row',flexWrap:'wrap',marginBottom:sp.base},previewIcon:{height:54,width:54,borderRadius:18,backgroundColor:c.blush,alignItems:'center',justifyContent:'center',marginBottom:sp.md},muted:{color:c.muted,marginTop:sp.md,lineHeight:20},offer:{backgroundColor:c.blush,padding:sp.base,borderRadius:16,marginTop:sp.base,gap:sp.sm},notice:{color:c.pink,fontFamily:f.semibold,marginTop:sp.base,lineHeight:22}});
