import React,{useMemo,useRef,useState} from 'react';
import {Alert,Animated,Dimensions,FlatList,Image,KeyboardAvoidingView,Modal,PanResponder,Platform,Pressable,ScrollView,StyleSheet,TextInput,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {colors as c,space as sp,radii as r,fonts as f} from './theme';
import {people,groups,cities} from './data';
import {Button,Chip,Field,PageHeading,Surface,Typography} from './ui';
const W=Dimensions.get('window').width;
const avatar=(photo,size=48)=><Image source={{uri:photo}} style={{width:size,height:size,borderRadius:size/2,backgroundColor:c.blush}}/>;
const authorId=post=>post.authorId||people.find(p=>p.name===post.author)?.id;
function Section({title,children}){return <Surface><Typography variant="subtitle" style={{marginBottom:sp.sm}}>{title}</Typography>{children}</Surface>}
function TextAction({icon,title,onPress,danger=false}){return <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={s.textAction}><Ionicons name={icon} size={19} color={danger?c.pink:c.muted}/><Typography style={{color:danger?c.pink:c.muted,fontFamily:f.semibold,fontSize:13}}>{title}</Typography></Pressable>}

export function DiscoverScreen({city='Warszawa',blockedIds=[],onBlock,onReport}){
  const [index,setIndex]=useState(0),[saved,setSaved]=useState([]);
  const filtered=people.filter(p=>!blockedIds.includes(p.id)&&p.city===city);
  const person=filtered.length?filtered[index%filtered.length]:null;
  const xy=useRef(new Animated.ValueXY()).current;
  const vibeFor=p=>{
    const tags=p?.tags||[];
    if(tags.includes('Podróże')) return 'podróżnicza';
    if(tags.includes('Sport')) return 'sportowa';
    if(tags.includes('Muzyka')) return 'imprezowa';
    if(tags.includes('Sztuka')) return 'kreatywna';
    if(tags.includes('Jedzenie')) return 'towarzyska';
    if(tags.includes('Książki')) return 'spokojna';
    return ['przedsiębiorcza','spontaniczna','ambitna','miejska'][Math.abs(String(p?.id||'').split('').reduce((a,ch)=>a+ch.charCodeAt(0),0))%4];
  };
  const decide=dir=>{if(!person)return;Animated.timing(xy,{toValue:{x:dir*W,y:0},duration:190,useNativeDriver:true}).start(()=>{if(dir>0)setSaved(prev=>prev.includes(person.id)?prev:[...prev,person.id]);setIndex(v=>v+1);xy.setValue({x:0,y:0})})};
  const pan=useMemo(()=>PanResponder.create({
    onMoveShouldSetPanResponder:(_,g)=>Math.abs(g.dx)>16&&Math.abs(g.dx)>Math.abs(g.dy)*1.15,
    onPanResponderMove:Animated.event([null,{dx:xy.x,dy:xy.y}],{useNativeDriver:false}),
    onPanResponderRelease:(_,g)=>Math.abs(g.dx)>88?decide(g.dx>0?1:-1):Animated.spring(xy,{toValue:{x:0,y:0},friction:7,useNativeDriver:true}).start()
  }),[person?.id]);
  const confirmBlock=()=>person&&Alert.alert(`Zablokować ${person.name}?`,'Profil zniknie z odkrywania.',[
    {text:'Anuluj',style:'cancel'},{text:'Zablokuj',style:'destructive',onPress:()=>onBlock(person.id)}
  ]);

  const stack=[0,1,2].map(offset=>filtered.length?filtered[(index+offset)%filtered.length]:null).filter(Boolean);
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[s.page,{paddingBottom:110}]}>
    <View style={s.discoverControls}><Typography style={s.discoverHint}>Dziewczyny, które mogą pasować do Ciebie</Typography><Ionicons name="options-outline" size={22} color={c.ink}/></View>
    <Typography style={s.cityContext}>{city}</Typography>
    {person?<>
      <View style={s.stackWrap}>
        {stack.slice().reverse().map((p,revIndex)=>{
          const realOffset=stack.length-1-revIndex;
          const isTop=realOffset===0;
          const cardStyle=isTop?[s.swipeCard,{transform:[{translateX:xy.x},{translateY:xy.y},{rotate:xy.x.interpolate({inputRange:[-W,0,W],outputRange:['-8deg','0deg','8deg']})}]}]:[
            s.swipeCard,
            s.stackCard,
            {transform:[{translateY:realOffset*11},{scale:1-realOffset*0.035}],opacity:1-realOffset*0.12}
          ];
          const Wrapper=isTop?Animated.View:View;
          return <Wrapper key={p.id} {...(isTop?pan.panHandlers:{})} style={cardStyle}>
            <Image source={{uri:p.photo}} style={s.swipePhoto} resizeMode="cover"/>
            <View style={s.cardScrim}/>
            <View style={s.vibePill}><Typography style={s.vibeText}>{vibeFor(p)}</Typography></View>
            <View style={s.cardIdentity}>
              <Typography style={s.cardName}>{p.name}, {p.age}</Typography>
              <Typography style={s.cardMeta}>{p.city} · {(p.tags||[]).slice(0,2).join(' · ')}</Typography>
            </View>
          </Wrapper>
        })}
      </View>
      <View style={s.actions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Pomiń profil" onPress={()=>decide(-1)} style={s.round}><Ionicons name="close" size={28} color={c.ink}/></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Polub profil" onPress={()=>decide(1)} style={[s.round,s.heartRound]}><Ionicons name="heart" size={25} color={c.white}/></Pressable>
      </View>
      <Section title="O mnie"><Typography>{person.bio}</Typography></Section>
      <Section title="Lubię"><View style={s.wrap}>{person.tags.map(v=><Chip key={v} label={v}/>)}</View></Section>
      <Section title={person.prompt}><Typography style={{fontSize:19,fontFamily:f.semibold}}>{person.answer}</Typography></Section>
      <View style={s.safetyRow}><TextAction icon="ban-outline" title="Zablokuj" danger onPress={confirmBlock}/><TextAction icon="flag-outline" title="Zgłoś" danger onPress={()=>onReport({kind:'profile',id:person.id,label:`Profil: ${person.name}`})}/></View>
    </>:<Surface><Typography variant="subtitle">Brak profili</Typography><Typography style={{color:c.muted}}>Zmień miasto lub sprawdź później.</Typography></Surface>}
  </ScrollView>;
}

export function CommunityScreen({city='Warszawa',posts=[],setPosts,blockedIds=[],onReport}){
  const [draft,setDraft]=useState(''),[likes,setLikes]=useState([]),[composerOpen,setComposerOpen]=useState(false);
  const visiblePosts=posts.filter(post=>!blockedIds.includes(authorId(post))&&post.city===city);
  const deleteOwnPost=item=>Alert.alert('Usunąć wpis?','Wpis zniknie z tej sesji.',[
    {text:'Anuluj',style:'cancel'},{text:'Usuń',style:'destructive',onPress:()=>setPosts(prev=>prev.filter(p=>p.id!==item.id))}
  ]);
  const publish=()=>{
    const body=draft.trim();
    if(!body)return;
    setPosts(prev=>[{id:String(Date.now()),author:'Ty',authorId:'local-demo',city,body,likes:0},...prev]);
    setDraft('');
    setComposerOpen(false);
  };

  return <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':'height'}>
    <FlatList
      data={visiblePosts}
      keyExtractor={item=>item.id}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={s.feedPage}
      ListHeaderComponent={
        <View style={s.feedHeader}>
          <Pressable onPress={()=>setComposerOpen(true)} style={s.composerTrigger}>
            <View style={s.composerAvatar}><Ionicons name="person" size={18} color={c.pink}/></View>
            <Typography style={s.composerPlaceholder}>Napisz coś do dziewczyn w {city}…</Typography>
            <Ionicons name="add-circle" size={24} color={c.pink}/>
          </Pressable>
        </View>
      }
      renderItem={({item})=><View style={s.feedPost}>
        <View style={s.postHeader}>{avatar(people.find(p=>p.name===item.author)?.photo||people[0].photo,42)}<View style={{flex:1}}><Typography style={s.postAuthor}>{item.author}</Typography><Typography variant="caption" style={{color:c.muted}}>{item.city}</Typography></View></View>
        <Typography style={s.postBody}>{item.body}</Typography>
        <View style={s.postActions}>
          <TextAction icon={likes.includes(item.id)?'heart':'heart-outline'} title={String(item.likes+(likes.includes(item.id)?1:0))} onPress={()=>setLikes(prev=>prev.includes(item.id)?prev.filter(id=>id!==item.id):[...prev,item.id])}/>
          {item.author==='Ty'?<TextAction icon="trash-outline" title="Usuń" danger onPress={()=>deleteOwnPost(item)}/>:<TextAction icon="flag-outline" title="Zgłoś" danger onPress={()=>onReport({kind:'post',id:item.id,label:`Wpis: ${item.author}`})}/>}
        </View>
      </View>}
      ListEmptyComponent={<View style={s.feedEmpty}><Typography style={s.emptyFeedTitle}>Jeszcze cicho w {city}</Typography><Typography style={s.emptyFeedText}>Napisz pierwszy post albo zmień miasto u góry.</Typography></View>}
    />

    <Modal visible={composerOpen} transparent animationType="slide" onRequestClose={()=>setComposerOpen(false)}>
      <KeyboardAvoidingView style={s.postModalBackdrop} behavior={Platform.OS==='ios'?'padding':'height'}>
        <Pressable style={StyleSheet.absoluteFill} onPress={()=>setComposerOpen(false)}/>
        <View style={s.postSheet}>
          <View style={s.postSheetHandle}/>
          <View style={s.postSheetTop}>
            <Pressable onPress={()=>setComposerOpen(false)}><Typography style={s.cancelText}>Anuluj</Typography></Pressable>
            <Typography style={s.postSheetTitle}>Nowy post</Typography>
            <Pressable disabled={!draft.trim()} onPress={publish}><Typography style={[s.publishText,!draft.trim()&&{opacity:.35}]}>Publikuj</Typography></Pressable>
          </View>
          <View style={s.postAudience}><Ionicons name="location-outline" size={16} color={c.pink}/><Typography style={s.postAudienceText}>{city}</Typography></View>
          <TextInput
            autoFocus
            multiline
            value={draft}
            onChangeText={value=>setDraft(value.slice(0,1200))}
            placeholder={`Co dzieje się w ${city}?`}
            placeholderTextColor={c.muted}
            style={s.postInput}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
  cityContext:{fontFamily:f.bold,fontSize:14,color:c.pink,marginBottom:8},
  feedPage:{paddingBottom:110,backgroundColor:'#F7F3F5'},
  feedHeader:{paddingHorizontal:sp.lg,paddingTop:6,paddingBottom:12,backgroundColor:c.canvas},
  composerTrigger:{minHeight:54,backgroundColor:c.white,borderWidth:1,borderColor:c.line,borderRadius:18,flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:12},
  composerAvatar:{width:34,height:34,borderRadius:17,backgroundColor:c.blush,alignItems:'center',justifyContent:'center'},
  composerPlaceholder:{flex:1,fontFamily:f.regular,fontSize:14,color:c.muted},
  feedPost:{paddingHorizontal:sp.lg,paddingTop:16,paddingBottom:14,marginBottom:8,backgroundColor:c.white,borderTopWidth:StyleSheet.hairlineWidth,borderBottomWidth:StyleSheet.hairlineWidth,borderColor:c.line},
  postAuthor:{fontFamily:f.bold,fontSize:15,color:c.ink},
  postBody:{fontFamily:f.regular,fontSize:17,lineHeight:24,color:c.ink,marginTop:12,marginBottom:12},
  feedEmpty:{padding:36,alignItems:'center'},
  emptyFeedTitle:{fontFamily:f.bold,fontSize:18,color:c.ink},
  emptyFeedText:{fontFamily:f.regular,fontSize:14,color:c.muted,marginTop:5,textAlign:'center'},
  postModalBackdrop:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(0,0,0,.28)'},
  postSheet:{backgroundColor:c.white,borderTopLeftRadius:28,borderTopRightRadius:28,padding:sp.lg,paddingTop:10,minHeight:330},
  postSheetHandle:{width:42,height:5,borderRadius:3,backgroundColor:c.line,alignSelf:'center',marginBottom:14},
  postSheetTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:18},
  postSheetTitle:{fontFamily:f.bold,fontSize:17,color:c.ink},
  cancelText:{fontFamily:f.semibold,fontSize:14,color:c.muted},
  publishText:{fontFamily:f.bold,fontSize:14,color:c.pink},
  postAudience:{alignSelf:'flex-start',flexDirection:'row',alignItems:'center',gap:5,backgroundColor:c.blush,borderRadius:999,paddingHorizontal:10,paddingVertical:7,marginBottom:12},
  postAudienceText:{fontFamily:f.bold,fontSize:12,color:c.pink},
  postInput:{minHeight:150,fontFamily:f.regular,fontSize:20,lineHeight:28,color:c.ink,textAlignVertical:'top'},
  discoverControls:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,marginBottom:8},
  discoverHint:{fontFamily:f.semibold,fontSize:14,color:c.muted},
  stackWrap:{height:520,marginTop:8,marginBottom:12,position:'relative'},
  swipeCard:{position:'absolute',left:0,right:0,top:0,height:490,borderRadius:28,overflow:'hidden',backgroundColor:c.white,borderWidth:1,borderColor:c.line,shadowColor:'#27151D',shadowOpacity:.12,shadowRadius:18,shadowOffset:{width:0,height:10},elevation:4},
  stackCard:{pointerEvents:'none'},
  swipePhoto:{width:'100%',height:'100%'},
  cardScrim:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(0,0,0,.14)'},
  vibePill:{position:'absolute',top:16,left:16,backgroundColor:'rgba(255,255,255,.9)',paddingHorizontal:12,paddingVertical:7,borderRadius:999},
  vibeText:{fontFamily:f.bold,fontSize:12,color:c.ink},
  cardIdentity:{position:'absolute',left:18,right:18,bottom:18},
  cardName:{fontFamily:f.bold,fontSize:34,lineHeight:38,color:c.white,letterSpacing:-1.4},
  cardMeta:{fontFamily:f.semibold,fontSize:14,color:'rgba(255,255,255,.92)',marginTop:4},
  heartRound:{backgroundColor:c.pink,borderColor:c.pink},
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
  postActions:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingTop:2},
  groupRow:{flexDirection:'row',gap:sp.base,alignItems:'center'},
  chatRow:{flexDirection:'row',alignItems:'center',gap:sp.md},
  chatBack:{flexDirection:'row',alignItems:'center',gap:12,marginBottom:sp.base},
  compose:{flexDirection:'row',gap:8,alignItems:'center'}
});
