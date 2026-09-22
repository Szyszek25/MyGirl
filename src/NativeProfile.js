import React,{useEffect,useState} from 'react';
import {Alert,Image,KeyboardAvoidingView,Platform,ScrollView,StyleSheet,TextInput,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {colors as c,space as sp,fonts as f,radii as r} from './theme';
import {Button,Chip,Field,PageHeading,Surface,Typography} from './ui';
import {PROFILE_PROMPTS} from './Onboarding';
import {cities,interests as availableInterests} from './data';

const copy=account=>({...account,interests:[...(account.interests||[])],answers:{...(account.answers||{})}});
export default function NativeProfile({account,onSafety,onPartner,onSave}){
  const [editing,setEditing]=useState(false);
  const [draft,setDraft]=useState(()=>copy(account));
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  useEffect(()=>{if(!editing)setDraft(copy(account));},[account,editing]);
  const edit=(key,value)=>setDraft(prev=>({...prev,[key]:value}));
  const cancel=()=>{setDraft(copy(account));setEditing(false);setNotice('');};
  const selectPhoto=async()=>{
    try{
      const selection=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,aspect:[1,1],quality:0.7});
      if(selection.canceled)return;
      const image=selection.assets?.[0];
      if(!image?.uri)throw new Error('Nie udało się wybrać zdjęcia.');
      if(image.fileSize&&image.fileSize>5*1024*1024)throw new Error('Zdjęcie jest za duże. Wybierz plik do 5 MB.');
      edit('photo',image.uri);
      setNotice('Nowe zdjęcie zapisze się po naciśnięciu „Zapisz zmiany”.');
    }catch(error){Alert.alert('Nie udało się wybrać zdjęcia',error.message||'Spróbuj ponownie.');}
  };
  const save=async()=>{
    if(busy)return;
    if(draft.name.trim().length<2){setNotice('Wpisz imię (minimum 2 znaki).');return;}
    if(!draft.city){setNotice('Wybierz miasto.');return;}
    setBusy(true);setNotice('');
    try{
      const answers=Object.fromEntries(Object.entries(draft.answers).map(([key,value])=>[key,String(value).trim().slice(0,160)]));
      await onSave({...draft,name:draft.name.trim(),answers});
      setEditing(false);
    }catch(error){setNotice(error.message||'Nie udało się zapisać profilu.');}
    finally{setBusy(false);}
  };
  return <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.page}>
      <PageHeading kicker="MOJA PRZESTRZEŃ" title={editing?'Edytuj profil.':'Twój profil.'}/>
      <Surface style={s.head}>
        {(editing?draft.photo:account.photo)?<Image source={{uri:editing?draft.photo:account.photo}} style={s.avatar} accessibilityLabel="Twoje zdjęcie profilowe"/>:<View style={[s.avatar,s.placeholder]}><Ionicons name="person-outline" size={54} color={c.pink}/></View>}
        {!editing?<>
          <Typography variant="heading" style={{marginTop:sp.base}}>{account.name}</Typography>
          <Typography style={s.muted}>{account.city}</Typography>
          <Typography variant="caption" style={s.note}>Profil zapisany na tym urządzeniu · bez konta online</Typography>
        </>:<>
          <Button title="Wybierz zdjęcie z galerii" secondary icon="image-outline" onPress={selectPhoto} style={s.photoAction}/>
          {!!draft.photo&&<Button title="Usuń zdjęcie" secondary icon="trash-outline" onPress={()=>edit('photo',null)} style={s.photoAction}/>}
          <Typography variant="caption" style={s.note}>Zdjęcie pozostaje na telefonie. Usunięcie zatwierdzisz przy zapisie zmian.</Typography>
        </>}
      </Surface>
      {editing?<>
        <Surface>
          <Field label="Imię" value={draft.name} onChangeText={value=>edit('name',value.slice(0,60))} placeholder="Jak się do Ciebie zwracać?"/>
          <Typography variant="subtitle" style={s.title}>Miasto</Typography>
          <View style={s.wrap}>{cities.map(city=><Chip key={city} label={city} selected={draft.city===city} onPress={()=>edit('city',city)}/>)}</View>
          <Typography variant="subtitle" style={s.title}>Po co tu jesteś?</Typography>
          <View style={s.wrap}>{['Przyjaźń','Wspólne wyjścia','Nowe miasto','Grupy zainteresowań'].map(goal=><Chip key={goal} label={goal} selected={draft.goal===goal} onPress={()=>edit('goal',goal)}/>)}</View>
          <Typography variant="subtitle" style={s.title}>Zainteresowania</Typography>
          <View style={s.wrap}>{availableInterests.map(interest=><Chip key={interest} label={interest} selected={draft.interests.includes(interest)} onPress={()=>edit('interests',draft.interests.includes(interest)?draft.interests.filter(item=>item!==interest):[...draft.interests,interest])}/>)}</View>
        </Surface>
        <Surface><Typography variant="subtitle" style={s.title}>Pytania o Tobie</Typography>
          {PROFILE_PROMPTS.map((prompt,index)=><View key={prompt} style={s.prompt}>
            <Typography style={{fontFamily:f.semibold,marginBottom:sp.sm}}>{prompt}</Typography>
            <TextInput multiline maxLength={160} value={draft.answers[index]||''} onChangeText={value=>edit('answers',{...draft.answers,[index]:value})} accessibilityLabel={prompt} placeholder="Twoja odpowiedź…" placeholderTextColor={c.muted} style={s.answer}/>
          </View>)}
        </Surface>
        <Button title={busy?'Zapisywanie…':'Zapisz zmiany'} disabled={busy} onPress={save} icon="checkmark-outline"/>
        <Button title="Anuluj" secondary disabled={busy} onPress={cancel} style={s.secondary}/>
        {!!notice&&<Typography accessibilityRole="alert" style={s.notice}>{notice}</Typography>}
      </>:<>
        <Surface><Typography variant="subtitle" style={s.title}>Po co tu jestem</Typography><Typography>{account.goal}</Typography></Surface>
        <Surface><Typography variant="subtitle" style={s.title}>Moje zainteresowania</Typography><View style={s.wrap}>{(account.interests||[]).map(interest=><Chip key={interest} label={interest}/>)}</View></Surface>
        {Object.entries(account.answers||{}).filter(([,answer])=>typeof answer==='string'&&answer.trim()).map(([key,answer])=><Surface key={key}><Typography variant="subtitle" style={s.title}>{PROFILE_PROMPTS[Number(key)]||'Moja odpowiedź'}</Typography><Typography>{answer}</Typography></Surface>)}
        <Button title="Edytuj profil i zdjęcie" onPress={()=>{setDraft(copy(account));setEditing(true);}} icon="create-outline"/>
        <Button title="Panel dla biznesu i organizacji" secondary onPress={onPartner} style={s.secondary} icon="storefront-outline"/>
        <Button title="Bezpieczeństwo i moje dane" secondary icon="shield-checkmark-outline" style={s.secondary} onPress={onSafety}/>
        <Typography variant="caption" style={s.note}>To lokalny profil. Edycja nie aktualizuje profilu online. Wpisy i wiadomości na pozostałych ekranach nadal są demonstracyjne.</Typography>
      </>}
    </ScrollView>
  </KeyboardAvoidingView>;
}
const s=StyleSheet.create({page:{flexGrow:1,padding:sp.lg,paddingBottom:sp.xxl,backgroundColor:c.canvas},head:{alignItems:'center',paddingVertical:sp.xl},avatar:{height:124,width:124,borderRadius:62,backgroundColor:c.blush},placeholder:{alignItems:'center',justifyContent:'center'},title:{marginBottom:sp.sm},wrap:{flexDirection:'row',flexWrap:'wrap'},note:{color:c.muted,marginTop:sp.base,lineHeight:20,textAlign:'center'},muted:{color:c.muted},photoAction:{marginTop:sp.md,width:'100%'},secondary:{marginTop:sp.md},prompt:{paddingVertical:sp.md,borderBottomWidth:1,borderColor:c.line},answer:{fontFamily:f.regular,color:c.ink,minHeight:56,textAlignVertical:'top'},notice:{color:c.pink,marginTop:sp.md}});
