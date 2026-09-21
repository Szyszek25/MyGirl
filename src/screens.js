import React,{useMemo,useRef,useState} from 'react';
import {Alert,Animated,Dimensions,FlatList,Image,KeyboardAvoidingView,PanResponder,Platform,Pressable,ScrollView,StyleSheet,TextInput,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {colors as c,space as sp,radii as r,fonts as f} from './theme';
import {people,groups,cities} from './data';
import {Button,Chip,Field,PageHeading,Surface,Typography} from './ui';
const W=Dimensions.get('window').width;
const avatar=(photo,size=48)=><Image source={{uri:photo}} style={{width:size,height:size,borderRadius:size/2,backgroundColor:c.blush}}/>;
const authorId=post=>post.authorId||people.find(p=>p.name===post.author)?.id;
function Section({title,children}){return <Surface><Typography variant="subtitle" style={{marginBottom:sp.sm}}>{title}</Typography>{children}</Surface>}
function TextAction({icon,title,onPress,danger=false}){return <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={s.textAction}><Ionicons name={icon} size={19} color={danger?c.pink:c.muted}/><Typography style={{color:danger?c.pink:c.muted,fontFamily:f.semibold,fontSize:13}}>{title}</Typography></Pressable>}

export function DiscoverScreen({blockedIds=[],onBlock,onReport}){
  const [city,setCity]=useState('Wszystkie'),[index,setIndex]=useState(0),[saved,setSaved]=useState([]);
  const filtered=people.filter(p=>!blockedIds.includes(p.id)&&(city==='Wszystkie'||p.city===city));
  const person=filtered.length?filtered[index%filtered.length]:null;
  const xy=useRef(new Animated.ValueXY()).current;
  const decide=dir=>{if(!person)return;Animated.timing(xy,{toValue:{x:dir*W,y:0},duration:180,useNativeDriver:true}).start(()=>{if(dir>0)setSaved(prev=>prev.includes(person.id)?prev:[...prev,person.id]);setIndex(v=>v+1);xy.setValue({x:0,y:0})})};
  const pan=useMemo(()=>PanResponder.create({
    onMoveShouldSetPanResponder:(_,g)=>Math.abs(g.dx)>18&&Math.abs(g.dx)>Math.abs(g.dy)*1.3,
    onPanResponderMove:Animated.event([null,{dx:xy.x,dy:xy.y}],{useNativeDriver:false}),
    onPanResponderRelease:(_,g)=>Math.abs(g.dx)>95?decide(g.dx>0?1:-1):Animated.spring(xy,{toValue:{x:0,y:0},useNativeDriver:true}).start()
  }),[person?.id]);
  const confirmBlock=()=>person&&Alert.alert(`Zablokować ${person.name}?`,'Profil zniknie z odkrywania, wpisów i prywatnego czatu w tej sesji prototypu.',[
    {text:'Anuluj',style:'cancel'},{text:'Zablokuj',style:'destructive',onPress:()=>onBlock(person.id)}
  ]);
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.page}>
    <PageHeading kicker="MYGIRL / ODKRYWAJ" title="Poznaj się."/>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:sp.base}}>{['Wszystkie',...cities].map(v=><Chip key={v} label={v} selected={city===v} onPress={()=>{setCity(v);setIndex(0)}}/>)}</ScrollView>
    {person?<>
      <Animated.View {...pan.panHandlers} style={[s.profileCard,{transform:[{translateX:xy.x},{translateY:xy.y},{rotate:xy.x.interpolate({inputRange:[-W,0,W],outputRange:['-9deg','0deg','9deg']})}]}]}>
        <Image source={{uri:person.photo}} style={s.heroPhoto} resizeMode="cover"/>
        <View style={s.heroName}><Typography variant="heading">{person.name}, {person.age}</Typography><Typography style={{color:c.muted}}>{person.city} · Profil demonstracyjny</Typography></View>
      </Animated.View>
      <View style={s.actions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Pomiń profil" onPress={()=>decide(-1)} style={s.round}><Ionicons name="close" size={27} color={c.ink}/></Pressable>
        <Typography variant="caption" style={{color:c.muted}}>PRZESUŃ W BOK</Typography>
        <Pressable accessibilityRole="button" accessibilityLabel="Polub profil" onPress={()=>decide(1)} style={[s.round,{backgroundColor:c.pink}]}><Ionicons name="heart" size={24} color={c.white}/></Pressable>
      </View>
      <Section title="O mnie"><Typography>{person.bio}</Typography></Section>
      <Section title="Lubię"><View style={s.wrap}>{person.tags.map(v=><Chip key={v} label={v}/>)}</View></Section>
      <Section title={person.prompt}><Typography style={{fontSize:20,fontFamily:f.semibold}}>{person.answer}</Typography></Section>
      <View style={s.safetyRow}><TextAction icon="ban-outline" title="Zablokuj" danger onPress={confirmBlock}/><TextAction icon="flag-outline" title="Zgłoś" danger onPress={()=>onReport({kind:'profile',id:person.id,label:`Profil: ${person.name}`})}/></View>
      <Typography variant="caption" style={s.disclaimer}>Profile demonstracyjne. Polubienia i blokady nie trafiają na serwer.</Typography>
    </>:<Surface><Typography variant="subtitle">Brak profili.</Typography><Typography style={{color:c.muted}}>Zmień miasto lub odblokuj osoby w ustawieniach bezpieczeństwa.</Typography></Surface>}
  </ScrollView>;
}

