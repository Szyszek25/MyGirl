import React,{useEffect,useMemo,useState} from 'react';
import {Alert,Image,KeyboardAvoidingView,Modal,Platform,Pressable,ScrollView,StyleSheet,TextInput,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {cities,people} from './data';
import {colors as c,fonts as f,radii as r,space as sp} from './theme';
import {Button,Chip,Typography} from './ui';
import {createPlan,loadPlans,setPlanJoined} from './services/plansApi';

const starterPlans=[
  {id:'p1',title:'Matcha + spacer po centrum',city:'Warszawa',when:'Dzisiaj · 18:00',spots:'3/5',category:'Kawa',photo:'https://images.unsplash.com/photo-1511988617509-a57c8a288659?w=900&q=80',host:'Maja'},
  {id:'p2',title:'Girls night + karaoke',city:'Warszawa',when:'Piątek · 20:00',spots:'4/6',category:'Wyjścia',photo:'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=900&q=80',host:'Natalia'},
  {id:'p3',title:'Pilates + brunch na Mokotowie',city:'Warszawa',when:'Sobota · 11:00',spots:'2/5',category:'Sport',photo:'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=900&q=80',host:'Klara'},
  {id:'p4',title:'Second hand tour + kawa',city:'Warszawa',when:'Niedziela · 13:00',spots:'3/6',category:'Spacer',photo:'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=900&q=80',host:'Daria'},
  {id:'p5',title:'Koncert + drink po',city:'Warszawa',when:'Sobota · 19:30',spots:'4/7',category:'Koncert',photo:'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=900&q=80',host:'Mia'},
  {id:'p6',title:'Kawa na Kazimierzu',city:'Kraków',when:'Dzisiaj · 17:30',spots:'2/4',category:'Kawa',photo:'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=900&q=80',host:'Ola'},
  {id:'p7',title:'Spacer + zdjęcia nad Wisłą',city:'Kraków',when:'Sobota · 16:00',spots:'3/5',category:'Spacer',photo:'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&q=80',host:'Sonia'},
  {id:'p8',title:'Pilates + kawa po zajęciach',city:'Wrocław',when:'Sobota · 10:30',spots:'2/4',category:'Sport',photo:'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=900&q=80',host:'Julia'},
  {id:'p9',title:'Wine bar + rozmowy',city:'Wrocław',when:'Piątek · 20:00',spots:'4/6',category:'Wyjścia',photo:'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=900&q=80',host:'Nela'},
  {id:'p10',title:'Brunch + vintage shopping',city:'Poznań',when:'Niedziela · 12:00',spots:'3/5',category:'Wyjścia',photo:'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=900&q=80',host:'Kasia'},
  {id:'p11',title:'Plaża + kawa na wynos',city:'Gdańsk',when:'Sobota · 14:00',spots:'4/8',category:'Spacer',photo:'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&q=80',host:'Natalia'},
  {id:'p12',title:'Book club + matcha',city:'Gdańsk',when:'Niedziela · 16:00',spots:'5/8',category:'Kawa',photo:'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=900&q=80',host:'Sara'},
  {id:'p13',title:'Koncert w OFF + after',city:'Łódź',when:'Piątek · 19:00',spots:'3/6',category:'Koncert',photo:'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=900&q=80',host:'Wiktoria'},
  {id:'p14',title:'Kawa + spacer po Nikiszowcu',city:'Katowice',when:'Sobota · 15:00',spots:'2/5',category:'Kawa',photo:'https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=900&q=80',host:'Dominika'},
];
const categories=['Wszystkie','Kawa','Wyjścia','Sport','Koncert','Spacer','Podróże'];

export default function DiscoverScreen({city='Warszawa',sessionUserId=null}){
  const [category,setCategory]=useState('Wszystkie');
  const [plans,setPlans]=useState(starterPlans);
  const [remoteLoaded,setRemoteLoaded]=useState(false);
  const [details,setDetails]=useState('');
  const [creating,setCreating]=useState(false);
  const [title,setTitle]=useState('');
  const [joined,setJoined]=useState([]);
  const [selected,setSelected]=useState(null);
  useEffect(()=>{
    if(!sessionUserId){setPlans(starterPlans);setRemoteLoaded(false);return;}
    let alive=true;
    loadPlans(city,sessionUserId).then(rows=>{
      if(!alive)return;
      if(rows.length){setPlans([...rows, ...starterPlans.filter(sp=>!rows.some(r=>r.title===sp.title))]);setJoined(rows.filter(row=>row.joinedByMe).map(row=>row.id));}
      else setPlans(starterPlans);
      setRemoteLoaded(true);
    }).catch(()=>{if(alive){setPlans(starterPlans);setRemoteLoaded(false)}});
    return ()=>{alive=false};
  },[city,sessionUserId]);

  const visible=useMemo(()=>plans.filter(p=>(city==='Wszystkie'||p.city===city)&&(category==='Wszystkie'||p.category===category)),[plans,city,category]);

  const addPlan=async()=>{
    const clean=title.trim();
    if(clean.length<4){Alert.alert('Dodaj nazwę planu','Np. „Matcha i spacer po centrum”.');return;}
    if(sessionUserId){
      try{
        await createPlan(sessionUserId,{title:clean,city:city==='Wszystkie'?'Warszawa':city,category:category==='Wszystkie'?'Wyjścia':category,timingLabel:'Termin do ustalenia',details,capacity:6});
        const rows=await loadPlans(city,sessionUserId);
        setPlans(rows);
        setJoined(rows.filter(row=>row.joinedByMe).map(row=>row.id));
        setSelected(prev=>prev?.id===plan.id ? {...prev,joinedByMe:!currently} : prev);setJoined(rows.filter(row=>row.joinedByMe).map(row=>row.id));
        setTitle('');setDetails('');setCreating(false);return;
      }catch(error){Alert.alert('Nie utworzono planu',error.message||'Spróbuj ponownie.');return;}
    }
    const id='local-'+Date.now();
    setPlans(prev=>[{id,title:clean,city:city==='Wszystkie'?'Warszawa':city,when:'Termin do ustalenia',spots:'1/5',category:category==='Wszystkie'?'Wyjścia':category,photo:'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=900&q=80',host:'Ty'},...prev]);
    setTitle('');setDetails('');setCreating(false);
  };

  const toggleJoined=async plan=>{
    const currently=joined.includes(plan.id);
    setJoined(prev=>currently?prev.filter(id=>id!==plan.id):[...prev,plan.id]);
    if(plan.remote&&sessionUserId){
      try{
        await setPlanJoined(plan.id,sessionUserId,!currently);
        const rows=await loadPlans(city,sessionUserId);
        setPlans(rows);
      }catch(error){
        setJoined(prev=>currently?[...new Set([...prev,plan.id])]:prev.filter(id=>id!==plan.id));
      }
    }
  };

  return <View style={s.root}>
    <View style={s.planControls}><Typography style={s.contextText}>Plany blisko Ciebie</Typography><Pressable style={s.addBtn} onPress={()=>setCreating(true)} accessibilityLabel="Utwórz plan"><Ionicons name="add" size={22} color={c.white}/></Pressable></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filtersSecondary}>
      {categories.map(v=><Chip key={'cat-'+v} label={v} selected={category===v} onPress={()=>setCategory(v)}/>)}
    </ScrollView>

    <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
      {visible.map(plan=>{
        const isJoined=joined.includes(plan.id);
        const host=people.find(p=>p.name===plan.host);
        return <Pressable key={plan.id} onPress={()=>setSelected(plan)} style={s.planCard}>
          <Image source={{uri:plan.photo}} style={s.cover}/>
          <View style={s.overlay}/>
          <View style={s.topPills}>
            <View style={s.categoryPill}><Typography style={s.categoryText}>{plan.category}</Typography></View>
            <View style={s.spotsPill}><Ionicons name="people" size={13} color={c.white}/><Typography style={s.spotsText}>{plan.spots}</Typography></View>
          </View>
          <View style={s.bottomContent}>
            <Typography style={s.planTitle}>{plan.title}</Typography>
            <Typography style={s.planMeta}>{plan.when} · luźny plan</Typography>
            <View style={s.hostRow}>
              {host?<Image source={{uri:host.photo}} style={s.avatar}/>:<View style={[s.avatar,s.avatarFallback]}><Ionicons name="person" size={15} color={c.pink}/></View>}
              <Typography style={s.hostText}>Organizuje {plan.host}</Typography>
              <Pressable onPress={e=>{e.stopPropagation?.();void toggleJoined(plan);}} style={[s.joinBtn,isJoined&&s.joinedBtn]} hitSlop={6}>
                <Typography style={[s.joinText,isJoined&&{color:c.pink}]}>{isJoined?'Dołączono':'Dołącz'}</Typography>
              </Pressable>
            </View>
          </View>
        </Pressable>
      })}
      {!visible.length&&<View style={s.empty}><Typography style={s.emptyTitle}>Jeszcze nic tu nie ma</Typography><Typography style={s.emptyText}>Utwórz pierwszy plan albo zmień filtr.</Typography></View>}
    </ScrollView>

    <Modal visible={!!selected} animationType="slide" onRequestClose={()=>setSelected(null)}>
      {!!selected&&<View style={s.detailRoot}>
        <View style={s.detailHeader}>
          <Pressable onPress={()=>setSelected(null)} style={s.detailIcon}><Ionicons name="arrow-back" size={24} color={c.ink}/></Pressable>
          <Typography style={s.detailHeaderTitle}>Plan</Typography>
          <View style={s.detailIcon}/>
        </View>
        <ScrollView contentContainerStyle={s.detailContent} showsVerticalScrollIndicator={false}>
          <Image source={{uri:selected.photo}} style={s.detailHero}/>
          <Typography style={s.detailTitle}>{selected.title}</Typography>
          <View style={s.detailMetaRow}><Ionicons name="calendar-outline" size={18} color={c.pink}/><Typography style={s.detailMeta}>{selected.when}</Typography></View>
          <View style={s.detailMetaRow}><Ionicons name="location-outline" size={18} color={c.pink}/><Typography style={s.detailMeta}>{selected.city}</Typography></View>
          <View style={s.detailMetaRow}><Ionicons name="people-outline" size={18} color={c.pink}/><Typography style={s.detailMeta}>{selected.spots} osób</Typography></View>
          <View style={s.detailHost}>
            {people.find(p=>p.name===selected.host)?<Image source={{uri:people.find(p=>p.name===selected.host).photo}} style={s.detailHostAvatar}/>:<View style={[s.detailHostAvatar,s.avatarFallback]}><Ionicons name="person" size={18} color={c.pink}/></View>}
            <View><Typography style={s.detailHostLabel}>Organizuje</Typography><Typography style={s.detailHostName}>{selected.host}</Typography></View>
          </View>
          <View style={s.detailActionRow}>
            <Pressable onPress={()=>toggleJoined(selected)} style={[s.detailJoinBtn,joined.includes(selected.id)&&s.detailJoinBtnActive]}>
              <Typography style={[s.detailJoinText,joined.includes(selected.id)&&s.detailJoinTextActive]}>{joined.includes(selected.id)?'Wycofaj udział':'Dołącz do planu'}</Typography>
            </Pressable>
          </View>
        </ScrollView>
      </View>}
    </Modal>

    <Modal visible={creating} animationType="slide" transparent onRequestClose={()=>setCreating(false)}>
      <KeyboardAvoidingView style={s.modalBackdrop} behavior={Platform.OS==='ios'?'padding':'height'}>
        <Pressable style={StyleSheet.absoluteFill} onPress={()=>setCreating(false)}/>
        <View style={s.sheet}>
          <View style={s.handle}/>
          <View style={s.sheetHeader}><Typography style={s.sheetTitle}>Nowy plan</Typography><Pressable onPress={()=>setCreating(false)}><Ionicons name="close" size={24} color={c.ink}/></Pressable></View>
          <Typography style={s.fieldLabel}>Co chcesz zrobić?</Typography>
          <TextInput value={title} onChangeText={setTitle} maxLength={80} placeholder="Np. matcha w centrum po 18" placeholderTextColor={c.muted} style={s.input}/>
          <Typography style={s.fieldLabel}>Opis (opcjonalnie)</Typography>
          <TextInput value={details} onChangeText={setDetails} maxLength={600} multiline placeholder="Dodaj klimat, miejsce albo dla kogo jest ten plan" placeholderTextColor={c.muted} style={[s.input,{height:86,textAlignVertical:'top',paddingTop:14}]}/>
          <View style={s.fixedCity}><Ionicons name="location-outline" size={16} color={c.pink}/><Typography style={s.fixedCityText}>{city}</Typography></View>
          <Typography style={s.fieldLabel}>Kategoria</Typography>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.sheetChipScroll} contentContainerStyle={s.sheetChipContent}>{categories.filter(v=>v!=='Wszystkie').map(v=><Chip key={v} label={v} selected={category===v} onPress={()=>setCategory(v)}/>)}</ScrollView>
          <Button title="Utwórz plan" onPress={addPlan} style={{marginTop:sp.lg}}/>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  </View>;
}

