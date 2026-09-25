import React,{useEffect,useState} from 'react';
import {Alert,Pressable,ScrollView,Share,StyleSheet,Switch,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {colors as c,fonts as f,radii as r,space as sp} from './theme';
import {Typography} from './ui';
import {defaultFeaturePreferences,loadFeaturePreferences,saveFeaturePreferences} from './featurePreferences';

const SHARE_URL='https://polka.app';

function Row({icon,title,subtitle,onPress,right,danger=false}){
  return <Pressable accessibilityRole="button" onPress={onPress} style={s.row}>
    <View style={[s.iconBox,danger&&{backgroundColor:'#FFF0F3'}]}><Ionicons name={icon} size={20} color={danger?'#B4233B':c.pink}/></View>
    <View style={{flex:1}}><Typography style={[s.rowTitle,danger&&{color:'#B4233B'}]}>{title}</Typography>{!!subtitle&&<Typography variant="caption" style={s.subtitle}>{subtitle}</Typography>}</View>
    {right||<Ionicons name="chevron-forward" size={19} color={c.muted}/>}
  </Pressable>;
}

export default function SettingsScreen({onClose,onSafety,onPartner,onReset,onPasswordReset,onFeaturePreferencesChange}){
  const [push,setPush]=useState(true);
  const [plans,setPlans]=useState(true);
  const [messages,setMessages]=useState(true);
  const [features,setFeatures]=useState(defaultFeaturePreferences);

  useEffect(()=>{
    let alive=true;
    loadFeaturePreferences().then(value=>{if(alive)setFeatures(value)});
    return ()=>{alive=false};
  },[]);

  const setFeature=async(key,value)=>{
    const next={...features,[key]:value};
    setFeatures(next);
    try{
      const saved=await saveFeaturePreferences(next);
      onFeaturePreferencesChange?.(saved);
    }catch{}
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
      <Row icon="notifications-outline" title="Powiadomienia" subtitle="Główne powiadomienia aplikacji" right={<Switch value={push} onValueChange={setPush} trackColor={{false:'#D9D4D7',true:'#F7A7C0'}} thumbColor={push?c.pink:'#fff'}/>}/>
      <Row icon="calendar-outline" title="Plany i wydarzenia" right={<Switch value={plans} onValueChange={setPlans} trackColor={{false:'#D9D4D7',true:'#F7A7C0'}} thumbColor={plans?c.pink:'#fff'}/>}/>
      <Row icon="chatbubble-outline" title="Wiadomości" right={<Switch value={messages} onValueChange={setMessages} trackColor={{false:'#D9D4D7',true:'#F7A7C0'}} thumbColor={messages?c.pink:'#fff'}/>}/>
    </View>

    <Typography variant="eyebrow" style={s.sectionLabel}>DOPASOWANIE POLKI</Typography>
    <View style={s.group}>
      <Row icon="heart-circle-outline" title="Polka Care i cykl" subtitle="Tracker, kalendarz i baza wiedzy" right={<Switch value={features.polkaCare} onValueChange={value=>setFeature('polkaCare',value)} trackColor={{false:'#D9D4D7',true:'#F7A7C0'}} thumbColor={features.polkaCare?c.pink:'#fff'}/>}/>
      <Row icon="calendar-number-outline" title="Cykl przy spotkaniach" subtitle="Dni do okresu i kontekst terminu" right={<Switch value={features.cycleMeetingContext} onValueChange={value=>setFeature('cycleMeetingContext',value)} trackColor={{false:'#D9D4D7',true:'#F7A7C0'}} thumbColor={features.cycleMeetingContext?c.pink:'#fff'}/>}/>
      <Row icon="sparkles-outline" title="Zodiak przy spotkaniach" subtitle="Astro vibe dla terminu spotkania" right={<Switch value={features.zodiacMeetingContext} onValueChange={value=>setFeature('zodiacMeetingContext',value)} trackColor={{false:'#D9D4D7',true:'#F7A7C0'}} thumbColor={features.zodiacMeetingContext?c.pink:'#fff'}/>}/>
      <Row icon="people-outline" title="Astro matching w Poznaj" subtitle="Dopasowanie znaków na profilach" right={<Switch value={features.zodiacPeopleMatching} onValueChange={value=>setFeature('zodiacPeopleMatching',value)} trackColor={{false:'#D9D4D7',true:'#F7A7C0'}} thumbColor={features.zodiacPeopleMatching?c.pink:'#fff'}/>}/>
      <Row icon="shirt-outline" title="Styl ubierania w Poznaj" subtitle="Dopasowanie estetyki i stylu" right={<Switch value={features.stylePeopleMatching} onValueChange={value=>setFeature('stylePeopleMatching',value)} trackColor={{false:'#D9D4D7',true:'#F7A7C0'}} thumbColor={features.stylePeopleMatching?c.pink:'#fff'}/>}/>
      <Row icon="chatbubbles-outline" title="Grupa wsparcia w wiadomościach" subtitle="Seedowana rozmowa „Cykl i samopoczucie”" right={<Switch value={features.supportChat} onValueChange={value=>setFeature('supportChat',value)} trackColor={{false:'#D9D4D7',true:'#F7A7C0'}} thumbColor={features.supportChat?c.pink:'#fff'}/>}/>
    </View>

    <Typography variant="eyebrow" style={s.sectionLabel}>PRYWATNOŚĆ I KONTO</Typography>
    <View style={s.group}>
      <Row icon="shield-checkmark-outline" title="Bezpieczeństwo i prywatność" subtitle="Blokady, zgłoszenia i Twoje dane" onPress={onSafety}/>
      <Row icon="key-outline" title="Resetuj hasło" subtitle="Wyślij bezpieczny link na e-mail" onPress={onPasswordReset}/>
      <Row icon="lock-closed-outline" title="Prywatność profilu" subtitle="Kto może zobaczyć Twój profil"/>
      <Row icon="person-add-outline" title="Kto może do mnie pisać" subtitle="Kontakty i wiadomości"/>
      <Row icon="location-outline" title="Miasto i lokalizacja" subtitle="Używaj miasta zamiast dokładnego adresu"/>
    </View>

    <Typography variant="eyebrow" style={s.sectionLabel}>POMOC</Typography>
    <View style={s.group}>
      <Row icon="help-circle-outline" title="Pomoc i FAQ"/>
      <Row icon="document-text-outline" title="Regulamin"/>
      <Row icon="finger-print-outline" title="Polityka prywatności"/>
      <Row icon="mail-outline" title="Kontakt"/>
    </View>

    <View style={[s.group,{marginTop:sp.lg}]}>
      <Row icon="trash-outline" title="Usuń dane demo" danger onPress={()=>Alert.alert('Usunąć dane demo?','Profil lokalny i dane tej wersji zostaną usunięte z telefonu.',[{text:'Anuluj',style:'cancel'},{text:'Usuń',style:'destructive',onPress:onReset}])}/>
    </View>
    <Typography variant="caption" style={s.footer}>Polka 1.0.0 · część ustawień jest UI-em przygotowanym pod backend produkcyjny.</Typography>
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
  footer:{textAlign:'center',color:c.muted,marginTop:sp.xl}
});