export function CommunityScreen({posts=[],setPosts,blockedIds=[],onReport}){
  const [draft,setDraft]=useState(''),[likes,setLikes]=useState([]);
  const visiblePosts=posts.filter(post=>!blockedIds.includes(authorId(post)));
  const deleteOwnPost=item=>Alert.alert('Usunąć wpis?','Wpis zostanie usunięty z bieżącej sesji prototypu.',[
    {text:'Anuluj',style:'cancel'},{text:'Usuń',style:'destructive',onPress:()=>setPosts(prev=>prev.filter(p=>p.id!==item.id))}
  ]);
  return <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
    <FlatList data={visiblePosts} keyExtractor={item=>item.id} keyboardShouldPersistTaps="handled" contentContainerStyle={s.page}
      ListHeaderComponent={<><PageHeading kicker="TWOJA SPOŁECZNOŚĆ" title="Co nowego?"/><Surface><Field label="Dodaj wpis" value={draft} onChangeText={value=>setDraft(value.slice(0,2000))} placeholder="Kto ma ochotę na kawę?" multiline/><Button title="Dodaj wpis demo" disabled={!draft.trim()} onPress={()=>{setPosts(prev=>[{id:String(Date.now()),author:'Ty',authorId:'local-demo',city:'Demo',body:draft.trim(),likes:0},...prev]);setDraft('')}}/><Typography variant="caption" style={s.disclaimer}>Wpis widoczny tylko w tej sesji. Wersja online wymaga moderacji.</Typography></Surface></>}
      renderItem={({item})=><Surface>
        <View style={s.postHeader}>{avatar(people.find(p=>p.name===item.author)?.photo||people[0].photo)}<View style={{flex:1}}><Typography variant="subtitle">{item.author}</Typography><Typography variant="caption" style={{color:c.muted}}>{item.city} · DEMO</Typography></View></View>
        <Typography style={{fontSize:18,marginBottom:sp.lg}}>{item.body}</Typography>
        <View style={s.postActions}>
          <TextAction icon={likes.includes(item.id)?'heart':'heart-outline'} title={String(item.likes+(likes.includes(item.id)?1:0))} onPress={()=>setLikes(prev=>prev.includes(item.id)?prev.filter(id=>id!==item.id):[...prev,item.id])}/>
          {item.author==='Ty'?<TextAction icon="trash-outline" title="Usuń wpis" danger onPress={()=>deleteOwnPost(item)}/>:<TextAction icon="flag-outline" title="Zgłoś wpis" danger onPress={()=>onReport({kind:'post',id:item.id,label:`Wpis: ${item.author}`})}/>}
        </View>
      </Surface>}
      ListEmptyComponent={<Surface><Typography>Nie ma widocznych wpisów.</Typography></Surface>}
    />
  </KeyboardAvoidingView>;
}

