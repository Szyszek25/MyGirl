import React,{useEffect,useMemo,useState} from 'react';
import {Alert,Image,Linking,Modal,Pressable,ScrollView,StyleSheet,Switch,TextInput,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {colors as c,fonts as f,space as sp} from './theme';
import {Button,Chip,Typography} from './ui';
import {isCareAdmin,loadPublishedCareArticles,saveCareArticle} from './services/careApi';

const articles=[
  {
    id:'cycle-basics',
    category:'Cykl',
    icon:'calendar-outline',
    image:'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=1400&q=86',
    title:'Jak liczyć cykl i co właściwie warto zapisywać?',
    summary:'Najprostsza rzecz: dzień 1 to pierwszy dzień miesiączki. Reszta zaczyna mieć sens dopiero, kiedy patrzysz na kilka cykli, a nie jeden.',
    body:[
      'Cykl liczy się od pierwszego dnia miesiączki do dnia poprzedzającego kolejną miesiączkę. Jeśli krwawienie zaczyna się dziś, dziś jest dzień 1 nowego cyklu.',
      'Nie musisz zapisywać wszystkiego. Na start wystarczą: początek miesiączki, długość krwawienia, ból, energia, nastrój i wszystko, co wyraźnie wpływa na Twój dzień.',
      'Najwięcej daje regularność. Kilka prostych wpisów z kolejnych miesięcy może pokazać Twój własny wzorzec — na przykład kiedy częściej boli Cię głowa, kiedy masz mniej energii albo kiedy objawy są wyraźnie inne niż zwykle.',
      'Długość cyklu nie musi być identyczna co miesiąc. Dlatego Polka Care pokazuje przewidywania orientacyjnie, a nie jako pewnik.'
    ],
    source:'ACOG',
    url:'https://www.acog.org/womens-health/faqs/your-first-period'
  },
  {
    id:'late-period',
    category:'Okres',
    icon:'time-outline',
    image:'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=1400&q=86',
    title:'Okres się spóźnia. Co teraz warto zanotować?',
    summary:'Zamiast od razu zgadywać przyczynę, zbierz kilka konkretów: datę ostatniego okresu, długość zwykłego cyklu i nowe objawy.',
    body:[
      'Późniejsza miesiączka może mieć wiele możliwych przyczyn i pojedynczy spóźniony cykl sam w sobie nie mówi, dlaczego tak się stało.',
      'Warto zanotować, kiedy zaczęła się poprzednia miesiączka, ile zwykle trwa Twój cykl, czy ostatnio mocno zmienił się sen, stres, trening, jedzenie albo ogólne samopoczucie.',
      'Jeśli istnieje możliwość ciąży, test ciążowy może być właściwym kolejnym krokiem. Tracker nie jest w stanie tego potwierdzić ani wykluczyć.',
      'Jeżeli brak miesiączki się przedłuża, sytuacja regularnie się powtarza albo pojawiają się inne niepokojące objawy, warto skontaktować się z lekarzem zamiast opierać się wyłącznie na przewidywaniach aplikacji.'
    ],
    source:'ACOG',
    url:'https://www.acog.org/womens-health/faqs/amenorrhea-absence-of-periods'
  },
  {
    id:'symptoms',
    category:'Objawy',
    icon:'pulse-outline',
    image:'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=1400&q=86',
    title:'Skurcze, wzdęcia, ból głowy, nastrój — jak śledzić objawy?',
    summary:'Nie chodzi o zaznaczanie wszystkiego. Chodzi o zauważenie, co naprawdę wraca i co faktycznie zmienia Twój dzień.',
    body:[
      'Objawy związane z miesiączką mogą wyglądać bardzo różnie u różnych osób. Dla jednej osoby najważniejszy będzie ból, dla innej sen, apetyt, energia albo zmiany nastroju.',
      'Zamiast tworzyć ogromny dziennik, wybierz kilka objawów, które realnie zauważasz. Zapisuj ich obecność przez kilka cykli i porównuj ze swoim zwykłym wzorcem.',
      'Jeśli coś zaczyna być wyraźnie silniejsze niż zwykle, trwa dłużej albo utrudnia normalne funkcjonowanie, sam tracker nie powinien być końcem tematu.',
      'Szczególnie warto szukać profesjonalnej pomocy, jeśli ból, krwawienie lub zmiany samopoczucia są na tyle silne, że wpływają na codzienną aktywność.'
    ],
    source:'WHO',
    url:'https://www.who.int/news-room/fact-sheets/detail/menstrual-health'
  },
  {
    id:'heavy-bleeding',
    category:'Kiedy po pomoc',
    icon:'medical-outline',
    image:'https://images.unsplash.com/photo-1548142813-c348350df52b?w=1400&q=86',
    title:'Kiedy objawów nie warto po prostu przeczekiwać?',
    summary:'Jeśli coś jest mocno inne niż Twój zwykły wzorzec albo utrudnia Ci normalny dzień, to wystarczający powód, żeby zapytać specjalistę.',
    body:[
      'Bardzo obfite albo długo utrzymujące się krwawienie, silny ból, długotrwały brak miesiączki lub inne wyraźne zmiany warto omówić z profesjonalistą medycznym.',
      'Nie musisz sama oceniać, czy objaw jest „wystarczająco poważny”. Jeśli coś Cię niepokoi albo wpływa na codzienne funkcjonowanie, konsultacja jest rozsądnym krokiem.',
      'Dobrze prowadzone notatki mogą ułatwić rozmowę: zapisz daty, nasilenie objawów i to, co zmieniło się względem poprzednich miesięcy.',
      'Polka Care pomaga zebrać te informacje w jednym miejscu, ale nie diagnozuje przyczyny i nie zastępuje badania.'
    ],
    source:'ACOG',
    url:'https://www.acog.org/womens-health/faqs/heavy-and-abnormal-periods'
  },
  {
    id:'plans',
    category:'Plany',
    icon:'sparkles-outline',
    image:'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1400&q=86',
    title:'Okres potrafi zmienić plany — i to jest normalne',
    summary:'Nie ustawiaj życia pod „fazę z aplikacji”. Patrz na własne samopoczucie i dobieraj plan do tego, czego dziś potrzebujesz.',
    body:[
      'Są dni, kiedy masz ochotę wyjść na koncert, i takie, kiedy najlepszym planem jest kawa w małej grupie albo spacer bez pośpiechu.',
      'Tracker może pomóc zauważyć, że pewne dni częściej wiążą się u Ciebie z mniejszą energią albo większą potrzebą odpoczynku. To informacja, nie instrukcja.',
      'Nie ma potrzeby rezygnować z aktywności tylko dlatego, że aplikacja pokazuje konkretną fazę cyklu. Jeśli czujesz się dobrze, Twój własny organizm jest ważniejszy niż etykieta na ekranie.',
      'Polka łączy ten kontekst z planami właśnie po to, żeby łatwiej było wybrać coś, co pasuje do Ciebie dzisiaj — a nie do teorii.'
    ],
    source:'Polka Care + WHO',
    url:'https://www.who.int/news-room/fact-sheets/detail/menstrual-health'
  }
]

const categories=['Wszystkie','Cykl','Objawy','Plany'];

export default function PolkaCareScreen({onClose}){
  const [category,setCategory]=useState('Wszystkie');
  const [selected,setSelected]=useState(null);
  const [remoteArticles,setRemoteArticles]=useState([]);
  const [admin,setAdmin]=useState(false);
  const [editorOpen,setEditorOpen]=useState(false);
  const [saving,setSaving]=useState(false);
  const [editor,setEditor]=useState({slug:'',category:'Cykl',title:'',summary:'',body:'',icon:'book-outline',isPublished:false});
  useEffect(()=>{
    let alive=true;
    Promise.all([loadPublishedCareArticles().catch(()=>[]),isCareAdmin().catch(()=>false)]).then(([rows,isAdmin])=>{
      if(!alive)return;
      if(rows.length)setRemoteArticles(rows);
      setAdmin(isAdmin);
    });
    return ()=>{alive=false};
  },[]);

  const saveRemoteArticle=async()=>{
    const slug=editor.slug.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    const body=editor.body.split('\n').map(v=>v.trim()).filter(Boolean);
    if(slug.length<3||editor.title.trim().length<4||editor.summary.trim().length<8||!body.length){
      Alert.alert('Uzupełnij artykuł','Dodaj slug, tytuł, opis i przynajmniej jeden akapit.');
      return;
    }
    setSaving(true);
    try{
      await saveCareArticle({...editor,slug,body});
      const rows=await loadPublishedCareArticles();
      if(rows.length)setRemoteArticles(rows);
      setEditor({slug:'',category:'Cykl',title:'',summary:'',body:'',icon:'book-outline',isPublished:false});
      setEditorOpen(false);
      Alert.alert(editor.isPublished?'Opublikowano':'Szkic zapisany',editor.isPublished?'Artykuł jest dostępny w Polka Care.':'Artykuł zapisano zdalnie jako szkic.');
    }catch(error){Alert.alert('Nie zapisano artykułu',error.message||'Spróbuj ponownie.');}
    finally{setSaving(false);}
  };
  const sourceArticles=remoteArticles.length?remoteArticles:articles;
  const dynamicCategories=useMemo(()=>['Wszystkie',...new Set(sourceArticles.map(a=>a.category))],[sourceArticles]);
  const visible=useMemo(()=>sourceArticles.filter(a=>category==='Wszystkie'||a.category===category),[category,sourceArticles]);

  if(selected)return <View style={s.root}>
    <View style={s.header}><Pressable onPress={()=>setSelected(null)} style={s.iconBtn}><Ionicons name="arrow-back" size={24} color={c.ink}/></Pressable><Typography style={s.headerTitle}>Polka Care</Typography><View style={s.iconBtn}/></View>
    <ScrollView contentContainerStyle={s.articlePage}>
      {!!selected.image&&<Image source={{uri:selected.image}} style={s.articleHero}/>}
      <View style={s.articleIcon}><Ionicons name={selected.icon} size={28} color={c.pink}/></View>
      <Typography style={s.articleCategory}>{selected.category.toUpperCase()}</Typography>
      <Typography style={s.articleTitle}>{selected.title}</Typography>
      <Typography style={s.articleLead}>{selected.summary}</Typography>
      {selected.body.map((p,i)=><Typography key={i} style={s.articleBody}>{p}</Typography>)}
      {!!selected.url&&<Pressable onPress={()=>Linking.openURL(selected.url)} style={s.sourceRow}><Ionicons name="open-outline" size={18} color={c.pink}/><View style={{flex:1}}><Typography style={s.sourceLabel}>Źródło</Typography><Typography style={s.sourceName}>{selected.source}</Typography></View><Ionicons name="chevron-forward" size={18} color={c.muted}/></Pressable>}
      <View style={s.medicalNote}><Ionicons name="information-circle-outline" size={20} color={c.pink}/><Typography style={s.medicalText}>Polka Care ma charakter edukacyjny. Nie stawia diagnoz i nie zastępuje konsultacji medycznej.</Typography></View>
    </ScrollView>
  </View>;

  return <View style={s.root}>
    <View style={s.header}><Pressable onPress={onClose} style={s.iconBtn}><Ionicons name="arrow-back" size={24} color={c.ink}/></Pressable><Typography style={s.headerTitle}>Polka Care</Typography>{admin?<Pressable onPress={()=>setEditorOpen(true)} style={s.iconBtn}><Ionicons name="create-outline" size={22} color={c.pink}/></Pressable>:<View style={s.iconBtn}/>}</View>

    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.intro}>
        <Typography style={s.topLabel}>ARTYKUŁY</Typography>
        <Typography style={s.introTitle}>Twój cykl, bez zgadywania.</Typography>
        <Typography style={s.introCopy}>Proste wyjaśnienia o okresie, objawach i samopoczuciu — napisane tak, żeby dało się to przeczytać w dwie minuty.</Typography>
      </View>

      <View style={s.careLandingGrid}>
        <View style={s.careLandingTilePrimary}>
          <View style={s.careLandingIcon}><Ionicons name="sparkles-outline" size={25} color={c.white}/></View>
          <Typography style={s.careLandingKicker}>DZIŚ W POLKA CARE</Typography>
          <Typography style={s.careLandingTitle}>Czytaj mniej. Rozumiej więcej.</Typography>
          <Typography style={s.careLandingText}>Krótko o cyklu, objawach i tym, kiedy warto coś sprawdzić.</Typography>
        </View>
        <View style={s.careLandingTile}>
          <Ionicons name="calendar-outline" size={26} color={c.pink}/>
          <Typography style={s.careLandingMiniTitle}>Cykl</Typography>
          <Typography style={s.careLandingMiniText}>Prognozy bez udawania pewności.</Typography>
        </View>
        <View style={s.careLandingTile}>
          <Ionicons name="pulse-outline" size={26} color={c.pink}/>
          <Typography style={s.careLandingMiniTitle}>Objawy</Typography>
          <Typography style={s.careLandingMiniText}>Co warto obserwować i zapisywać.</Typography>
        </View>
      </View>

      <Pressable onPress={()=>setSelected(sourceArticles.find(a=>a.id==='late-period')||sourceArticles[0])} style={s.leadStory}>
        <Typography style={s.cardCategory}>NA POCZĄTEK</Typography>
        <Typography style={s.leadTitle}>{(sourceArticles.find(a=>a.id==='late-period')||sourceArticles[0])?.title}</Typography>
        <Typography style={s.leadSummary}>{(sourceArticles.find(a=>a.id==='late-period')||sourceArticles[0])?.summary}</Typography>
        <View style={s.readRow}><Typography style={s.readText}>Czytaj artykuł</Typography><Ionicons name="arrow-forward" size={18} color={c.pink}/></View>
      </Pressable>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>
        {dynamicCategories.map(item=><Chip key={item} label={item} selected={category===item} onPress={()=>setCategory(item)}/>)}
      </ScrollView>

      <View style={s.quote}>
        <Typography style={s.quoteText}>Okresu nie da się zaplanować. Spotkania z Polkami już tak.</Typography>
      </View>

      <Typography style={s.sectionLabel}>WIĘCEJ DO PRZECZYTANIA</Typography>
      {visible.filter(article=>article.id!=='late-period').map(article=><Pressable key={article.id} onPress={()=>setSelected(article)} style={s.listRow}>
        {article.image?<Image source={{uri:article.image}} style={s.listImage}/>:<View style={[s.listImage,s.remoteArticleIcon]}><Ionicons name={article.icon||'book-outline'} size={28} color={c.pink}/></View>}
        <View style={s.listText}>
          <Typography style={s.cardCategory}>{article.category}</Typography>
          <Typography style={s.listTitle}>{article.title}</Typography>
          <Typography numberOfLines={2} style={s.cardSummary}>{article.summary}</Typography>
        </View>
      </Pressable>)}

      <Typography style={s.footer}>Materiały Polka Care mają charakter edukacyjny. Treści opierają się na materiałach WHO i ACOG i nie zastępują konsultacji medycznej.</Typography>
    </ScrollView>

    <Modal visible={editorOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setEditorOpen(false)}>
      <View style={s.editorRoot}>
        <View style={s.header}><Pressable onPress={()=>setEditorOpen(false)} style={s.iconBtn}><Ionicons name="close" size={24} color={c.ink}/></Pressable><Typography style={s.headerTitle}>Nowy artykuł</Typography><Pressable disabled={saving} onPress={saveRemoteArticle} style={s.editorSave}><Typography style={s.editorSaveText}>{saving?'Chwila…':'Zapisz'}</Typography></Pressable></View>
        <ScrollView contentContainerStyle={s.editorContent} keyboardShouldPersistTaps="handled">
          <Typography style={s.editorNote}>Edytor jest dostępny tylko dla roli admin/moderator. Publikowanie treści zdrowotnych nadal wymaga ręcznego przeglądu źródeł.</Typography>
          <Typography style={s.editorLabel}>Slug</Typography><TextInput value={editor.slug} onChangeText={v=>setEditor(p=>({...p,slug:v}))} placeholder="np. bol-okresowy" placeholderTextColor={c.muted} style={s.editorInput}/>
          <Typography style={s.editorLabel}>Kategoria</Typography><TextInput value={editor.category} onChangeText={v=>setEditor(p=>({...p,category:v}))} placeholder="Cykl" placeholderTextColor={c.muted} style={s.editorInput}/>
          <Typography style={s.editorLabel}>Tytuł</Typography><TextInput value={editor.title} onChangeText={v=>setEditor(p=>({...p,title:v}))} placeholder="Tytuł artykułu" placeholderTextColor={c.muted} style={s.editorInput}/>
          <Typography style={s.editorLabel}>Lead / podsumowanie</Typography><TextInput multiline value={editor.summary} onChangeText={v=>setEditor(p=>({...p,summary:v}))} placeholder="Krótko: czego dowie się czytelniczka?" placeholderTextColor={c.muted} style={[s.editorInput,s.editorMultiline]}/>
          <Typography style={s.editorLabel}>Treść</Typography><TextInput multiline value={editor.body} onChangeText={v=>setEditor(p=>({...p,body:v}))} placeholder={"Każdy akapit w nowej linii…"} placeholderTextColor={c.muted} style={[s.editorInput,s.editorBody]}/>
          <View style={s.editorPublishRow}><View style={{flex:1}}><Typography style={s.editorPublishTitle}>Opublikuj od razu</Typography><Typography style={s.editorPublishCopy}>Wyłącz, aby zapisać jako szkic.</Typography></View><Switch value={editor.isPublished} onValueChange={v=>setEditor(p=>({...p,isPublished:v}))} trackColor={{false:'#D9D4D7',true:'#F7A7C0'}} thumbColor={editor.isPublished?c.pink:'#fff'}/></View>
          <Button title={saving?'Zapisywanie…':'Zapisz artykuł'} disabled={saving} onPress={saveRemoteArticle}/>
        </ScrollView>
      </View>
    </Modal>
  </View>;
}

