import React,{useEffect,useMemo,useState} from 'react';
import {Alert,KeyboardAvoidingView,Platform,Pressable,ScrollView,StyleSheet,TextInput,View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Ionicons} from '@expo/vector-icons';
import {colors as c,fonts as f,radii as r,space as sp} from './theme';
import {Button,Chip,Typography} from './ui';

const STORAGE_KEY='polka_cycle_tracker_v1';
const symptomOptions=['Skurcze','Ból głowy','Wzdęcia','Tkliwość piersi','Trądzik','Apetyt','Niska energia','Wysoka energia','Gorszy nastrój','Dobry nastrój','Problemy ze snem'];
const moods=['😣','😕','😐','🙂','✨'];
const dayMs=24*60*60*1000;
const dateOnly=value=>new Date(value.getFullYear(),value.getMonth(),value.getDate());
const isoDay=value=>dateOnly(value).toISOString().slice(0,10);
const diffDays=(a,b)=>Math.max(0,Math.floor((dateOnly(a)-dateOnly(b))/dayMs));
const phaseFor=(day,cycleLength)=>{
  if(day<=5)return {name:'Miesiączka',copy:'Możesz mieć mniej energii. Wybieraj plany zgodnie z samopoczuciem.',icon:'water-outline'};
  if(day<=Math.max(10,Math.floor(cycleLength*.45)))return {name:'Faza folikularna',copy:'U części osób energia stopniowo rośnie — obserwuj własny wzorzec.',icon:'leaf-outline'};
  if(day<=Math.max(15,Math.floor(cycleLength*.58)))return {name:'Okolice owulacji',copy:'To tylko orientacyjne wyliczenie, nie metoda antykoncepcji.',icon:'sparkles-outline'};
  return {name:'Faza lutealna',copy:'Zapisuj objawy i energię — łatwiej zauważysz własne powtarzalne wzorce.',icon:'moon-outline'};
};

