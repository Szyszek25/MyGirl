import React,{useEffect,useState} from 'react';
import {Alert,Pressable,ScrollView,Share,StyleSheet,Switch,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {colors as c,fonts as f,radii as r,space as sp} from './theme';
import {Typography} from './ui';
import {defaultFeaturePreferences,loadFeaturePreferences,saveFeaturePreferences} from './featurePreferences';
import {defaultAccountSettings,loadAccountSettings,updateAccountSettings} from './services/accountSettingsApi';

const SHARE_URL='https://polka.app';
const ZODIAC_SIGNS=['Baran','Byk','Bliźnięta','Rak','Lew','Panna','Waga','Skorpion','Strzelec','Koziorożec','Wodnik','Ryby'];
const STYLE_OPTIONS=['Casual','Minimal','Vintage','Streetwear','Sporty','Classy','Artsy'];

function Row({icon,title,subtitle,onPress,right,danger=false}){
  return <Pressable accessibilityRole="button" onPress={onPress} style={s.row}>
    <View style={[s.iconBox,danger&&{backgroundColor:'#FFF0F3'}]}><Ionicons name={icon} size={20} color={danger?'#B4233B':c.pink}/></View>
    <View style={{flex:1}}><Typography style={[s.rowTitle,danger&&{color:'#B4233B'}]}>{title}</Typography>{!!subtitle&&<Typography variant="caption" style={s.subtitle}>{subtitle}</Typography>}</View>
    {right||<Ionicons name="chevron-forward" size={19} color={c.muted}/>}
  </Pressable>;
}

export default function SettingsScreen({onClose,onSafety,onPartner,onReset,onPasswordReset,onFeaturePreferencesChange,onSignOut,onDeleteAccount,isAuthenticated=false,accountEmail='',userId=null}){
  const [accountSettings,setAccountSettings]=useState(defaultAccountSettings);
  const push=accountSettings.push_enabled;
  const plans=accountSettings.plans_notifications;
  const messages=accountSettings.messages_notifications;
  const [features,setFeatures]=useState(defaultFeaturePreferences);

  useEffect(()=>{
    let alive=true;
    Promise.all([
      loadFeaturePreferences(),
      isAuthenticated&&userId?loadAccountSettings(userId):Promise.resolve(defaultAccountSettings)
    ]).then(([featureValue,accountValue])=>{
      if(!alive)return;
      setFeatures(featureValue);
      setAccountSettings(accountValue);
    }).catch(()=>{});
    return ()=>{alive=false};
  },[isAuthenticated,userId]);

  const setFeature=async(key,value)=>{
    const next={...features,[key]:value};
    setFeatures(next);
    try{
      const saved=await saveFeaturePreferences(next);
      onFeaturePreferencesChange?.(saved);
    }catch{}
  };

  const setAccountSetting=async(key,value)=>{
    const next={...accountSettings,[key]:value};
    setAccountSettings(next);
    if(!isAuthenticated||!userId)return;
    try{
      const saved=await updateAccountSettings(userId,{[key]:value});
      setAccountSettings(saved);
    }catch(error){
      setAccountSettings(accountSettings);
      Alert.alert('Nie zapisano ustawienia',error.message||'Spróbuj ponownie.');
    }
  };

  const recommend=async()=>{
    try{
      await Share.share({message:`Polka — plany, dziewczyny i Twoje miasto. Dołącz tutaj: ${SHARE_URL}`,url:SHARE_URL,title:'Poleć Polkę'});
    }catch(error){Alert.alert('Nie udało się udostępnić','Spróbuj ponownie.');}
  };

  return <ScrollView contentContainerStyle={s.page}>
    <View style={s.header}><Pressable onPress={onClose} hitSlop={12}><Ionicons name="arrow-back" size={25} color={c.ink}/></Pressable><Typography variant="heading">Ustawienia</Typography><View style={{width:25}}/></View>

    <Typography variant="eyebrow" style={s.sectionLabel}>POLKA</Typography>
    <View style={s.group}>
      <Row icon="share-social-outline" title="Poleć Polkę" subtitle="Wyślij link znajomej" onPress={recommend}/>
      <Row icon="storefront-outline" title="Dla firm i organizacji" subtitle="Profil miejsca, oferta, współpraca" onPress={onPartner}/>
    </View>

    <Typography variant="eyebrow" style={s.sectionLabel}>POWIADOMIENIA</Typography>
    <View style={s.group}>
      <Row icon="notifications-outline" title="Powiadomienia" subtitle="Główne powiadomienia aplikacji" right={<Switch value={push} onValueChange={value=>setAccountSetting('push_enabled',value)} trackColor={{false:'#D9D4D7',true:'#F7A7C0'}} thumbColor={push?c.pink:'#fff'}/>}/>
      <Row icon="calendar-outline" title="Plany i wydarzenia" right={<Switch value={plans} onValueChange={value=>setAccountSetting('plans_notifications',value)} trackColor={{false:'#D9D4D7',true:'#F7A7C0'}} thumbColor={plans?c.pink:'#fff'}/>}/>
      <Row icon="chatbubble-outline" title="Wiadomości" right={<Switch value={messages} onValueChange={value=>setAccountSetting('messages_notifications',value)} trackColor={{false:'#D9D4D7',true:'#F7A7C0'}} thumbColor={messages?c.pink:'#fff'}/>}/>
    </View>

    <Typography variant="eyebrow" style={s.sectionLabel}>DOPASOWANIE POLKI</Typography>
    <View style={s.group}>
      <Row icon="heart-circle-outline" title="Polka Care i cykl" subtitle="Tracker, kalendarz i baza wiedzy" right={<Switch value={features.polkaCare} onValueChange={value=>setFeature('polkaCare',value)} trackColor={{false:'#D9D4D7',true:'#F7A7C0'}} thumbColor={features.polkaCare?c.pink:'#fff'}/>}/>
      <Row icon="calendar-number-outline" title="Cykl przy spotkaniach" subtitle="Dni do okresu i kontekst terminu" right={<Switch value={features.cycleMeetingContext} onValueChange={value=>setFeature('cycleMeetingContext',value)} trackColor={{false:'#D9D4D7',true:'#F7A7C0'}} thumbColor={features.cycleMeetingContext?c.pink:'#fff'}/>}/>
      <Row icon="sparkles-outline" title="Zodiak przy spotkaniach" subtitle="Astro vibe dla terminu spotkania" right={<Switch value={features.zodiacMeetingContext} onValueChange={value=>setFeature('zodiacMeetingContext',value)} trackColor={{false:'#D9D4D7',true:'#F7A7C0'}} thumbColor={features.zodiacMeetingContext?c.pink:'#fff'}/>}/>
      <Row icon="people-outline" title="Astro matching w Poznaj" subtitle="Dopasowanie znaków na profilach" right={<Switch value={features.zodiacPeopleMatching} onValueChange={value=>setFeature('zodiacPeopleMatching',value)} trackColor={{false:'#D9D4D7',true:'#F7A7C0'}} thumbColor={features.zodiacPeopleMatching?c.pink:'#fff'}/>}/>
      <Row icon="shirt-outline" title="Styl ubierania w Poznaj" subtitle="Dopasowanie estetyki i stylu" right={<Switch value={features.stylePeopleMatching} onValueChange={value=>setFeature('stylePeopleMatching',value)} trackColor={{false:'#D9D4D7',true:'#F7A7C0'}} thumbColor={features.stylePeopleMatching?c.pink:'#fff'}/>}/>
      {features.zodiacPeopleMatching&&<View style={s.preferencePicker}>
        <Typography style={s.pickerLabel}>Mój znak</Typography>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pickerScroll}>
          {ZODIAC_SIGNS.map(sign=><Pressable key={sign} onPress={()=>setFeature('zodiacSign',sign)} style={[s.preferenceChip,features.zodiacSign===sign&&s.preferenceChipActive]}><Typography style={[s.preferenceChipText,features.zodiacSign===sign&&s.preferenceChipTextActive]}>{sign}</Typography></Pressable>)}
        </ScrollView>
      </View>}
      {features.stylePeopleMatching&&<View style={s.preferencePicker}>
        <Typography style={s.pickerLabel}>Mój styl</Typography>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pickerScroll}>
          {STYLE_OPTIONS.map(style=><Pressable key={style} onPress={()=>setFeature('stylePreference',style)} style={[s.preferenceChip,features.stylePreference===style&&s.preferenceChipActive]}><Typography style={[s.preferenceChipText,features.stylePreference===style&&s.preferenceChipTextActive]}>{style}</Typography></Pressable>)}
        </ScrollView>
      </View>}
      <Row icon="chatbubbles-outline" title="Grupa wsparcia w wiadomościach" subtitle="Seedowana rozmowa „Cykl i samopoczucie”" right={<Switch value={features.supportChat} onValueChange={value=>setFeature('supportChat',value)} trackColor={{false:'#D9D4D7',true:'#F7A7C0'}} thumbColor={features.supportChat?c.pink:'#fff'}/>}/>
      {isAuthenticated&&<Row icon="cloud-upload-outline" title="Synchronizuj cykl w chmurze" subtitle="Opcjonalnie · prywatne dane Polka Care w Twoim koncie" right={<Switch value={features.cycleCloudSync} onValueChange={value=>setFeature('cycleCloudSync',value)} trackColor={{false:'#D9D4D7',true:'#F7A7C0'}} thumbColor={features.cycleCloudSync?c.pink:'#fff'}/>}/>}
      <Row icon="videocam-outline" title="Film na ekranie Start" subtitle="Krótki film Polki nad feedem" right={<Switch value={features.homeIntroVideo} onValueChange={value=>setFeature('homeIntroVideo',value)} trackColor={{false:'#D9D4D7',true:'#F7A7C0'}} thumbColor={features.homeIntroVideo?c.pink:'#fff'}/>}/>
    </View>

    <Typography variant="eyebrow" style={s.sectionLabel}>PRYWATNOŚĆ I KONTO</Typography>
    <View style={s.group}>
      {isAuthenticated&&<Row icon="person-circle-outline" title={accountEmail||'Konto Polki'} subtitle="Zalogowane konto Supabase"/>}
      <Row icon="shield-checkmark-outline" title="Bezpieczeństwo i prywatność" subtitle="Blokady, zgłoszenia i Twoje dane" onPress={onSafety}/>
      {isAuthenticated&&<Row icon="key-outline" title="Zmień hasło" subtitle="Ustaw nowe hasło do konta" onPress={onPasswordReset}/>}
      <Row icon="lock-closed-outline" title="Prywatność profilu" subtitle="Kto może zobaczyć Twój profil"/>
      <Row icon="person-add-outline" title="Kto może do mnie pisać" subtitle="Kontakty i wiadomości"/>
      <Row icon="location-outline" title="Miasto i lokalizacja" subtitle="Używaj miasta zamiast dokładnego adresu"/>
      {isAuthenticated&&<Row icon="log-out-outline" title="Wyloguj się" subtitle="Zakończ sesję na tym urządzeniu" danger onPress={()=>Alert.alert('Wylogować się?','Będziesz musiała zalogować się ponownie.',[{text:'Anuluj',style:'cancel'},{text:'Wyloguj',style:'destructive',onPress:onSignOut}])}/>}
    </View>

    <Typography variant="eyebrow" style={s.sectionLabel}>POMOC</Typography>
    <View style={s.group}>
      <Row icon="help-circle-outline" title="Pomoc i FAQ"/>
      <Row icon="document-text-outline" title="Regulamin"/>
      <Row icon="finger-print-outline" title="Polityka prywatności"/>
      <Row icon="mail-outline" title="Kontakt"/>
    </View>

    <View style={[s.group,{marginTop:sp.lg}]}>
      {isAuthenticated
        ? <Row icon="trash-outline" title="Usuń konto" subtitle="Trwale usuń konto i dane Polki" danger onPress={()=>Alert.alert('Usunąć konto?','Tej operacji nie można cofnąć. Usuniemy konto oraz przypisane dane i pliki.',[{text:'Anuluj',style:'cancel'},{text:'Usuń konto',style:'destructive',onPress:onDeleteAccount}])}/>
        : <Row icon="trash-outline" title="Usuń dane lokalne" danger onPress={()=>Alert.alert('Usunąć dane lokalne?','Profil lokalny i dane tej wersji zostaną usunięte z telefonu.',[{text:'Anuluj',style:'cancel'},{text:'Usuń',style:'destructive',onPress:onReset}])}/>}
    </View>
    <Typography variant="caption" style={s.footer}>{isAuthenticated?'Polka 1.0.0 · konto online aktywne':'Polka 1.0.0 · tryb lokalny'}</Typography>
  </ScrollView>;
}

