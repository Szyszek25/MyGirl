import React,{useEffect,useMemo,useState} from 'react';
import {Alert,Image,KeyboardAvoidingView,Platform,Pressable,ScrollView,StyleSheet,TextInput,View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Ionicons} from '@expo/vector-icons';
import {colors as c,fonts as f,space as sp} from './theme';
import {Button,Chip,Typography} from './ui';
import {loadCycleCloud,saveCycleEntryCloud,saveCycleSettingsCloud} from './services/cycleApi';

const STORAGE_KEY='polka_cycle_tracker_v1';
const symptomOptions=['Skurcze','Ból głowy','Wzdęcia','Tkliwość piersi','Apetyt','Niska energia','Wysoka energia','Gorszy nastrój','Dobry nastrój','Problemy ze snem'];
const moods=['😣','😕','😐','🙂','✨'];
const WEEK=['Pn','Wt','Śr','Cz','Pt','Sb','Nd'];
const MONTHS=['styczeń','luty','marzec','kwiecień','maj','czerwiec','lipiec','sierpień','wrzesień','październik','listopad','grudzień'];
const DAY_MS=24*60*60*1000;
const atNoon=d=>new Date(d.getFullYear(),d.getMonth(),d.getDate(),12);
const isoDay=d=>atNoon(d).toISOString().slice(0,10);
const fromIso=v=>new Date(v+'T12:00:00');
const addDays=(d,n)=>new Date(atNoon(d).getTime()+n*DAY_MS);
const daysBetween=(a,b)=>Math.round((atNoon(a)-atNoon(b))/DAY_MS);
const sameDay=(a,b)=>isoDay(a)===isoDay(b);

const monthCells=date=>{
  const first=new Date(date.getFullYear(),date.getMonth(),1,12);
  const mondayIndex=(first.getDay()+6)%7;
  const start=addDays(first,-mondayIndex);
  return Array.from({length:42},(_,i)=>addDays(start,i));
};

const predictedStarts=(lastPeriod,cycleLength,centerDate)=>{
  const start=fromIso(lastPeriod);
  const dates=[];
  for(let i=-6;i<=18;i++){
    const d=addDays(start,i*cycleLength);
    if(Math.abs(daysBetween(d,centerDate))<550)dates.push(d);
  }
  return dates;
};

const phaseFor=(day,cycleLength)=>{
  if(day<=5)return {name:'Miesiączka',copy:'Dziś możesz chcieć zwolnić. Zapisuj to, co faktycznie czujesz.',icon:'water-outline'};
  if(day<=Math.max(10,Math.floor(cycleLength*.45)))return {name:'Faza folikularna',copy:'Obserwuj własny poziom energii zamiast trzymać się sztywnej teorii.',icon:'leaf-outline'};
  if(day<=Math.max(15,Math.floor(cycleLength*.58)))return {name:'Okolice owulacji',copy:'Prognoza jest orientacyjna i nie jest metodą antykoncepcji.',icon:'sparkles-outline'};
  return {name:'Faza lutealna',copy:'To dobry moment, żeby zwrócić uwagę na powtarzające się objawy.',icon:'moon-outline'};
};

