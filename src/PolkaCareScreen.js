import React,{useMemo,useState} from 'react';
import {Linking,Pressable,ScrollView,StyleSheet,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {colors as c,fonts as f,space as sp} from './theme';
import {Chip,Typography} from './ui';

const articles=[
  {id:'cycle-basics',category:'Cykl',icon:'calendar-outline',title:'Jak liczyć cykl?',summary:'Cykl liczy się od pierwszego dnia krwawienia do pierwszego dnia kolejnej miesiączki.',body:['Śledzenie pierwszego dnia miesiączki pomaga zauważyć własny rytm i zmiany między miesiącami.','Długość cyklu różni się między osobami i może zmieniać się z miesiąca na miesiąc.'],source:'ACOG',url:'https://www.acog.org/womens-health/faqs/your-first-period'},
  {id:'late-period',category:'Okres',icon:'time-outline',title:'Okres się spóźnia — co warto zanotować?',summary:'Zapisz datę ostatniej miesiączki, objawy i to, jak różni się ten cykl od poprzednich.',body:['Pojedynczy późniejszy cykl nie mówi sam w sobie, co jest przyczyną.','Jeśli istnieje możliwość ciąży, test ciążowy może być właściwym kolejnym krokiem. Przy utrzymującym się braku miesiączki albo innych niepokojących objawach warto skonsultować się z lekarzem.'],source:'ACOG',url:'https://www.acog.org/womens-health/faqs/amenorrhea-absence-of-periods'},
  {id:'symptoms',category:'Objawy',icon:'pulse-outline',title:'Skurcze, wzdęcia, ból głowy i nastrój',summary:'Objawy wokół miesiączki są częste, ale ich nasilenie może być bardzo różne.',body:['Notowanie objawów przez kilka cykli może pomóc zobaczyć, czy coś powtarza się w podobnym momencie.','Silny ból, bardzo obfite krwawienie, niepokojące zmiany nastroju albo objawy utrudniające normalne funkcjonowanie są dobrym powodem do kontaktu z profesjonalistą medycznym.'],source:'WHO',url:'https://www.who.int/news-room/fact-sheets/detail/menstrual-health'},
  {id:'heavy-bleeding',category:'Kiedy po pomoc',icon:'medical-outline',title:'Kiedy nie ignorować objawów?',summary:'Jeśli coś jest wyraźnie inne niż Twój zwykły wzorzec albo utrudnia codzienne funkcjonowanie, nie musisz tego przeczekiwać sama.',body:['Warto zasięgnąć porady medycznej przy bardzo obfitym lub długim krwawieniu, braku miesiączki przez dłuższy czas, silnym bólu lub innych niepokojących objawach.','Polka Care może pomóc zebrać notatki z cyklu, ale nie diagnozuje przyczyny objawów.'],source:'ACOG',url:'https://www.acog.org/womens-health/faqs/heavy-and-abnormal-periods'},
  {id:'plans',category:'Plany',icon:'sparkles-outline',title:'Okres potrafi zmienić plany',summary:'Nie musisz dopasowywać życia do aplikacji. Dopasuj plan do tego, jak faktycznie się czujesz.',body:['Jeśli masz mniej energii, wybierz spokojniejszy plan albo mniejszą grupę. Jeśli czujesz się dobrze, nie ma potrzeby rezygnować z aktywności tylko dlatego, że aplikacja pokazuje konkretną fazę.','Traktuj tracker jako pamiętnik własnych wzorców, nie jako instrukcję tego, co „powinnaś” robić.'],source:'Polka Care + WHO',url:'https://www.who.int/news-room/fact-sheets/detail/menstrual-health'}
];

const categories=['Wszystkie','Cykl','Okres','Objawy','Kiedy po pomoc','Plany'];

export default function PolkaCareScreen({onClose}){
  const [category,setCategory]=useState('Wszystkie');
  const [selected,setSelected]=useState(null);
  const visible=useMemo(()=>articles.filter(a=>category==='Wszystkie'||a.category===category),[category]);

  if(selected)return <View style={s.root}>
    <View style={s.header}><Pressable onPress={()=>setSelected(null)} style={s.iconBtn}><Ionicons name="arrow-back" size={24} color={c.ink}/></Pressable><Typography style={s.headerTitle}>Polka Care</Typography><View style={s.iconBtn}/></View>
    <ScrollView contentContainerStyle={s.articlePage}>
      <View style={s.articleIcon}><Ionicons name={selected.icon} size={28} color={c.pink}/></View>
      <Typography style={s.articleCategory}>{selected.category.toUpperCase()}</Typography>
      <Typography style={s.articleTitle}>{selected.title}</Typography>
      <Typography style={s.articleLead}>{selected.summary}</Typography>
      {selected.body.map((p,i)=><Typography key={i} style={s.articleBody}>{p}</Typography>)}
      <Pressable onPress={()=>Linking.openURL(selected.url)} style={s.sourceRow}><Ionicons name="open-outline" size={18} color={c.pink}/><View style={{flex:1}}><Typography style={s.sourceLabel}>Źródło</Typography><Typography style={s.sourceName}>{selected.source}</Typography></View><Ionicons name="chevron-forward" size={18} color={c.muted}/></Pressable>
      <View style={s.medicalNote}><Ionicons name="information-circle-outline" size={20} color={c.pink}/><Typography style={s.medicalText}>Polka Care ma charakter edukacyjny. Nie stawia diagnoz i nie zastępuje konsultacji medycznej.</Typography></View>
    </ScrollView>
  </View>;

  return <View style={s.root}>
    <View style={s.header}><Pressable onPress={onClose} style={s.iconBtn}><Ionicons name="arrow-back" size={24} color={c.ink}/></Pressable><Typography style={s.headerTitle}>Polka Care</Typography><View style={s.iconBtn}/></View>
    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.hero}>
        <Typography style={s.careMark}>Polka Care</Typography>
        <Typography style={s.heroTitle}>Okres potrafi czasem zmienić plany.</Typography>
        <Typography style={s.heroCopy}>Lepiej poznaj swój rytm, zapisuj objawy i miej pod ręką prostą bazę wiedzy.</Typography>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>{categories.map(item=><Chip key={item} label={item} selected={category===item} onPress={()=>setCategory(item)}/>)}</ScrollView>
      <View style={s.quote}><Typography style={s.quoteText}>„Okresu nie da się zaplanować. Spotkania z Polkami już tak.”</Typography></View>
      {visible.map(article=><Pressable key={article.id} onPress={()=>setSelected(article)} style={s.card}>
        <View style={s.cardIcon}><Ionicons name={article.icon} size={22} color={c.pink}/></View>
        <View style={{flex:1}}><Typography style={s.cardCategory}>{article.category}</Typography><Typography style={s.cardTitle}>{article.title}</Typography><Typography numberOfLines={2} style={s.cardSummary}>{article.summary}</Typography></View>
        <Ionicons name="chevron-forward" size={20} color={c.muted}/>
      </Pressable>)}
      <Typography style={s.footer}>Treści edukacyjne Polka Care opierają się na materiałach WHO i ACOG. W razie niepokojących objawów skonsultuj się z profesjonalistą medycznym.</Typography>
    </ScrollView>
  </View>;
}

