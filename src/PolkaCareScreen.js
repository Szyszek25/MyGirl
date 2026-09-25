import React,{useMemo,useState} from 'react';
import {Image,ImageBackground,Linking,Pressable,ScrollView,StyleSheet,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {colors as c,fonts as f,space as sp} from './theme';
import {Chip,Typography} from './ui';

const articles=[

  {id:'cycle-basics',category:'Cykl',icon:'calendar-outline',image:'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=1400&q=86',title:'Jak liczyć cykl?',summary:'Cykl liczy się od pierwszego dnia krwawienia do pierwszego dnia kolejnej miesiączki.',body:['Śledzenie pierwszego dnia miesiączki pomaga zauważyć własny rytm i zmiany między miesiącami.','Długość cyklu różni się między osobami i może zmieniać się z miesiąca na miesiąc.'],source:'ACOG',url:'https://www.acog.org/womens-health/faqs/your-first-period'},
  {id:'late-period',category:'Okres',icon:'time-outline',image:'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=1400&q=86',title:'Okres się spóźnia — co warto zanotować?',summary:'Zapisz datę ostatniej miesiączki, objawy i to, jak różni się ten cykl od poprzednich.',body:['Pojedynczy późniejszy cykl nie mówi sam w sobie, co jest przyczyną.','Jeśli istnieje możliwość ciąży, test ciążowy może być właściwym kolejnym krokiem. Przy utrzymującym się braku miesiączki albo innych niepokojących objawach warto skonsultować się z lekarzem.'],source:'ACOG',url:'https://www.acog.org/womens-health/faqs/amenorrhea-absence-of-periods'},
  {id:'symptoms',category:'Objawy',icon:'pulse-outline',image:'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1400&q=86',title:'Skurcze, wzdęcia, ból głowy i nastrój',summary:'Objawy wokół miesiączki są częste, ale ich nasilenie może być bardzo różne.',body:['Notowanie objawów przez kilka cykli może pomóc zobaczyć, czy coś powtarza się w podobnym momencie.','Silny ból, bardzo obfite krwawienie, niepokojące zmiany nastroju albo objawy utrudniające normalne funkcjonowanie są dobrym powodem do kontaktu z profesjonalistą medycznym.'],source:'WHO',url:'https://www.who.int/news-room/fact-sheets/detail/menstrual-health'},
  {id:'heavy-bleeding',category:'Kiedy po pomoc',icon:'medical-outline',image:'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=1400&q=86',title:'Kiedy nie ignorować objawów?',summary:'Jeśli coś jest wyraźnie inne niż Twój zwykły wzorzec albo utrudnia codzienne funkcjonowanie, nie musisz tego przeczekiwać sama.',body:['Warto zasięgnąć porady medycznej przy bardzo obfitym lub długim krwawieniu, braku miesiączki przez dłuższy czas, silnym bólu lub innych niepokojących objawach.','Polka Care może pomóc zebrać notatki z cyklu, ale nie diagnozuje przyczyny objawów.'],source:'ACOG',url:'https://www.acog.org/womens-health/faqs/heavy-and-abnormal-periods'},
  {id:'plans',category:'Plany',icon:'sparkles-outline',image:'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1400&q=86',title:'Okres potrafi zmienić plany',summary:'Nie musisz dopasowywać życia do aplikacji. Dopasuj plan do tego, jak faktycznie się czujesz.',body:['Jeśli masz mniej energii, wybierz spokojniejszy plan albo mniejszą grupę. Jeśli czujesz się dobrze, nie ma potrzeby rezygnować z aktywności tylko dlatego, że aplikacja pokazuje konkretną fazę.','Traktuj tracker jako pamiętnik własnych wzorców, nie jako instrukcję tego, co „powinnaś” robić.'],source:'Polka Care + WHO',url:'https://www.who.int/news-room/fact-sheets/detail/menstrual-health'}
];

const categories=['Wszystkie','Cykl','Objawy','Plany'];

export default function PolkaCareScreen({onClose}){
  const [category,setCategory]=useState('Wszystkie');
  const [selected,setSelected]=useState(null);
  const visible=useMemo(()=>articles.filter(a=>category==='Wszystkie'||a.category===category),[category]);

  if(selected)return <View style={s.root}>
    <View style={s.header}><Pressable onPress={()=>setSelected(null)} style={s.iconBtn}><Ionicons name="arrow-back" size={24} color={c.ink}/></Pressable><Typography style={s.headerTitle}>Polka Care</Typography><View style={s.iconBtn}/></View>
    <ScrollView contentContainerStyle={s.articlePage}>
      <Image source={{uri:selected.image}} style={s.articleHero}/>
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
      <ImageBackground source={{uri:'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=1500&q=86'}} style={s.hero} imageStyle={s.heroImage}>
        <View style={s.heroOverlay}/>
        <View style={s.heroContent}>
          <Typography style={s.careMark}>Polka Care</Typography>
          <Typography style={s.heroTitle}>Okres potrafi czasem zmienić plany.</Typography>
          <Typography style={s.heroCopy}>Twój rytm, objawy i samopoczucie — bez spiny i bez medycznego żargonu.</Typography>
        </View>
      </ImageBackground>

      <Typography style={s.sectionLabel}>NAJWAŻNIEJSZE TERAZ</Typography>
      <Pressable onPress={()=>setSelected(articles[1])} style={s.feature}>
        <Image source={{uri:articles[1].image}} style={s.featureImage}/>
        <View style={s.featureBody}><Typography style={s.cardCategory}>{articles[1].category}</Typography><Typography style={s.featureTitle}>{articles[1].title}</Typography><Typography numberOfLines={2} style={s.cardSummary}>{articles[1].summary}</Typography></View>
      </Pressable>

      <Pressable onPress={()=>setSelected(articles[4])} style={s.secondaryFeature}>
        <Image source={{uri:articles[4].image}} style={s.secondaryImage}/>
        <View style={{flex:1}}><Typography style={s.cardCategory}>{articles[4].category}</Typography><Typography style={s.cardTitle}>{articles[4].title}</Typography></View>
        <Ionicons name="chevron-forward" size={20} color={c.muted}/>
      </Pressable>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>{categories.map(item=><Chip key={item} label={item} selected={category===item} onPress={()=>setCategory(item)}/>)}</ScrollView>

      <View style={s.quote}><Typography style={s.quoteText}>Okresu nie da się zaplanować. Spotkania z Polkami już tak.</Typography></View>

      <Typography style={s.sectionLabel}>BAZA WIEDZY</Typography>
      {visible.filter(article=>!['late-period','plans'].includes(article.id)).map(article=><Pressable key={article.id} onPress={()=>setSelected(article)} style={s.listRow}>
        <View style={s.listText}><Typography style={s.cardCategory}>{article.category}</Typography><Typography style={s.listTitle}>{article.title}</Typography><Typography numberOfLines={1} style={s.cardSummary}>{article.summary}</Typography></View>
        <Ionicons name="chevron-forward" size={19} color={c.muted}/>
      </Pressable>)}

      <Typography style={s.footer}>Treści edukacyjne Polka Care opierają się na materiałach WHO i ACOG. Przy niepokojących objawach skonsultuj się z profesjonalistą medycznym.</Typography>
    </ScrollView>
  </View>;
}

const s=StyleSheet.create({
  root:{flex:1,backgroundColor:c.canvas},
  header:{height:60,paddingHorizontal:12,backgroundColor:c.white,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:c.line,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  iconBtn:{width:40,height:40,borderRadius:20,alignItems:'center',justifyContent:'center'},
  headerTitle:{fontFamily:f.bold,fontSize:16,color:c.ink},
  content:{paddingBottom:70},
  hero:{height:390,justifyContent:'flex-end',marginBottom:26},
  heroImage:{borderBottomLeftRadius:28,borderBottomRightRadius:28},
  heroOverlay:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(27,16,22,.36)',borderBottomLeftRadius:28,borderBottomRightRadius:28},
  heroContent:{padding:22,paddingBottom:26},
  careMark:{fontFamily:f.bold,fontSize:12,letterSpacing:1.1,color:'#FFFFFFD9'},
  heroTitle:{fontFamily:f.bold,fontSize:38,lineHeight:40,letterSpacing:-1.5,color:c.white,marginTop:14,maxWidth:320},
  heroCopy:{fontFamily:f.regular,fontSize:15,lineHeight:22,color:'#FFFFFFE8',marginTop:10,maxWidth:310},
  sectionLabel:{fontFamily:f.bold,fontSize:11,letterSpacing:1.2,color:c.muted,marginHorizontal:sp.lg,marginBottom:10},
  feature:{marginHorizontal:sp.lg,backgroundColor:c.white,borderRadius:24,overflow:'hidden',borderWidth:1,borderColor:c.line,marginBottom:12},
  featureImage:{width:'100%',height:210,backgroundColor:c.blush},
  featureBody:{padding:16},
  featureTitle:{fontFamily:f.bold,fontSize:24,lineHeight:28,letterSpacing:-.7,color:c.ink,marginTop:3},
  secondaryFeature:{marginHorizontal:sp.lg,backgroundColor:c.white,borderRadius:18,borderWidth:1,borderColor:c.line,padding:10,flexDirection:'row',alignItems:'center',gap:12,marginBottom:18},
  secondaryImage:{width:76,height:76,borderRadius:14,backgroundColor:c.blush},
  filters:{paddingLeft:sp.lg,paddingRight:sp.md,paddingBottom:12},
  quote:{marginHorizontal:sp.lg,paddingVertical:22,borderTopWidth:1,borderBottomWidth:1,borderColor:c.line,marginBottom:22},
  quoteText:{fontFamily:f.bold,fontSize:22,lineHeight:29,letterSpacing:-.6,color:c.ink},
  listRow:{marginHorizontal:sp.lg,minHeight:88,paddingVertical:14,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:c.line,flexDirection:'row',alignItems:'center',gap:12},
  listText:{flex:1},
  listTitle:{fontFamily:f.bold,fontSize:16,color:c.ink,marginTop:2},
  cardCategory:{fontFamily:f.bold,fontSize:10,letterSpacing:.8,color:c.pink,textTransform:'uppercase'},
  cardTitle:{fontFamily:f.bold,fontSize:16,color:c.ink,marginTop:2},
  cardSummary:{fontFamily:f.regular,fontSize:12,lineHeight:17,color:c.muted,marginTop:4},
  footer:{fontFamily:f.regular,fontSize:11,lineHeight:17,color:c.muted,marginHorizontal:sp.lg,marginTop:24},
  articlePage:{paddingBottom:70},
  articleHero:{width:'100%',height:280,backgroundColor:c.blush},
  articleIcon:{width:58,height:58,borderRadius:19,backgroundColor:c.blush,alignItems:'center',justifyContent:'center',marginTop:-29,marginLeft:sp.lg,borderWidth:4,borderColor:c.canvas},
  articleCategory:{fontFamily:f.bold,fontSize:11,letterSpacing:1.1,color:c.pink,marginTop:20,marginHorizontal:sp.lg},
  articleTitle:{fontFamily:f.bold,fontSize:34,lineHeight:38,letterSpacing:-1.3,color:c.ink,marginTop:5,marginHorizontal:sp.lg},
  articleLead:{fontFamily:f.semibold,fontSize:17,lineHeight:25,color:c.ink,marginTop:16,marginBottom:8,marginHorizontal:sp.lg},
  articleBody:{fontFamily:f.regular,fontSize:16,lineHeight:25,color:c.ink,marginTop:14,marginHorizontal:sp.lg},
  sourceRow:{marginTop:28,marginHorizontal:sp.lg,borderTopWidth:1,borderBottomWidth:1,borderColor:c.line,paddingVertical:14,flexDirection:'row',alignItems:'center',gap:10},
  sourceLabel:{fontFamily:f.regular,fontSize:10,color:c.muted},
  sourceName:{fontFamily:f.bold,fontSize:14,color:c.ink,marginTop:2},
  medicalNote:{marginTop:18,marginHorizontal:sp.lg,borderRadius:18,backgroundColor:c.blush,padding:14,flexDirection:'row',gap:10,alignItems:'flex-start'},
  medicalText:{flex:1,fontFamily:f.regular,fontSize:11,lineHeight:17,color:c.muted}
});