const s=StyleSheet.create({
  page:{padding:sp.lg,paddingBottom:120,backgroundColor:c.canvas,flexGrow:1},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:sp.xl},
  sectionLabel:{color:c.muted,letterSpacing:1.4,marginTop:sp.lg,marginBottom:sp.sm},
  group:{backgroundColor:c.white,borderRadius:r.lg,borderWidth:1,borderColor:c.line,overflow:'hidden'},
  row:{minHeight:68,flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:14,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:c.line},
  iconBox:{width:38,height:38,borderRadius:12,backgroundColor:c.blush,alignItems:'center',justifyContent:'center'},
  rowTitle:{fontFamily:f.semibold,fontSize:15},
  subtitle:{color:c.muted,marginTop:2},
  preferencePicker:{paddingHorizontal:14,paddingVertical:12,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:c.line},
  pickerLabel:{fontFamily:f.bold,fontSize:12,color:c.ink,marginBottom:8},
  pickerScroll:{paddingRight:10},
  preferenceChip:{height:34,paddingHorizontal:12,borderRadius:999,borderWidth:1,borderColor:c.line,backgroundColor:c.canvas,alignItems:'center',justifyContent:'center',marginRight:7},
  preferenceChipActive:{backgroundColor:c.pink,borderColor:c.pink},
  preferenceChipText:{fontFamily:f.semibold,fontSize:11,color:c.ink},
  preferenceChipTextActive:{color:c.white},
  footer:{textAlign:'center',color:c.muted,marginTop:sp.xl}
});
