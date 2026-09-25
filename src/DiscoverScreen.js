import React,{useMemo,useState} from 'react';
import {Alert,Image,Pressable,ScrollView,StyleSheet,TextInput,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {cities,people} from './data';
import {colors as c,fonts as f,radii as r,space as sp} from './theme';
import {Button,Chip,PageHeading,Surface,Typography} from './ui';

const starterPlans=[
  {id:'p1',title:'Matcha + spacer po centrum',city:'Warszawa',when:'Dzisiaj · 18:00',spots:'3/5',category:'Kawa',photo:'https://images.unsplash.com/photo-1511988617509-a57c8a288659?w=900&q=80',host:'Maja'},
  {id:'p2',title:'Girls night + karaoke',city:'Warszawa',when:'Piątek · 20:00',spots:'4/6',category:'Wyjścia',photo:'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=900&q=80',host:'Natalia'},
  {id:'p3',title:'Pilates i kawa po zajęciach',city:'Kraków',when:'Sobota · 11:00',spots:'2/4',category:'Sport',photo:'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=900&q=80',host:'Ola'},
];

const categories=['Wszystkie','Kawa','Wyjścia','Sport','Koncert','Spacer','Podróże'];

export default function DiscoverScreen(){
  const [city,setCity]=useState('Warszawa');
  const [category,setCategory]=useState('Wszystkie');
  const [plans,setPlans]=useState(starterPlans);
  const [creating,setCreating]=useState(false);
  const [title,setTitle]=useState('');
  const [joined,setJoined]=useState([]);

  const visible=useMemo(()=>plans.filter(p=>(city==='Wszystkie'||p.city===city)&&(category==='Wszystkie'||p.category===category)),[plans,city,category]);

  const addPlan=()=>{
    const clean=title.trim();
    if(clean.length<4){Alert.alert('Dodaj nazwę planu','Np. „Matcha i spacer po centrum”.');return;}
    const id='local-'+Date.now();
    setPlans(prev=>[{id,title:clean,city:city==='Wszystkie'?'Warszawa':city,when:'Termin do ustalenia',spots:'1/5',category:category==='Wszystkie'?'Wyjścia':category,photo:'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=900&q=80',host:'Ty'},...prev]);
    setTitle('');
    setCreating(false);
  };

  return <ScrollView contentContainerStyle={s.page}>
    <PageHeading kicker="POLKA / PLANY" title="Co robimy?"/>
    <Typography style={s.lead}>Zaproponuj konkretny plan albo dołącz do dziewczyn, które już coś organizują.</Typography>

    <Surface style={s.createCard}>
      <View style={s.createTop}>
        <View style={{flex:1}}>
          <Typography variant="subtitle">Masz pomysł?</Typography>
          <Typography style={s.muted}>Kawa, koncert, spacer, pilates, wyjazd — utwórz plan w kilka sekund.</Typography>
        </View>
        <View style={s.createIcon}><Ionicons name="add" size={28} color={c.white}/></View>
      </View>
      {creating?<>
        <TextInput value={title} onChangeText={setTitle} maxLength={80} placeholder="Np. matcha w centrum po 18" placeholderTextColor={c.muted} style={s.input}/>
        <View style={s.row}><Button title="Dodaj plan" onPress={addPlan} style={{flex:1}}/><Button title="Anuluj" secondary onPress={()=>{setCreating(false);setTitle('')}} style={{flex:1}}/></View>
      </>:<Button title="+ Utwórz plan" onPress={()=>setCreating(true)} style={{marginTop:sp.base}}/>}
    </Surface>

    <Typography variant="subtitle" style={s.sectionTitle}>Miasto</Typography>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.horizontal}>
      {['Wszystkie',...cities].map(v=><Chip key={v} label={v} selected={city===v} onPress={()=>setCity(v)}/>)}
    </ScrollView>

    <Typography variant="subtitle" style={s.sectionTitle}>Na co masz ochotę?</Typography>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.horizontal}>
      {categories.map(v=><Chip key={v} label={v} selected={category===v} onPress={()=>setCategory(v)}/>)}
    </ScrollView>

    <View style={s.headerRow}><Typography variant="heading">Plany blisko Ciebie</Typography><Typography variant="caption" style={s.muted}>{visible.length} propozycji</Typography></View>

    {visible.map(plan=>{
      const isJoined=joined.includes(plan.id);
      const host=people.find(p=>p.name===plan.host);
      return <Surface key={plan.id} style={s.plan}>
        <Image source={{uri:plan.photo}} style={s.cover}/>
        <View style={s.planBody}>
          <View style={s.badges}><View style={s.badge}><Typography variant="caption" style={s.badgeText}>{plan.category}</Typography></View><Typography variant="caption" style={s.muted}>{plan.spots} miejsc</Typography></View>
          <Typography variant="subtitle" style={s.planTitle}>{plan.title}</Typography>
          <Typography style={s.muted}>{plan.city} · {plan.when}</Typography>
          <View style={s.hostRow}>
            {host?<Image source={{uri:host.photo}} style={s.avatar}/>:<View style={[s.avatar,s.avatarFallback]}><Ionicons name="person" size={16} color={c.pink}/></View>}
            <Typography style={{flex:1,fontFamily:f.semibold}}>Organizuje {plan.host}</Typography>
            <Button title={isJoined?'Dołączono':'Dołącz'} secondary={isJoined} onPress={()=>setJoined(prev=>isJoined?prev.filter(id=>id!==plan.id):[...prev,plan.id])}/>
          </View>
        </View>
      </Surface>
    })}

    {!visible.length&&<Surface><Typography variant="subtitle">Tu jest jeszcze pusto.</Typography><Typography style={s.muted}>Zmień filtr albo utwórz pierwszy plan w tym mieście.</Typography><Button title="+ Utwórz pierwszy plan" onPress={()=>setCreating(true)} style={{marginTop:sp.base}}/></Surface>}

    <Typography variant="caption" style={s.demo}>To nadal dane demonstracyjne. Lokalne utworzenie planu nie publikuje go w internecie, dopóki backend Polki nie zostanie podłączony i przetestowany.</Typography>
  </ScrollView>;
}

