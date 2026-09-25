import React,{useEffect,useState} from 'react';
import {Image,Linking,Pressable,ScrollView,StyleSheet,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {colors as c,fonts as f,radii as r,space as sp} from './theme';
import {Typography} from './ui';
import {loadDiscounts} from './services/discountsApi';

const demoDiscounts=[
  {id:'d1',business:'Douglas',title:'Beauty deals dla społeczności',description:'Miejsce na zweryfikowane kody i akcje partnerskie Polki.',code:null},
  {id:'d2',business:'Local coffee',title:'-10% na pierwszą kawę',description:'Przykładowa lokalna zniżka dla użytkowniczek Polki.',code:'POLKA10'},
  {id:'d3',business:'Pilates studio',title:'Pierwsze wejście taniej',description:'Przykładowy benefit lokalnego partnera.',code:null}
];
const marketplace=[
  {id:'m1',icon:'shirt-outline',title:'Ubrania i dodatki',copy:'Sprzedaj albo oddaj rzeczy lokalnie.'},
  {id:'m2',icon:'book-outline',title:'Książki i rzeczy na studia',copy:'Prosty lokalny marketplace bez osobnej zakładki.'},
  {id:'m3',icon:'sparkles-outline',title:'Beauty swap',copy:'Nieotwarte kosmetyki i akcesoria — z zasadami bezpieczeństwa.'}
];

export default function MoreScreen({onClose}){
  const [discounts,setDiscounts]=useState([]);
  const [scanImage,setScanImage]=useState(null);
  useEffect(()=>{let alive=true;loadDiscounts().then(rows=>{if(alive)setDiscounts(rows)}).catch(()=>{});return()=>{alive=false}},[]);

  const scan=async()=>{
    const result=await ImagePicker.launchCameraAsync({mediaTypes:['images'],allowsEditing:false,quality:.8});
    if(!result.canceled&&result.assets?.[0]?.uri)setScanImage(result.assets[0].uri);
  };
  const rows=discounts.length?discounts:demoDiscounts;

  return <View style={s.root}>
    <View style={s.header}><Pressable onPress={onClose} style={s.icon}><Ionicons name="close" size={24} color={c.ink}/></Pressable><Typography style={s.title}>Więcej w Polce</Typography><View style={s.icon}/></View>
    <ScrollView contentContainerStyle={s.content}>
      <Typography style={s.hero}>Małe rzeczy, które ułatwiają życie.</Typography>
      <Typography style={s.lead}>Zniżki, lokalny marketplace i narzędzia beauty bez dokładania szóstej zakładki na dole.</Typography>

      <Typography style={s.section}>ZNIŻKI</Typography>
      {rows.map(item=><Pressable key={item.id} onPress={()=>item.url&&Linking.openURL(item.url)} style={s.discount}>
        <View style={s.discountIcon}><Ionicons name="pricetag-outline" size={21} color={c.pink}/></View>
        <View style={{flex:1}}><Typography style={s.discountBusiness}>{item.business}</Typography><Typography style={s.discountTitle}>{item.title}</Typography><Typography style={s.discountCopy}>{item.description}</Typography>{!!item.code&&<Typography style={s.code}>{item.code}</Typography>}</View>
        {!!item.url&&<Ionicons name="open-outline" size={18} color={c.muted}/>}
      </Pressable>)}

      <Typography style={s.section}>MARKETPLACE</Typography>
      <View style={s.marketGrid}>{marketplace.map(item=><View key={item.id} style={s.marketCard}><View style={s.marketIcon}><Ionicons name={item.icon} size={22} color={c.pink}/></View><Typography style={s.marketTitle}>{item.title}</Typography><Typography style={s.marketCopy}>{item.copy}</Typography><View style={s.soon}><Typography style={s.soonText}>seed / następny etap</Typography></View></View>)}</View>

      <Typography style={s.section}>SKANER KOSMETYKÓW</Typography>
      <View style={s.scanner}>
        {scanImage?<Image source={{uri:scanImage}} style={s.scanImage}/>:<View style={s.scanPlaceholder}><Ionicons name="scan-outline" size={34} color={c.pink}/></View>}
        <View style={{flex:1}}><Typography style={s.marketTitle}>Zeskanuj etykietę</Typography><Typography style={s.marketCopy}>Aparat jest gotowy. OCR nie jest jeszcze udawany: kolejny krok to lokalny ML Kit / on-device OCR, żeby nie płacić za API za każdy skan.</Typography>
          <Pressable onPress={scan} style={s.scanButton}><Ionicons name="camera-outline" size={17} color={c.white}/><Typography style={s.scanButtonText}>{scanImage?'Zrób ponownie':'Otwórz aparat'}</Typography></Pressable>
        </View>
      </View>
    </ScrollView>
  </View>;
}

const s=StyleSheet.create({
  root:{flex:1,backgroundColor:c.canvas},header:{height:60,paddingHorizontal:12,backgroundColor:c.white,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:c.line,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},icon:{width:40,height:40,alignItems:'center',justifyContent:'center'},title:{fontFamily:f.bold,fontSize:17,color:c.ink},content:{padding:sp.lg,paddingBottom:70},hero:{fontFamily:f.bold,fontSize:34,lineHeight:38,letterSpacing:-1.3,color:c.ink},lead:{fontFamily:f.regular,fontSize:15,lineHeight:22,color:c.muted,marginTop:8,marginBottom:24},section:{fontFamily:f.bold,fontSize:10,letterSpacing:1.3,color:c.muted,marginTop:18,marginBottom:9},discount:{flexDirection:'row',alignItems:'flex-start',gap:12,padding:14,backgroundColor:c.white,borderRadius:r.lg,borderWidth:1,borderColor:c.line,marginBottom:9},discountIcon:{width:40,height:40,borderRadius:13,backgroundColor:c.blush,alignItems:'center',justifyContent:'center'},discountBusiness:{fontFamily:f.bold,fontSize:11,color:c.pink},discountTitle:{fontFamily:f.bold,fontSize:15,color:c.ink,marginTop:2},discountCopy:{fontFamily:f.regular,fontSize:12,lineHeight:17,color:c.muted,marginTop:3},code:{alignSelf:'flex-start',fontFamily:f.bold,fontSize:12,color:c.ink,backgroundColor:c.blush,borderRadius:8,paddingHorizontal:8,paddingVertical:5,marginTop:7},marketGrid:{gap:9},marketCard:{backgroundColor:c.white,borderWidth:1,borderColor:c.line,borderRadius:r.lg,padding:16},marketIcon:{width:40,height:40,borderRadius:13,backgroundColor:c.blush,alignItems:'center',justifyContent:'center',marginBottom:10},marketTitle:{fontFamily:f.bold,fontSize:16,color:c.ink},marketCopy:{fontFamily:f.regular,fontSize:12,lineHeight:18,color:c.muted,marginTop:4},soon:{alignSelf:'flex-start',marginTop:9,backgroundColor:c.canvas,borderRadius:999,paddingHorizontal:8,paddingVertical:5},soonText:{fontFamily:f.bold,fontSize:9,color:c.muted},scanner:{flexDirection:'row',gap:13,alignItems:'flex-start',backgroundColor:c.white,borderWidth:1,borderColor:c.line,borderRadius:r.lg,padding:14},scanPlaceholder:{width:86,height:110,borderRadius:16,backgroundColor:c.blush,alignItems:'center',justifyContent:'center'},scanImage:{width:86,height:110,borderRadius:16,backgroundColor:c.blush},scanButton:{alignSelf:'flex-start',height:38,borderRadius:12,backgroundColor:c.pink,flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:12,marginTop:10},scanButtonText:{fontFamily:f.bold,fontSize:11,color:c.white}
});