export function GroupsScreen({onReport}){
  const [joined,setJoined]=useState([]);
  return <FlatList data={groups} keyExtractor={item=>item.id} contentContainerStyle={s.page} ListHeaderComponent={<PageHeading kicker="RAZEM" title="Twoje grupy."/>}
    renderItem={({item})=><Surface><View style={s.groupRow}><View style={s.groupIcon}><Ionicons name={item.icon} size={28} color={c.pink}/></View><View style={{flex:1}}><Typography variant="subtitle">{item.name}</Typography><Typography variant="caption" style={{color:c.muted,marginTop:4}}>{item.city} · {item.description}</Typography></View></View>
      <Button title={joined.includes(item.id)?'Dołączono (demo)':'Dołącz'} secondary style={{marginTop:sp.base}} onPress={()=>setJoined(prev=>prev.includes(item.id)?prev.filter(id=>id!==item.id):[...prev,item.id])}/>
      <TextAction icon="flag-outline" title="Zgłoś grupę (demo)" onPress={()=>onReport({kind:'group',id:item.id,label:`Grupa: ${item.name}`})}/>
    </Surface>}
    ListFooterComponent={<Typography variant="caption" style={s.disclaimer}>Grupy i zgłoszenia demonstracyjne. Brak serwera i moderacji grup.</Typography>}/>;
}

