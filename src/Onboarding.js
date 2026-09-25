import React,{useState} from 'react';
import {Alert,Image,KeyboardAvoidingView,Platform,Pressable,ScrollView,StyleSheet,TextInput,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {cities,interests} from './data';
import {colors as c,space as sp,fonts as f,radii as r} from './theme';
import {Button,Chip,Field,PageHeading,Typography} from './ui';

export const PROFILE_PROMPTS=[
  'Green flag u nowej znajomej?',
  'Mój comfort spot w mieście?',
  'Idealny spontaniczny plan na piątek?',
  'Hot take, którego będę bronić?',
  'Co ostatnio totalnie Cię wkręciło?',
  'Gdybyśmy miały wolną sobotę, to…',
];
const steps=[
  ['CZEŚĆ','Polka jest lokalna.','Twórz plany i poznawaj dziewczyny w swoim mieście.'],
  ['TWÓJ CEL','Czego szukasz?','Wybierz, co ma Ci dawać Polka.'],
  ['LOKALNIE','Twoje miasto.','Plany i społeczność zaczynają się blisko Ciebie.'],
  ['TWÓJ KLIMAT','Co lubisz robić?','To pomoże dopasować plany i grupy.'],
  ['PRZEDSTAW SIĘ','Jak masz na imię?','Bez CV. Tylko to, co potrzebne na start.'],
  ['POZNAJMY SIĘ','Coś więcej niż zdjęcie.','Odpowiedz na minimum jedno pytanie. Po swojemu.'],
  ['TWOJE ZDJĘCIE','Pokaż siebie.','Dodaj naturalne zdjęcie z galerii. Możesz pominąć.'],
  ['BEZPIECZNIE','Twoje zasady.','Ta wersja nadal zapisuje profil wyłącznie na Twoim urządzeniu.'],
];
export default function Onboarding({onComplete}){
  const [step,setStep]=useState(0),[goal,setGoal]=useState('Przyjaźń'),[city,setCity]=useState('Warszawa');
  const [selected,setSelected]=useState([]),[name,setName]=useState(''),[adult,setAdult]=useState(false);
  const [photo,setPhoto]=useState(null),[answers,setAnswers]=useState({}),[busy,setBusy]=useState(false);
  const validAnswers=Object.entries(answers).filter(([,answer])=>answer.trim().length>=3);
  const ready=step===4?name.trim().length>=2:step===7?adult:true;
  const pickPhoto=async()=>{
    try{
      const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,aspect:[1,1],quality:0.7});
      if(result.canceled)return;
      const chosen=result.assets?.[0];
      if(!chosen?.uri)throw Error('Nie udało się wybrać zdjęcia.');
      if(chosen.fileSize&&chosen.fileSize>5*1024*1024)throw Error('Zdjęcie jest za duże. Wybierz plik do 5 MB.');
      setPhoto(chosen.uri);
    }catch(error){Alert.alert('Nie udało się dodać zdjęcia',error.message||'Spróbuj ponownie.');}
  };
  const next=async()=>{
    if(!ready||busy)return;
    if(step<steps.length-1){setStep(v=>v+1);return;}
    setBusy(true);
    try{await onComplete({goal,city,interests:selected,name:name.trim(),photo,answers:Object.fromEntries(validAnswers),adultConfirmed:true});}
    catch(error){Alert.alert('Nie zapisano profilu',error.message||'Spróbuj ponownie.');}
    finally{setBusy(false);}
  };
  return <KeyboardAvoidingView style={{flex:1,backgroundColor:c.canvas}} behavior={Platform.OS==='ios'?'padding':'height'} keyboardVerticalOffset={Platform.OS==='ios'?8:0}>
    <View style={s.top}><Pressable accessibilityRole="button" accessibilityLabel="Wstecz" onPress={()=>setStep(v=>Math.max(0,v-1))} style={{width:40,paddingVertical:8}}>{step>0?<Ionicons name="arrow-back" size={24} color={c.ink}/>:null}</Pressable><Typography variant="caption" style={{color:c.muted}}>{step+1} / {steps.length}</Typography></View>
    <View style={s.progress}><View style={[s.progressFill,{width:`${(step+1)/steps.length*100}%`}]}/></View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
      <PageHeading kicker={steps[step][0]} title={steps[step][1]}/>
      <Typography style={{color:c.muted,marginBottom:sp.xl,fontSize:17}}>{steps[step][2]}</Typography>
      {step===0&&<View style={s.welcome}><Ionicons name="heart" size={84} color={c.pink}/><Typography variant="heading" style={{textAlign:'center',marginTop:20}}>Polka</Typography><Typography style={{textAlign:'center',marginTop:8,color:c.muted}}>Plany, dziewczyny, Twoje miasto.</Typography></View>}
      {step===1&&<View style={s.wrap}>{['Nowe znajomości','Wspólne wyjścia','Nowe miasto','Grupy i hobby'].map(value=><Chip key={value} label={value} selected={goal===value} onPress={()=>setGoal(value)}/>)}</View>}
      {step===2&&<View style={s.wrap}>{cities.map(value=><Chip key={value} label={value} selected={city===value} onPress={()=>setCity(value)}/>)}</View>}
      {step===3&&<View style={s.wrap}>{interests.map(value=><Chip key={value} label={value} selected={selected.includes(value)} onPress={()=>setSelected(prev=>prev.includes(value)?prev.filter(item=>item!==value):[...prev,value])}/>)}</View>}
      {step===4&&<Field label="Imię" value={name} onChangeText={setName} placeholder="Jak się do Ciebie zwracać?"/>}
      {step===5&&PROFILE_PROMPTS.map((prompt,index)=><View key={prompt} style={s.prompt}><Typography variant="subtitle" style={{marginBottom:sp.sm}}>{prompt}</Typography><TextInput multiline maxLength={160} value={answers[index]||''} onChangeText={value=>setAnswers(prev=>({...prev,[index]:value}))} placeholder="Twoja odpowiedź…" placeholderTextColor={c.muted} accessibilityLabel={prompt} style={s.answer}/></View>)}
      {step===6&&<View style={s.photo}><Pressable accessibilityRole="button" accessibilityLabel="Wybierz zdjęcie z galerii" onPress={pickPhoto} style={{alignItems:'center'}}>{photo?<Image source={{uri:photo}} style={s.preview}/>:<Ionicons name="camera-outline" size={44} color={c.pink}/>}<Typography style={{color:c.pink,fontFamily:f.bold,marginTop:sp.base}}>{photo?'Zmień zdjęcie':'Wybierz z galerii'}</Typography></Pressable>{photo&&<Button title="Usuń wybrane zdjęcie" secondary onPress={()=>setPhoto(null)} style={{marginTop:sp.base}}/>}<Typography variant="caption" style={{textAlign:'center',color:c.muted,marginTop:sp.base}}>Zdjęcie zapisze się lokalnie w aplikacji, nie zostanie wysłane do internetu.</Typography></View>}
      {step===7&&<><Typography style={{lineHeight:24}}>To wersja mobilna Polki w przygotowaniu. Profil i zdjęcie pozostają lokalnie na tym telefonie. Nie ma jeszcze rejestracji online ani prawdziwych rozmów z innymi osobami. Nie wpisuj danych wrażliwych.</Typography><Pressable accessibilityRole="checkbox" accessibilityState={{checked:adult}} onPress={()=>setAdult(v=>!v)} style={s.check}><Ionicons name={adult?'checkbox':'square-outline'} size={25} color={c.pink}/><Typography style={{flex:1}}>Mam ukończone 18 lat i rozumiem, że to profil lokalny, a nie konto internetowe.</Typography></Pressable></>}
    </ScrollView>
    <View style={s.footer}><Button title={busy?'Zapisywanie…':step===steps.length-1?'Zapisz profil na telefonie':((step===3&&!selected.length)||(step===5&&!validAnswers.length)||(step===6&&!photo))?'Pomiń':'Dalej'} onPress={next} disabled={!ready||busy} icon="arrow-forward"/></View>
  </KeyboardAvoidingView>;
}
const s=StyleSheet.create({top:{paddingHorizontal:sp.lg,paddingTop:sp.md,paddingBottom:sp.sm,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},progress:{height:3,backgroundColor:c.line},progressFill:{height:3,backgroundColor:c.pink},content:{flexGrow:1,padding:sp.lg,paddingTop:sp.xl},wrap:{flexDirection:'row',flexWrap:'wrap'},welcome:{flex:1,alignItems:'center',justifyContent:'center',paddingVertical:50},photo:{backgroundColor:c.blush,borderWidth:1,borderStyle:'dashed',borderColor:c.pink,borderRadius:r.lg,padding:sp.xl,alignItems:'center'},preview:{width:180,height:180,borderRadius:90,backgroundColor:c.blush},prompt:{backgroundColor:c.white,borderWidth:1,borderColor:c.line,borderRadius:r.md,padding:sp.base,marginBottom:sp.md},answer:{fontFamily:f.regular,fontSize:16,color:c.ink,minHeight:65,textAlignVertical:'top'},check:{flexDirection:'row',gap:12,alignItems:'center',marginTop:32,padding:12},footer:{padding:sp.lg,borderTopWidth:1,borderColor:c.line,backgroundColor:c.white}});
