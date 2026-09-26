import React,{useEffect,useState} from 'react';
import {Alert,FlatList,Image,KeyboardAvoidingView,Modal,Platform,Pressable,ScrollView,StyleSheet,View} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {Ionicons} from '@expo/vector-icons';
import {groups as seedGroups,people} from './data';
import {colors as c,space as sp,radii as r,fonts as f} from './theme';
import {Button,Chip,Field,Typography} from './ui';
import {createGroup,deleteGroup,loadGroups,setGroupJoined} from './services/groupsApi';

const categories=['Kawa','Sport','Książki','Podróże','Jedzenie','Muzyka','Samopoczucie','Studia','Inne'];
const clean=(value,max)=>String(value||'').trim().slice(0,max);
const localId=()=>`group-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;

export default function ClubsMeetupsScreen({city='Warszawa',sessionUserId=null,onReport,onOpenChat,openGroupId=null,onGroupOpened}){
  const [clubs,setClubs]=useState(()=>sessionUserId?[]:seedGroups.map((g,i)=>({...g,demo:true,members:g.members||18+i*7})));
  const [remoteLoaded,setRemoteLoaded]=useState(false);
  const [joined,setJoined]=useState(['coffee-waw']);
  const [activeClub,setActiveClub]=useState(null);
  const [creating,setCreating]=useState(false);
  const [name,setName]=useState('');
  const [description,setDescription]=useState('');
  const [category,setCategory]=useState('Kawa');
  const [groupFilter,setGroupFilter]=useState('Wszystkie');
  const [coverUri,setCoverUri]=useState(null);
  useEffect(()=>{if(!openGroupId||!clubs.length)return;const target=clubs.find(item=>item.id===openGroupId);if(target){setActiveClub(target);onGroupOpened?.();}},[openGroupId,clubs,onGroupOpened]);
  useEffect(()=>{
    if(!sessionUserId){
      setClubs(seedGroups.map((g,i)=>({...g,demo:true,members:g.members||18+i*7})));
      setRemoteLoaded(false);
      return;
    }
    let alive=true;
    setClubs([]);
    loadGroups(city,sessionUserId).then(rows=>{
      if(!alive)return;
      setClubs(rows.length?rows:[]);
      setJoined(rows.filter(row=>row.joinedByMe).map(row=>row.id));
      setRemoteLoaded(true);
    }).catch(()=>{if(alive){setRemoteLoaded(false)}});
    return ()=>{alive=false};
  },[city,sessionUserId]);



  const withCategory=club=>club.category||({
    'cafe-outline':'Kawa','fitness-outline':'Sport','book-outline':'Książki','airplane-outline':'Podróże','restaurant-outline':'Jedzenie','sparkles-outline':'Muzyka'
  }[club.icon]||'Inne');
  const data=clubs.filter(item=>(item.city===city||item.city==='Polska')&&(groupFilter==='Wszystkie'||withCategory(item)===groupFilter));

  const resetForm=()=>{
    setName('');
    setDescription('');
    setCategory('Kawa');
    setCoverUri(null);
    setCreating(false);
  };

  const toggleJoin=async club=>{
    const currently=joined.includes(club.id);
    setJoined(prev=>currently?prev.filter(id=>id!==club.id):[...prev,club.id]);
    if(club.remote&&sessionUserId){
      try{
        await setGroupJoined(club.id,sessionUserId,!currently);
        const rows=await loadGroups(city,sessionUserId);
        setClubs(rows);
      }catch(error){
        setJoined(prev=>currently?[...new Set([...prev,club.id])]:prev.filter(id=>id!==club.id));
      }
    }
  };

  const joinAndOpen=club=>{
    setJoined(prev=>prev.includes(club.id)?prev:[...prev,club.id]);
    setActiveClub(club);
  };

  const openGroupChat=async club=>{
    if(!sessionUserId)return Alert.alert('Zaloguj się','Czat grupy wymaga konta.');
    if(!club?.remote)return Alert.alert('Czat grupy','Ta grupa demonstracyjna nie ma rozmowy online.');
    if(!joined.includes(club.id))return Alert.alert('Dołącz do grupy','Najpierw dołącz do grupy, aby otworzyć jej czat.');
    try{
      await onOpenChat?.(club.id);
      setActiveClub(null);
    }catch(error){Alert.alert('Czat grupy',error.message||'Nie udało się otworzyć czatu.');}
  };

  const pickCover=async()=>{const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();if(!permission.granted)return;const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,aspect:[1,1],quality:.85});if(!result.canceled&&result.assets?.[0]?.uri)setCoverUri(result.assets[0].uri)};

  const createClub=async()=>{
    const title=clean(name,80);
    if(title.length<2)return Alert.alert('Podaj nazwę grupy','Wpisz przynajmniej 2 znaki.');
    if(sessionUserId){
      try{
        const created=await createGroup(sessionUserId,{name:title,description:clean(description,500)||'Nowa grupa w Polce',city,category,coverUri});
        const rows=await loadGroups(city,sessionUserId);
        setClubs(rows);setJoined(rows.filter(row=>row.joinedByMe).map(row=>row.id));
        resetForm();
        setActiveClub(rows.find(row=>row.id===created.id)||null);
        return;
      }catch(error){Alert.alert('Nie utworzono grupy',error.message||'Spróbuj ponownie.');return;}
    }
    const club={id:localId(),name:title,city,description:clean(description,500)||'Nowa grupa w Polce',icon:'people-outline',category,owned:true,demo:true,members:1};
    setClubs(prev=>[club,...prev]);setJoined(prev=>[club.id,...prev]);resetForm();setActiveClub(club);
  };

  return <View style={s.root}>
    <View style={s.controls}>
      <Typography style={s.context}>Grupy w {city}</Typography>
      <Pressable style={s.plus} onPress={()=>setCreating(true)} accessibilityRole="button" accessibilityLabel="Utwórz grupę">
        <Ionicons name="add" size={24} color={c.white}/>
      </Pressable>
    </View>

    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.groupFilterScroll} contentContainerStyle={s.groupFilters}>
      {['Wszystkie',...categories].map(item=><Chip key={item} label={item} selected={groupFilter===item} onPress={()=>setGroupFilter(item)}/>)}
    </ScrollView>

    <FlatList
      data={data}
      keyExtractor={item=>item.id}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={s.list}
      renderItem={({item})=>{
        const isJoined=joined.includes(item.id);
        return <Pressable onPress={()=>setActiveClub(item)} style={s.card}>
          <View style={s.icon}><Ionicons name={item.icon||'people-outline'} size={23} color={c.pink}/></View>
          <View style={s.cardBody}>
            <Typography style={s.cardTitle}>{item.name}</Typography>
            <Typography style={s.meta}>{withCategory(item)} · {item.members||1} członkiń</Typography>
            {!!item.description&&<Typography numberOfLines={1} style={s.descriptionPreview}>{item.description}</Typography>}
          </View>
          <Pressable hitSlop={10} onPress={()=>joinAndOpen(item)} style={[s.joinButton,isJoined&&s.joinedButton]}>
            <Typography style={[s.joinText,isJoined&&{color:c.pink}]}>{isJoined?'Otwórz':'Dołącz'}</Typography>
          </Pressable>
        </Pressable>
      }}
      ListEmptyComponent={<View style={s.empty}><Typography style={s.emptyTitle}>Brak grup w {city}</Typography><Typography style={s.emptyText}>Utwórz pierwszą grupę albo zmień miasto u góry.</Typography></View>}
    />

    <Modal visible={!!activeClub} animationType="slide" transparent onRequestClose={()=>setActiveClub(null)}>
      {!!activeClub&&(()=>{
        const club=clubs.find(item=>item.id===activeClub.id)||activeClub;
        const isJoined=joined.includes(club.id);
        return <View style={s.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={()=>setActiveClub(null)}/>
          <View style={s.detailModal}>
            <View style={s.handle}/>
            <ScrollView contentContainerStyle={s.detailPage} showsVerticalScrollIndicator={false}>
              <View style={s.detailHeader}>
                <Pressable onPress={()=>setActiveClub(null)} style={s.iconButton}><Ionicons name="arrow-back" size={23} color={c.ink}/></Pressable>
                <Typography style={s.detailHeaderTitle}>Grupa</Typography>
                <Pressable onPress={()=>onReport?.({kind:'group',id:club.id,label:`Grupa: ${club.name}`})} style={s.iconButton}><Ionicons name="ellipsis-horizontal" size={22} color={c.ink}/></Pressable>
              </View>

              <View style={s.heroIcon}><Ionicons name={club.icon||'people-outline'} size={42} color={c.pink}/></View>
              <Typography style={s.detailTitle}>{club.name}</Typography>
              <Typography style={s.meta}>{club.city} · {withCategory(club)} · {club.members||1} członkiń</Typography>
              <Typography style={s.detailDescription}>{club.description}</Typography>

              <View style={s.membersRow}>
                {people.filter(p=>p.city===club.city).slice(0,5).map(p=><View key={p.id} style={s.memberWrap}><View style={s.memberBubble}><Typography style={s.memberInitial}>{p.name[0]}</Typography></View></View>)}
                <Typography style={s.membersText}>Społeczność w {club.city}</Typography>
              </View>

              <Button title={isJoined?'Opuść grupę':'Dołącz do grupy'} secondary={isJoined} onPress={()=>toggleJoin(club)}/>
              {club.remote&&club.owned&&<Button title="Usuń grupę" secondary style={{marginTop:sp.sm}} onPress={()=>Alert.alert('Usunąć grupę?','Tej operacji nie można cofnąć.',[{text:'Anuluj',style:'cancel'},{text:'Usuń',style:'destructive',onPress:async()=>{try{await deleteGroup(club.id,sessionUserId);setActiveClub(null);setClubs(await loadGroups(city,sessionUserId));}catch(error){Alert.alert('Nie usunięto grupy',error.message||'Spróbuj ponownie.')}}}])}/>} 

              <View style={s.actions}>
                <Pressable style={s.action} onPress={()=>openGroupChat(club)}><Ionicons name="chatbubbles-outline" size={20} color={c.pink}/><Typography style={s.actionText}>Otwórz czat</Typography></Pressable>
                <Pressable style={s.action} onPress={()=>onReport?.({kind:'group',id:club.id,label:`Grupa: ${club.name}`})}><Ionicons name="flag-outline" size={20} color={c.pink}/><Typography style={s.actionText}>Zgłoś</Typography></Pressable>
              </View>
            </ScrollView>
          </View>
        </View>;
      })()}
    </Modal>

    <Modal visible={creating} transparent animationType="slide" onRequestClose={resetForm}>
      <KeyboardAvoidingView style={s.modalBackdrop} behavior={Platform.OS==='ios'?'padding':'height'}>
        <Pressable style={StyleSheet.absoluteFill} onPress={resetForm}/>
        <View style={s.createSheet}>
          <View style={s.handle}/>
          <View style={s.createHeader}><Typography style={s.createTitle}>Nowa grupa</Typography><Pressable onPress={resetForm}><Ionicons name="close" size={24} color={c.ink}/></Pressable></View>
          <Pressable onPress={pickCover} style={s.coverPicker}>{coverUri?<Image source={{uri:coverUri}} style={s.coverPreview}/>:<><Ionicons name="camera-outline" size={25} color={c.pink}/><Typography style={s.coverPickerText}>Dodaj zdjęcie grupy</Typography></>}</Pressable>
          <Field label="Nazwa grupy" value={name} onChangeText={value=>setName(value.slice(0,80))} placeholder="Np. Matcha Girls Warszawa"/>
          <Field label="Opis" value={description} onChangeText={value=>setDescription(value.slice(0,500))} placeholder="Dla kogo jest ta grupa?" multiline/>
          <View style={s.cityPill}><Ionicons name="location-outline" size={16} color={c.pink}/><Typography style={s.cityPillText}>{city}</Typography></View>
          <Typography style={s.label}>Temat</Typography>
          <View style={s.chips}>{categories.map(item=><Chip key={item} label={item} selected={category===item} onPress={()=>setCategory(item)}/>)}</View>
          <Button title="Utwórz grupę" onPress={createClub} style={{marginTop:sp.md}}/>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  </View>;
}

const s=StyleSheet.create({
  root:{flex:1,backgroundColor:c.canvas},
  controls:{paddingHorizontal:sp.lg,paddingTop:4,paddingBottom:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  context:{fontFamily:f.semibold,fontSize:15,color:c.muted},
  plus:{width:44,height:44,borderRadius:22,backgroundColor:c.pink,alignItems:'center',justifyContent:'center'},
  groupFilterScroll:{flexGrow:0,flexShrink:0},
  groupFilters:{paddingLeft:sp.lg,paddingRight:sp.sm,paddingBottom:10,alignItems:'center'},
  list:{paddingHorizontal:sp.lg,paddingBottom:110,gap:10},
  card:{minHeight:78,backgroundColor:c.white,borderRadius:r.md,borderWidth:1,borderColor:c.line,padding:12,flexDirection:'row',alignItems:'center',gap:12},
  icon:{width:50,height:50,borderRadius:16,backgroundColor:c.blush,alignItems:'center',justifyContent:'center'},
  cardBody:{flex:1,minWidth:0},
  cardTitle:{fontFamily:f.bold,fontSize:16,color:c.ink},
  meta:{fontFamily:f.regular,fontSize:12,color:c.muted,marginTop:3},
  descriptionPreview:{fontFamily:f.regular,fontSize:12,color:c.muted,marginTop:4},
  joinButton:{backgroundColor:c.pink,borderRadius:r.pill,paddingVertical:8,paddingHorizontal:12},
  joinedButton:{backgroundColor:c.blush},
  joinText:{fontFamily:f.bold,fontSize:12,color:c.white},
  empty:{padding:36,alignItems:'center'},
  emptyTitle:{fontFamily:f.bold,fontSize:18,color:c.ink},
  emptyText:{fontFamily:f.regular,fontSize:14,color:c.muted,marginTop:5,textAlign:'center'},
  modalBackdrop:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(0,0,0,.28)'},
  detailModal:{backgroundColor:c.white,borderTopLeftRadius:30,borderTopRightRadius:30,maxHeight:'91%',overflow:'hidden'},
  handle:{width:42,height:5,borderRadius:3,backgroundColor:c.line,alignSelf:'center',marginTop:10,marginBottom:4},
  detailPage:{padding:sp.lg,paddingTop:8,paddingBottom:50},
  detailHeader:{height:48,flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:12},
  detailHeaderTitle:{fontFamily:f.bold,fontSize:16,color:c.ink},
  iconButton:{width:40,height:40,borderRadius:20,alignItems:'center',justifyContent:'center'},
  heroIcon:{width:76,height:76,borderRadius:24,backgroundColor:c.blush,alignItems:'center',justifyContent:'center',marginBottom:sp.base},
  detailTitle:{fontFamily:f.bold,fontSize:30,lineHeight:34,letterSpacing:-1,color:c.ink},
  detailDescription:{fontFamily:f.regular,fontSize:17,lineHeight:25,color:c.ink,marginVertical:sp.lg},
  membersRow:{flexDirection:'row',alignItems:'center',marginBottom:sp.lg},
  memberWrap:{marginRight:-7},
  memberBubble:{width:34,height:34,borderRadius:17,backgroundColor:c.blush,borderWidth:2,borderColor:c.white,alignItems:'center',justifyContent:'center'},
  memberInitial:{fontFamily:f.bold,fontSize:12,color:c.ink},
  membersText:{fontFamily:f.semibold,fontSize:12,color:c.muted,marginLeft:14},
  actions:{flexDirection:'row',gap:10,marginTop:12},
  action:{flex:1,height:48,borderRadius:r.md,borderWidth:1,borderColor:c.line,backgroundColor:c.white,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7},
  actionText:{fontFamily:f.semibold,fontSize:13,color:c.ink},
  infoBox:{marginTop:22,backgroundColor:c.canvas,borderRadius:18,borderWidth:1,borderColor:c.line,padding:14,flexDirection:'row',gap:10,alignItems:'flex-start'},
  infoTitle:{fontFamily:f.bold,fontSize:14,color:c.ink},
  infoText:{fontFamily:f.regular,fontSize:12,lineHeight:18,color:c.muted,marginTop:3},
  createSheet:{backgroundColor:c.white,borderTopLeftRadius:30,borderTopRightRadius:30,padding:sp.lg,paddingBottom:34,maxHeight:'86%'},
  createHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:sp.base},
  coverPicker:{width:92,height:92,borderRadius:24,backgroundColor:c.blush,borderWidth:1,borderColor:c.line,alignItems:'center',justifyContent:'center',alignSelf:'center',marginBottom:14,overflow:'hidden'},coverPreview:{width:'100%',height:'100%'},coverPickerText:{fontFamily:f.semibold,fontSize:10,color:c.pink,textAlign:'center',marginTop:4},
  createTitle:{fontFamily:f.bold,fontSize:22,letterSpacing:-.7,color:c.ink},
  cityPill:{alignSelf:'flex-start',flexDirection:'row',alignItems:'center',gap:6,backgroundColor:c.blush,borderRadius:999,paddingHorizontal:11,paddingVertical:8,marginBottom:sp.md},
  cityPillText:{fontFamily:f.bold,fontSize:12,color:c.pink},
  label:{fontFamily:f.semibold,fontSize:14,color:c.ink,marginBottom:sp.sm},
  chips:{flexDirection:'row',flexWrap:'wrap',marginBottom:sp.sm}
});