const s=StyleSheet.create({
  root:{flex:1,backgroundColor:c.canvas},
  planControls:{paddingHorizontal:sp.lg,paddingTop:4,paddingBottom:2,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  contextText:{fontFamily:f.semibold,fontSize:15,color:c.muted},
  addBtn:{width:44,height:44,borderRadius:22,backgroundColor:c.pink,alignItems:'center',justifyContent:'center'},
  filterScroll:{flexGrow:0,flexShrink:0,overflow:'visible'},
  filters:{paddingLeft:sp.lg,paddingRight:sp.md,paddingTop:8,paddingBottom:12,alignItems:'center'},
  filtersSecondary:{paddingLeft:sp.lg,paddingRight:sp.md,paddingTop:2,paddingBottom:12,alignItems:'center'},
  list:{padding:sp.lg,paddingTop:10,paddingBottom:110,gap:14},
  planCard:{height:260,borderRadius:24,overflow:'hidden',backgroundColor:c.blush,position:'relative'},
  cover:{...StyleSheet.absoluteFillObject,width:'100%',height:'100%'},
  overlay:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(0,0,0,.25)'},
  topPills:{position:'absolute',top:14,left:14,right:14,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  categoryPill:{backgroundColor:'rgba(255,255,255,.9)',borderRadius:999,paddingHorizontal:11,paddingVertical:7},
  categoryText:{fontFamily:f.bold,fontSize:11,color:c.ink},
  spotsPill:{backgroundColor:'rgba(17,17,17,.72)',borderRadius:999,paddingHorizontal:10,paddingVertical:7,flexDirection:'row',gap:5,alignItems:'center'},
  spotsText:{fontFamily:f.bold,fontSize:11,color:c.white},
  bottomContent:{position:'absolute',left:16,right:16,bottom:14},
  planTitle:{fontFamily:f.bold,fontSize:24,lineHeight:27,color:c.white,letterSpacing:-.7},
  planMeta:{fontFamily:f.semibold,fontSize:12,color:'rgba(255,255,255,.9)',marginTop:4},
  hostRow:{flexDirection:'row',alignItems:'center',gap:8,marginTop:12},
  avatar:{width:30,height:30,borderRadius:15,backgroundColor:c.blush},
  avatarFallback:{alignItems:'center',justifyContent:'center'},
  hostText:{flex:1,fontFamily:f.semibold,fontSize:12,color:c.white},
  joinBtn:{backgroundColor:c.pink,borderRadius:999,paddingHorizontal:14,paddingVertical:9},
  joinedBtn:{backgroundColor:c.white},
  joinText:{fontFamily:f.bold,fontSize:12,color:c.white},
  empty:{padding:28,alignItems:'center'},
  emptyTitle:{fontFamily:f.bold,fontSize:18,color:c.ink},
  emptyText:{fontFamily:f.regular,fontSize:14,color:c.muted,marginTop:4},
  modalBackdrop:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(0,0,0,.28)'},
  sheet:{backgroundColor:c.white,borderTopLeftRadius:28,borderTopRightRadius:28,padding:sp.lg,paddingBottom:34,maxHeight:'78%'},
  handle:{width:42,height:5,borderRadius:3,backgroundColor:c.line,alignSelf:'center',marginBottom:18},
  sheetHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:sp.lg},
  sheetTitle:{fontFamily:f.bold,fontSize:24,letterSpacing:-.8,color:c.ink},
  fieldLabel:{fontFamily:f.semibold,fontSize:14,color:c.ink,marginBottom:8,marginTop:8},fixedCity:{alignSelf:'flex-start',flexDirection:'row',alignItems:'center',gap:6,backgroundColor:c.blush,borderRadius:999,paddingHorizontal:11,paddingVertical:8,marginBottom:8},fixedCityText:{fontFamily:f.bold,fontSize:12,color:c.pink},sheetChipScroll:{flexGrow:0,flexShrink:0,overflow:'visible'},sheetChipContent:{paddingTop:8,paddingBottom:12,alignItems:'center'},
  detailRoot:{flex:1,backgroundColor:c.white},
  detailHeader:{height:60,paddingHorizontal:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:c.line},
  detailIcon:{width:40,height:40,borderRadius:20,alignItems:'center',justifyContent:'center'},
  detailHeaderTitle:{fontFamily:f.bold,fontSize:16,color:c.ink},
  detailContent:{paddingBottom:40},
  detailHero:{width:'100%',height:320,backgroundColor:c.blush},
  detailTitle:{fontFamily:f.bold,fontSize:32,lineHeight:36,letterSpacing:-1.1,color:c.ink,paddingHorizontal:sp.lg,marginTop:20,marginBottom:10},
  detailMetaRow:{flexDirection:'row',alignItems:'center',gap:9,paddingHorizontal:sp.lg,marginTop:8},
  detailMeta:{fontFamily:f.semibold,fontSize:14,color:c.ink},
  detailDescription:{fontFamily:f.regular,fontSize:15,lineHeight:22,color:c.ink,paddingHorizontal:sp.lg,marginTop:16},
  detailHost:{margin:sp.lg,padding:14,borderRadius:18,backgroundColor:c.canvas,borderWidth:1,borderColor:c.line,flexDirection:'row',alignItems:'center',gap:12},
  detailHostAvatar:{width:46,height:46,borderRadius:23,backgroundColor:c.blush},
  detailHostLabel:{fontFamily:f.regular,fontSize:11,color:c.muted},
  detailHostName:{fontFamily:f.bold,fontSize:16,color:c.ink,marginTop:2},
  detailActionRow:{paddingHorizontal:sp.lg,marginTop:4,alignItems:'flex-start'},
  detailJoinBtn:{minHeight:46,borderRadius:14,backgroundColor:c.pink,paddingHorizontal:20,alignItems:'center',justifyContent:'center'},
  detailJoinBtnActive:{backgroundColor:c.blush,borderWidth:1,borderColor:c.line},
  detailJoinText:{fontFamily:f.bold,fontSize:14,color:c.white},
  detailJoinTextActive:{color:c.pink},
  input:{height:52,borderRadius:r.md,borderWidth:1,borderColor:c.line,backgroundColor:c.white,paddingHorizontal:sp.base,fontFamily:f.regular,fontSize:15,color:c.ink}
});
