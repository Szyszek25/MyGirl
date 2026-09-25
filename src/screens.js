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
  const [draft,setDraft]=useState(''),[likes,setLikes]=useState([]),[composerOpen,setComposerOpen]=useState(false),[commentPost,setCommentPost]=useState(null),[commentDraft,setCommentDraft]=useState(''),[comments,setComments]=useState({});
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
  const seededComments=post=>comments[post.id]||[
    {id:`${post.id}-c1`,author:'Maja',body:'Ja jestem chętna 🙋‍♀️',photo:people[0].photo},
    {id:`${post.id}-c2`,author:'Ola',body:'Brzmi super, o której dokładnie?',photo:people[1].photo}
  ];
  const addComment=()=>{
    if(!commentPost||!commentDraft.trim())return;
    const next={id:`${commentPost.id}-${Date.now()}`,author:'Ty',body:commentDraft.trim(),photo:null};
    setComments(prev=>({...prev,[commentPost.id]:[...seededComments(commentPost),next]}));
    setCommentDraft('');
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
        {!!item.image&&<Image source={{uri:item.image}} style={s.postImage} resizeMode="cover"/>}
        <View style={s.postActions}>
          <View style={s.postActionLeft}>
            <TextAction icon={likes.includes(item.id)?'heart':'heart-outline'} title={String(item.likes+(likes.includes(item.id)?1:0))} onPress={()=>setLikes(prev=>prev.includes(item.id)?prev.filter(id=>id!==item.id):[...prev,item.id])}/>
            <TextAction icon="chatbubble-outline" title={String(seededComments(item).length)} onPress={()=>setCommentPost(item)}/>
          </View>
          {item.author==='Ty'?<TextAction icon="trash-outline" title="Usuń" danger onPress={()=>deleteOwnPost(item)}/>:<TextAction icon="flag-outline" title="Zgłoś" danger onPress={()=>onReport({kind:'post',id:item.id,label:`Wpis: ${item.author}`})}/>}
        </View>
        <Pressable onPress={()=>setCommentPost(item)} style={s.commentPreview}><Typography style={s.commentPreviewText}>Zobacz komentarze</Typography></Pressable>
      </View>}
      ListEmptyComponent={<View style={s.feedEmpty}><Typography style={s.emptyFeedTitle}>Jeszcze cicho w {city}</Typography><Typography style={s.emptyFeedText}>Napisz pierwszy post albo zmień miasto u góry.</Typography></View>}
    />

    <Modal visible={!!commentPost} animationType="slide" onRequestClose={()=>setCommentPost(null)}>
      {!!commentPost&&<KeyboardAvoidingView style={s.commentsRoot} behavior={Platform.OS==='ios'?'padding':'height'}>
        <View style={s.commentsHeader}>
          <Pressable onPress={()=>setCommentPost(null)} style={s.commentsBack}><Ionicons name="arrow-back" size={24} color={c.ink}/></Pressable>
          <Typography style={s.commentsTitle}>Komentarze</Typography>
          <Pressable onPress={()=>onReport?.({kind:'post',id:commentPost.id,label:`Wpis: ${commentPost.author}`})} style={s.commentsBack}><Ionicons name="ellipsis-horizontal" size={22} color={c.ink}/></Pressable>
        </View>
        <ScrollView style={s.commentsScroll} contentContainerStyle={s.commentsContent} keyboardShouldPersistTaps="handled">
          <View style={s.commentPostBox}>
            <View style={s.postHeader}>{avatar(people.find(p=>p.name===commentPost.author)?.photo||people[0].photo,42)}<View style={{flex:1}}><Typography style={s.postAuthor}>{commentPost.author}</Typography><Typography variant="caption" style={{color:c.muted}}>{commentPost.city}</Typography></View></View>
            <Typography style={s.postBody}>{commentPost.body}</Typography>
            {!!commentPost.image&&<Image source={{uri:commentPost.image}} style={s.commentPostImage} resizeMode="cover"/>}
          </View>
          {seededComments(commentPost).map(comment=><View key={comment.id} style={s.commentRow}>
            {comment.photo?avatar(comment.photo,38):<View style={s.commentAvatar}><Ionicons name="person" size={17} color={c.pink}/></View>}
            <View style={s.commentBubble}><Typography style={s.commentAuthor}>{comment.author}</Typography><Typography style={s.commentBody}>{comment.body}</Typography><View style={s.commentMetaRow}><Typography style={s.commentMeta}>teraz</Typography><Typography style={s.commentMeta}>Lubię</Typography><Typography style={s.commentMeta}>Odpowiedz</Typography></View></View>
          </View>)}
        </ScrollView>
        <View style={s.commentComposer}>
          <View style={s.commentAvatar}><Ionicons name="person" size={17} color={c.pink}/></View>
          <TextInput value={commentDraft} onChangeText={setCommentDraft} placeholder="Napisz komentarz…" placeholderTextColor={c.muted} multiline maxLength={800} style={s.commentInput}/>
          <Pressable onPress={addComment} disabled={!commentDraft.trim()} style={[s.commentSend,!commentDraft.trim()&&{opacity:.35}]}><Ionicons name="arrow-up" size={19} color={c.white}/></Pressable>
        </View>
      </KeyboardAvoidingView>}
    </Modal>

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

