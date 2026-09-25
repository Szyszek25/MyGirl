import React,{useMemo,useState} from 'react';
import {Alert,FlatList,KeyboardAvoidingView,Modal,Platform,Pressable,ScrollView,StyleSheet,TextInput,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {groups as seedGroups,cities,people} from './data';
import {colors as c,space as sp,radii as r,fonts as f} from './theme';
import {Button,Chip,Field,PageHeading,Surface,Typography} from './ui';

const categories=['Kawa','Sport','Książki','Podróże','Jedzenie','Muzyka','Studia','Inne'];
const seedMeetups=[
  {id:'e1',title:'Matcha + spacer po centrum',city:'Warszawa',startsAt:'2026-09-27T17:30:00',clubId:'coffee-waw',clubName:'Matcha & Coffee Girls',description:'Spotykamy się na matchę i idziemy na luźny spacer po centrum.',spots:6,joined:4},
  {id:'e2',title:'Girls night + karaoke',city:'Warszawa',startsAt:'2026-09-28T20:00:00',clubId:'girls-night-waw',clubName:'Girls Night Warszawa',description:'Karaoke, drinki i luźny wieczór. Bez spiny.',spots:8,joined:5},
  {id:'e3',title:'Pilates + brunch',city:'Wrocław',startsAt:'2026-10-03T11:00:00',clubId:'pilates-wro',clubName:'Pilates & Wellness',description:'Pilates rano, potem brunch w centrum.',spots:5,joined:3},
  {id:'e4',title:'Book club: wrześniowe spotkanie',city:'Gdańsk',startsAt:'2026-10-04T16:00:00',clubId:'books-gda',clubName:'Book Club',description:'Kawa i rozmowa o książce miesiąca.',spots:10,joined:7},
];
const text=(value,max)=>value.trim().slice(0,max);
const localId=()=>`demo-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;

export default function ClubsMeetupsScreen({city='Warszawa',onReport}){
  const [view,setView]=useState('Kluby');
  const [clubs,setClubs]=useState(seedGroups.map((g,i)=>({...g,demo:true,members:18+i*7})));
  const [meetups,setMeetups]=useState(seedMeetups);
  const [joined,setJoined]=useState(['coffee-waw']);
  const [interested,setInterested]=useState(['e1']);
  const [form,setForm]=useState(null);
  const [activeClub,setActiveClub]=useState(null);
  const [activeMeetup,setActiveMeetup]=useState(null);
  const [name,setName]=useState('');
  const [description,setDescription]=useState('');
  const activeCity=city;
  const [category,setCategory]=useState('Kawa');
  const [date,setDate]=useState('');
  const [time,setTime]=useState('');
  const [clubId,setClubId]=useState('');

  const reset=()=>{setForm(null);setName('');setDescription('');setCategory('Kawa');setDate('');setTime('');setClubId('')};
  const availableClubs=useMemo(()=>clubs.filter(g=>joined.includes(g.id)),[clubs,joined]);

  const toggleJoin=club=>{
    setJoined(old=>old.includes(club.id)?old.filter(v=>v!==club.id):[...old,club.id]);
  };

  const joinAndOpen=club=>{
    setJoined(old=>old.includes(club.id)?old:[...old,club.id]);
    setActiveClub(club);
  };

  const addClub=()=>{
    if(text(name,80).length<2)return Alert.alert('Podaj nazwę klubu','Wpisz przynajmniej dwa znaki.');
    const id=localId();
    const club={id,name:text(name,80),city:activeCity,description:text(description,500)||'Nowy klub',icon:'people-outline',category,owned:true,demo:true,members:1};
    setClubs(old=>[club,...old]);setJoined(old=>[...old,id]);reset();setActiveClub(club);
  };

  const addMeetup=()=>{
    if(text(name,100).length<3)return Alert.alert('Podaj tytuł spotkania');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))return Alert.alert('Podaj termin','Data: RRRR-MM-DD, godzina: GG:MM.');
    const starts=new Date(`${date}T${time}:00`);
    if(Number.isNaN(starts.getTime())||starts.getTime()<=Date.now())return Alert.alert('Wybierz przyszły, poprawny termin');
    const selected=clubId?clubs.find(g=>g.id===clubId):null;
    const meetup={id:localId(),title:text(name,100),description:text(description,500)||'Nowe spotkanie',activeCity,startsAt:starts.toISOString(),clubName:selected?.name||null,clubId:clubId||null,owned:true,spots:6,joined:1};
    setMeetups(old=>[meetup,...old]);setInterested(old=>[...old,meetup.id]);reset();setActiveMeetup(meetup);
  };

  if(activeClub){
    const club=clubs.find(g=>g.id===activeClub.id)||activeClub;
    const related=meetups.filter(m=>m.clubId===club.id);
    const isJoined=joined.includes(club.id);
    return <Modal visible animationType="slide" transparent onRequestClose={()=>setActiveClub(null)}><View style={s.modalBackdrop}><Pressable style={StyleSheet.absoluteFill} onPress={()=>setActiveClub(null)}/><View style={s.detailModal}><View style={s.modalHandle}/><ScrollView contentContainerStyle={s.detailPage} showsVerticalScrollIndicator={false}>
      <Pressable style={s.back} onPress={()=>setActiveClub(null)}><Ionicons name="arrow-back" size={23} color={c.ink}/><Typography style={{fontFamily:f.bold}}>Grupy</Typography></Pressable>
      <View style={s.heroIcon}><Ionicons name={club.icon||'people-outline'} size={42} color={c.pink}/></View>
      <Typography variant="hero" style={s.detailTitle}>{club.name}</Typography>
      <Typography style={s.meta}>{club.city} · {club.category||'Klub'} · {club.members||1} członkiń</Typography>
      <Typography style={s.description}>{club.description}</Typography>
      <View style={s.memberRow}>{people.slice(0,5).map(p=><View key={p.id} style={s.memberBubble}><Typography style={{fontSize:12,fontFamily:f.bold}}>{p.name[0]}</Typography></View>)}<Typography variant="caption" style={s.meta}>+ więcej</Typography></View>
      <Button title={isJoined?'Opuść klub':'Dołącz do klubu'} secondary={isJoined} onPress={()=>toggleJoin(club)}/>
      <View style={s.detailActions}>
        <Pressable style={s.actionCell}><Ionicons name="chatbubbles-outline" size={22} color={c.pink}/><Typography style={s.actionLabel}>Czat grupy</Typography></Pressable>
        <Pressable style={s.actionCell} onPress={()=>onReport?.({kind:'group',id:club.id,label:`Klub: ${club.name}`})}><Ionicons name="flag-outline" size={22} color={c.pink}/><Typography style={s.actionLabel}>Zgłoś</Typography></Pressable>
      </View>
      <Typography variant="subtitle" style={s.sectionTitle}>Nadchodzące wydarzenia</Typography>
      {related.length?related.map(m=><Pressable key={m.id} onPress={()=>{setActiveClub(null);setActiveMeetup(m)}} style={s.compactCard}><View style={s.dateBadge}><Typography style={s.dateBig}>{new Date(m.startsAt).getDate()}</Typography><Typography variant="caption">{new Date(m.startsAt).toLocaleString('pl-PL',{month:'short'})}</Typography></View><View style={{flex:1}}><Typography style={s.compactTitle}>{m.title}</Typography><Typography variant="caption" style={s.meta}>{new Date(m.startsAt).toLocaleString('pl-PL')} · {m.joined}/{m.spots}</Typography></View><Ionicons name="chevron-forward" size={20} color={c.muted}/></Pressable>):<Typography style={s.meta}>Jeszcze nie ma wydarzeń w tym klubie.</Typography>}
    </ScrollView></View></View></Modal>;
  }

  if(activeMeetup){
    const meetup=meetups.find(m=>m.id===activeMeetup.id)||activeMeetup;
    const isGoing=interested.includes(meetup.id);
    return <Modal visible animationType="slide" transparent onRequestClose={()=>setActiveMeetup(null)}><View style={s.modalBackdrop}><Pressable style={StyleSheet.absoluteFill} onPress={()=>setActiveMeetup(null)}/><View style={s.detailModal}><View style={s.modalHandle}/><ScrollView contentContainerStyle={s.detailPage} showsVerticalScrollIndicator={false}>
      <Pressable style={s.back} onPress={()=>setActiveMeetup(null)}><Ionicons name="arrow-back" size={23} color={c.ink}/><Typography style={{fontFamily:f.bold}}>Wydarzenia</Typography></Pressable>
      <View style={s.eventHero}><Ionicons name="calendar-outline" size={28} color={c.pink}/><Typography style={s.screenSubtitle}>Szczegóły wydarzenia</Typography></View>
      <Typography variant="hero" style={s.detailTitle}>{meetup.title}</Typography>
      <Typography style={s.meta}>{meetup.city} · {new Date(meetup.startsAt).toLocaleString('pl-PL')}</Typography>
      {!!meetup.clubName&&<Typography style={s.clubLink}>{meetup.clubName}</Typography>}
      <Typography style={s.description}>{meetup.description}</Typography>
      <Surface style={s.attendance}><View><Typography style={s.screenSubtitle}>Uczestniczki</Typography><Typography variant="heading">{meetup.joined}/{meetup.spots}</Typography></View><View style={s.memberRow}>{people.slice(0,4).map(p=><View key={p.id} style={s.memberBubble}><Typography style={{fontSize:12,fontFamily:f.bold}}>{p.name[0]}</Typography></View>)}</View></Surface>
      <Button title={meetup.owned?'Jesteś organizatorką':isGoing?'Dołączono · wycofaj':'Dołącz do wydarzenia'} secondary={isGoing||meetup.owned} disabled={meetup.owned} onPress={()=>setInterested(old=>isGoing?old.filter(id=>id!==meetup.id):[...old,meetup.id])}/>
      <View style={s.detailActions}>
        <Pressable style={s.actionCell}><Ionicons name="share-social-outline" size={22} color={c.pink}/><Typography style={s.actionLabel}>Udostępnij</Typography></Pressable>
        <Pressable style={s.actionCell} onPress={()=>onReport?.({kind:'meetup',id:meetup.id,label:`Wydarzenie: ${meetup.title}`})}><Ionicons name="flag-outline" size={22} color={c.pink}/><Typography style={s.actionLabel}>Zgłoś</Typography></Pressable>
      </View>
    </ScrollView></View></View></Modal>;
  }

  if(form)return <KeyboardAvoidingView style={{flex:1,backgroundColor:c.canvas}} behavior={Platform.OS==='ios'?'padding':'height'} keyboardVerticalOffset={Platform.OS==='ios'?8:0}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.page}>
      <Pressable onPress={reset} style={s.back}><Ionicons name="arrow-back" size={22} color={c.ink}/><Typography style={{fontFamily:f.bold}}>Wróć</Typography></Pressable>
      <View style={s.formHeader}><Typography style={s.screenTitle}>{form==='club'?'Nowa grupa':'Nowe wydarzenie'}</Typography><Typography style={s.screenSubtitle}>{form==='club'?'Stwórz własną społeczność':'Zaproś dziewczyny na konkretny plan'}</Typography></View>
      <Field label={form==='club'?'Nazwa klubu':'Tytuł wydarzenia'} value={name} onChangeText={v=>setName(v.slice(0,form==='club'?80:100))} placeholder={form==='club'?'Np. Matcha Girls Warszawa':'Np. Girls night w piątek'}/>
      <Field label="Opis" value={description} onChangeText={v=>setDescription(v.slice(0,500))} placeholder="Co planujesz?" multiline/>
      <View style={s.fixedCity}><Ionicons name="location-outline" size={16} color={c.pink}/><Typography style={s.fixedCityText}>{activeCity}</Typography></View>
      {form==='club'?<><Typography style={s.label}>Temat</Typography><View style={s.chips}>{categories.map(item=><Chip key={item} label={item} selected={category===item} onPress={()=>setCategory(item)}/>)}</View></>:<>
        <Typography style={s.label}>Klub (opcjonalnie)</Typography><View style={s.chips}><Chip label="Bez klubu" selected={!clubId} onPress={()=>setClubId('')}/>{availableClubs.map(item=><Chip key={item.id} label={item.name} selected={clubId===item.id} onPress={()=>setClubId(item.id)}/>)}</View>
        <Field label="Data · RRRR-MM-DD" value={date} onChangeText={v=>setDate(v.slice(0,10))} keyboardType="numbers-and-punctuation" placeholder="2026-10-10"/>
        <Field label="Godzina · GG:MM" value={time} onChangeText={v=>setTime(v.slice(0,5))} keyboardType="numbers-and-punctuation" placeholder="16:00"/>
      </>}
      <Button title={form==='club'?'Utwórz klub':'Utwórz wydarzenie'} onPress={form==='club'?addClub:addMeetup} style={{marginTop:sp.lg}}/>
    </ScrollView>
  </KeyboardAvoidingView>;

  const data=(view==='Kluby'?clubs:meetups).filter(item=>item.city===activeCity);
  return <View style={s.root}>
    <View style={s.topArea}>
      <View style={s.titleRow}><View><Typography style={s.screenTitle}>Razem</Typography><Typography style={s.screenSubtitle}>Grupy i wydarzenia w Twoim mieście</Typography></View><Pressable style={s.plus} onPress={()=>{reset();setForm(view==='Kluby'?'club':'meetup')}}><Ionicons name="add" size={25} color={c.white}/></Pressable></View>
      <View style={s.switch}>{['Kluby','Wydarzenia'].map(item=>{const mapped=item==='Wydarzenia'?'Spotkania':item;return <Pressable key={item} style={[s.segment,view===mapped&&s.selected]} onPress={()=>setView(mapped)}><Typography style={{color:view===mapped?c.white:c.ink,fontFamily:f.bold}}>{item}</Typography></Pressable>})}</View>
    </View>
    <FlatList data={data} keyExtractor={item=>item.id} contentContainerStyle={s.list} showsVerticalScrollIndicator={false}
      renderItem={({item})=>view==='Kluby'?
        <Pressable onPress={()=>setActiveClub(item)} style={s.compactCard}>
          <View style={s.icon}><Ionicons name={item.icon||'people-outline'} size={23} color={c.pink}/></View>
          <View style={{flex:1}}><Typography style={s.compactTitle}>{item.name}</Typography><Typography variant="caption" style={s.meta}>{item.city} · {item.members||1} członkiń</Typography></View>
          <Pressable hitSlop={10} onPress={()=>joinAndOpen(item)} style={[s.smallJoin,joined.includes(item.id)&&s.smallJoinActive]}><Typography style={{fontSize:12,fontFamily:f.bold,color:joined.includes(item.id)?c.pink:c.white}}>{joined.includes(item.id)?'Otwórz':'Dołącz'}</Typography></Pressable>
        </Pressable>
        :
        <Pressable onPress={()=>setActiveMeetup(item)} style={s.compactCard}>
          <View style={s.dateBadge}><Typography style={s.dateBig}>{new Date(item.startsAt).getDate()}</Typography><Typography variant="caption">{new Date(item.startsAt).toLocaleString('pl-PL',{month:'short'})}</Typography></View>
          <View style={{flex:1}}><Typography style={s.compactTitle}>{item.title}</Typography><Typography variant="caption" style={s.meta}>{item.city} · {new Date(item.startsAt).toLocaleString('pl-PL',{hour:'2-digit',minute:'2-digit'})} · {item.joined}/{item.spots}</Typography></View>
          <Ionicons name="chevron-forward" size={20} color={c.muted}/>
        </Pressable>
      }
    />
  </View>;
}

const s=StyleSheet.create({
  root:{flex:1,backgroundColor:c.canvas},modalBackdrop:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(0,0,0,.28)'},detailModal:{backgroundColor:c.white,borderTopLeftRadius:30,borderTopRightRadius:30,maxHeight:'90%',overflow:'hidden'},modalHandle:{width:42,height:5,borderRadius:3,backgroundColor:c.line,alignSelf:'center',marginTop:10,marginBottom:2},
  topArea:{paddingHorizontal:sp.lg,paddingTop:sp.lg,paddingBottom:sp.sm},
  titleRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:sp.md,marginBottom:sp.base},screenTitle:{fontFamily:f.bold,fontSize:28,letterSpacing:-1.1,color:c.ink},screenSubtitle:{fontFamily:f.regular,fontSize:13,color:c.muted,marginTop:2},formHeader:{marginBottom:sp.lg},
  plus:{width:44,height:44,borderRadius:22,backgroundColor:c.pink,alignItems:'center',justifyContent:'center'},
  page:{padding:sp.lg,paddingBottom:100},
  detailPage:{padding:sp.lg,paddingBottom:120,backgroundColor:c.white,flexGrow:1,borderTopLeftRadius:28,borderTopRightRadius:28},
  list:{paddingHorizontal:sp.lg,paddingBottom:110,gap:10},
  back:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:sp.lg},
  switch:{flexDirection:'row',gap:8},
  segment:{flex:1,alignItems:'center',paddingVertical:9,borderRadius:r.pill,backgroundColor:c.blush},
  selected:{backgroundColor:c.pink},
  compactCard:{minHeight:74,backgroundColor:c.white,borderRadius:r.md,borderWidth:1,borderColor:c.line,padding:12,flexDirection:'row',alignItems:'center',gap:12},
  icon:{height:48,width:48,borderRadius:16,backgroundColor:c.blush,alignItems:'center',justifyContent:'center'},
  compactTitle:{fontFamily:f.bold,fontSize:16,color:c.ink,marginBottom:3},
  meta:{color:c.muted},
  smallJoin:{backgroundColor:c.pink,borderRadius:r.pill,paddingVertical:8,paddingHorizontal:12},
  smallJoinActive:{backgroundColor:c.blush},
  dateBadge:{height:50,width:50,borderRadius:14,backgroundColor:c.blush,alignItems:'center',justifyContent:'center'},
  dateBig:{fontSize:19,fontFamily:f.bold,color:c.pink,lineHeight:20},
  heroIcon:{width:76,height:76,borderRadius:24,backgroundColor:c.blush,alignItems:'center',justifyContent:'center',marginBottom:sp.base},
  eventHero:{flexDirection:'row',alignItems:'center',gap:10,marginBottom:sp.base},
  detailTitle:{fontFamily:f.bold,fontSize:30,lineHeight:34,letterSpacing:-1,marginBottom:sp.sm},
  description:{fontSize:17,lineHeight:25,color:c.ink,marginVertical:sp.lg},
  memberRow:{flexDirection:'row',alignItems:'center',gap:6,marginVertical:sp.base},
  memberBubble:{width:32,height:32,borderRadius:16,backgroundColor:c.blush,borderWidth:2,borderColor:c.white,alignItems:'center',justifyContent:'center'},
  detailActions:{flexDirection:'row',gap:10,marginTop:sp.md},
  actionCell:{flex:1,minHeight:48,borderRadius:r.md,borderWidth:1,borderColor:c.line,backgroundColor:c.white,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7},
  actionLabel:{fontSize:12,fontFamily:f.semibold,color:c.ink},
  sectionTitle:{marginTop:sp.xl,marginBottom:sp.md},
  attendance:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',padding:sp.lg},
  clubLink:{color:c.pink,fontFamily:f.bold,marginTop:sp.sm},
  label:{fontFamily:f.semibold,color:c.ink,marginBottom:sp.sm,marginTop:sp.sm},fixedCity:{alignSelf:'flex-start',flexDirection:'row',alignItems:'center',gap:6,backgroundColor:c.blush,borderRadius:999,paddingHorizontal:11,paddingVertical:8,marginBottom:sp.md},fixedCityText:{fontFamily:f.bold,fontSize:12,color:c.pink},
  chips:{flexDirection:'row',flexWrap:'wrap',marginBottom:sp.md}
});
