import React,{useMemo,useState} from 'react';
import {Image,Modal,Pressable,ScrollView,StyleSheet,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {people} from './data';
import {colors as c,fonts as f,radii as r,space as sp} from './theme';
import {Button,Typography} from './ui';

const starterMeetings=[
  {id:'m1',title:'Matcha + spacer po centrum',city:'Warszawa',when:'2026-09-27T17:30:00',place:'Śródmieście',description:'Najpierw matcha, potem luźny spacer po centrum. Bez spiny — poznajemy się na żywo.',spots:6,joined:4,host:'Maja',photo:'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1400&q=88'},
  {id:'m2',title:'Girls night + karaoke',city:'Warszawa',when:'2026-09-28T20:00:00',place:'Centrum',description:'Karaoke, drinki i luźny wieczór. Możesz przyjść sama — większość osób się nie zna.',spots:8,joined:5,host:'Natalia',photo:'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=1400&q=88'},
  {id:'m5',title:'Pilates + brunch',city:'Warszawa',when:'2026-10-03T11:00:00',place:'Mokotów',description:'Krótki pilates, potem brunch i kawa. Mała grupa, spokojny klimat.',spots:6,joined:3,host:'Klara',photo:'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=1400&q=88'},
  {id:'m6',title:'Vintage shopping + kawa',city:'Warszawa',when:'2026-10-04T13:00:00',place:'Praga',description:'Obchodzimy second handy, a potem siadamy na kawę i pokazujemy łupy.',spots:7,joined:4,host:'Daria',photo:'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?w=1400&q=88'},
  {id:'m7',title:'Kazimierz coffee walk',city:'Kraków',when:'2026-09-29T17:30:00',place:'Kazimierz',description:'Kawa i spacer po Kazimierzu. Dobre na pierwsze spotkanie bez wielkiego planowania.',spots:5,joined:3,host:'Ola',photo:'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1400&q=88'},
  {id:'m8',title:'Foto spacer nad Wisłą',city:'Kraków',when:'2026-10-03T16:00:00',place:'Bulwary Wiślane',description:'Bierz telefon albo aparat. Robimy zdjęcia i poznajemy się przy okazji.',spots:6,joined:4,host:'Sonia',photo:'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=1400&q=88'},
  {id:'m3',title:'Pilates + brunch',city:'Wrocław',when:'2026-10-03T11:00:00',place:'Stare Miasto',description:'Pilates rano, potem brunch. Mała grupa i spokojny klimat.',spots:5,joined:3,host:'Julia',photo:'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=1400&q=88'},
  {id:'m9',title:'Wine bar girls night',city:'Wrocław',when:'2026-10-02T20:00:00',place:'Rynek',description:'Luźne wyjście na wino i rozmowy. Bez presji, bez zamkniętej ekipy.',spots:7,joined:5,host:'Nela',photo:'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=1400&q=88'},
  {id:'m10',title:'Brunch + vintage tour',city:'Poznań',when:'2026-10-04T12:00:00',place:'Jeżyce',description:'Brunch, potem kilka vintage shopów na Jeżycach.',spots:6,joined:4,host:'Kasia',photo:'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1400&q=88'},
  {id:'m4',title:'Book club + kawa',city:'Gdańsk',when:'2026-10-04T16:00:00',place:'Wrzeszcz',description:'Kawa i rozmowa o książce miesiąca. Nie musisz znać nikogo wcześniej.',spots:10,joined:7,host:'Sara',photo:'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=1400&q=88'},
  {id:'m11',title:'Plaża + kawa na wynos',city:'Gdańsk',when:'2026-10-03T14:00:00',place:'Brzeźno',description:'Kawa na wynos i spacer plażą. Prosty plan na poznanie kilku osób.',spots:8,joined:5,host:'Natalia',photo:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1400&q=88'},
  {id:'m12',title:'OFF Piotrkowska + koncert',city:'Łódź',when:'2026-10-02T19:00:00',place:'OFF Piotrkowska',description:'Najpierw coś zjemy, potem koncert i zobaczymy co dalej.',spots:7,joined:4,host:'Wiktoria',photo:'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=1400&q=88'},
  {id:'m13',title:'Kawa + spacer po Nikiszowcu',city:'Katowice',when:'2026-10-03T15:00:00',place:'Nikiszowiec',description:'Kawa, spacer i spokojne poznanie nowych osób.',spots:6,joined:3,host:'Dominika',photo:'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1400&q=88'}
];

export default function MeetingsScreen({city='Warszawa',onReport}){
  const [selected,setSelected]=useState(null);
  const [joined,setJoined]=useState(['m1']);
  const data=useMemo(()=>starterMeetings.filter(item=>item.city===city),[city]);
  const cityPeople=useMemo(()=>people.filter(p=>p.city===city),[city]);

  const toggle=id=>setJoined(prev=>prev.includes(id)?prev.filter(v=>v!==id):[...prev,id]);

  return <View style={s.root}>
    <View style={s.header}>
      <View>
        <Typography style={s.title}>Spotkania</Typography>
        <Typography style={s.subtitle}>Małe plany i wyjścia w {city}</Typography>
      </View>
      <View style={s.count}><Typography style={s.countText}>{data.length}</Typography></View>
    </View>

    <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
      {data.map(item=>{
        const going=joined.includes(item.id);
        return <Pressable key={item.id} onPress={()=>setSelected(item)} style={s.card}>
          <Image source={{uri:item.photo}} style={s.thumb}/>
          <View style={s.cardBody}>
            <Typography style={s.cardTitle}>{item.title}</Typography>
            <Typography style={s.meta}>{new Date(item.when).toLocaleString('pl-PL',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</Typography><Typography style={s.placeMeta}>{item.place}</Typography>
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
          <View style={s.infoRow}><Ionicons name="location-outline" size={19} color={c.pink}/><Typography style={s.infoText}>{selected.place}, {selected.city}</Typography></View>
          <Typography style={s.description}>{selected.description}</Typography>

          <View style={s.section}>
            <View style={{flex:1}}><Typography style={s.sectionLabel}>Organizuje</Typography><Typography style={s.host}>{selected.host}</Typography></View>
            <Image source={{uri:(people.find(p=>p.name===selected.host)||people[0]).photo}} style={s.hostAvatar}/>
          </View>

          <View style={s.section}>
            <View><Typography style={s.sectionLabel}>Uczestniczki</Typography><Typography style={s.bigNumber}>{selected.joined}/{selected.spots}</Typography></View>
            <View style={s.peopleRow}>{(cityPeople.length?cityPeople:people).slice(0,4).map(p=><Image key={p.id} source={{uri:p.photo}} style={s.detailAvatar}/>)}</View>
          </View>

          <Button title={joined.includes(selected.id)?'Wycofaj udział':'Dołącz do spotkania'} secondary={joined.includes(selected.id)} onPress={()=>toggle(selected.id)}/>
          <Pressable style={s.shareRow}><Ionicons name="share-social-outline" size={20} color={c.ink}/><Typography style={s.shareText}>Udostępnij spotkanie</Typography></Pressable>
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
  list:{paddingHorizontal:sp.lg,paddingBottom:110,gap:10},
  card:{minHeight:92,backgroundColor:c.white,borderRadius:20,borderWidth:1,borderColor:c.line,padding:10,flexDirection:'row',alignItems:'center',gap:12},
  thumb:{width:74,height:74,borderRadius:16,backgroundColor:c.blush},
  cardBody:{flex:1,minWidth:0},
  cardTitle:{fontFamily:f.bold,fontSize:16,color:c.ink},
  meta:{fontFamily:f.regular,fontSize:12,color:c.muted,marginTop:3},
  placeMeta:{fontFamily:f.semibold,fontSize:12,color:c.ink,marginTop:2},
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
  description:{fontFamily:f.regular,fontSize:17,lineHeight:25,color:c.ink,paddingHorizontal:sp.lg,marginVertical:22},
  section:{marginHorizontal:sp.lg,marginBottom:12,padding:16,borderRadius:18,backgroundColor:c.canvas,borderWidth:1,borderColor:c.line,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  sectionLabel:{fontFamily:f.regular,fontSize:12,color:c.muted},
  host:{fontFamily:f.bold,fontSize:18,color:c.ink,marginTop:3},
  hostAvatar:{width:46,height:46,borderRadius:23},
  bigNumber:{fontFamily:f.bold,fontSize:26,color:c.ink,marginTop:2},
  detailAvatar:{width:34,height:34,borderRadius:17,borderWidth:2,borderColor:c.white,marginRight:-7},
  shareRow:{height:52,marginHorizontal:sp.lg,marginTop:10,borderRadius:16,borderWidth:1,borderColor:c.line,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},
  shareText:{fontFamily:f.semibold,fontSize:14,color:c.ink}
});