export function ChatsScreen({blockedIds=[],onReport,onClose}){
  const [active,setActive]=useState(null),[draft,setDraft]=useState(''),[messages,setMessages]=useState({});
  const chats=[
    {id:'maja',name:'Maja',photo:people[0].photo,last:'Hej! Widzimy się jutro? 💗',time:'18:42',unread:2},
    {id:'meet-matcha',name:'Matcha + spacer',photo:'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=300&q=80',last:'Maja: widzimy się przy wejściu o 17:30 ☕',time:'18:15',unread:4},
    {id:'meet-karaoke',name:'Girls night + karaoke',photo:'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=300&q=80',last:'Natalia: mamy jeszcze dwa miejsca 🎤',time:'17:48',unread:7},
    {id:'group',name:'Coffee Girls',photo:people[1].photo,last:'Ola: mam stolik na 18:30',time:'17:10',unread:5},
    {id:'meet-pilates',name:'Pilates + brunch',photo:'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=300&q=80',last:'Klara: pamiętajcie o matach 🧘‍♀️',time:'15:22',unread:1},
    {id:'meet-books',name:'Book club + kawa',photo:'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300&q=80',last:'Sara: wrzucam lokalizację kawiarni',time:'wczoraj',unread:0}
  ].filter(chat=>!blockedIds.includes(chat.id));

  const send=()=>{
    if(!active||!draft.trim())return;
    const body=draft.trim();
    setMessages(prev=>({...prev,[active.id]:[...(prev[active.id]||[]),body]}));
    setDraft('');
  };

  if(active){
    return <KeyboardAvoidingView style={s.fullChat} behavior={Platform.OS==='ios'?'padding':'height'} keyboardVerticalOffset={0}>
      <View style={s.fullChatHeader}>
        <Pressable onPress={()=>setActive(null)} style={s.fullChatIcon} accessibilityLabel="Wróć do rozmów"><Ionicons name="arrow-back" size={24} color={c.ink}/></Pressable>
        {avatar(active.photo,42)}
        <View style={{flex:1}}><Typography style={s.fullChatName}>{active.name}</Typography><Typography style={s.fullChatStatus}>aktywna niedawno</Typography></View>
        <Pressable onPress={()=>onReport?.({kind:'chat',id:active.id,label:`Rozmowa: ${active.name}`})} style={s.fullChatIcon}><Ionicons name="ellipsis-horizontal" size={23} color={c.ink}/></Pressable>
      </View>

      <ScrollView style={s.messageArea} contentContainerStyle={s.messageContent} keyboardShouldPersistTaps="handled">
        <View style={s.dayPill}><Typography style={s.dayText}>Dzisiaj</Typography></View>
        <View style={s.incomingWrap}><View style={s.incomingBubble}><Typography style={s.bubbleText}>Hej! Miło Cię poznać 🌸</Typography></View></View>
        <View style={s.incomingWrap}><View style={s.incomingBubble}><Typography style={s.bubbleText}>Masz już jakiś plan na weekend?</Typography></View></View>
        {(messages[active.id]||[]).map((message,i)=><View key={i} style={s.outgoingWrap}><View style={s.outgoingBubble}><Typography style={s.outgoingText}>{message}</Typography></View></View>)}
      </ScrollView>

      <View style={s.fullComposer}>
        <Pressable style={s.attachButton}><Ionicons name="add" size={24} color={c.pink}/></Pressable>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Napisz wiadomość…"
          placeholderTextColor={c.muted}
          accessibilityLabel="Wiadomość"
          multiline
          maxLength={1200}
          style={s.fullMessageInput}
        />
        <Pressable accessibilityRole="button" accessibilityLabel="Wyślij wiadomość" disabled={!draft.trim()} onPress={send} style={[s.fullSend,!draft.trim()&&{opacity:.35}]}>
          <Ionicons name="arrow-up" color={c.white} size={21}/>
        </Pressable>
      </View>
    </KeyboardAvoidingView>;
  }

  return <View style={s.chatListRoot}>
    <View style={s.chatListHeader}>
      <Pressable onPress={onClose} style={s.fullChatIcon} accessibilityLabel="Zamknij wiadomości"><Ionicons name="arrow-back" size={24} color={c.ink}/></Pressable>
      <Typography style={s.chatListTitle}>Wiadomości</Typography>
      <Pressable style={s.chatHeaderButton}><Ionicons name="create-outline" size={21} color={c.ink}/></Pressable>
    </View>
    <FlatList
      data={chats}
      keyExtractor={item=>item.id}
      contentContainerStyle={s.chatList}
      keyboardShouldPersistTaps="handled"
      renderItem={({item})=><Pressable accessibilityRole="button" onPress={()=>setActive(item)} style={s.chatListRow}>
        {avatar(item.photo,54)}
        <View style={s.chatListBody}>
          <View style={s.chatTitleRow}><Typography style={s.chatName}>{item.name}</Typography><Typography style={s.chatTime}>{item.time}</Typography></View>
          <View style={s.chatPreviewRow}><Typography numberOfLines={1} style={s.chatPreview}>{item.last}</Typography>{item.unread>0&&<View style={s.unread}><Typography style={s.unreadText}>{item.unread}</Typography></View>}</View>
        </View>
      </Pressable>}
    />
  </View>;
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
  feedPage:{paddingBottom:110,backgroundColor:'#F7F3F5'},
  feedHeader:{paddingHorizontal:sp.lg,paddingTop:6,paddingBottom:12,backgroundColor:c.canvas},
  composerTrigger:{minHeight:54,backgroundColor:c.white,borderWidth:1,borderColor:c.line,borderRadius:18,flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:12},
  composerAvatar:{width:34,height:34,borderRadius:17,backgroundColor:c.blush,alignItems:'center',justifyContent:'center'},
  composerPlaceholder:{flex:1,fontFamily:f.regular,fontSize:14,color:c.muted},
  feedPost:{paddingHorizontal:sp.lg,paddingTop:16,paddingBottom:14,marginBottom:8,backgroundColor:c.white,borderTopWidth:StyleSheet.hairlineWidth,borderBottomWidth:StyleSheet.hairlineWidth,borderColor:c.line},
  postAuthor:{fontFamily:f.bold,fontSize:15,color:c.ink},
  postBody:{fontFamily:f.regular,fontSize:17,lineHeight:24,color:c.ink,marginTop:12,marginBottom:12},
  postImage:{width:'100%',height:230,borderRadius:18,backgroundColor:c.blush,marginBottom:10},
  commentPostImage:{width:'100%',height:240,borderRadius:18,backgroundColor:c.blush,marginBottom:8},
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
  postActionLeft:{flexDirection:'row',alignItems:'center',gap:8},
  commentPreview:{paddingTop:6,paddingBottom:2},
  commentPreviewText:{fontFamily:f.semibold,fontSize:12,color:c.muted},
  commentsRoot:{flex:1,backgroundColor:c.white},
  commentsHeader:{height:60,paddingHorizontal:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:c.line},
  commentsBack:{width:40,height:40,borderRadius:20,alignItems:'center',justifyContent:'center'},
  commentsTitle:{fontFamily:f.bold,fontSize:17,color:c.ink},
  commentsScroll:{flex:1,backgroundColor:c.canvas},
  commentsContent:{paddingBottom:24},
  commentPostBox:{paddingHorizontal:sp.lg,paddingVertical:16,backgroundColor:c.white,borderBottomWidth:1,borderBottomColor:c.line},
  commentRow:{flexDirection:'row',alignItems:'flex-start',gap:10,paddingHorizontal:sp.lg,paddingTop:14},
  commentAvatar:{width:38,height:38,borderRadius:19,backgroundColor:c.blush,alignItems:'center',justifyContent:'center'},
  commentBubble:{flex:1,backgroundColor:c.white,borderRadius:18,paddingHorizontal:12,paddingVertical:10,borderWidth:1,borderColor:c.line},
  commentAuthor:{fontFamily:f.bold,fontSize:13,color:c.ink},
  commentBody:{fontFamily:f.regular,fontSize:14,lineHeight:20,color:c.ink,marginTop:2},
  commentMetaRow:{flexDirection:'row',gap:14,marginTop:8},
  commentMeta:{fontFamily:f.semibold,fontSize:11,color:c.muted},
  commentComposer:{paddingHorizontal:12,paddingTop:8,paddingBottom:12,flexDirection:'row',alignItems:'flex-end',gap:8,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:c.line,backgroundColor:c.white},
  commentInput:{flex:1,maxHeight:110,minHeight:42,borderRadius:21,backgroundColor:c.canvas,borderWidth:1,borderColor:c.line,paddingHorizontal:14,paddingTop:10,paddingBottom:10,fontFamily:f.regular,fontSize:14,color:c.ink,textAlignVertical:'center'},
  commentSend:{width:40,height:40,borderRadius:20,backgroundColor:c.pink,alignItems:'center',justifyContent:'center'},
  groupRow:{flexDirection:'row',gap:sp.base,alignItems:'center'},
  chatRow:{flexDirection:'row',alignItems:'center',gap:sp.md},
  chatBack:{flexDirection:'row',alignItems:'center',gap:12,marginBottom:sp.base},
  compose:{flexDirection:'row',gap:8,alignItems:'center'},
  chatListRoot:{flex:1,backgroundColor:c.canvas},
  chatListHeader:{height:60,paddingHorizontal:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:c.white,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:c.line},
  chatListTitle:{fontFamily:f.bold,fontSize:24,letterSpacing:-.8,color:c.ink},
  chatHeaderButton:{width:38,height:38,borderRadius:19,backgroundColor:c.white,borderWidth:1,borderColor:c.line,alignItems:'center',justifyContent:'center'},
  chatList:{paddingBottom:40},
  chatListRow:{minHeight:76,paddingHorizontal:sp.lg,flexDirection:'row',alignItems:'center',gap:12,backgroundColor:c.white,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:c.line},
  chatListBody:{flex:1,minWidth:0},
  chatTitleRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  chatName:{fontFamily:f.bold,fontSize:15,color:c.ink},
  chatTime:{fontFamily:f.regular,fontSize:11,color:c.muted},
  chatPreviewRow:{flexDirection:'row',alignItems:'center',gap:8,marginTop:3},
  chatPreview:{flex:1,fontFamily:f.regular,fontSize:13,color:c.muted},
  unread:{minWidth:20,height:20,borderRadius:10,backgroundColor:c.pink,alignItems:'center',justifyContent:'center',paddingHorizontal:5},
  unreadText:{fontFamily:f.bold,fontSize:10,color:c.white},
  fullChat:{flex:1,backgroundColor:c.white},
  fullChatHeader:{minHeight:64,paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:10,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:c.line},
  fullChatIcon:{width:40,height:40,borderRadius:20,alignItems:'center',justifyContent:'center'},
  fullChatName:{fontFamily:f.bold,fontSize:15,color:c.ink},
  fullChatStatus:{fontFamily:f.regular,fontSize:11,color:c.muted,marginTop:1},
  messageArea:{flex:1,backgroundColor:'#FFF9FA'},
  messageContent:{padding:sp.lg,paddingBottom:30},
  dayPill:{alignSelf:'center',backgroundColor:c.white,borderRadius:999,paddingHorizontal:10,paddingVertical:5,marginBottom:16,borderWidth:1,borderColor:c.line},
  dayText:{fontFamily:f.semibold,fontSize:11,color:c.muted},
  incomingWrap:{alignItems:'flex-start',marginBottom:8},
  outgoingWrap:{alignItems:'flex-end',marginBottom:8},
  incomingBubble:{maxWidth:'78%',backgroundColor:c.white,borderRadius:20,borderTopLeftRadius:6,paddingHorizontal:14,paddingVertical:10,borderWidth:1,borderColor:c.line},
  outgoingBubble:{maxWidth:'78%',backgroundColor:c.pink,borderRadius:20,borderTopRightRadius:6,paddingHorizontal:14,paddingVertical:10},
  bubbleText:{fontFamily:f.regular,fontSize:15,lineHeight:20,color:c.ink},
  outgoingText:{fontFamily:f.regular,fontSize:15,lineHeight:20,color:c.white},
  fullComposer:{paddingHorizontal:12,paddingTop:8,paddingBottom:10,flexDirection:'row',alignItems:'flex-end',gap:8,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:c.line,backgroundColor:c.white},
  attachButton:{width:40,height:40,borderRadius:20,backgroundColor:c.blush,alignItems:'center',justifyContent:'center'},
  fullMessageInput:{flex:1,maxHeight:120,minHeight:42,borderRadius:21,backgroundColor:c.canvas,borderWidth:1,borderColor:c.line,paddingHorizontal:14,paddingTop:10,paddingBottom:10,fontFamily:f.regular,fontSize:15,color:c.ink,textAlignVertical:'center'},
  fullSend:{width:40,height:40,borderRadius:20,backgroundColor:c.pink,alignItems:'center',justifyContent:'center'}
});
