import React,{useMemo,useState} from 'react';
import {Alert,FlatList,KeyboardAvoidingView,Platform,Pressable,ScrollView,StyleSheet,TextInput,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {groups as seedGroups,cities} from './data';
import {colors as c,space as sp,radii as r,fonts as f} from './theme';
import {Button,Chip,Field,PageHeading,Surface,Typography} from './ui';

const categories=['Kawa','Sport','Książki','Podróże','Jedzenie','Muzyka','Studia','Inne'];
const text=(value,max)=>value.trim().slice(0,max);
const localId=()=>`demo-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;

export default function ClubsMeetupsScreen({onReport}){
  const [view,setView]=useState('Kluby');
  const [clubs,setClubs]=useState(seedGroups.map(g=>({...g,demo:true})));
  const [meetups,setMeetups]=useState([]);
  const [joined,setJoined]=useState([]);
  const [interested,setInterested]=useState([]);
  const [form,setForm]=useState(null);
  const [name,setName]=useState('');
  const [description,setDescription]=useState('');
  const [city,setCity]=useState('Warszawa');
  const [category,setCategory]=useState('Kawa');
  const [date,setDate]=useState('');
  const [time,setTime]=useState('');
  const [clubId,setClubId]=useState('');
  const reset=()=>{setForm(null);setName('');setDescription('');setCity('Warszawa');setCategory('Kawa');setDate('');setTime('');setClubId('')};
  const addClub=()=>{
    if(text(name,80).length<2)return Alert.alert('Podaj nazwę klubu','Wpisz przynajmniej dwa znaki.');
    const id=localId();
    setClubs(old=>[{id,name:text(name,80),city,description:text(description,500)||'Nowy klub',icon:'people-outline',category,owned:true,demo:true},...old]);
    setJoined(old=>[...old,id]);reset();setView('Kluby');
    Alert.alert('Klub w demonstracji','Klub zapisano tylko na ten czas działania aplikacji. W produkcji wymaga moderacji.');
  };
  const addMeetup=()=>{
    if(text(name,100).length<3)return Alert.alert('Podaj tytuł spotkania');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))return Alert.alert('Podaj termin','Data: RRRR-MM-DD, godzina: GG:MM.');
    const starts=new Date(`${date}T${time}:00`);
    if(Number.isNaN(starts.getTime())||starts.getTime()<=Date.now()||starts.getFullYear()!==Number(date.slice(0,4))||starts.getMonth()+1!==Number(date.slice(5,7))||starts.getDate()!==Number(date.slice(8,10)))return Alert.alert('Wybierz przyszły, poprawny termin');
    const selected=clubId?clubs.find(g=>g.id===clubId):null;
    if(clubId&&!selected)return Alert.alert('Klub jest niedostępny');
    setMeetups(old=>[{id:localId(),title:text(name,100),description:text(description,500),city,startsAt:starts.toISOString(),clubName:selected?.name||null,clubId:clubId||null,owned:true},...old]);
    reset();setView('Spotkania');
    Alert.alert('Spotkanie w demonstracji','Spotkanie zapisano tylko lokalnie. W produkcji wymaga zatwierdzenia przed publikacją.');
  };
  const availableClubs=useMemo(()=>clubs.filter(g=>joined.includes(g.id)),[clubs,joined]);
  if(form)return <KeyboardAvoidingView style={{flex:1,backgroundColor:c.canvas}} behavior={Platform.OS==='ios'?'padding':undefined}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.page}>
      <Pressable accessibilityRole="button" accessibilityLabel="Wróć" onPress={reset} style={s.back}><Ionicons name="arrow-back" size={22} color={c.pink}/><Typography>Wróć</Typography></Pressable>
      <PageHeading kicker={form==='club'?'NOWY KLUB':'NOWE SPOTKANIE'} title={form==='club'?'Załóż klub.':'Zaplanuj wyjście.'}/>
      <Typography style={s.hint}>Wersja demonstracyjna — niczego nie publikujemy ani nie wysyłamy innym osobom.</Typography>
      <Field label={form==='club'?'Nazwa klubu':'Tytuł spotkania'} value={name} onChangeText={v=>setName(v.slice(0,form==='club'?80:100))} placeholder={form==='club'?'Np. Girls Coffee Warszawa':'Np. Kawa w sobotę'}/>
      <Field label="Opis (opcjonalnie)" value={description} onChangeText={v=>setDescription(v.slice(0,500))} placeholder="Kogo zapraszasz i co planujesz?" multiline/>
      <Typography style={s.label}>Miasto</Typography><ScrollView horizontal showsHorizontalScrollIndicator={false}>{cities.map(item=><Chip key={item} label={item} selected={city===item} onPress={()=>setCity(item)}/>)}</ScrollView>
      {form==='club'?<><Typography style={s.label}>Temat klubu</Typography><View style={s.chips}>{categories.map(item=><Chip key={item} label={item} selected={category===item} onPress={()=>setCategory(item)}/>)}</View></>:<>
        <Typography style={s.label}>Klub (opcjonalnie)</Typography><View style={s.chips}><Chip label="Bez klubu" selected={!clubId} onPress={()=>setClubId('')}/>{availableClubs.map(item=><Chip key={item.id} label={item.name} selected={clubId===item.id} onPress={()=>setClubId(item.id)}/>)}</View>
        <Field label="Data · RRRR-MM-DD" value={date} onChangeText={v=>setDate(v.slice(0,10))} keyboardType="numbers-and-punctuation" placeholder="2026-10-10"/>
        <Field label="Godzina · GG:MM" value={time} onChangeText={v=>setTime(v.slice(0,5))} keyboardType="numbers-and-punctuation" placeholder="16:00"/>
        <Typography style={s.hint}>Nie wpisuj adresu domu. Dokładną lokalizację udostępniaj dopiero zaufanym uczestniczkom.</Typography>
      </>}
      <Button title={form==='club'?'Utwórz klub demo':'Utwórz spotkanie demo'} onPress={form==='club'?addClub:addMeetup} style={{marginTop:sp.lg}}/>
    </ScrollView>
  </KeyboardAvoidingView>;
  return <View style={{flex:1,backgroundColor:c.canvas}}>
    <View style={{paddingHorizontal:sp.lg,paddingTop:sp.lg}}><PageHeading kicker="POLKA / RAZEM" title="Spotkajmy się."/>
      <View style={s.switch}>{['Kluby','Spotkania'].map(item=><Pressable accessibilityRole="tab" accessibilityState={{selected:view===item}} key={item} style={[s.segment,view===item&&s.selected]} onPress={()=>setView(item)}><Typography style={{color:view===item?c.white:c.ink,fontFamily:f.bold}}>{item}</Typography></Pressable>)}</View>
      <Button title={view==='Kluby'?'+ Załóż klub':'+ Dodaj spotkanie'} onPress={()=>{reset();setForm(view==='Kluby'?'club':'meetup')}} style={{marginBottom:sp.md}}/>
    </View>
    {view==='Kluby'?<FlatList data={clubs} keyExtractor={item=>item.id} contentContainerStyle={s.list} renderItem={({item})=><Surface>
      <View style={s.row}><View style={s.icon}><Ionicons name={item.icon||'people-outline'} size={25} color={c.pink}/></View><View style={{flex:1}}><Typography variant="subtitle">{item.name}</Typography><Typography variant="caption" style={{color:c.muted}}>{item.city} · {item.category||'Klub'} · DEMO</Typography></View></View>
      <Typography style={{marginTop:sp.sm}}>{item.description}</Typography>
      <View style={s.row}><Button title={joined.includes(item.id)?'Opuść klub':'Dołącz'} secondary onPress={()=>setJoined(old=>old.includes(item.id)?old.filter(v=>v!==item.id):[...old,item.id])} style={{flex:1}}/>
      {item.owned?<Pressable accessibilityRole="button" accessibilityLabel="Usuń swój klub" onPress={()=>Alert.alert('Usunąć klub demo?',item.name,[{text:'Anuluj',style:'cancel'},{text:'Usuń',style:'destructive',onPress:()=>{setClubs(old=>old.filter(g=>g.id!==item.id));setMeetups(old=>old.filter(m=>m.clubId!==item.id))}}])}><Ionicons name="trash-outline" size={23} color={c.pink}/></Pressable>:<Pressable accessibilityRole="button" accessibilityLabel="Zgłoś klub" onPress={()=>onReport?.({kind:'group',id:item.id,label:`Klub: ${item.name}`})}><Ionicons name="flag-outline" size={23} color={c.pink}/></Pressable>}</View>
    </Surface>} ListFooterComponent={<Typography variant="caption" style={s.hint}>Kluby demonstracyjne. W produkcji tworzenie i publikacja wymagają uprawnień, RLS i moderacji.</Typography>}/>
    :<FlatList data={meetups} keyExtractor={item=>item.id} contentContainerStyle={s.list} ListEmptyComponent={<Surface><Typography variant="subtitle">Jeszcze nie ma spotkań demo.</Typography><Typography style={s.hint}>Dodaj pierwsze, żeby przetestować formularz i zapisy.</Typography></Surface>}
      renderItem={({item})=><Surface><Typography variant="subtitle">{item.title}</Typography><Typography style={s.hint}>{item.city} · {new Date(item.startsAt).toLocaleString('pl-PL')} · DEMO{item.clubName?` · ${item.clubName}`:''}</Typography><Typography>{item.description}</Typography>
      <View style={s.row}><Button title={item.owned?'Organizatorka':interested.includes(item.id)?'Wycofaj zainteresowanie':'Jestem zainteresowana'} secondary disabled={item.owned} onPress={()=>setInterested(old=>old.includes(item.id)?old.filter(id=>id!==item.id):[...old,item.id])} style={{flex:1}}/>
      {item.owned?<Pressable accessibilityRole="button" accessibilityLabel="Usuń swoje spotkanie" onPress={()=>Alert.alert('Usunąć spotkanie demo?',item.title,[{text:'Anuluj',style:'cancel'},{text:'Usuń',style:'destructive',onPress:()=>setMeetups(old=>old.filter(e=>e.id!==item.id))}])}><Ionicons name="trash-outline" size={23} color={c.pink}/></Pressable>:<Pressable accessibilityRole="button" accessibilityLabel="Zgłoś spotkanie" onPress={()=>onReport?.({kind:'meetup',id:item.id,label:`Spotkanie: ${item.title}`})}><Ionicons name="flag-outline" size={23} color={c.pink}/></Pressable>}</View></Surface>}
      ListFooterComponent={<Typography variant="caption" style={s.hint}>Zgłoszenia i zapisy demo nie trafiają na serwer. W produkcji tylko zatwierdzone wydarzenia będą widoczne.</Typography>}/>}
  </View>;
}
const s=StyleSheet.create({page:{padding:sp.lg,paddingBottom:sp.xxl},list:{paddingHorizontal:sp.lg,paddingBottom:sp.xxl,flexGrow:1},back:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:sp.lg},hint:{color:c.muted,fontSize:13,lineHeight:20,marginBottom:sp.base},label:{fontFamily:f.semibold,color:c.ink,marginBottom:sp.sm,marginTop:sp.sm},chips:{flexDirection:'row',flexWrap:'wrap',marginBottom:sp.md},switch:{flexDirection:'row',gap:8,marginBottom:sp.base},segment:{flex:1,alignItems:'center',padding:12,borderRadius:r.md,backgroundColor:c.blush},selected:{backgroundColor:c.pink},row:{flexDirection:'row',alignItems:'center',gap:sp.md,marginTop:sp.md},icon:{height:54,width:54,borderRadius:r.md,backgroundColor:c.blush,alignItems:'center',justifyContent:'center'}});