export default function CycleScreen({onClose,onOpenGroups}){
  const today=new Date();
  const [cycleLength,setCycleLength]=useState(28);
  const [lastPeriod,setLastPeriod]=useState(()=>isoDay(new Date(Date.now()-17*dayMs)));
  const [symptoms,setSymptoms]=useState([]);
  const [mood,setMood]=useState('🙂');
  const [note,setNote]=useState('');
  const [history,setHistory]=useState([]);
  const [saved,setSaved]=useState(false);

  useEffect(()=>{AsyncStorage.getItem(STORAGE_KEY).then(raw=>{
    if(!raw)return;
    try{
      const data=JSON.parse(raw);
      if(data.cycleLength)setCycleLength(data.cycleLength);
      if(data.lastPeriod)setLastPeriod(data.lastPeriod);
      if(Array.isArray(data.history))setHistory(data.history);
    }catch{}
  }).catch(()=>{});},[]);

  const cycleDay=useMemo(()=>{
    const start=new Date(lastPeriod+'T12:00:00');
    return Math.min(cycleLength,Math.max(1,diffDays(today,start)+1));
  },[lastPeriod,cycleLength]);
  const daysToPeriod=Math.max(0,cycleLength-cycleDay+1);
  const phase=phaseFor(cycleDay,cycleLength);

  const persist=async next=>{
    const payload={cycleLength,lastPeriod,history:next};
    await AsyncStorage.setItem(STORAGE_KEY,JSON.stringify(payload));
  };

  const saveToday=async()=>{
    const entry={date:isoDay(today),cycleDay,symptoms,mood,note:note.trim().slice(0,600)};
    const next=[entry,...history.filter(item=>item.date!==entry.date)].slice(0,90);
    setHistory(next);
    setSaved(true);
    try{await persist(next);}catch{Alert.alert('Nie udało się zapisać','Spróbuj ponownie.');}
  };

  const markPeriodToday=async()=>{
    const value=isoDay(today);
    setLastPeriod(value);
    const next=history;
    try{await AsyncStorage.setItem(STORAGE_KEY,JSON.stringify({cycleLength,lastPeriod:value,history:next}));}catch{}
    Alert.alert('Zapisano','Dzisiejszy dzień ustawiono jako początek miesiączki.');
  };

  return <KeyboardAvoidingView style={s.root} behavior={Platform.OS==='ios'?'padding':undefined}>
    <View style={s.header}><Pressable onPress={onClose} style={s.iconBtn}><Ionicons name="arrow-back" size={24} color={c.ink}/></Pressable><Typography style={s.headerTitle}>Cykl i samopoczucie</Typography><View style={s.iconBtn}/></View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
      <View style={s.hero}>
        <View style={s.phaseIcon}><Ionicons name={phase.icon} size={26} color={c.pink}/></View>
        <Typography style={s.eyebrow}>DZIEŃ {cycleDay} Z ~{cycleLength}</Typography>
        <Typography style={s.title}>{phase.name}</Typography>
        <Typography style={s.copy}>{phase.copy}</Typography>
        <View style={s.statRow}><View><Typography style={s.statValue}>{daysToPeriod}</Typography><Typography style={s.statLabel}>dni do przewidywanego okresu</Typography></View><Pressable onPress={markPeriodToday} style={s.periodBtn}><Typography style={s.periodBtnText}>Okres zaczął się dziś</Typography></Pressable></View>
      </View>

      <View style={s.section}>
        <Typography style={s.sectionTitle}>Dzisiaj</Typography>
        <Typography style={s.label}>Jak się czujesz?</Typography>
        <View style={s.moods}>{moods.map(item=><Pressable key={item} onPress={()=>setMood(item)} style={[s.mood,mood===item&&s.moodActive]}><Typography style={s.moodText}>{item}</Typography></Pressable>)}</View>
        <Typography style={s.label}>Objawy i energia</Typography>
        <View style={s.chips}>{symptomOptions.map(item=><Chip key={item} label={item} selected={symptoms.includes(item)} onPress={()=>setSymptoms(prev=>prev.includes(item)?prev.filter(v=>v!==item):[...prev,item])}/>)}</View>
        <Typography style={s.label}>Notatka</Typography>
        <TextInput value={note} onChangeText={setNote} multiline maxLength={600} placeholder="Np. opóźnia mi się okres, słabiej spałam, mam większy apetyt…" placeholderTextColor={c.muted} style={s.note}/>
        <Button title={saved?'Zapisano dzisiejszy wpis':'Zapisz dzisiejszy wpis'} icon={saved?'checkmark':'add'} onPress={saveToday}/>
      </View>

      <View style={s.section}>
        <View style={s.sectionHead}><View><Typography style={s.sectionTitle}>Plany pod samopoczucie</Typography><Typography style={s.sectionSub}>Nie „pod fazę” na sztywno — wybierasz według energii i objawów.</Typography></View></View>
        <View style={s.planRow}><View style={s.planIcon}><Ionicons name="cafe-outline" size={22} color={c.pink}/></View><View style={{flex:1}}><Typography style={s.planTitle}>Spokojnie</Typography><Typography style={s.planCopy}>kawa, spacer, book club, kino</Typography></View></View>
        <View style={s.planRow}><View style={s.planIcon}><Ionicons name="sparkles-outline" size={22} color={c.pink}/></View><View style={{flex:1}}><Typography style={s.planTitle}>Mam energię</Typography><Typography style={s.planCopy}>girls night, koncert, pilates, city walk</Typography></View></View>
      </View>

      <Pressable onPress={onOpenGroups} style={s.community}>
        <View style={s.communityIcon}><Ionicons name="chatbubbles-outline" size={23} color={c.pink}/></View>
        <View style={{flex:1}}><Typography style={s.communityTitle}>Cykl i samopoczucie</Typography><Typography style={s.communityText}>Grupa do rozmów i wsparcia — doświadczenia innych osób nie zastępują konsultacji medycznej.</Typography></View>
        <Ionicons name="chevron-forward" size={20} color={c.muted}/>
      </Pressable>

      <View style={s.settings}>
        <Typography style={s.sectionTitle}>Ustawienia cyklu</Typography>
        <Typography style={s.label}>Średnia długość cyklu</Typography>
        <View style={s.lengthRow}><Pressable onPress={()=>setCycleLength(v=>Math.max(21,v-1))} style={s.lengthBtn}><Ionicons name="remove" size={20} color={c.ink}/></Pressable><Typography style={s.lengthValue}>{cycleLength} dni</Typography><Pressable onPress={()=>setCycleLength(v=>Math.min(40,v+1))} style={s.lengthBtn}><Ionicons name="add" size={20} color={c.ink}/></Pressable></View>
        <Typography style={s.disclaimer}>Przewidywania są orientacyjne. Ta funkcja nie służy do diagnozowania chorób ani jako metoda antykoncepcji. Przy niepokojących, silnych lub utrzymujących się objawach skonsultuj się z lekarzem.</Typography>
      </View>
    </ScrollView>
  </KeyboardAvoidingView>;
}

