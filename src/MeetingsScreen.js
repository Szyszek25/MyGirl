import React,{useEffect,useMemo,useState} from 'react';
import {Image,Linking,Modal,Pressable,ScrollView,Share,StyleSheet,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {people} from './data';
import {colors as c,fonts as f,radii as r,space as sp} from './theme';
import {Button,Typography} from './ui';
import {loadMeetups,setMeetupRsvp} from './services/meetupsApi';

const starterMeetings=[
  {id:'m1',category:'Kawa',title:'Matcha + spacer po centrum',city:'Warszawa',when:'2026-09-27T17:30:00',place:'Śródmieście',description:'Najpierw matcha, potem luźny spacer po centrum. Bez spiny — poznajemy się na żywo.',spots:6,joined:4,host:'Maja',photo:'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1400&q=88'},
  {id:'m2',category:'Wyjścia',title:'Girls night + karaoke',city:'Warszawa',when:'2026-09-28T20:00:00',place:'Centrum',description:'Karaoke, drinki i luźny wieczór. Możesz przyjść sama — większość osób się nie zna.',spots:8,joined:5,host:'Natalia',photo:'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=1400&q=88'},
  {id:'m5',category:'Sport',title:'Pilates + brunch',city:'Warszawa',when:'2026-10-03T11:00:00',place:'Mokotów',description:'Krótki pilates, potem brunch i kawa. Mała grupa, spokojny klimat.',spots:6,joined:3,host:'Klara',photo:'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=1400&q=88'},
  {id:'m6',category:'Moda',title:'Vintage shopping + kawa',city:'Warszawa',when:'2026-10-04T13:00:00',place:'Praga',description:'Obchodzimy second handy, a potem siadamy na kawę i pokazujemy łupy.',spots:7,joined:4,host:'Daria',photo:'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?w=1400&q=88'},
  {id:'m7',category:'Kawa',title:'Kazimierz coffee walk',city:'Kraków',when:'2026-09-29T17:30:00',place:'Kazimierz',description:'Kawa i spacer po Kazimierzu. Dobre na pierwsze spotkanie bez wielkiego planowania.',spots:5,joined:3,host:'Ola',photo:'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1400&q=88'},
  {id:'m8',category:'Spacer',title:'Foto spacer nad Wisłą',city:'Kraków',when:'2026-10-03T16:00:00',place:'Bulwary Wiślane',description:'Bierz telefon albo aparat. Robimy zdjęcia i poznajemy się przy okazji.',spots:6,joined:4,host:'Sonia',photo:'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=1400&q=88'},
  {id:'m3',category:'Sport',title:'Pilates + brunch',city:'Wrocław',when:'2026-10-03T11:00:00',place:'Stare Miasto',description:'Pilates rano, potem brunch. Mała grupa i spokojny klimat.',spots:5,joined:3,host:'Julia',photo:'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=1400&q=88'},
  {id:'m9',category:'Wyjścia',title:'Wine bar girls night',city:'Wrocław',when:'2026-10-02T20:00:00',place:'Rynek',description:'Luźne wyjście na wino i rozmowy. Bez presji, bez zamkniętej ekipy.',spots:7,joined:5,host:'Nela',photo:'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=1400&q=88'},
  {id:'m10',category:'Jedzenie',title:'Brunch + vintage tour',city:'Poznań',when:'2026-10-04T12:00:00',place:'Jeżyce',description:'Brunch, potem kilka vintage shopów na Jeżycach.',spots:6,joined:4,host:'Kasia',photo:'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1400&q=88'},
  {id:'m4',category:'Książki',title:'Book club + kawa',city:'Gdańsk',when:'2026-10-04T16:00:00',place:'Wrzeszcz',description:'Kawa i rozmowa o książce miesiąca. Nie musisz znać nikogo wcześniej.',spots:10,joined:7,host:'Sara',photo:'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=1400&q=88'},
  {id:'m11',category:'Spacer',title:'Plaża + kawa na wynos',city:'Gdańsk',when:'2026-10-03T14:00:00',place:'Brzeźno',description:'Kawa na wynos i spacer plażą. Prosty plan na poznanie kilku osób.',spots:8,joined:5,host:'Natalia',photo:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1400&q=88'},
  {id:'m12',category:'Koncert',title:'OFF Piotrkowska + koncert',city:'Łódź',when:'2026-10-02T19:00:00',place:'OFF Piotrkowska',description:'Najpierw coś zjemy, potem koncert i zobaczymy co dalej.',spots:7,joined:4,host:'Wiktoria',photo:'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=1400&q=88'},
  {id:'m13',category:'Kawa',title:'Kawa + spacer po Nikiszowcu',city:'Katowice',when:'2026-10-03T15:00:00',place:'Nikiszowiec',description:'Kawa, spacer i spokojne poznanie nowych osób.',spots:6,joined:3,host:'Dominika',photo:'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1400&q=88'}
];

const meetingCategories=['Wszystkie','Kawa','Wyjścia','Sport','Spacer','Jedzenie','Książki','Koncert','Moda'];
const zodiacVibeFor=(sign,item)=>{
  const date=new Date(item.when);
  const seed=String(sign||'Lew')+item.id+date.getFullYear()+date.getMonth()+date.getDate()+item.category;
  const score=Math.abs(seed.split('').reduce((sum,ch)=>sum+ch.charCodeAt(0),0))%3;
  if(score===0)return {tone:'high',short:'dobry vibe na wyjście',title:'Dobry vibe na to spotkanie',copy:item.category==='Wyjścia'||item.category==='Koncert'?'Zodiakowo to bardziej towarzyski dzień — dobry moment na większą energię i ludzi.':'Zodiakowo ten termin wypada lekko i społecznie.'};
  if(score===1)return {tone:'soft',short:'raczej na spokojnie',title:'Raczej na spokojnie',copy:'Zodiakowo to dzień bardziej na małą ekipę, kawę albo plan bez dużej presji.'};
  return {tone:'mixed',short:'sprawdź swój nastrój',title:'Vibe mieszany',copy:'Zodiakowo dzień jest neutralny — potraktuj to jako zabawny kontekst i kieruj się tym, jak faktycznie się czujesz.'};
};
const CYCLE_STORAGE_KEY='polka_cycle_tracker_v1';
const DAY_MS=24*60*60*1000;
const atNoon=value=>new Date(value.getFullYear(),value.getMonth(),value.getDate(),12);
const addDays=(date,days)=>new Date(atNoon(date).getTime()+days*DAY_MS);
const daysBetween=(a,b)=>Math.round((atNoon(a)-atNoon(b))/DAY_MS);
const cycleContextFor=(meetingDate,cycle)=>{
  if(!cycle?.lastPeriod||!cycle?.cycleLength)return null;
  const start=new Date(cycle.lastPeriod+'T12:00:00');
  const cycleLength=Math.max(21,Math.min(40,Number(cycle.cycleLength)||28));
  const periodLength=Math.max(3,Math.min(7,Number(cycle.periodLength)||5));
  let cycleIndex=Math.floor(daysBetween(meetingDate,start)/cycleLength);
  if(cycleIndex<0)cycleIndex=0;
  let predictedStart=addDays(start,cycleIndex*cycleLength);
  if(predictedStart<atNoon(meetingDate)&&daysBetween(meetingDate,predictedStart)>=cycleLength){
    predictedStart=addDays(predictedStart,cycleLength);
  }
  const offset=daysBetween(meetingDate,predictedStart);
  const nextStart=offset<0?predictedStart:addDays(predictedStart,cycleLength);
  const daysToPeriod=Math.max(0,daysBetween(nextStart,meetingDate));
  const periodEnd=addDays(predictedStart,periodLength-1);
  const duringPeriod=meetingDate>=predictedStart&&meetingDate<=periodEnd;
  const nearPeriod=!duringPeriod&&(daysToPeriod<=3||Math.abs(offset)<=2);

  if(duringPeriod)return {tone:'period',label:'Może wypaść w trakcie okresu',daysText:'przewidywany okres',icon:'water-outline'};
  if(nearPeriod)return {tone:'careful',label:'Zostaw sobie luz',daysText:daysToPeriod===0?'okres może zacząć się tego dnia':daysToPeriod===1?'1 dzień do okresu':daysToPeriod+' dni do okresu',icon:'heart-outline'};
  return {tone:'easy',label:'Na luzie',daysText:daysToPeriod===1?'1 dzień do okresu':daysToPeriod+' dni do okresu',icon:'sparkles-outline'};
};

export default function MeetingsScreen({city='Warszawa',sessionUserId=null,onReport,featurePreferences={polkaCare:true,cycleMeetingContext:true,zodiacMeetingContext:true,zodiacSign:null}}){
  const [selected,setSelected]=useState(null);
  const [joined,setJoined]=useState(['m1']);
  const [category,setCategory]=useState('Wszystkie');
  const [cycleData,setCycleData]=useState(null);
  const [remoteMeetups,setRemoteMeetups]=useState([]);
  const sourceMeetings=remoteMeetups.length?remoteMeetups:starterMeetings;
  const data=useMemo(()=>sourceMeetings.filter(item=>item.city===city&&(category==='Wszystkie'||item.category===category||item.category==='Spotkanie')),[sourceMeetings,city,category]);
  const cityPeople=useMemo(()=>people.filter(p=>p.city===city),[city]);
  useEffect(()=>{
    if(!sessionUserId){setRemoteMeetups([]);return;}
    let alive=true;
    loadMeetups(city,sessionUserId).then(rows=>{
      if(!alive)return;
      setRemoteMeetups(rows);
      setJoined(rows.filter(row=>row.joinedByMe).map(row=>row.id));
    }).catch(()=>{if(alive)setRemoteMeetups([])});
    return ()=>{alive=false};
  },[city,sessionUserId]);

  useEffect(()=>{
    let alive=true;
    AsyncStorage.getItem(CYCLE_STORAGE_KEY).then(raw=>{
      if(!alive||!raw)return;
      try{setCycleData(JSON.parse(raw));}catch{}
    }).catch(()=>{});
    return ()=>{alive=false;};
  },[]);

  const toggle=async id=>{
    const item=sourceMeetings.find(row=>row.id===id);
    const currently=joined.includes(id);
    setJoined(prev=>currently?prev.filter(v=>v!==id):[...prev,id]);
    if(item?.remote&&sessionUserId){
      try{
        await setMeetupRsvp(id,sessionUserId,!currently);
        setRemoteMeetups(prev=>prev.map(row=>row.id===id?{...row,joined:Math.max(0,row.joined+(currently?-1:1)),joinedByMe:!currently}:row));
      }catch(error){
        setJoined(prev=>currently?[...new Set([...prev,id])]:prev.filter(v=>v!==id));
      }
    }
  };

  return <View style={s.root}>
    <View style={s.header}>
      <View>
        <Typography style={s.title}>Spotkania</Typography>
        <Typography style={s.subtitle}>Małe plany i wyjścia w {city}</Typography>
      </View>
      <View style={s.count}><Typography style={s.countText}>{data.length}</Typography></View>
    </View>

    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filters}>
      {meetingCategories.map(item=><Pressable key={item} onPress={()=>setCategory(item)} style={[s.filterChip,category===item&&s.filterChipActive]}><Typography style={[s.filterChipText,category===item&&s.filterChipTextActive]}>{item}</Typography></Pressable>)}
    </ScrollView>

    <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
      {data.map(item=>{
        const going=joined.includes(item.id);
        return <Pressable key={item.id} onPress={()=>setSelected(item)} style={s.card}>
          <Image source={{uri:item.photo}} style={s.thumb}/>
          <View style={s.cardBody}>
            <Typography style={s.cardTitle}>{item.title}</Typography>
            <Typography style={s.meta}>{new Date(item.when).toLocaleString('pl-PL',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</Typography><Typography style={s.placeMeta}>{item.place}</Typography>
            <View style={s.metaBadges}>
              {featurePreferences.polkaCare&&featurePreferences.cycleMeetingContext&&(()=>{const ctx=cycleContextFor(new Date(item.when),cycleData);return ctx?<View style={[s.cycleMini,ctx.tone==='easy'&&s.cycleMiniEasy,ctx.tone==='careful'&&s.cycleMiniCareful,ctx.tone==='period'&&s.cycleMiniPeriod]}><Ionicons name={ctx.icon} size={12} color={ctx.tone==='easy'?c.success:ctx.tone==='careful'?c.warning:c.pink}/><Typography style={[s.cycleMiniText,ctx.tone==='easy'&&{color:c.success},ctx.tone==='careful'&&{color:c.warning},ctx.tone==='period'&&{color:c.pink}]}>{ctx.label} · {ctx.daysText}</Typography></View>:null})()}
              {featurePreferences.zodiacMeetingContext&&featurePreferences.zodiacSign&&(()=>{const vibe=zodiacVibeFor(featurePreferences.zodiacSign,item);return <View style={s.zodiacMini}><Typography style={s.zodiacMiniText}>✦ Dla {featurePreferences.zodiacSign}: {vibe.short}</Typography></View>})()}
            </View>
            <View style={s.cardBottom}>
              <View style={s.peopleRow}>{(cityPeople.length?cityPeople:people).slice(0,3).map(p=><Image key={p.id} source={{uri:p.photo}} style={s.avatar}/>)}</View>
              <Typography style={s.spots}>{item.joined}/{item.spots}</Typography>
              {going&&<View style={s.goingPill}><Ionicons name="checkmark" size={13} color={c.pink}/><Typography style={s.goingText}>Idziesz</Typography></View>}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={c.muted}/>
        </Pressable>
      })}
      {!data.length&&<View style={s.empty}><Typography style={s.emptyTitle}>Brak spotkań w {city}</Typography><Typography style={s.emptyText}>Zmień miasto u góry albo wróć później.</Typography></View>}
    </ScrollView>

    <Modal visible={!!selected} animationType="slide" onRequestClose={()=>setSelected(null)}>
      {!!selected&&<View style={s.detailRoot}>
        <View style={s.detailTop}>
          <Pressable onPress={()=>setSelected(null)} style={s.iconButton}><Ionicons name="arrow-back" size={24} color={c.ink}/></Pressable>
          <Typography style={s.detailTopTitle}>Szczegóły spotkania</Typography>
          <Pressable onPress={()=>onReport?.({kind:'meetup',id:selected.id,label:selected.title})} style={s.iconButton}><Ionicons name="ellipsis-horizontal" size={23} color={c.ink}/></Pressable>
        </View>
        <ScrollView contentContainerStyle={s.detailScroll} showsVerticalScrollIndicator={false}>
          <Image source={{uri:selected.photo}} style={s.hero}/>
          <Typography style={s.detailTitle}>{selected.title}</Typography>
          <View style={s.infoRow}><Ionicons name="calendar-outline" size={19} color={c.pink}/><Typography style={s.infoText}>{new Date(selected.when).toLocaleString('pl-PL',{weekday:'long',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'})}</Typography></View>
          <Pressable onPress={()=>Linking.openURL(selected.mapsUrl||`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selected.place+', '+selected.city)}`)} style={s.infoRow}><Ionicons name="location-outline" size={19} color={c.pink}/><Typography style={s.infoText}>{selected.place}, {selected.city}</Typography><Ionicons name="open-outline" size={16} color={c.muted}/></Pressable>

          {featurePreferences.polkaCare&&featurePreferences.cycleMeetingContext&&(()=>{const ctx=cycleContextFor(new Date(selected.when),cycleData);return <View style={s.careFit}>
            <View style={s.careFitTop}><View><Typography style={s.careFitOverline}>POLKA CARE</Typography><Typography style={s.careFitTitle}>{ctx?ctx.label:'Kontekst terminu'}</Typography></View><View style={[s.careFitIcon,ctx?.tone==='easy'&&{backgroundColor:'#EAF6F0'},ctx?.tone==='careful'&&{backgroundColor:'#FFF4E5'},ctx?.tone==='period'&&{backgroundColor:c.blush}]}><Ionicons name={ctx?.icon||'heart-circle-outline'} size={22} color={ctx?.tone==='easy'?c.success:ctx?.tone==='careful'?c.warning:c.pink}/></View></View>
            <Typography style={s.careFitDays}>{ctx?ctx.daysText:'Ustaw cykl, żeby zobaczyć prognozę'}</Typography>
            <Typography style={s.careFitCopy}>{ctx?(ctx.tone==='easy'?'Termin nie wypada blisko przewidywanego okresu. Jeśli czujesz się dobrze, nic w trackerze nie sugeruje, żeby zmieniać plan.':ctx.tone==='careful'?'Termin wypada blisko przewidywanego okresu. Możesz zostawić sobie więcej luzu albo wybrać spokojniejszy plan — zależnie od samopoczucia.':'Termin może wypaść w przewidywane dni miesiączki. To nie znaczy, że masz rezygnować — potraktuj to tylko jako przypomnienie o własnym komforcie.'):'Ustaw cykl w Polka Care, żeby zobaczyć kontekst terminu.'}</Typography>
            <Typography style={s.careFitNote}>Prognoza okresu jest orientacyjna.</Typography>
          </View>})()}
          {featurePreferences.zodiacMeetingContext&&featurePreferences.zodiacSign&&(()=>{const vibe=zodiacVibeFor(featurePreferences.zodiacSign,selected);return <View style={s.zodiacFit}>
            <Typography style={s.zodiacLabel}>ASTRO VIBE · {String(featurePreferences.zodiacSign).toUpperCase()}</Typography>
            <Typography style={s.zodiacFitTitle}>{vibe.title}</Typography>
            <Typography style={s.zodiacFitCopy}>{vibe.copy}</Typography>
          </View>})()}

          <Typography style={s.description}>{selected.description}</Typography>

          <View style={s.section}>
            <View style={{flex:1}}><Typography style={s.sectionLabel}>Organizuje</Typography><Typography style={s.host}>{selected.host}</Typography></View>
            <Image source={{uri:(people.find(p=>p.name===selected.host)||people[0]).photo}} style={s.hostAvatar}/>
          </View>

          <View style={s.participantsSection}>
            <View style={s.participantsHeader}>
              <View><Typography style={s.sectionLabel}>Uczestniczki</Typography><Typography style={s.participantsCount}>{selected.joined}/{selected.spots} miejsc</Typography></View>
              <Ionicons name="people-outline" size={20} color={c.pink}/>
            </View>
            <View style={s.participantsGrid}>
              {(cityPeople.length?cityPeople:people).slice(0,Math.min(selected.joined,5)).map(p=><View key={p.id} style={s.participant}>
                <Image source={{uri:p.photo}} style={s.participantPhoto}/>
                <Typography numberOfLines={1} style={s.participantName}>{p.name}</Typography>
              </View>)}
              {selected.joined>5&&<View style={s.participantMore}><Typography style={s.participantMoreText}>+{selected.joined-5}</Typography></View>}
            </View>
          </View>

          <Button title={joined.includes(selected.id)?'Wycofaj udział':'Dołącz do spotkania'} secondary={joined.includes(selected.id)} onPress={()=>toggle(selected.id)}/>
          <Pressable onPress={()=>Share.share({message:`${selected.title} · ${selected.place}, ${selected.city} · ${new Date(selected.when).toLocaleString('pl-PL')}`})} style={s.shareRow}><Ionicons name="share-social-outline" size={20} color={c.ink}/><Typography style={s.shareText}>Udostępnij spotkanie</Typography></Pressable>
        </ScrollView>
      </View>}
    </Modal>
  </View>;
}

const s=StyleSheet.create({
  root:{flex:1,backgroundColor:c.canvas},
  header:{paddingHorizontal:sp.lg,paddingTop:6,paddingBottom:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  title:{fontFamily:f.bold,fontSize:26,letterSpacing:-1,color:c.ink},
  subtitle:{fontFamily:f.regular,fontSize:13,color:c.muted,marginTop:2},
  count:{minWidth:34,height:34,borderRadius:17,backgroundColor:c.blush,alignItems:'center',justifyContent:'center',paddingHorizontal:9},
  countText:{fontFamily:f.bold,fontSize:13,color:c.pink},
  filterScroll:{flexGrow:0,flexShrink:0},
  filters:{paddingHorizontal:sp.lg,paddingBottom:12,alignItems:'center'},
  filterChip:{paddingHorizontal:14,paddingVertical:9,borderRadius:999,backgroundColor:c.white,borderWidth:1,borderColor:c.line,marginRight:8},
  filterChipActive:{backgroundColor:c.pink,borderColor:c.pink},
  filterChipText:{fontFamily:f.semibold,fontSize:12,color:c.ink},
  filterChipTextActive:{color:c.white},
  list:{paddingHorizontal:sp.lg,paddingBottom:110,gap:10},
  card:{minHeight:92,backgroundColor:c.white,borderRadius:20,borderWidth:1,borderColor:c.line,padding:10,flexDirection:'row',alignItems:'center',gap:12},
  thumb:{width:74,height:74,borderRadius:16,backgroundColor:c.blush},
  cardBody:{flex:1,minWidth:0},
  cardTitle:{fontFamily:f.bold,fontSize:16,color:c.ink},
  meta:{fontFamily:f.regular,fontSize:12,color:c.muted,marginTop:3},
  placeMeta:{fontFamily:f.semibold,fontSize:12,color:c.ink,marginTop:2},
  metaBadges:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:6,marginTop:7},
  cycleMini:{alignSelf:'flex-start',paddingHorizontal:8,paddingVertical:5,borderRadius:999,flexDirection:'row',alignItems:'center',gap:5,borderWidth:1},
  cycleMiniEasy:{backgroundColor:'#F3FAF7',borderColor:'#CFE8DC'},
  cycleMiniCareful:{backgroundColor:'#FFF9EF',borderColor:'#F1DEC1'},
  cycleMiniPeriod:{backgroundColor:c.blush,borderColor:'#F0C8D5'},
  cycleMiniText:{fontFamily:f.bold,fontSize:9},
  zodiacMini:{alignSelf:'flex-start',paddingHorizontal:8,paddingVertical:5,borderRadius:999,backgroundColor:c.canvas,borderWidth:1,borderColor:c.line},
  zodiacMiniText:{fontFamily:f.bold,fontSize:9,color:c.muted},
  zodiacFit:{marginHorizontal:sp.lg,paddingVertical:15,borderBottomWidth:1,borderBottomColor:c.line},
  zodiacFitTitle:{fontFamily:f.bold,fontSize:19,color:c.ink,marginTop:4},
  zodiacFitCopy:{fontFamily:f.regular,fontSize:12,lineHeight:18,color:c.muted,marginTop:5},
  cardBottom:{flexDirection:'row',alignItems:'center',marginTop:9},
  peopleRow:{flexDirection:'row',alignItems:'center'},
  avatar:{width:24,height:24,borderRadius:12,borderWidth:2,borderColor:c.white,marginRight:-6},
  spots:{fontFamily:f.semibold,fontSize:12,color:c.muted,marginLeft:10},
  goingPill:{marginLeft:8,flexDirection:'row',alignItems:'center',gap:4,backgroundColor:c.blush,borderRadius:999,paddingHorizontal:8,paddingVertical:4},
  goingText:{fontFamily:f.bold,fontSize:10,color:c.pink},
  empty:{padding:36,alignItems:'center'},
  emptyTitle:{fontFamily:f.bold,fontSize:18,color:c.ink},
  emptyText:{fontFamily:f.regular,fontSize:14,color:c.muted,marginTop:5,textAlign:'center'},
  detailRoot:{flex:1,backgroundColor:c.white},
  detailTop:{height:60,paddingHorizontal:sp.lg,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:c.line},
  iconButton:{width:40,height:40,borderRadius:20,alignItems:'center',justifyContent:'center'},
  detailTopTitle:{fontFamily:f.bold,fontSize:16,color:c.ink},
  detailScroll:{paddingBottom:50},
  hero:{width:'100%',height:310,backgroundColor:c.blush},
  detailTitle:{fontFamily:f.bold,fontSize:32,lineHeight:36,letterSpacing:-1.2,color:c.ink,paddingHorizontal:sp.lg,marginTop:20},
  infoRow:{flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:sp.lg,marginTop:12},
  infoText:{fontFamily:f.semibold,fontSize:14,color:c.ink,flex:1},
  careFit:{marginHorizontal:sp.lg,marginTop:18,paddingVertical:16,borderTopWidth:1,borderBottomWidth:1,borderColor:c.line},
  careFitTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},
  careFitOverline:{fontFamily:f.bold,fontSize:10,letterSpacing:1.2,color:c.pink},
  careFitTitle:{fontFamily:f.bold,fontSize:24,lineHeight:29,letterSpacing:-.7,color:c.ink,marginTop:3},
  careFitIcon:{width:44,height:44,borderRadius:15,alignItems:'center',justifyContent:'center'},
  careFitDays:{fontFamily:f.bold,fontSize:15,color:c.pink,marginTop:10},
  careFitCopy:{fontFamily:f.regular,fontSize:13,lineHeight:20,color:c.muted,marginTop:5},
  zodiacRow:{marginTop:13,paddingTop:12,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:c.line,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},
  zodiacLabel:{fontFamily:f.bold,fontSize:9,letterSpacing:1,color:c.muted},
  zodiacValue:{fontFamily:f.bold,fontSize:12,color:c.ink},
  careFitNote:{fontFamily:f.regular,fontSize:10,lineHeight:15,color:c.muted,marginTop:9},
  careFitEmpty:{marginHorizontal:sp.lg,marginTop:18,paddingVertical:14,borderTopWidth:1,borderBottomWidth:1,borderColor:c.line,flexDirection:'row',alignItems:'center',gap:10},
  careFitEmptyText:{flex:1,fontFamily:f.regular,fontSize:12,lineHeight:18,color:c.muted},
  description:{fontFamily:f.regular,fontSize:17,lineHeight:25,color:c.ink,paddingHorizontal:sp.lg,marginVertical:22},
  section:{marginHorizontal:sp.lg,marginBottom:12,padding:16,borderRadius:18,backgroundColor:c.canvas,borderWidth:1,borderColor:c.line,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  sectionLabel:{fontFamily:f.regular,fontSize:12,color:c.muted},
  host:{fontFamily:f.bold,fontSize:18,color:c.ink,marginTop:3},
  hostAvatar:{width:46,height:46,borderRadius:23},
  bigNumber:{fontFamily:f.bold,fontSize:26,color:c.ink,marginTop:2},
  participantsSection:{marginHorizontal:sp.lg,marginBottom:16,padding:16,borderRadius:20,backgroundColor:c.canvas,borderWidth:1,borderColor:c.line},
  participantsHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:14},
  participantsCount:{fontFamily:f.bold,fontSize:18,color:c.ink,marginTop:2},
  participantsGrid:{flexDirection:'row',alignItems:'flex-start',gap:10},
  participant:{width:52,alignItems:'center'},
  participantPhoto:{width:50,height:50,borderRadius:25,backgroundColor:c.blush,borderWidth:2,borderColor:c.white},
  participantName:{fontFamily:f.semibold,fontSize:10,color:c.ink,marginTop:5,maxWidth:52,textAlign:'center'},
  participantMore:{width:50,height:50,borderRadius:25,backgroundColor:c.blush,alignItems:'center',justifyContent:'center'},
  participantMoreText:{fontFamily:f.bold,fontSize:13,color:c.pink},
  detailAvatar:{width:34,height:34,borderRadius:17,borderWidth:2,borderColor:c.white,marginRight:-7},
  shareRow:{height:52,marginHorizontal:sp.lg,marginTop:10,borderRadius:16,borderWidth:1,borderColor:c.line,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},
  shareText:{fontFamily:f.semibold,fontSize:14,color:c.ink}
});