const s=StyleSheet.create({
  page:{padding:sp.lg,paddingBottom:sp.xxl,backgroundColor:c.canvas,flexGrow:1},
  lead:{fontSize:17,color:c.muted,lineHeight:24,marginTop:-sp.sm,marginBottom:sp.lg},
  createCard:{backgroundColor:c.blush,borderColor:'#F2CADB'},
  createTop:{flexDirection:'row',gap:sp.md,alignItems:'center'},
  createIcon:{height:48,width:48,borderRadius:24,backgroundColor:c.pink,alignItems:'center',justifyContent:'center'},
  muted:{color:c.muted},
  input:{marginTop:sp.base,minHeight:50,borderRadius:r.md,borderWidth:1,borderColor:c.line,backgroundColor:c.white,paddingHorizontal:sp.base,fontFamily:f.regular,fontSize:15,color:c.ink},
  row:{flexDirection:'row',gap:sp.sm,marginTop:sp.sm},
  sectionTitle:{marginTop:sp.lg,marginBottom:sp.sm},
  horizontal:{paddingRight:sp.lg},
  headerRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-end',gap:sp.base,marginTop:sp.xl,marginBottom:sp.md},
  plan:{padding:0,overflow:'hidden'},
  cover:{width:'100%',height:185,backgroundColor:c.blush},
  planBody:{padding:sp.base},
  badges:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  badge:{backgroundColor:c.blush,borderRadius:r.pill,paddingVertical:6,paddingHorizontal:10},
  badgeText:{color:c.pink,fontFamily:f.bold},
  planTitle:{fontSize:21,marginTop:sp.sm,marginBottom:4},
  hostRow:{flexDirection:'row',alignItems:'center',gap:sp.sm,marginTop:sp.base},
  avatar:{width:34,height:34,borderRadius:17,backgroundColor:c.blush},
  avatarFallback:{alignItems:'center',justifyContent:'center'},
  demo:{color:c.muted,lineHeight:18,marginTop:sp.lg}
});