export function ChatsScreen({blockedIds=[],onReport}){
  const [active,setActive]=useState(null),[draft,setDraft]=useState(''),[messages,setMessages]=useState({});
  const chats=[{id:'maja',name:'Maja',photo:people[0].photo},{id:'group',name:'Coffee Girls',photo:people[1].photo}].filter(chat=>!blockedIds.includes(chat.id));
  const opened=active&&!blockedIds.includes(active.id)?active:null;
  return <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
    {!opened?<FlatList data={chats} keyExtractor={item=>item.id} contentContainerStyle={s.page} ListHeaderComponent={<PageHeading kicker="ROZMOWY DEMO" title="Czaty."/>}
      renderItem={({item})=><Pressable accessibilityRole="button" onPress={()=>setActive(item)}><Surface style={s.chatRow}>{avatar(item.photo)}<View style={{flex:1}}><Typography variant="subtitle">{item.name}</Typography><Typography variant="caption" style={{color:c.muted}}>Otwórz rozmowę demo</Typography></View><Ionicons name="chevron-forward" size={18} color={c.pink}/></Surface></Pressable>}
      ListFooterComponent={<Typography variant="caption" style={s.disclaimer}>Wiadomości są demonstracyjne. Nic nie jest wysyłane do innych osób.</Typography>}/>
    :<View style={[s.page,{flex:1}]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Wróć do czatów" onPress={()=>setActive(null)} style={s.chatBack}><Ionicons name="arrow-back" size={24} color={c.pink}/><Typography variant="subtitle">{opened.name}</Typography></Pressable>
      <TextAction icon="flag-outline" title="Zgłoś rozmowę (demo)" danger onPress={()=>onReport({kind:'chat',id:opened.id,label:`Rozmowa: ${opened.name}`})}/>
      <Typography variant="caption" style={s.disclaimer}>Symulacja czatu — wiadomości nie są wysyłane do innych osób.</Typography>
      <ScrollView style={{flex:1}} keyboardShouldPersistTaps="handled"><Surface><Typography>Hej! Miło Cię poznać 🌸</Typography></Surface>{(messages[opened.id]||[]).map((message,i)=><Surface key={i} style={{backgroundColor:c.blush,alignSelf:'flex-end',maxWidth:'85%'}}><Typography>{message}</Typography></Surface>)}</ScrollView>
      <View style={s.compose}><TextInput value={draft} onChangeText={setDraft} placeholder="Wiadomość..." accessibilityLabel="Wiadomość" style={s.messageInput}/><Pressable accessibilityRole="button" accessibilityLabel="Wyślij wiadomość demonstracyjną" onPress={()=>{if(!draft.trim())return;setMessages(prev=>({...prev,[opened.id]:[...(prev[opened.id]||[]),draft.trim()]}));setDraft('')}} style={s.send}><Ionicons name="send" color={c.white} size={21}/></Pressable></View>
    </View>}
  </KeyboardAvoidingView>;
}

export function ProfileScreen({account,onSafety}){
  return <ScrollView contentContainerStyle={s.page}>
    <PageHeading kicker="MOJA PRZESTRZEŃ" title="Twój profil."/>
    <Surface style={{alignItems:'center',paddingVertical:sp.xl}}><View style={s.profile}><Ionicons name="person-outline" size={54} color={c.pink}/></View><Typography variant="heading" style={{marginTop:sp.base}}>{account.name}</Typography><Typography style={{color:c.muted}}>{account.city}</Typography></Surface>
    <Section title="Chcę poznać"><Typography>{account.goal}</Typography></Section>
    <Section title="Zainteresowania"><View style={s.wrap}>{account.interests.map(i=><Chip key={i} label={i}/>)}</View></Section>
    <Button title="Bezpieczeństwo i moje dane" icon="shield-checkmark-outline" onPress={onSafety}/>
    <Typography variant="caption" style={s.disclaimer}>Prototyp bez kont i przechowywania na serwerze. Usuwanie danych demonstracyjnych znajdziesz w ustawieniach bezpieczeństwa.</Typography>
  </ScrollView>;
}
const s=StyleSheet.create({
  page:{padding:sp.lg,paddingBottom:sp.xxl,backgroundColor:c.canvas,flexGrow:1},
  wrap:{flexDirection:'row',flexWrap:'wrap'},
  profileCard:{borderRadius:r.lg,backgroundColor:c.white,overflow:'hidden',borderWidth:1,borderColor:c.line},
  heroPhoto:{width:'100%',height:Math.min(W*1.2,470),backgroundColor:c.blush},
  heroName:{backgroundColor:c.white,padding:sp.base},
  actions:{flexDirection:'row',alignItems:'center',justifyContent:'space-around',marginVertical:sp.lg},
  round:{width:55,height:55,borderRadius:30,backgroundColor:c.white,borderWidth:1,borderColor:c.line,alignItems:'center',justifyContent:'center'},
  groupIcon:{width:60,height:60,borderRadius:20,backgroundColor:c.blush,alignItems:'center',justifyContent:'center'},
  disclaimer:{color:c.muted,marginTop:sp.base,lineHeight:19},
  messageInput:{flex:1,borderWidth:1,borderColor:c.line,backgroundColor:c.white,borderRadius:r.md,padding:sp.md,color:c.ink,fontFamily:f.regular},
  send:{backgroundColor:c.pink,width:48,height:48,borderRadius:24,alignItems:'center',justifyContent:'center'},
  profile:{height:110,width:110,borderRadius:55,backgroundColor:c.blush,alignItems:'center',justifyContent:'center'},
  textAction:{flexDirection:'row',alignItems:'center',gap:6,paddingVertical:sp.sm,paddingHorizontal:sp.xs},
  safetyRow:{flexDirection:'row',justifyContent:'space-between',marginTop:sp.sm},
  postHeader:{flexDirection:'row',alignItems:'center',gap:sp.md,marginBottom:sp.md},
  postActions:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  groupRow:{flexDirection:'row',gap:sp.base,alignItems:'center'},
  chatRow:{flexDirection:'row',alignItems:'center',gap:sp.md},
  chatBack:{flexDirection:'row',alignItems:'center',gap:12,marginBottom:sp.base},
  compose:{flexDirection:'row',gap:8,alignItems:'center'}
});
