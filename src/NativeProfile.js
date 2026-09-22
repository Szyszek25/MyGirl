import React from 'react';
import {Image,ScrollView,StyleSheet,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {colors as c,space as sp,fonts as f,radii as r} from './theme';
import {Button,Chip,PageHeading,Surface,Typography} from './ui';
import {PROFILE_PROMPTS} from './Onboarding';

export default function NativeProfile({account,onSafety}){
  return <ScrollView contentContainerStyle={s.page}>
    <PageHeading kicker="MOJA PRZESTRZEŃ" title="Twój profil."/>
    <Surface style={s.head}>
      {account.photo?<Image source={{uri:account.photo}} style={s.avatar} accessibilityLabel="Twoje zdjęcie profilowe"/>:<View style={[s.avatar,s.placeholder]}><Ionicons name="person-outline" size={54} color={c.pink}/></View>}
      <Typography variant="heading" style={{marginTop:sp.base}}>{account.name}</Typography>
      <Typography style={{color:c.muted}}>{account.city}</Typography>
      <Typography variant="caption" style={s.note}>Profil zapisany na tym urządzeniu · bez konta online</Typography>
    </Surface>
    <Surface><Typography variant="subtitle" style={s.title}>Po co tu jestem</Typography><Typography>{account.goal}</Typography></Surface>
    <Surface><Typography variant="subtitle" style={s.title}>Moje zainteresowania</Typography><View style={s.wrap}>{(account.interests||[]).map(interest=><Chip key={interest} label={interest}/>)}</View></Surface>
    {Object.entries(account.answers||{}).filter(([,answer])=>typeof answer==='string'&&answer.trim()).map(([key,answer])=><Surface key={key}><Typography variant="subtitle" style={s.title}>{PROFILE_PROMPTS[Number(key)]||'Moja odpowiedź'}</Typography><Typography>{answer}</Typography></Surface>)}
    <Button title="Bezpieczeństwo i moje dane" icon="shield-checkmark-outline" onPress={onSafety}/>
    <Typography variant="caption" style={s.note}>Zdjęcie i profil pozostają lokalnie w aplikacji. Wpisy i wiadomości na pozostałych ekranach są jeszcze symulacją, nie kontaktem z prawdziwymi osobami.</Typography>
  </ScrollView>;
}
const s=StyleSheet.create({page:{flexGrow:1,padding:sp.lg,paddingBottom:sp.xxl,backgroundColor:c.canvas},head:{alignItems:'center',paddingVertical:sp.xl},avatar:{height:124,width:124,borderRadius:62,backgroundColor:c.blush},placeholder:{alignItems:'center',justifyContent:'center'},title:{marginBottom:sp.sm},wrap:{flexDirection:'row',flexWrap:'wrap'},note:{color:c.muted,marginTop:sp.base,lineHeight:20,textAlign:'center'}});