const s=StyleSheet.create({
  root:{flex:1,backgroundColor:c.canvas},header:{height:60,paddingHorizontal:12,backgroundColor:c.white,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:c.line,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},iconBtn:{width:40,height:40,borderRadius:20,alignItems:'center',justifyContent:'center'},headerTitle:{fontFamily:f.bold,fontSize:16,color:c.ink},content:{padding:sp.lg,paddingBottom:80,gap:14},hero:{backgroundColor:c.white,borderRadius:26,borderWidth:1,borderColor:c.line,padding:20},phaseIcon:{width:50,height:50,borderRadius:17,backgroundColor:c.blush,alignItems:'center',justifyContent:'center'},eyebrow:{fontFamily:f.bold,fontSize:11,letterSpacing:1.2,color:c.pink,marginTop:18},title:{fontFamily:f.bold,fontSize:30,letterSpacing:-1,color:c.ink,marginTop:3},copy:{fontFamily:f.regular,fontSize:14,lineHeight:21,color:c.muted,marginTop:8},statRow:{marginTop:20,paddingTop:16,borderTopWidth:1,borderTopColor:c.line,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},statValue:{fontFamily:f.bold,fontSize:28,color:c.ink},statLabel:{fontFamily:f.regular,fontSize:11,color:c.muted,maxWidth:130},periodBtn:{backgroundColor:c.blush,borderRadius:14,paddingHorizontal:12,paddingVertical:10},periodBtnText:{fontFamily:f.bold,fontSize:11,color:c.pink},section:{backgroundColor:c.white,borderRadius:22,borderWidth:1,borderColor:c.line,padding:16},sectionHead:{marginBottom:4},sectionTitle:{fontFamily:f.bold,fontSize:18,color:c.ink},sectionSub:{fontFamily:f.regular,fontSize:12,lineHeight:18,color:c.muted,marginTop:3},label:{fontFamily:f.semibold,fontSize:13,color:c.ink,marginTop:16,marginBottom:9},moods:{flexDirection:'row',gap:8},mood:{width:48,height:48,borderRadius:16,backgroundColor:c.canvas,borderWidth:1,borderColor:c.line,alignItems:'center',justifyContent:'center'},moodActive:{borderColor:c.pink,backgroundColor:c.blush},moodText:{fontSize:23},chips:{flexDirection:'row',flexWrap:'wrap'},note:{minHeight:88,borderRadius:16,borderWidth:1,borderColor:c.line,backgroundColor:c.canvas,padding:13,fontFamily:f.regular,fontSize:14,color:c.ink,textAlignVertical:'top',marginBottom:14},planRow:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:12,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:c.line},planIcon:{width:42,height:42,borderRadius:14,backgroundColor:c.blush,alignItems:'center',justifyContent:'center'},planTitle:{fontFamily:f.bold,fontSize:14,color:c.ink},planCopy:{fontFamily:f.regular,fontSize:12,color:c.muted,marginTop:2},community:{backgroundColor:c.white,borderRadius:22,borderWidth:1,borderColor:c.line,padding:15,flexDirection:'row',alignItems:'center',gap:12},communityIcon:{width:46,height:46,borderRadius:16,backgroundColor:c.blush,alignItems:'center',justifyContent:'center'},communityTitle:{fontFamily:f.bold,fontSize:15,color:c.ink},communityText:{fontFamily:f.regular,fontSize:11,lineHeight:16,color:c.muted,marginTop:3},settings:{backgroundColor:c.white,borderRadius:22,borderWidth:1,borderColor:c.line,padding:16},lengthRow:{flexDirection:'row',alignItems:'center',gap:18},lengthBtn:{width:42,height:42,borderRadius:14,borderWidth:1,borderColor:c.line,alignItems:'center',justifyContent:'center'},lengthValue:{fontFamily:f.bold,fontSize:18,color:c.ink},disclaimer:{fontFamily:f.regular,fontSize:11,lineHeight:17,color:c.muted,marginTop:18}
});