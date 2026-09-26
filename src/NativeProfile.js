import React,{useEffect,useState} from 'react';
import {Alert,Image,KeyboardAvoidingView,Modal,Platform,Pressable,ScrollView,Share,StyleSheet,TextInput,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {colors as c,space as sp,fonts as f,radii as r} from './theme';
import {Button,Chip,Field,PageHeading,Surface,Typography} from './ui';
import {PROFILE_PROMPTS} from './Onboarding';
import {cities,interests as availableInterests} from './data';

export const ZODIAC_SIGNS=['Baran','Byk','Bliźnięta','Rak','Lew','Panna','Waga','Skorpion','Strzelec','Koziorożec','Wodnik','Ryby'];
export const STYLE_OPTIONS=['Minimal','Vintage','Casual','Streetwear','Classy','Sporty','Artsy'];

const copy=account=>({...account,interests:[...(account.interests||[])],answers:{...(account.answers||{})},galleryPhotos:[...(account.galleryPhotos||[])],zodiac:account?.zodiac||null,style:account?.style||null});
export default function NativeProfile({account,showCare=true,onSafety,onPartner,onSettings,onCycle,onCare,onMore,onSave,onSignOut}){
  const [editing,setEditing]=useState(false);
  const [shareOpen,setShareOpen]=useState(false);
  const [draft,setDraft]=useState(()=>copy(account));
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  useEffect(()=>{if(!editing)setDraft(copy(account));},[account,editing]);
  const edit=(key,value)=>setDraft(prev=>({...prev,[key]:value}));
  const cancel=()=>{setDraft(copy(account));setEditing(false);setNotice('');};
  const handleProfilePhoto=async source=>{
    try{
      let selection;
      if(source==='camera'){
        const perm=await ImagePicker.requestCameraPermissionsAsync();
        if(perm.status!=='granted'){
          Alert.alert('Brak uprawnień','Zezwól Polce na dostęp do aparatu w ustawieniach telefonu.');
          return;
        }
        selection=await ImagePicker.launchCameraAsync({
          mediaTypes:['images'],
          allowsEditing:true,
          quality:0.85
        });
      }else{
        const perm=await ImagePicker.requestMediaLibraryPermissionsAsync();
        if(perm.status!=='granted'){
          Alert.alert('Brak uprawnień','Zezwól Polce na dostęp do galerii w ustawieniach telefonu.');
          return;
        }
        selection=await ImagePicker.launchImageLibraryAsync({
          mediaTypes:['images'],
          allowsEditing:true,
          quality:0.85
        });
      }
      if(selection.canceled)return;
      const image=selection.assets?.[0];
      if(!image?.uri)throw new Error('Nie udało się wybrać zdjęcia.');
      if(image.fileSize&&image.fileSize>8*1024*1024)throw new Error('Zdjęcie jest za duże. Wybierz plik do 8 MB.');
      edit('photo',image.uri);
      setNotice('Nowe zdjęcie zapisze się po naciśnięciu „Zapisz zmiany”.');
    }catch(error){Alert.alert('Nie udało się wybrać zdjęcia',error.message||'Spróbuj ponownie.');}
  };
  const selectGalleryPhotos=async()=>{
    try{
      const remaining=Math.max(0,9-(draft.galleryPhotos||[]).length);
      if(!remaining){setNotice('Możesz dodać maksymalnie 9 zdjęć.');return;}
      const perm=await ImagePicker.requestMediaLibraryPermissionsAsync();
      if(perm.status!=='granted'){Alert.alert('Brak uprawnień','Zezwól Polce na dostęp do galerii w ustawieniach telefonu.');return;}
      const selection=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsMultipleSelection:true,selectionLimit:remaining,quality:0.85});
      if(selection.canceled)return;
      const picked=(selection.assets||[]).filter(item=>item?.uri).slice(0,remaining);
      if(picked.some(item=>item.fileSize&&item.fileSize>8*1024*1024))throw new Error('Jedno ze zdjęć jest za duże. Maksymalny rozmiar to 8 MB.');
      edit('galleryPhotos',[...(draft.galleryPhotos||[]),...picked.map(item=>({path:null,url:item.uri}))].slice(0,9));
      setNotice('Zdjęcia zapiszą się po naciśnięciu „Zapisz”.');
    }catch(error){Alert.alert('Nie udało się dodać zdjęć',error.message||'Spróbuj ponownie.');}
  };
  const selectPhoto=()=>{
    Alert.alert(
      'Zmień zdjęcie profilowe',
      'Wybierz źródło:',
      [
        {text:'Zrób zdjęcie (aparat)',onPress:()=>handleProfilePhoto('camera')},
        {text:'Wybierz z galerii',onPress:()=>handleProfilePhoto('library')},
        {text:'Anuluj',style:'cancel'}
      ]
    );
  };
  const profilePhotos=[account?.photo,...(account?.galleryPhotos||[]).map(item=>item?.url||item)].filter(Boolean);
  const save=async()=>{
    if(busy)return;
    if(draft.name.trim().length<2){setNotice('Wpisz imię (minimum 2 znaki).');return;}
    if(!draft.city){setNotice('Wybierz miasto.');return;}
    setBusy(true);setNotice('');
    try{
      const answers=Object.fromEntries(Object.entries(draft.answers).map(([key,value])=>[key,String(value).trim().slice(0,160)]));
      await onSave({...draft,name:draft.name.trim(),zodiac:draft.zodiac||null,style:draft.style||null,answers});
      setEditing(false);
    }catch(error){setNotice(error.message||'Nie udało się zapisać profilu.');}
    finally{setBusy(false);}
  };
  return <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.page}>
      <View style={s.profileTop} />
      <Surface style={s.head}>
        {(editing?draft.photo:account.photo)?<Image source={{uri:editing?draft.photo:account.photo}} style={s.avatar} accessibilityLabel="Twoje zdjęcie profilowe"/>:<View style={[s.avatar,s.placeholder]}><Ionicons name="person-outline" size={54} color={c.pink}/></View>}
        {!editing?<>
          <Typography variant="heading" style={{marginTop:sp.base}}>{account.name}</Typography>
          <Typography style={s.muted}>{account.city}</Typography>
          <Typography variant="caption" style={s.note}>{account?.id ? 'Twój profil w Polce' : 'Profil zapisany na tym urządzeniu'}</Typography>
        </>:<>
          <Button title="Wybierz zdjęcie z galerii" secondary icon="image-outline" onPress={selectPhoto} style={s.photoAction}/>
          {!!draft.photo&&<Button title="Usuń zdjęcie" secondary icon="trash-outline" onPress={()=>edit('photo',null)} style={s.photoAction}/>}
          <Typography variant="caption" style={s.note}>Zdjęcie pozostaje na telefonie. Usunięcie zatwierdzisz przy zapisie zmian.</Typography>
        </>}
      </Surface>
      <>
        {(!!account.headline||!!account.subtitle||!!account.instagramHandle||!!account.tiktokHandle||!!account.spotifyUrl)&&<Surface>
          {!!account.headline&&<Typography style={s.profileHeadline}>{account.headline}</Typography>}
          {!!account.subtitle&&account.subtitle!==account.goal&&<Typography style={s.profileSubtitle}>{account.subtitle}</Typography>}
          <View style={s.socialRow}>
            {!!account.instagramHandle&&<View style={s.socialChip}><Ionicons name="logo-instagram" size={16} color={c.pink}/><Typography style={s.socialText}>@{account.instagramHandle.replace(/^@/,'')}</Typography></View>}
            {!!account.tiktokHandle&&<View style={s.socialChip}><Ionicons name="logo-tiktok" size={16} color={c.ink}/><Typography style={s.socialText}>@{account.tiktokHandle.replace(/^@/,'')}</Typography></View>}
            {!!account.spotifyUrl&&<View style={s.socialChip}><Ionicons name="musical-notes" size={16} color={c.pink}/><Typography style={s.socialText}>Spotify</Typography></View>}
          </View>
        </Surface>}
        <View style={s.infoTiles}>
          {!!account.goal&&<Pressable onPress={()=>{setDraft(copy(account));setEditing(true);}} style={s.infoTile}><View style={s.infoTileIcon}><Ionicons name="sparkles-outline" size={18} color={c.pink}/></View><Typography style={s.infoTileLabel}>Po co tu jestem</Typography><Typography numberOfLines={2} style={s.infoTileValue}>{account.goal}</Typography></Pressable>}
          <Pressable onPress={()=>{setDraft(copy(account));setEditing(true);}} style={s.infoTile}><View style={s.infoTileIcon}><Ionicons name="heart-outline" size={18} color={c.pink}/></View><Typography style={s.infoTileLabel}>Zainteresowania</Typography><Typography numberOfLines={3} style={s.infoTileValue}>{(account.interests||[]).slice(0,4).join(' · ')||'Dodaj zainteresowania'}</Typography></Pressable>
          {(!!account?.zodiac||!!account?.style)&&<View style={s.infoTile}><View style={s.infoTileIcon}><Ionicons name="moon-outline" size={18} color={c.pink}/></View><Typography style={s.infoTileLabel}>Vibe</Typography><Typography numberOfLines={2} style={s.infoTileValue}>{[account?.zodiac,account?.style].filter(Boolean).join(' · ')}</Typography></View>}
        </View>
        {!!profilePhotos.length&&<Surface>
          <View style={s.galleryHeader}><Typography variant="subtitle" style={s.title}>Moje zdjęcia</Typography><Typography style={s.galleryCount}>{profilePhotos.length}</Typography></View>
          <View style={s.galleryGrid}>{profilePhotos.map((uri,index)=><Image key={uri||index} source={{uri}} style={s.galleryThumb} resizeMode="cover"/>)}</View>
        </Surface>}
        {Object.entries(account.answers||{}).filter(([,answer])=>typeof answer==='string'&&answer.trim()).map(([key,answer])=><Surface key={key}><Typography variant="subtitle" style={s.title}>{PROFILE_PROMPTS[Number(key)]||'Moja odpowiedź'}</Typography><Typography>{answer}</Typography></Surface>)}
        <View style={s.profileActions}>
          <Button title="Edytuj profil" onPress={()=>{setDraft(copy(account));setEditing(true);}} icon="create-outline" style={{flex:1}}/>
          <Pressable onPress={()=>setShareOpen(true)} style={s.shareButton}><Ionicons name="share-social-outline" size={22} color={c.pink}/></Pressable>
        </View>
        <View style={s.actionTiles}>
          {showCare&&<Pressable onPress={onCare} style={[s.actionTile,s.actionTilePrimary]}><View style={s.actionTileIcon}><Ionicons name="heart-circle-outline" size={23} color={c.white}/></View><Typography style={s.actionTilePrimaryText}>Polka Care</Typography><Typography style={s.actionTilePrimarySub}>Wiedza i wellbeing</Typography></Pressable>}
          {showCare&&<Pressable onPress={onCycle} style={s.actionTile}><View style={s.actionTileIconSoft}><Ionicons name="calendar-outline" size={22} color={c.pink}/></View><Typography style={s.actionTileText}>Cykl</Typography><Typography style={s.actionTileSub}>Kalendarz i objawy</Typography></Pressable>}
          <Pressable onPress={onMore} style={s.actionTile}><View style={s.actionTileIconSoft}><Ionicons name="grid-outline" size={22} color={c.pink}/></View><Typography style={s.actionTileText}>Więcej</Typography><Typography style={s.actionTileSub}>Funkcje Polki</Typography></Pressable>
          <Pressable onPress={onSettings} style={s.actionTile}><View style={s.actionTileIconSoft}><Ionicons name="settings-outline" size={22} color={c.pink}/></View><Typography style={s.actionTileText}>Ustawienia</Typography><Typography style={s.actionTileSub}>Konto i aplikacja</Typography></Pressable>
          <Pressable onPress={onPartner} style={s.actionTile}><View style={s.actionTileIconSoft}><Ionicons name="storefront-outline" size={22} color={c.pink}/></View><Typography style={s.actionTileText}>Dla firm</Typography><Typography style={s.actionTileSub}>Partnerstwa i miejsca</Typography></Pressable>
          <Pressable onPress={onSafety} style={s.actionTile}><View style={s.actionTileIconSoft}><Ionicons name="shield-checkmark-outline" size={22} color={c.pink}/></View><Typography style={s.actionTileText}>Bezpieczeństwo</Typography><Typography style={s.actionTileSub}>Dane i blokady</Typography></Pressable>
        </View>
        {!!onSignOut&&<Pressable accessibilityRole="button" accessibilityLabel="Wyloguj się" onPress={()=>Alert.alert('Wylogować się?','Będziesz mogła zalogować się ponownie.',[{text:'Anuluj',style:'cancel'},{text:'Wyloguj',style:'destructive',onPress:onSignOut}])} style={s.logoutButton}>
          <Ionicons name="log-out-outline" size={20} color="#E03131"/>
          <Typography style={s.logoutText}>Wyloguj się</Typography>
        </Pressable>}
      </>

      <Modal visible={editing} animationType="slide" presentationStyle="pageSheet" onRequestClose={cancel}>
        <KeyboardAvoidingView style={{flex:1,backgroundColor:c.canvas}} behavior={Platform.OS==='ios'?'padding':undefined}>
          <View style={s.modalHeader}><Pressable onPress={cancel} style={s.modalIcon}><Ionicons name="close" size={24} color={c.ink}/></Pressable><Typography style={s.modalTitle}>Edytuj profil</Typography><Pressable disabled={busy} onPress={save} style={s.modalSave}><Typography style={s.modalSaveText}>{busy?'Chwila…':'Zapisz'}</Typography></Pressable></View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.modalContent}>
            <Surface style={s.head}>
              {draft.photo?<Image source={{uri:draft.photo}} style={s.avatar}/>:<View style={[s.avatar,s.placeholder]}><Ionicons name="person-outline" size={54} color={c.pink}/></View>}
              <Button title="Zmień zdjęcie" secondary icon="image-outline" onPress={selectPhoto} style={s.photoAction}/>
            </Surface>
            <Surface>
              <Field label="Imię" value={draft.name} onChangeText={value=>edit('name',value.slice(0,60))} placeholder="Jak się do Ciebie zwracać?"/>
              <Field label="Nagłówek profilu (opcjonalnie)" value={draft.headline||''} onChangeText={value=>edit('headline',value.slice(0,80))} placeholder="np. Nowa w Warszawie ✨"/>
              <Field label="Podtytuł (opcjonalnie)" value={draft.subtitle||''} onChangeText={value=>edit('subtitle',value.slice(0,120))} placeholder="np. matcha · koncerty · spacery"/>
              <Typography variant="subtitle" style={s.title}>Miasto</Typography>
              <View style={s.wrap}>{cities.map(city=><Chip key={city} label={city} selected={draft.city===city} onPress={()=>edit('city',city)}/>)}</View>
              <Typography variant="subtitle" style={s.title}>Po co tu jesteś?</Typography>
              <View style={s.wrap}>{['Nowe znajomości','Wspólne wyjścia','Nowe miasto','Grupy i hobby'].map(goal=><Chip key={goal} label={goal} selected={draft.goal===goal} onPress={()=>edit('goal',goal)}/>)}</View>
              <Typography variant="subtitle" style={s.title}>Zainteresowania</Typography>
              <View style={s.wrap}>{availableInterests.map(interest=><Chip key={interest} label={interest} selected={draft.interests.includes(interest)} onPress={()=>edit('interests',draft.interests.includes(interest)?draft.interests.filter(item=>item!==interest):[...draft.interests,interest])}/>)}</View>
            </Surface>
            <Surface>
              <View style={s.galleryHeader}><Typography variant="subtitle" style={s.title}>Zdjęcia profilu</Typography><Typography style={s.galleryCount}>{(draft.galleryPhotos||[]).length}/9</Typography></View>
              <Typography style={s.galleryHelp}>Pojawią się na dole profilu w Poznaj jako duże kafelki.</Typography>
              <View style={s.galleryGrid}>
                {(draft.galleryPhotos||[]).map((item,index)=><View key={item.path||item.url||index} style={s.galleryEditItem}>
                  <Image source={{uri:item.url||item}} style={[s.galleryThumb,s.galleryEditPhoto]}/>
                  <Pressable accessibilityLabel="Usuń zdjęcie" onPress={()=>edit('galleryPhotos',(draft.galleryPhotos||[]).filter((_,i)=>i!==index))} style={s.galleryRemove}><Ionicons name="close" size={18} color={c.white}/></Pressable>
                </View>)}
                {(draft.galleryPhotos||[]).length<9&&<Pressable onPress={selectGalleryPhotos} style={s.galleryAdd}><Ionicons name="add" size={28} color={c.pink}/><Typography style={s.galleryAddText}>Dodaj</Typography></Pressable>}
              </View>
            </Surface>
            <Surface>
              <Typography variant="subtitle" style={s.title}>Sociale (opcjonalnie)</Typography>
              <Field label="Instagram" value={draft.instagramHandle||''} onChangeText={value=>edit('instagramHandle',value.slice(0,50))} placeholder="@twojprofil"/>
              <Field label="TikTok" value={draft.tiktokHandle||''} onChangeText={value=>edit('tiktokHandle',value.slice(0,50))} placeholder="@twojprofil"/>
              <Field label="Spotify" value={draft.spotifyUrl||''} onChangeText={value=>edit('spotifyUrl',value.slice(0,500))} placeholder="https://open.spotify.com/..."/>
            </Surface>
            <Surface>
              <Typography variant="subtitle" style={s.title}>Mój znak zodiaku</Typography>
              <View style={s.wrap}>{ZODIAC_SIGNS.map(sign=><Chip key={sign} label={sign} selected={draft.zodiac===sign} onPress={()=>edit('zodiac',draft.zodiac===sign?null:sign)}/>)}</View>
              <Typography variant="subtitle" style={[s.title,{marginTop:sp.md}]}>Mój styl</Typography>
              <View style={s.wrap}>{STYLE_OPTIONS.map(style=><Chip key={style} label={style} selected={draft.style===style} onPress={()=>edit('style',draft.style===style?null:style)}/>)}</View>
            </Surface>
            <Surface><Typography variant="subtitle" style={s.title}>Pytania o Tobie</Typography>
              {PROFILE_PROMPTS.map((prompt,index)=><View key={prompt} style={s.prompt}><Typography style={{fontFamily:f.semibold,marginBottom:sp.sm}}>{prompt}</Typography><TextInput multiline maxLength={160} value={draft.answers[index]||''} onChangeText={value=>edit('answers',{...draft.answers,[index]:value})} placeholder="Twoja odpowiedź…" placeholderTextColor={c.muted} style={s.answer}/></View>)}
            </Surface>
            {!!notice&&<Typography accessibilityRole="alert" style={s.notice}>{notice}</Typography>}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={shareOpen} transparent animationType="fade" onRequestClose={()=>setShareOpen(false)}>
        <Pressable style={s.shareBackdrop} onPress={()=>setShareOpen(false)}>
          <Pressable style={s.shareCard} onPress={e=>e.stopPropagation()}>
            <Typography style={s.shareEmoji}>💗✨👯‍♀️</Typography>
            {(account.photo)?<Image source={{uri:account.photo}} style={s.shareAvatar}/>:<View style={[s.shareAvatar,s.placeholder]}><Ionicons name="person-outline" size={36} color={c.pink}/></View>}
            <Typography style={s.shareName}>{account.name}</Typography>
            <Typography style={s.shareCity}>{account.city} · Polka</Typography>
            <Typography style={s.shareTagline}>{account.headline||'Znajdź mnie w Polce 💕'}</Typography>
            <Button title="Udostępnij profil" icon="share-social-outline" onPress={async()=>{try{await Share.share({message:`Poznaj ${account.name} w Polce 💗`})}catch{} }}/>
          </Pressable>
        </Pressable>
      </Modal>

    </ScrollView>
  </KeyboardAvoidingView>;
}
const s=StyleSheet.create({galleryHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},galleryCount:{fontFamily:f.bold,fontSize:12,color:c.muted},galleryHelp:{fontFamily:f.regular,fontSize:12,lineHeight:18,color:c.muted,marginBottom:12},galleryGrid:{flexDirection:'row',flexWrap:'wrap',gap:10},galleryThumb:{width:'48%',aspectRatio:0.82,borderRadius:18,backgroundColor:c.blush},galleryEditItem:{width:'48%',position:'relative'},galleryEditPhoto:{width:'100%'},galleryRemove:{position:'absolute',top:8,right:8,width:30,height:30,borderRadius:15,backgroundColor:'rgba(25,14,20,.72)',alignItems:'center',justifyContent:'center'},galleryAdd:{width:'48%',aspectRatio:0.82,borderRadius:18,borderWidth:1.5,borderStyle:'dashed',borderColor:c.pink,backgroundColor:c.blush,alignItems:'center',justifyContent:'center',gap:4},galleryAddText:{fontFamily:f.bold,fontSize:12,color:c.pink},logoutButton:{minHeight:54,borderRadius:r.md,backgroundColor:'#FFF5F5',borderWidth:1,borderColor:'#FFC9C9',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:sp.sm,marginTop:sp.lg,marginBottom:sp.base},logoutText:{color:'#E03131',fontFamily:f.bold,fontSize:15},profileHeadline:{fontFamily:f.bold,fontSize:23,lineHeight:28,color:c.ink,textAlign:'center'},profileSubtitle:{fontFamily:f.regular,fontSize:14,lineHeight:20,color:c.muted,textAlign:'center',marginTop:6},socialRow:{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',gap:7,marginTop:12},socialChip:{flexDirection:'row',alignItems:'center',gap:5,borderWidth:1,borderColor:c.line,borderRadius:999,paddingHorizontal:10,paddingVertical:6},socialText:{fontFamily:f.semibold,fontSize:11,color:c.ink},profileActions:{flexDirection:'row',gap:10,alignItems:'center'},shareButton:{width:52,height:52,borderRadius:16,borderWidth:1,borderColor:c.line,backgroundColor:c.white,alignItems:'center',justifyContent:'center'},
infoTiles:{flexDirection:'row',flexWrap:'wrap',gap:10},infoTile:{width:'48%',minHeight:118,borderRadius:20,backgroundColor:c.white,borderWidth:1,borderColor:c.line,padding:15},infoTileIcon:{width:34,height:34,borderRadius:12,backgroundColor:c.blush,alignItems:'center',justifyContent:'center',marginBottom:10},infoTileLabel:{fontFamily:f.bold,fontSize:11,color:c.muted,textTransform:'uppercase',letterSpacing:.7},infoTileValue:{fontFamily:f.semibold,fontSize:14,lineHeight:19,color:c.ink,marginTop:5},
actionTiles:{flexDirection:'row',flexWrap:'wrap',gap:10,marginTop:4},actionTile:{width:'48%',minHeight:132,borderRadius:22,backgroundColor:c.white,borderWidth:1,borderColor:c.line,padding:16,justifyContent:'flex-end'},actionTilePrimary:{backgroundColor:c.pink,borderColor:c.pink},actionTileIcon:{width:38,height:38,borderRadius:13,backgroundColor:'rgba(255,255,255,.18)',alignItems:'center',justifyContent:'center',marginBottom:'auto'},actionTileIconSoft:{width:38,height:38,borderRadius:13,backgroundColor:c.blush,alignItems:'center',justifyContent:'center',marginBottom:'auto'},actionTileText:{fontFamily:f.bold,fontSize:16,color:c.ink,marginTop:14},actionTileSub:{fontFamily:f.regular,fontSize:11,color:c.muted,marginTop:3},actionTilePrimaryText:{fontFamily:f.bold,fontSize:16,color:c.white,marginTop:14},actionTilePrimarySub:{fontFamily:f.regular,fontSize:11,color:'rgba(255,255,255,.82)',marginTop:3},modalHeader:{height:60,paddingHorizontal:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:c.white,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:c.line},modalIcon:{width:40,height:40,alignItems:'center',justifyContent:'center'},modalTitle:{fontFamily:f.bold,fontSize:16,color:c.ink},modalSave:{minWidth:62,alignItems:'flex-end'},modalSaveText:{fontFamily:f.bold,fontSize:14,color:c.pink},modalContent:{padding:sp.lg,paddingBottom:60},shareBackdrop:{flex:1,backgroundColor:'rgba(24,11,18,.55)',alignItems:'center',justifyContent:'center',padding:24},shareCard:{width:'100%',maxWidth:340,backgroundColor:c.white,borderRadius:30,padding:24,alignItems:'center'},shareEmoji:{fontSize:28,marginBottom:8},shareAvatar:{width:104,height:104,borderRadius:52,backgroundColor:c.blush},shareName:{fontFamily:f.bold,fontSize:30,color:c.ink,marginTop:14},shareCity:{fontFamily:f.semibold,fontSize:13,color:c.muted,marginTop:3},shareTagline:{fontFamily:f.semibold,fontSize:15,lineHeight:21,color:c.pink,textAlign:'center',marginVertical:18},page:{flexGrow:1,paddingHorizontal:sp.lg,paddingTop:12,paddingBottom:sp.xxl,backgroundColor:c.canvas},profileTop:{flexDirection:'row',alignItems:'flex-start',gap:12},settingsButton:{width:44,height:44,borderRadius:22,backgroundColor:c.white,borderWidth:1,borderColor:c.line,alignItems:'center',justifyContent:'center',marginTop:6},head:{alignItems:'center',paddingVertical:18},avatar:{height:124,width:124,borderRadius:62,backgroundColor:c.blush},placeholder:{alignItems:'center',justifyContent:'center'},title:{marginBottom:sp.sm},wrap:{flexDirection:'row',flexWrap:'wrap'},note:{color:c.muted,marginTop:sp.base,lineHeight:20,textAlign:'center'},muted:{color:c.muted},photoAction:{marginTop:sp.md,width:'100%'},secondary:{marginTop:sp.md},prompt:{paddingVertical:sp.md,borderBottomWidth:1,borderColor:c.line},answer:{fontFamily:f.regular,color:c.ink,minHeight:56,textAlignVertical:'top'},notice:{color:c.pink,marginTop:sp.md}});