export default function CycleScreen({onClose,onOpenGroups,onOpenCare,userId=null,cloudSync=false}){
  const today=atNoon(new Date());
  const [cycleLength,setCycleLength]=useState(28);
  const [periodLength,setPeriodLength]=useState(5);
  const [lastPeriod,setLastPeriod]=useState(()=>isoDay(addDays(today,-17)));
  const [history,setHistory]=useState([]);
  const [month,setMonth]=useState(()=>new Date(today.getFullYear(),today.getMonth(),1,12));
  const [selectedDate,setSelectedDate]=useState(today);
  const [symptoms,setSymptoms]=useState([]);
  const [mood,setMood]=useState('🙂');
  const [note,setNote]=useState('');
  const [bleeding,setBleeding]=useState('none');
  const [saved,setSaved]=useState(false);
  const [historyExpanded,setHistoryExpanded]=useState(false);

  useEffect(()=>{
    let alive=true;
    (async()=>{
      let local=null;
      try{
        const raw=await AsyncStorage.getItem(STORAGE_KEY);
        if(raw)local=JSON.parse(raw);
      }catch{}
      if(local&&alive){
        if(local.cycleLength)setCycleLength(local.cycleLength);
        if(local.periodLength)setPeriodLength(local.periodLength);
        if(local.lastPeriod)setLastPeriod(local.lastPeriod);
        if(Array.isArray(local.history))setHistory(local.history);
      }
      if(!cloudSync||!userId||!alive)return;
      try{
        const remote=await loadCycleCloud(userId);
        if(remote){
          if(remote.cycleLength)setCycleLength(remote.cycleLength);
          if(remote.periodLength)setPeriodLength(remote.periodLength);
          if(remote.lastPeriod)setLastPeriod(remote.lastPeriod);
          if(Array.isArray(remote.history)&&remote.history.length)setHistory(remote.history);
          await AsyncStorage.setItem(STORAGE_KEY,JSON.stringify(remote));
        }else if(local){
          await saveCycleSettingsCloud(userId,{
            cycleLength:local.cycleLength||28,
            periodLength:local.periodLength||5,
            lastPeriod:local.lastPeriod||null
          });
          for(const entry of (local.history||[]).slice(0,180))await saveCycleEntryCloud(userId,entry);
        }
      }catch(error){
        if(alive)Alert.alert('Polka Care','Nie udało się zsynchronizować prywatnego kalendarza. Dane lokalne zostały zachowane.');
      }
    })();
    return ()=>{alive=false};
  },[cloudSync,userId]);

  useEffect(()=>{
    const entry=history.find(item=>item.date===isoDay(selectedDate));
    setSymptoms(entry?.symptoms||[]);
    setMood(entry?.mood||'🙂');
    setNote(entry?.note||'');
    setBleeding(entry?.bleeding||'none');
    setSaved(false);
  },[selectedDate,history]);

  const cycleDay=useMemo(()=>{
    const start=fromIso(lastPeriod);
    const raw=daysBetween(selectedDate,start);
    return ((raw%cycleLength)+cycleLength)%cycleLength+1;
  },[selectedDate,lastPeriod,cycleLength]);

  const phase=phaseFor(cycleDay,cycleLength);
  const predictions=useMemo(()=>predictedStarts(lastPeriod,cycleLength,month),[lastPeriod,cycleLength,month]);
  const nextPeriod=useMemo(()=>{
    const start=fromIso(lastPeriod);
    let next=start;
    while(next<today)next=addDays(next,cycleLength);
    return next;
  },[lastPeriod,cycleLength]);
  const daysToPeriod=Math.max(0,daysBetween(nextPeriod,today));
  const cycleProgress=Math.max(0,Math.min(100,Math.round((cycleDay/cycleLength)*100)));
  const cells=useMemo(()=>monthCells(month),[month]);
  const recentEntries=useMemo(()=>history.slice(0,historyExpanded?12:4),[history,historyExpanded]);
  const periodStarts=useMemo(()=>history.filter(item=>item.isPeriodStart).sort((a,b)=>b.date.localeCompare(a.date)),[history]);
  const averageLoggedCycle=useMemo(()=>{
    if(periodStarts.length<2)return null;
    const diffs=[];
    for(let i=0;i<periodStarts.length-1;i++){
      const a=fromIso(periodStarts[i].date),b=fromIso(periodStarts[i+1].date);
      const d=daysBetween(a,b);
      if(d>=18&&d<=45)diffs.push(d);
    }
    if(!diffs.length)return null;
    return Math.round(diffs.reduce((a,b)=>a+b,0)/diffs.length);
  },[periodStarts]);

  const entryFor=date=>history.find(item=>item.date===isoDay(date));
  const predictedPeriodFor=date=>predictions.some(start=>{
    const diff=daysBetween(date,start);
    return diff>=0&&diff<periodLength;
  });

  const persist=async(nextHistory,nextLastPeriod=lastPeriod,nextEntry=null)=>{
    await AsyncStorage.setItem(STORAGE_KEY,JSON.stringify({cycleLength,periodLength,lastPeriod:nextLastPeriod,history:nextHistory}));
    if(cloudSync&&userId){
      await saveCycleSettingsCloud(userId,{cycleLength,periodLength,lastPeriod:nextLastPeriod});
      if(nextEntry)await saveCycleEntryCloud(userId,nextEntry);
    }
  };

  const saveSelected=async()=>{
    const date=isoDay(selectedDate);
    const entry={date,cycleDay,symptoms,mood,note:note.trim().slice(0,600),bleeding,isPeriodStart:bleeding!=='none'&&(!entryFor(addDays(selectedDate,-1))||entryFor(addDays(selectedDate,-1))?.bleeding==='none')};
    const next=[entry,...history.filter(item=>item.date!==date)].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,180);
    let nextLast=lastPeriod;
    if(entry.isPeriodStart&&selectedDate<=today)nextLast=date;
    setHistory(next);
    setLastPeriod(nextLast);
    setSaved(true);
    try{await persist(next,nextLast,entry);}catch{Alert.alert('Nie udało się zapisać','Dane lokalne mogły zostać zapisane, ale synchronizacja chmury nie powiodła się.');}
  };

  const logPeriodStart=async()=>{
    const date=isoDay(selectedDate);
    const entry={date,cycleDay:1,symptoms,mood,note:note.trim().slice(0,600),bleeding:'medium',isPeriodStart:true};
    const next=[entry,...history.filter(item=>item.date!==date)].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,180);
    setBleeding('medium');
    setHistory(next);
    setLastPeriod(date);
    setSaved(true);
    try{await persist(next,date,entry);}catch{Alert.alert('Polka Care','Zapis lokalny jest dostępny, ale synchronizacja chmury nie powiodła się.');}
  };

  return <KeyboardAvoidingView style={s.root} behavior={Platform.OS==='ios'?'padding':undefined}>
    <View style={s.header}>
      <Pressable onPress={onClose} style={s.iconBtn}><Ionicons name="arrow-back" size={24} color={c.ink}/></Pressable>
      <Typography style={s.headerTitle}>Cykl i samopoczucie</Typography>
      <View style={s.iconBtn}/>
    </View>

    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <Pressable onPress={onOpenCare} style={s.carePill}>
        <View style={s.carePillIcon}><Ionicons name="book-outline" size={17} color={c.pink}/></View>
        <View style={{flex:1}}><Typography style={s.carePillTitle}>Polka Care</Typography><Typography style={s.carePillSub}>Wiedza o cyklu i samopoczuciu</Typography></View>
        <Ionicons name="chevron-forward" size={18} color={c.pink}/>
      </Pressable>
      <View style={s.careHero}>
        <View style={s.careHeroTop}>
          <View>
            <Typography style={s.careEyebrow}>POLKA CARE</Typography>
            <Typography style={s.careHeroTitle}>{daysToPeriod===0?'Okres może zacząć się dziś':`${daysToPeriod} ${daysToPeriod===1?'dzień':'dni'} do okresu`}</Typography>
            <Typography style={s.careHeroSubtitle}>{phase.name} · dzień {cycleDay} cyklu</Typography>
          </View>
          {cloudSync&&userId&&<View style={s.cloudBadge}><Ionicons name="cloud-done-outline" size={13} color={c.pink}/><Typography style={s.cloudBadgeText}>prywatnie</Typography></View>}
        </View>

        <View style={s.careHeroBody}>
          <View style={s.clayScene}>
            <Image
              source={{uri:'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=800&q=85'}}
              style={s.cycleHeroImage}
              resizeMode="cover"
            />
          </View>
          <View style={s.careStats}>
            <View style={s.careStat}><Typography style={s.careStatValue}>{daysToPeriod}</Typography><Typography style={s.careStatLabel}>dni do okresu</Typography></View>
            <View style={s.careStat}><Typography style={s.careStatValue}>{cycleDay}</Typography><Typography style={s.careStatLabel}>dzień cyklu</Typography></View>
          </View>
        </View>

        <View style={s.progressTrackHero}><View style={[s.progressFillHero,{width:`${cycleProgress}%`}]}/></View>
        <View style={s.progressMeta}><Typography style={s.progressMetaText}>Początek cyklu</Typography><Typography style={s.progressMetaText}>{cycleLength} dni</Typography></View>
        <Typography style={s.careHeroCopy}>{phase.copy}</Typography>
      </View>

      <View style={s.sectionIntro}><Typography style={s.sectionIntroEyebrow}>KALENDARZ</Typography><Typography style={s.sectionIntroTitle}>Twój cykl</Typography><Typography style={s.sectionIntroCopy}>Prognoza, wpisy i samopoczucie w jednym miejscu.</Typography></View>
      <View style={s.calendarHead}>
        <Pressable onPress={()=>setMonth(m=>new Date(m.getFullYear(),m.getMonth()-1,1,12))} style={s.monthButton}><Ionicons name="chevron-back" size={21} color={c.ink}/></Pressable>
        <Pressable onPress={()=>{setMonth(new Date(today.getFullYear(),today.getMonth(),1,12));setSelectedDate(today)}}><Typography style={s.monthTitle}>{MONTHS[month.getMonth()]} {month.getFullYear()}</Typography></Pressable>
        <Pressable onPress={()=>setMonth(m=>new Date(m.getFullYear(),m.getMonth()+1,1,12))} style={s.monthButton}><Ionicons name="chevron-forward" size={21} color={c.ink}/></Pressable>
      </View>

      <View style={s.calendar}>
        <View style={s.weekRow}>{WEEK.map(day=><Typography key={day} style={s.weekDay}>{day}</Typography>)}</View>
        <View style={s.daysGrid}>
          {cells.map(date=>{
            const entry=entryFor(date);
            const predicted=predictedPeriodFor(date);
            const loggedPeriod=entry?.bleeding&&entry.bleeding!=='none';
            const selected=sameDay(date,selectedDate);
            const currentMonth=date.getMonth()===month.getMonth();
            return <Pressable key={isoDay(date)} onPress={()=>setSelectedDate(date)} style={s.dayCell}>
              <View style={[s.dayCircle,predicted&&s.predictedDay,loggedPeriod&&s.loggedPeriod,selected&&s.selectedDay]}>
                <Typography style={[s.dayText,!currentMonth&&s.dayMuted,(predicted||loggedPeriod||selected)&&s.dayStrong]}>{date.getDate()}</Typography>
              </View>
              {!!entry&&<View style={s.entryDot}/>}
            </Pressable>;
          })}
        </View>
        <View style={s.legend}>
          <View style={s.legendItem}><View style={[s.legendDot,{backgroundColor:c.pink}]}/><Typography style={s.legendText}>zapisany okres</Typography></View>
          <View style={s.legendItem}><View style={[s.legendDot,s.legendPredicted]}/><Typography style={s.legendText}>przewidywany</Typography></View>
          <View style={s.legendItem}><View style={[s.legendDot,{backgroundColor:c.ink}]}/><Typography style={s.legendText}>wpis</Typography></View>
        </View>
      </View>

      <View style={s.selectedHeader}>
        <View><Typography style={s.selectedEyebrow}>{sameDay(selectedDate,today)?'DZISIAJ':'WYBRANY DZIEŃ'}</Typography><Typography style={s.selectedTitle}>{selectedDate.toLocaleDateString('pl-PL',{weekday:'long',day:'numeric',month:'long'})}</Typography></View>
        <Typography style={s.selectedCycleDay}>Dzień {cycleDay}</Typography>
      </View>

      <View style={s.quickPeriod}>
        <Typography style={s.logLabel}>Krwawienie</Typography>
        <View style={s.flowRow}>
          {[['none','Brak'],['light','Lekkie'],['medium','Średnie'],['heavy','Obfite']].map(([key,label])=><Pressable key={key} onPress={()=>setBleeding(key)} style={[s.flowOption,bleeding===key&&s.flowOptionActive]}><Typography style={[s.flowText,bleeding===key&&s.flowTextActive]}>{label}</Typography></Pressable>)}
        </View>
        <Pressable onPress={logPeriodStart} style={s.periodStartRow}><Ionicons name="water-outline" size={18} color={c.pink}/><Typography style={s.periodStartText}>Ustaw ten dzień jako początek okresu</Typography></Pressable>
      </View>

      <Typography style={s.logLabel}>Jak się czujesz?</Typography>
      <View style={s.moods}>{moods.map(item=><Pressable key={item} onPress={()=>setMood(item)} style={[s.mood,mood===item&&s.moodActive]}><Typography style={s.moodText}>{item}</Typography></Pressable>)}</View>

      <Typography style={s.logLabel}>Objawy i energia</Typography>
      <View style={s.chips}>{symptomOptions.map(item=><Chip key={item} label={item} selected={symptoms.includes(item)} onPress={()=>setSymptoms(prev=>prev.includes(item)?prev.filter(v=>v!==item):[...prev,item])}/>)}</View>

      <Typography style={s.logLabel}>Notatka</Typography>
      <TextInput value={note} onChangeText={setNote} multiline maxLength={600} placeholder="Co chcesz zapamiętać z tego dnia?" placeholderTextColor={c.muted} style={s.note}/>
      <View style={s.saveRow}><Button title={saved?'Zapisano':'Zapisz dzień'} icon={saved?'checkmark':'add'} onPress={saveSelected} style={s.saveButton}/></View>

      <View style={s.historySection}>
        <View style={s.historyHead}>
          <View><Typography style={s.historyOverline}>HISTORIA</Typography><Typography style={s.historyTitle}>Twoje ostatnie wpisy</Typography></View>
          {!!history.length&&<Pressable onPress={()=>setHistoryExpanded(v=>!v)}><Typography style={s.historyAction}>{historyExpanded?'Pokaż mniej':'Zobacz więcej'}</Typography></Pressable>}
        </View>

        <View style={s.historyStats}>
          <View style={s.historyStat}><Typography style={s.historyStatValue}>{history.length}</Typography><Typography style={s.historyStatLabel}>zapisanych dni</Typography></View>
          <View style={s.historyStat}><Typography style={s.historyStatValue}>{periodStarts.length}</Typography><Typography style={s.historyStatLabel}>początków okresu</Typography></View>
          <View style={s.historyStat}><Typography style={s.historyStatValue}>{averageLoggedCycle?averageLoggedCycle+' d':'—'}</Typography><Typography style={s.historyStatLabel}>średni cykl z wpisów</Typography></View>
        </View>

        {!recentEntries.length?<Typography style={s.historyEmpty}>Zapisz pierwszy dzień, a tutaj pojawi się historia objawów i cyklu.</Typography>:recentEntries.map(entry=><Pressable key={entry.date} onPress={()=>{const d=fromIso(entry.date);setSelectedDate(d);setMonth(new Date(d.getFullYear(),d.getMonth(),1,12));}} style={s.historyRow}>
          <View style={s.historyDate}><Typography style={s.historyDay}>{fromIso(entry.date).getDate()}</Typography><Typography style={s.historyMonth}>{MONTHS[fromIso(entry.date).getMonth()].slice(0,3)}</Typography></View>
          <View style={s.historyBody}>
            <Typography style={s.historyRowTitle}>{entry.bleeding&&entry.bleeding!=='none'?'Okres · ':''}{entry.mood||'🙂'} {entry.symptoms?.slice(0,2).join(' · ')||'Wpis dnia'}</Typography>
            <Typography numberOfLines={1} style={s.historyRowText}>{entry.note||('Dzień '+(entry.cycleDay||'—')+' cyklu')}</Typography>
          </View>
          <Ionicons name="chevron-forward" size={18} color={c.muted}/>
        </Pressable>)}
      </View>

      <View style={s.divider}/>

      <Pressable onPress={onOpenCare} style={s.rowLink}><View><Typography style={s.rowOverline}>POLKA CARE</Typography><Typography style={s.rowTitle}>Baza wiedzy</Typography><Typography style={s.rowText}>Cykl, objawy, opóźnienie okresu i proste wyjaśnienia.</Typography></View><Ionicons name="chevron-forward" size={20} color={c.muted}/></Pressable>
      <Pressable onPress={onOpenGroups} style={s.rowLink}><View><Typography style={s.rowOverline}>SPOŁECZNOŚĆ</Typography><Typography style={s.rowTitle}>Cykl i samopoczucie</Typography><Typography style={s.rowText}>Porozmawiaj z dziewczynami bez mieszania prywatnych danych trackera z grupą.</Typography></View><Ionicons name="chevron-forward" size={20} color={c.muted}/></Pressable>

      <Pressable onPress={()=>{setSelectedDate(today);setMonth(new Date(today.getFullYear(),today.getMonth(),1,12));}} style={s.rowLink}><View><Typography style={s.rowOverline}>SZYBKI POWRÓT</Typography><Typography style={s.rowTitle}>Przejdź do dzisiaj</Typography><Typography style={s.rowText}>Wróć do bieżącego dnia i uzupełnij wpis.</Typography></View><Ionicons name="today-outline" size={20} color={c.muted}/></Pressable>

      <View style={s.settings}>
        <Typography style={s.settingsTitle}>Ustawienia cyklu</Typography>
        <View style={s.settingRow}><Typography style={s.settingLabel}>Średni cykl</Typography><View style={s.stepper}><Pressable onPress={()=>setCycleLength(v=>Math.max(21,v-1))} style={s.stepBtn}><Ionicons name="remove" size={18} color={c.ink}/></Pressable><Typography style={s.stepValue}>{cycleLength} dni</Typography><Pressable onPress={()=>setCycleLength(v=>Math.min(40,v+1))} style={s.stepBtn}><Ionicons name="add" size={18} color={c.ink}/></Pressable></View></View>
        <View style={s.settingRow}><Typography style={s.settingLabel}>Długość okresu</Typography><View style={s.stepper}><Pressable onPress={()=>setPeriodLength(v=>Math.max(2,v-1))} style={s.stepBtn}><Ionicons name="remove" size={18} color={c.ink}/></Pressable><Typography style={s.stepValue}>{periodLength} dni</Typography><Pressable onPress={()=>setPeriodLength(v=>Math.min(10,v+1))} style={s.stepBtn}><Ionicons name="add" size={18} color={c.ink}/></Pressable></View></View>
      </View>

      <Typography style={s.disclaimer}>Prognozy są orientacyjne. Polka Care nie diagnozuje chorób i nie jest metodą antykoncepcji.</Typography>
    </ScrollView>
  </KeyboardAvoidingView>;
}

