import React,{useEffect,useMemo,useState} from 'react';
import {Alert,KeyboardAvoidingView,Platform,Pressable,ScrollView,StyleSheet,TextInput,View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Ionicons} from '@expo/vector-icons';
import {colors as c,fonts as f,space as sp} from './theme';
import {Button,Chip,Typography} from './ui';

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

export default function CycleScreen({onClose,onOpenGroups,onOpenCare}){
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

  useEffect(()=>{AsyncStorage.getItem(STORAGE_KEY).then(raw=>{
    if(!raw)return;
    try{
      const data=JSON.parse(raw);
      if(data.cycleLength)setCycleLength(data.cycleLength);
      if(data.periodLength)setPeriodLength(data.periodLength);
      if(data.lastPeriod)setLastPeriod(data.lastPeriod);
      if(Array.isArray(data.history))setHistory(data.history);
    }catch{}
  }).catch(()=>{});},[]);

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

  const persist=async(nextHistory,nextLastPeriod=lastPeriod)=>{
    await AsyncStorage.setItem(STORAGE_KEY,JSON.stringify({cycleLength,periodLength,lastPeriod:nextLastPeriod,history:nextHistory}));
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
    try{await persist(next,nextLast);}catch{Alert.alert('Nie udało się zapisać','Spróbuj ponownie.');}
  };

  const logPeriodStart=async()=>{
    const date=isoDay(selectedDate);
    const entry={date,cycleDay:1,symptoms,mood,note:note.trim().slice(0,600),bleeding:'medium',isPeriodStart:true};
    const next=[entry,...history.filter(item=>item.date!==date)].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,180);
    setBleeding('medium');
    setHistory(next);
    setLastPeriod(date);
    setSaved(true);
    try{await persist(next,date);}catch{}
  };

  return <KeyboardAvoidingView style={s.root} behavior={Platform.OS==='ios'?'padding':undefined}>
    <View style={s.header}>
      <Pressable onPress={onClose} style={s.iconBtn}><Ionicons name="arrow-back" size={24} color={c.ink}/></Pressable>
      <Typography style={s.headerTitle}>Cykl i samopoczucie</Typography>
      <Pressable onPress={onOpenCare} style={s.iconBtn}><Ionicons name="book-outline" size={22} color={c.ink}/></Pressable>
    </View>

    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.summary}>
        <Typography style={s.summaryOverline}>POLKA CARE</Typography>
        <View style={s.summaryMain}>
          <View><Typography style={s.summaryNumber}>{daysToPeriod}</Typography><Typography style={s.summaryLabel}>{daysToPeriod===1?'dzień do okresu':'dni do okresu'}</Typography></View>
          <View style={s.summarySide}><Ionicons name={phase.icon} size={22} color={c.pink}/><Typography style={s.summaryPhase}>{phase.name}</Typography><Typography style={s.summaryDay}>Dzień {cycleDay}</Typography></View>
        </View>
        <Typography style={s.summaryCopy}>{phase.copy}</Typography>
      </View>

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
  summaryOverline:{fontFamily:f.bold,fontSize:10,letterSpacing:1.4,color:c.pink},
  summaryMain:{flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between',marginTop:8},
  summaryNumber:{fontFamily:f.bold,fontSize:58,lineHeight:62,letterSpacing:-2.2,color:c.ink},
  summaryLabel:{fontFamily:f.semibold,fontSize:13,color:c.muted},
  summarySide:{alignItems:'flex-end',paddingBottom:4},
  summaryPhase:{fontFamily:f.bold,fontSize:15,color:c.ink,marginTop:5},
  summaryDay:{fontFamily:f.regular,fontSize:12,color:c.muted,marginTop:2},
  summaryCopy:{fontFamily:f.regular,fontSize:13,lineHeight:19,color:c.muted,marginTop:13,maxWidth:340},

  calendarHead:{paddingHorizontal:sp.lg,flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:4},
  monthButton:{width:40,height:40,alignItems:'center',justifyContent:'center'},
  monthTitle:{fontFamily:f.bold,fontSize:18,color:c.ink,textTransform:'capitalize'},
  calendar:{paddingHorizontal:sp.lg,paddingBottom:16},
  weekRow:{flexDirection:'row',marginTop:8},
  weekDay:{width:'14.2857%',textAlign:'center',fontFamily:f.semibold,fontSize:10,color:c.muted,paddingVertical:7},
  daysGrid:{flexDirection:'row',flexWrap:'wrap'},
  dayCell:{width:'14.2857%',height:48,alignItems:'center',justifyContent:'center'},
  dayCircle:{width:36,height:36,borderRadius:18,alignItems:'center',justifyContent:'center'},
  predictedDay:{borderWidth:1.5,borderColor:c.pink,borderStyle:'dashed'},
  loggedPeriod:{backgroundColor:c.pink,borderColor:c.pink},
  selectedDay:{borderWidth:2,borderColor:c.ink},
  dayText:{fontFamily:f.semibold,fontSize:13,color:c.ink},
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