const s=StyleSheet.create({
  root:{flex:1,backgroundColor:c.canvas},header:{height:60,paddingHorizontal:12,backgroundColor:c.white,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:c.line,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},iconBtn:{width:40,height:40,borderRadius:20,alignItems:'center',justifyContent:'center'},headerTitle:{fontFamily:f.bold,fontSize:16,color:c.ink},content:{padding:sp.lg,paddingBottom:70},hero:{backgroundColor:c.pink,borderRadius:28,padding:22,marginBottom:14},careMark:{fontFamily:f.bold,fontSize:12,letterSpacing:1.1,color:'#FFFFFFCC'},heroTitle:{fontFamily:f.bold,fontSize:34,lineHeight:37,letterSpacing:-1.3,color:c.white,marginTop:28},heroCopy:{fontFamily:f.regular,fontSize:15,lineHeight:22,color:'#FFFFFFDD',marginTop:10},filters:{paddingBottom:8},quote:{borderRadius:20,backgroundColor:c.blush,padding:18,marginBottom:12},quoteText:{fontFamily:f.bold,fontSize:20,lineHeight:27,letterSpacing:-.5,color:c.pink},card:{backgroundColor:c.white,borderRadius:20,borderWidth:1,borderColor:c.line,padding:14,flexDirection:'row',alignItems:'center',gap:12,marginBottom:10},cardIcon:{width:44,height:44,borderRadius:15,backgroundColor:c.blush,alignItems:'center',justifyContent:'center'},cardCategory:{fontFamily:f.bold,fontSize:10,letterSpacing:.8,color:c.pink,textTransform:'uppercase'},cardTitle:{fontFamily:f.bold,fontSize:16,color:c.ink,marginTop:2},cardSummary:{fontFamily:f.regular,fontSize:12,lineHeight:17,color:c.muted,marginTop:3},footer:{fontFamily:f.regular,fontSize:11,lineHeight:17,color:c.muted,marginTop:12},articlePage:{padding:sp.lg,paddingBottom:70},articleIcon:{width:58,height:58,borderRadius:19,backgroundColor:c.blush,alignItems:'center',justifyContent:'center',marginTop:10},articleCategory:{fontFamily:f.bold,fontSize:11,letterSpacing:1.1,color:c.pink,marginTop:20},articleTitle:{fontFamily:f.bold,fontSize:34,lineHeight:38,letterSpacing:-1.3,color:c.ink,marginTop:5},articleLead:{fontFamily:f.semibold,fontSize:17,lineHeight:25,color:c.ink,marginTop:16,marginBottom:8},articleBody:{fontFamily:f.regular,fontSize:16,lineHeight:25,color:c.ink,marginTop:14},sourceRow:{marginTop:28,borderRadius:18,borderWidth:1,borderColor:c.line,backgroundColor:c.white,padding:14,flexDirection:'row',alignItems:'center',gap:10},sourceLabel:{fontFamily:f.regular,fontSize:10,color:c.muted},sourceName:{fontFamily:f.bold,fontSize:14,color:c.ink,marginTop:2},medicalNote:{marginTop:14,borderRadius:18,backgroundColor:c.blush,padding:14,flexDirection:'row',gap:10,alignItems:'flex-start'},medicalText:{flex:1,fontFamily:f.regular,fontSize:11,lineHeight:17,color:c.muted}
});