const s=StyleSheet.create({
  root:{flex:1,backgroundColor:c.canvas},
  header:{height:60,paddingHorizontal:12,backgroundColor:c.white,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:c.line,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  iconBtn:{width:40,height:40,borderRadius:20,alignItems:'center',justifyContent:'center'},
  headerTitle:{fontFamily:f.bold,fontSize:16,color:c.ink},
  content:{paddingBottom:80},

  summary:{paddingHorizontal:sp.lg,paddingTop:22,paddingBottom:20},
  summaryBadgeRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},
  summaryOverline:{fontFamily:f.bold,fontSize:10,letterSpacing:1.4,color:c.pink},
  cloudBadge:{flexDirection:'row',alignItems:'center',gap:4,backgroundColor:c.blush,borderRadius:999,paddingHorizontal:8,paddingVertical:5},
  cloudBadgeText:{fontFamily:f.bold,fontSize:9,color:c.pink},
  summaryMain:{flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between',marginTop:8},
  summaryNumber:{fontFamily:f.bold,fontSize:58,lineHeight:62,letterSpacing:-2.2,color:c.ink},
  summaryLabel:{fontFamily:f.semibold,fontSize:13,color:c.muted},
  summarySide:{alignItems:'flex-end',paddingBottom:4},
  summaryPhase:{fontFamily:f.bold,fontSize:15,color:c.ink,marginTop:5},
  summaryDay:{fontFamily:f.regular,fontSize:12,color:c.muted,marginTop:2},
  summaryCopy:{fontFamily:f.regular,fontSize:13,lineHeight:19,color:c.muted,marginTop:13,maxWidth:340},

  carePill:{marginHorizontal:sp.lg,marginTop:10,marginBottom:10,minHeight:62,borderRadius:18,backgroundColor:c.white,borderWidth:1,borderColor:c.line,paddingHorizontal:14,flexDirection:'row',alignItems:'center',gap:10},
  carePillIcon:{width:34,height:34,borderRadius:12,backgroundColor:c.blush,alignItems:'center',justifyContent:'center'},
  carePillTitle:{fontFamily:f.bold,fontSize:15,color:c.ink},
  carePillSub:{fontFamily:f.regular,fontSize:11,color:c.muted,marginTop:2},
  careHero:{marginHorizontal:sp.lg,marginTop:12,marginBottom:18,borderRadius:28,backgroundColor:'#F8E3EA',padding:18,overflow:'hidden'},
  careHeroTop:{flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between',gap:12},
  careEyebrow:{fontFamily:f.bold,fontSize:12,letterSpacing:1.25,color:c.pink},
  careHeroTitle:{fontFamily:f.bold,fontSize:31,lineHeight:35,color:c.ink,letterSpacing:-1.1,marginTop:5,maxWidth:290},
  careHeroSubtitle:{fontFamily:f.semibold,fontSize:15,color:c.muted,marginTop:7},
  careHeroBody:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:8,gap:12},
  clayScene:{width:148,height:176,borderRadius:30,backgroundColor:'#F0CBD9',alignItems:'center',justifyContent:'center',position:'relative',overflow:'hidden'},
  cycleHeroImage:{width:'100%',height:'100%'},
  clayGlow:{position:'absolute',width:126,height:126,borderRadius:63,backgroundColor:'#FFF1F5',top:15,left:11},
  clayHairBack:{position:'absolute',width:74,height:96,borderRadius:38,backgroundColor:'#6E4256',top:22,left:37},
  clayHead:{width:58,height:66,borderRadius:29,backgroundColor:'#F2BDAE',position:'absolute',top:30,left:45,alignItems:'center',zIndex:5},
  clayHairFront:{position:'absolute',width:48,height:17,borderBottomLeftRadius:18,borderBottomRightRadius:20,backgroundColor:'#6E4256',top:-1,left:4,transform:[{rotate:'-6deg'}]},
  clayEyeLeft:{position:'absolute',width:4,height:4,borderRadius:2,backgroundColor:'#3F2830',top:31,left:17},
  clayEyeRight:{position:'absolute',width:4,height:4,borderRadius:2,backgroundColor:'#3F2830',top:31,right:17},
  claySmile:{position:'absolute',width:16,height:7,borderBottomWidth:2,borderColor:'#A64D63',borderRadius:12,bottom:14},
  clayNeck:{position:'absolute',width:18,height:18,borderRadius:8,backgroundColor:'#F2BDAE',top:86,left:65,zIndex:4},
  clayTorso:{position:'absolute',width:72,height:78,borderTopLeftRadius:28,borderTopRightRadius:28,borderBottomLeftRadius:16,borderBottomRightRadius:16,backgroundColor:c.pink,top:94,left:38,zIndex:3},
  clayArmLeft:{position:'absolute',width:18,height:70,borderRadius:10,backgroundColor:'#F2BDAE',top:101,left:29,transform:[{rotate:'9deg'}],zIndex:2},
  clayArmRight:{position:'absolute',width:18,height:70,borderRadius:10,backgroundColor:'#F2BDAE',top:101,right:29,transform:[{rotate:'-9deg'}],zIndex:2},
  claySkirt:{position:'absolute',width:88,height:44,borderTopLeftRadius:18,borderTopRightRadius:18,backgroundColor:'#A94B70',bottom:-12,left:30,zIndex:2},
  claySparkle:{position:'absolute',width:11,height:11,borderRadius:4,backgroundColor:'#FFF6C9',transform:[{rotate:'45deg'}]},
  careStats:{flex:1,gap:10},
  careStat:{backgroundColor:'rgba(255,255,255,.72)',borderRadius:18,paddingVertical:12,paddingHorizontal:14},
  careStatValue:{fontFamily:f.bold,fontSize:28,color:c.ink},
  careStatLabel:{fontFamily:f.semibold,fontSize:12,color:c.muted,marginTop:2},
  progressTrackHero:{height:7,borderRadius:999,backgroundColor:'rgba(255,255,255,.68)',overflow:'hidden',marginTop:12},
  progressFillHero:{height:'100%',borderRadius:999,backgroundColor:c.pink},
  progressMeta:{flexDirection:'row',justifyContent:'space-between',marginTop:6},
  progressMetaText:{fontFamily:f.semibold,fontSize:11,color:c.muted},
  careHeroCopy:{fontFamily:f.regular,fontSize:14,lineHeight:20,color:c.muted,marginTop:12},
  sectionIntro:{paddingHorizontal:sp.lg,marginBottom:0,marginTop:2},
  sectionIntroEyebrow:{fontFamily:f.bold,fontSize:11,letterSpacing:1.2,color:c.pink},
  sectionIntroTitle:{fontFamily:f.bold,fontSize:30,lineHeight:34,color:c.ink,marginTop:4},
  sectionIntroCopy:{fontFamily:f.regular,fontSize:14,lineHeight:20,color:c.muted,marginTop:5},
  calendarHead:{paddingHorizontal:sp.lg,flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:4},
  monthButton:{width:40,height:40,alignItems:'center',justifyContent:'center'},
  monthTitle:{fontFamily:f.bold,fontSize:22,color:c.ink,textTransform:'capitalize'},
  calendar:{paddingHorizontal:sp.lg,paddingBottom:16},
  weekRow:{flexDirection:'row',marginTop:8},
  weekDay:{width:'14.2857%',textAlign:'center',fontFamily:f.semibold,fontSize:12,color:c.muted,paddingVertical:8},
  daysGrid:{flexDirection:'row',flexWrap:'wrap'},
  dayCell:{width:'14.2857%',height:48,alignItems:'center',justifyContent:'center'},
  dayCircle:{width:36,height:36,borderRadius:18,alignItems:'center',justifyContent:'center'},
  predictedDay:{borderWidth:1.5,borderColor:c.pink,borderStyle:'dashed'},
  loggedPeriod:{backgroundColor:c.pink,borderColor:c.pink},
  selectedDay:{borderWidth:2,borderColor:c.ink},
  dayText:{fontFamily:f.semibold,fontSize:15,color:c.ink},
  dayMuted:{color:'#B9ADB3'},
  dayStrong:{fontFamily:f.bold},
  entryDot:{position:'absolute',bottom:2,width:4,height:4,borderRadius:2,backgroundColor:c.ink},
  legend:{flexDirection:'row',flexWrap:'wrap',gap:12,marginTop:10},
  legendItem:{flexDirection:'row',alignItems:'center',gap:5},
  legendDot:{width:8,height:8,borderRadius:4},
  legendPredicted:{borderWidth:1,borderColor:c.pink,backgroundColor:c.white},
  legendText:{fontFamily:f.regular,fontSize:10,color:c.muted},

  selectedHeader:{paddingHorizontal:sp.lg,paddingTop:22,paddingBottom:14,borderTopWidth:1,borderTopColor:c.line,flexDirection:'row',justifyContent:'space-between',alignItems:'flex-end',gap:12},
  selectedEyebrow:{fontFamily:f.bold,fontSize:10,letterSpacing:1.2,color:c.pink},
  selectedTitle:{fontFamily:f.bold,fontSize:21,lineHeight:25,color:c.ink,marginTop:3,textTransform:'capitalize'},
  selectedCycleDay:{fontFamily:f.bold,fontSize:12,color:c.muted},

  quickPeriod:{paddingHorizontal:sp.lg},
  logLabel:{fontFamily:f.bold,fontSize:13,color:c.ink,marginHorizontal:sp.lg,marginTop:18,marginBottom:9},
  flowRow:{flexDirection:'row',gap:7},
  flowOption:{flex:1,height:38,borderRadius:12,borderWidth:1,borderColor:c.line,alignItems:'center',justifyContent:'center',backgroundColor:c.white},
  flowOptionActive:{borderColor:c.pink,backgroundColor:c.blush},
  flowText:{fontFamily:f.semibold,fontSize:11,color:c.muted},
  flowTextActive:{fontFamily:f.bold,color:c.pink},
  periodStartRow:{marginTop:10,flexDirection:'row',alignItems:'center',gap:7,paddingVertical:8},
  periodStartText:{fontFamily:f.bold,fontSize:12,color:c.pink},

  moods:{flexDirection:'row',gap:8,paddingHorizontal:sp.lg},
  mood:{width:48,height:48,borderRadius:16,backgroundColor:c.white,borderWidth:1,borderColor:c.line,alignItems:'center',justifyContent:'center'},
  moodActive:{borderColor:c.pink,backgroundColor:c.blush},
  moodText:{fontSize:23},
  chips:{flexDirection:'row',flexWrap:'wrap',paddingHorizontal:sp.lg},
  note:{minHeight:90,marginHorizontal:sp.lg,borderRadius:16,borderWidth:1,borderColor:c.line,backgroundColor:c.white,padding:13,fontFamily:f.regular,fontSize:14,color:c.ink,textAlignVertical:'top',marginBottom:14},
  saveRow:{paddingHorizontal:sp.lg,alignItems:'flex-end'},
  saveButton:{minHeight:46,paddingHorizontal:18,borderRadius:14},

  historySection:{marginTop:30},
  historyHead:{paddingHorizontal:sp.lg,flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between',gap:12},
  historyOverline:{fontFamily:f.bold,fontSize:9,letterSpacing:1.2,color:c.pink},
  historyTitle:{fontFamily:f.bold,fontSize:21,color:c.ink,marginTop:3},
  historyAction:{fontFamily:f.bold,fontSize:12,color:c.pink,paddingVertical:5},
  historyStats:{flexDirection:'row',paddingHorizontal:sp.lg,marginTop:14,gap:10},
  historyStat:{flex:1,paddingVertical:12,borderTopWidth:1,borderColor:c.line},
  historyStatValue:{fontFamily:f.bold,fontSize:18,color:c.ink},
  historyStatLabel:{fontFamily:f.regular,fontSize:9,lineHeight:13,color:c.muted,marginTop:2},
  historyEmpty:{fontFamily:f.regular,fontSize:12,lineHeight:18,color:c.muted,marginHorizontal:sp.lg,marginTop:16},
  historyRow:{marginHorizontal:sp.lg,minHeight:68,paddingVertical:10,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:c.line,flexDirection:'row',alignItems:'center',gap:12},
  historyDate:{width:42,alignItems:'center'},
  historyDay:{fontFamily:f.bold,fontSize:20,color:c.ink},
  historyMonth:{fontFamily:f.semibold,fontSize:9,color:c.muted,textTransform:'uppercase'},
  historyBody:{flex:1,minWidth:0},
  historyRowTitle:{fontFamily:f.bold,fontSize:13,color:c.ink},
  historyRowText:{fontFamily:f.regular,fontSize:11,color:c.muted,marginTop:2},
  divider:{height:1,backgroundColor:c.line,marginHorizontal:sp.lg,marginTop:28,marginBottom:6},
  rowLink:{marginHorizontal:sp.lg,paddingVertical:16,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:c.line,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:16},
  rowOverline:{fontFamily:f.bold,fontSize:9,letterSpacing:1.2,color:c.pink},
  rowTitle:{fontFamily:f.bold,fontSize:16,color:c.ink,marginTop:3},
  rowText:{fontFamily:f.regular,fontSize:11,lineHeight:16,color:c.muted,marginTop:3,maxWidth:300},

  settings:{marginHorizontal:sp.lg,marginTop:26,paddingTop:4},
  settingsTitle:{fontFamily:f.bold,fontSize:18,color:c.ink,marginBottom:8},
  settingRow:{minHeight:56,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:c.line},
  settingLabel:{fontFamily:f.semibold,fontSize:13,color:c.ink},
  stepper:{flexDirection:'row',alignItems:'center',gap:10},
  stepBtn:{width:34,height:34,borderRadius:11,borderWidth:1,borderColor:c.line,backgroundColor:c.white,alignItems:'center',justifyContent:'center'},
  stepValue:{fontFamily:f.bold,fontSize:13,color:c.ink,minWidth:48,textAlign:'center'},
  disclaimer:{fontFamily:f.regular,fontSize:10,lineHeight:16,color:c.muted,marginHorizontal:sp.lg,marginTop:18}
});