const s=StyleSheet.create({
  root:{flex:1,backgroundColor:c.canvas},
  header:{height:60,paddingHorizontal:12,backgroundColor:c.white,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:c.line,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  iconBtn:{width:40,height:40,borderRadius:20,alignItems:'center',justifyContent:'center'},
  headerTitle:{fontFamily:f.bold,fontSize:16,color:c.ink},

  content:{paddingBottom:70},
  intro:{paddingHorizontal:sp.lg,paddingTop:20,paddingBottom:16},
  topLabel:{fontFamily:f.bold,fontSize:11,letterSpacing:1.5,color:c.pink},
  introTitle:{fontFamily:f.bold,fontSize:34,lineHeight:38,letterSpacing:-1.2,color:c.ink,marginTop:8,maxWidth:330},
  introCopy:{fontFamily:f.regular,fontSize:15,lineHeight:22,color:c.muted,marginTop:10,maxWidth:330},

  careLandingGrid:{paddingHorizontal:sp.lg,display:'flex',flexDirection:'row',flexWrap:'wrap',gap:10,marginBottom:8},
  careLandingTilePrimary:{width:'100%',minHeight:210,borderRadius:26,backgroundColor:c.pink,padding:20,justifyContent:'flex-end'},
  careLandingIcon:{width:44,height:44,borderRadius:15,backgroundColor:'rgba(255,255,255,.18)',alignItems:'center',justifyContent:'center',marginBottom:'auto'},
  careLandingKicker:{fontFamily:f.bold,fontSize:11,letterSpacing:1.1,color:'rgba(255,255,255,.82)',marginTop:20},
  careLandingTitle:{fontFamily:f.bold,fontSize:30,lineHeight:34,letterSpacing:-1,color:c.white,marginTop:6,maxWidth:290},
  careLandingText:{fontFamily:f.regular,fontSize:14,lineHeight:20,color:'rgba(255,255,255,.86)',marginTop:8,maxWidth:290},
  careLandingTile:{width:'48%',minHeight:145,borderRadius:22,backgroundColor:c.white,borderWidth:1,borderColor:c.line,padding:16},
  careLandingMiniTitle:{fontFamily:f.bold,fontSize:18,color:c.ink,marginTop:'auto'},
  careLandingMiniText:{fontFamily:f.regular,fontSize:12,lineHeight:17,color:c.muted,marginTop:5},
  leadStory:{paddingHorizontal:sp.lg,paddingTop:22,paddingBottom:18},
  leadTitle:{fontFamily:f.bold,fontSize:28,lineHeight:32,letterSpacing:-.9,color:c.ink,marginTop:5},
  leadSummary:{fontFamily:f.regular,fontSize:14,lineHeight:21,color:c.muted,marginTop:9},
  readRow:{marginTop:15,flexDirection:'row',alignItems:'center',gap:7},
  readText:{fontFamily:f.bold,fontSize:13,color:c.pink},

  filters:{paddingLeft:sp.lg,paddingRight:sp.md,paddingBottom:10},
  quote:{marginHorizontal:sp.lg,paddingVertical:22,borderTopWidth:1,borderBottomWidth:1,borderColor:c.line,marginBottom:24},
  quoteText:{fontFamily:f.bold,fontSize:22,lineHeight:29,letterSpacing:-.6,color:c.ink},

  sectionLabel:{fontFamily:f.bold,fontSize:11,letterSpacing:1.2,color:c.muted,marginHorizontal:sp.lg,marginBottom:4},
  listRow:{marginHorizontal:sp.lg,paddingVertical:16,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:c.line,flexDirection:'row',alignItems:'center',gap:14},
  listImage:{width:88,height:88,borderRadius:16,backgroundColor:c.blush},
  remoteArticleIcon:{alignItems:'center',justifyContent:'center'},
  listText:{flex:1},
  listTitle:{fontFamily:f.bold,fontSize:16,lineHeight:20,color:c.ink,marginTop:2},
  cardCategory:{fontFamily:f.bold,fontSize:10,letterSpacing:.8,color:c.pink,textTransform:'uppercase'},
  cardSummary:{fontFamily:f.regular,fontSize:12,lineHeight:17,color:c.muted,marginTop:4},
  footer:{fontFamily:f.regular,fontSize:11,lineHeight:17,color:c.muted,marginHorizontal:sp.lg,marginTop:24},

  articlePage:{paddingBottom:70},
  articleHero:{width:'100%',height:300,backgroundColor:c.blush},
  articleIcon:{width:58,height:58,borderRadius:19,backgroundColor:c.blush,alignItems:'center',justifyContent:'center',marginTop:-29,marginLeft:sp.lg,borderWidth:4,borderColor:c.canvas},
  articleCategory:{fontFamily:f.bold,fontSize:11,letterSpacing:1.1,color:c.pink,marginTop:20,marginHorizontal:sp.lg},
  articleTitle:{fontFamily:f.bold,fontSize:34,lineHeight:38,letterSpacing:-1.3,color:c.ink,marginTop:5,marginHorizontal:sp.lg},
  articleLead:{fontFamily:f.semibold,fontSize:17,lineHeight:25,color:c.ink,marginTop:16,marginBottom:8,marginHorizontal:sp.lg},
  articleBody:{fontFamily:f.regular,fontSize:16,lineHeight:26,color:c.ink,marginTop:16,marginHorizontal:sp.lg},
  sourceRow:{marginTop:30,marginHorizontal:sp.lg,borderTopWidth:1,borderBottomWidth:1,borderColor:c.line,paddingVertical:14,flexDirection:'row',alignItems:'center',gap:10},
  sourceLabel:{fontFamily:f.regular,fontSize:10,color:c.muted},
  sourceName:{fontFamily:f.bold,fontSize:14,color:c.ink,marginTop:2},
  medicalNote:{marginTop:18,marginHorizontal:sp.lg,borderRadius:18,backgroundColor:c.blush,padding:14,flexDirection:'row',gap:10,alignItems:'flex-start'},
  medicalText:{flex:1,fontFamily:f.regular,fontSize:11,lineHeight:17,color:c.muted},
  editorRoot:{flex:1,backgroundColor:c.canvas},
  editorContent:{padding:sp.lg,paddingBottom:60},
  editorSave:{minWidth:58,alignItems:'flex-end'},
  editorSaveText:{fontFamily:f.bold,fontSize:13,color:c.pink},
  editorNote:{fontFamily:f.regular,fontSize:12,lineHeight:18,color:c.muted,backgroundColor:c.blush,borderRadius:16,padding:13,marginBottom:18},
  editorLabel:{fontFamily:f.bold,fontSize:12,color:c.ink,marginTop:12,marginBottom:6},
  editorInput:{minHeight:50,borderRadius:14,borderWidth:1,borderColor:c.line,backgroundColor:c.white,paddingHorizontal:13,paddingVertical:11,fontFamily:f.regular,fontSize:14,color:c.ink},
  editorMultiline:{minHeight:90,textAlignVertical:'top'},
  editorBody:{minHeight:220,textAlignVertical:'top'},
  editorPublishRow:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:c.white,borderWidth:1,borderColor:c.line,borderRadius:16,padding:14,marginVertical:16},
  editorPublishTitle:{fontFamily:f.bold,fontSize:14,color:c.ink},
  editorPublishCopy:{fontFamily:f.regular,fontSize:11,color:c.muted,marginTop:2}
});