import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Alert,Animated,Dimensions,PanResponder,Pressable,ScrollView,StyleSheet,View} from 'react-native';
import {Image} from 'expo-image';
import {Ionicons} from '@expo/vector-icons';
import {people,cities} from './data';
import {colors as c,fonts as f,radii as r,space as sp} from './theme';
import {Chip,PageHeading,Surface,Typography} from './ui';
const WIDTH=Dimensions.get('window').width;
function Section({title,children}){return <Surface><Typography variant="subtitle" style={{marginBottom:sp.sm}}>{title}</Typography>{children}</Surface>}
export default function DiscoverScreen({blockedIds=[],onBlock,onReport}){
  const [city,setCity]=useState('Wszystkie');
  const [index,setIndex]=useState(0);
  const [liked,setLiked]=useState([]);
  const filtered=people.filter(p=>!blockedIds.includes(p.id)&&(city==='Wszystkie'||p.city===city));
  const person=filtered.length?filtered[index%filtered.length]:null;
  const xy=useRef(new Animated.ValueXY()).current;
  useEffect(()=>{
    const next=filtered.length>1?filtered[(index+1)%filtered.length]:null;
    if(next?.photo)Image.prefetch(next.photo,'disk').catch(()=>{});
  },[city,index,blockedIds]);
  const decide=direction=>{
    if(!person)return;
    // PanResponder uses the JS animation driver, so the dismissal also uses it.
    Animated.timing(xy,{toValue:{x:direction*WIDTH,y:0},duration:180,useNativeDriver:false}).start(({finished})=>{
      if(!finished)return;
      if(direction>0)setLiked(prev=>prev.includes(person.id)?prev:[...prev,person.id]);
      setIndex(prev=>prev+1);
      xy.setValue({x:0,y:0});
    });
  };
  const pan=useMemo(()=>PanResponder.create({
    onMoveShouldSetPanResponder:(_,g)=>Math.abs(g.dx)>18&&Math.abs(g.dx)>Math.abs(g.dy)*1.3,
    onPanResponderMove:Animated.event([null,{dx:xy.x,dy:xy.y}],{useNativeDriver:false}),
    onPanResponderRelease:(_,g)=>Math.abs(g.dx)>95?decide(g.dx>0?1:-1):Animated.spring(xy,{toValue:{x:0,y:0},useNativeDriver:false}).start(),
    onPanResponderTerminate:()=>Animated.spring(xy,{toValue:{x:0,y:0},useNativeDriver:false}).start()
  }),[person?.id]);
  const block=()=>person&&Alert.alert(`Zablokować ${person.name}?`,'Profil zniknie z aplikacji na czas tej sesji.',[
    {text:'Anuluj',style:'cancel'},{text:'Zablokuj',style:'destructive',onPress:()=>onBlock?.(person.id)}
  ]);
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.page}>
    <PageHeading kicker="MYGIRL / ODKRYWAJ" title="Znajdź swoją ekipę."/>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:sp.base}}>{['Wszystkie',...cities].map(value=><Chip key={value} label={value} selected={city===value} onPress={()=>{setCity(value);setIndex(0);xy.setValue({x:0,y:0});}}/>)}</ScrollView>
    {person?<>
      <Animated.View {...pan.panHandlers} style={[s.card,{transform:[{translateX:xy.x},{translateY:xy.y},{rotate:xy.x.interpolate({inputRange:[-WIDTH,0,WIDTH],outputRange:['-9deg','0deg','9deg']})}]}]}>
        <Image source={{uri:person.photo}} style={s.photo} contentFit="cover" cachePolicy="memory-disk" transition={180} accessibilityLabel={`Poglądowe zdjęcie profilu: ${person.name}`}/>
        <View style={s.name}><Typography variant="heading">{person.name}, {person.age}</Typography><Typography style={s.muted}>{person.city} · profil demonstracyjny</Typography></View>
      </Animated.View>
      <View style={s.actions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Pomiń profil" onPress={()=>decide(-1)} style={s.round}><Ionicons name="close" size={26} color={c.ink}/></Pressable>
        <Typography variant="caption" style={s.muted}>PRZESUŃ W BOK</Typography>
        <Pressable accessibilityRole="button" accessibilityLabel="Polub profil" onPress={()=>decide(1)} style={[s.round,{backgroundColor:c.pink}]}><Ionicons name="heart" size={23} color={c.white}/></Pressable>
      </View>
      <Section title="O mnie"><Typography>{person.bio}</Typography></Section>
      <Section title="Lubię"><View style={s.wrap}>{person.tags.map(tag=><Chip key={tag} label={tag}/>)}</View></Section>
      <Section title={person.prompt}><Typography style={{fontFamily:f.semibold,fontSize:20}}>{person.answer}</Typography></Section>
      <View style={s.safety}>
        <Pressable accessibilityRole="button" onPress={block} style={s.action}><Ionicons name="ban-outline" size={18} color={c.pink}/><Typography style={s.actionText}>Zablokuj</Typography></Pressable>
        <Pressable accessibilityRole="button" onPress={()=>onReport?.({kind:'profile',id:person.id,label:`Profil: ${person.name}`})} style={s.action}><Ionicons name="flag-outline" size={18} color={c.pink}/><Typography style={s.actionText}>Zgłoś</Typography></Pressable>
      </View>
      <Typography variant="caption" style={s.muted}>Profile i zdjęcia ilustracyjne. Polubienia nie są wysyłane na serwer. Polubiono lokalnie: {liked.length}.</Typography>
    </>:<Surface><Typography variant="subtitle">Brak profili w tym mieście.</Typography><Typography style={s.muted}>Wybierz inne miasto albo odblokuj osoby w ustawieniach.</Typography></Surface>}
  </ScrollView>;
}
const s=StyleSheet.create({page:{padding:sp.lg,paddingBottom:sp.xxl,backgroundColor:c.canvas,flexGrow:1},card:{borderRadius:r.lg,backgroundColor:c.white,overflow:'hidden',borderWidth:1,borderColor:c.line},photo:{width:'100%',height:Math.min(WIDTH*1.12,450),backgroundColor:c.blush},name:{padding:sp.base},muted:{color:c.muted,marginTop:sp.sm,lineHeight:19},actions:{flexDirection:'row',alignItems:'center',justifyContent:'space-around',marginVertical:sp.lg},round:{height:55,width:55,borderRadius:28,backgroundColor:c.white,borderWidth:1,borderColor:c.line,alignItems:'center',justifyContent:'center'},wrap:{flexDirection:'row',flexWrap:'wrap'},safety:{flexDirection:'row',justifyContent:'space-between',marginVertical:sp.base},action:{flexDirection:'row',gap:sp.sm,alignItems:'center',padding:sp.sm},actionText:{color:c.pink,fontFamily:f.semibold}});
