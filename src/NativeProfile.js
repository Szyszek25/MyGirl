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

const copy=account=>({...account,interests:[...(account.interests||[])],answers:{...(account.answers||{})},zodiac:account?.zodiac||null,style:account?.style||null});
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
      <View style={s.profileTop}>
        <View style={{flex:1}}><PageHeading kicker="MOJA PRZESTRZEŃ" title="Twój profil."/></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Ustawienia" onPress={onSettings} style={s.settingsButton}><Ionicons name="settings-outline" size={23} color={c.ink}/></Pressable>
        {!!onSignOut&&<Pressable accessibilityRole="button" accessibilityLabel="Wyloguj się" onPress={()=>Alert.alert('Wylogować się?','Będziesz mogła zalogować się ponownie.',[{text:'Anuluj',style:'cancel'},{text:'Wyloguj',style:'destructive',onPress:onSignOut}])} style={[s.settingsButton,{marginLeft:8}]}><Ionicons name="log-out-outline" size={23} color="#E03131"/></Pressable>}
      </View>
      <Surface style={s.head}>
        {(editing?draft.photo:account.photo)?<Image source={{uri:editing?draft.photo:account.photo}} style={s.avatar} accessibilityLabel="Twoje zdjęcie profilowe"/>:<View style={[s.avatar,s.placeholder]}><Ionicons name="person-outline" size={54} color={c.pink}/></View>}
        {!editing?<>
          <Typography variant="heading" style={{marginTop:sp.base}}>{account.name}</Typography>
          <Typography style={s.muted}>{account.city}</Typography>
          <Typography variant="caption" style={s.note}>Profil zapisany na tym urządzeniu · bez konta online</Typography>
        </>:<>
          <Button title="Wybierz zdjęcie z galerii" secondary icon="image-outline" onPress={selectPhoto} style={s.photoAction}/>
          {!!draft.photo&&<Button title="Usuń zdjęcie" secondary icon="trash-outline" onPress={()=>edit('photo',null)} style={s.photoAction}/>}
          <Typography variant="caption" style={s.note}>Zdjęcie pozostaje na telefonie. Usunięcie zatwierdzisz przy zapisie zmian.</Typography>
        </>}
      </Surface>
      <>
        <Surface>
          {!!account.headline&&<Typography style={s.profileHeadline}>{account.headline}</Typography>}
          {!!account.subtitle&&<Typography style={s.profileSubtitle}>{account.subtitle}</Typography>}
          {!account.headline&&!account.subtitle&&<Typography style={s.muted}>{account.goal}</Typography>}
          <View style={s.socialRow}>
            {!!account.instagramHandle&&<View style={s.socialChip}><Ionicons name="logo-instagram" size={16} color={c.pink}/><Typography style={s.socialText}>@{account.instagramHandle.replace(/^@/,'')}</Typography></View>}
            {!!account.tiktokHandle&&<View style={s.socialChip}><Ionicons name="logo-tiktok" size={16} color={c.ink}/><Typography style={s.socialText}>@{account.tiktokHandle.replace(/^@/,'')}</Typography></View>}
            {!!account.spotifyUrl&&<View style={s.socialChip}><Ionicons name="musical-notes" size={16} color={c.pink}/><Typography style={s.socialText}>Spotify</Typography></View>}
          </View>
        </Surface>
        <Surface><Typography variant="subtitle" style={s.title}>Po co tu jestem</Typography><Typography>{account.goal}</Typography></Surface>
        {(!!account?.zodiac||!!account?.style)&&<Surface>
          <Typography variant="subtitle" style={s.title}>Zodiak i styl</Typography>
          <View style={s.wrap}>
            {!!account?.zodiac&&<Chip label={`✨ ${account.zodiac}`}/>}
            {!!account?.style&&<Chip label={`👗 ${account.style}`}/>}
          </View>
        </Surface>}
        <Surface><Typography variant="subtitle" style={s.title}>Moje zainteresowania</Typography><View style={s.wrap}>{(account.interests||[]).map(interest=><Chip key={interest} label={interest}/>)}</View></Surface>
        {Object.entries(account.answers||{}).filter(([,answer])=>typeof answer==='string'&&answer.trim()).map(([key,answer])=><Surface key={key}><Typography variant="subtitle" style={s.title}>{PROFILE_PROMPTS[Number(key)]||'Moja odpowiedź'}</Typography><Typography>{answer}</Typography></Surface>)}
        <View style={s.profileActions}>
          <Button title="Edytuj profil" onPress={()=>{setDraft(copy(account));setEditing(true);}} icon="create-outline" style={{flex:1}}/>
          <Pressable onPress={()=>setShareOpen(true)} style={s.shareButton}><Ionicons name="share-social-outline" size={22} color={c.pink}/></Pressable>
        </View>
        {showCare&&<>
          <Button title="Polka Care" onPress={onCare} icon="heart-circle-outline"/>
          <Button title="Cykl i samopoczucie" secondary onPress={onCycle} icon="calendar-outline" style={s.secondary}/>
        </>}
        <Button title="Więcej w Polce" secondary onPress={onMore} style={s.secondary} icon="grid-outline"/>
        <Button title="Ustawienia" secondary onPress={onSettings} style={s.secondary} icon="settings-outline"/>
        <Button title="Dla firm i organizacji" secondary onPress={onPartner} style={s.secondary} icon="storefront-outline"/>
        <Button title="Bezpieczeństwo i moje dane" secondary icon="shield-checkmark-outline" style={s.secondary} onPress={onSafety}/>
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
const s=StyleSheet.create({logoutButton:{minHeight:54,borderRadius:r.md,backgroundColor:'#FFF5F5',borderWidth:1,borderColor:'#FFC9C9',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:sp.sm,marginTop:sp.lg,marginBottom:sp.base},logoutText:{color:'#E03131',fontFamily:f.bold,fontSize:15},profileHeadline:{fontFamily:f.bold,fontSize:23,lineHeight:28,color:c.ink,textAlign:'center'},profileSubtitle:{fontFamily:f.regular,fontSize:14,lineHeight:20,color:c.muted,textAlign:'center',marginTop:6},socialRow:{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',gap:7,marginTop:12},socialChip:{flexDirection:'row',alignItems:'center',gap:5,borderWidth:1,borderColor:c.line,borderRadius:999,paddingHorizontal:10,paddingVertical:6},socialText:{fontFamily:f.semibold,fontSize:11,color:c.ink},profileActions:{flexDirection:'row',gap:10,alignItems:'center'},shareButton:{width:52,height:52,borderRadius:16,borderWidth:1,borderColor:c.line,backgroundColor:c.white,alignItems:'center',justifyContent:'center'},modalHeader:{height:60,paddingHorizontal:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:c.white,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:c.line},modalIcon:{width:40,height:40,alignItems:'center',justifyContent:'center'},modalTitle:{fontFamily:f.bold,fontSize:16,color:c.ink},modalSave:{minWidth:62,alignItems:'flex-end'},modalSaveText:{fontFamily:f.bold,fontSize:14,color:c.pink},modalContent:{padding:sp.lg,paddingBottom:60},shareBackdrop:{flex:1,backgroundColor:'rgba(24,11,18,.55)',alignItems:'center',justifyContent:'center',padding:24},shareCard:{width:'100%',maxWidth:340,backgroundColor:c.white,borderRadius:30,padding:24,alignItems:'center'},shareEmoji:{fontSize:28,marginBottom:8},shareAvatar:{width:104,height:104,borderRadius:52,backgroundColor:c.blush},shareName:{fontFamily:f.bold,fontSize:30,color:c.ink,marginTop:14},shareCity:{fontFamily:f.semibold,fontSize:13,color:c.muted,marginTop:3},shareTagline:{fontFamily:f.semibold,fontSize:15,lineHeight:21,color:c.pink,textAlign:'center',marginVertical:18},page:{flexGrow:1,padding:sp.lg,paddingBottom:sp.xxl,backgroundColor:c.canvas},profileTop:{flexDirection:'row',alignItems:'flex-start',gap:12},settingsButton:{width:44,height:44,borderRadius:22,backgroundColor:c.white,borderWidth:1,borderColor:c.line,alignItems:'center',justifyContent:'center',marginTop:6},head:{alignItems:'center',paddingVertical:sp.xl},avatar:{height:124,width:124,borderRadius:62,backgroundColor:c.blush},placeholder:{alignItems:'center',justifyContent:'center'},title:{marginBottom:sp.sm},wrap:{flexDirection:'row',flexWrap:'wrap'},note:{color:c.muted,marginTop:sp.base,lineHeight:20,textAlign:'center'},muted:{color:c.muted},photoAction:{marginTop:sp.md,width:'100%'},secondary:{marginTop:sp.md},prompt:{paddingVertical:sp.md,borderBottomWidth:1,borderColor:c.line},answer:{fontFamily:f.regular,color:c.ink,minHeight:56,textAlignVertical:'top'},notice:{color:c.pink,marginTop:sp.md}});
