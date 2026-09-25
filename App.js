import React,{useEffect,useState} from 'react';
import {Alert,Modal,Platform,Pressable,StatusBar,StyleSheet,View} from 'react-native';
import {SafeAreaProvider,SafeAreaView,useSafeAreaInsets} from 'react-native-safe-area-context';
import {useFonts,DMSans_400Regular,DMSans_600SemiBold,DMSans_700Bold} from '@expo-google-fonts/dm-sans';
import {PlayfairDisplay_700Bold} from '@expo-google-fonts/playfair-display';
import {Ionicons} from '@expo/vector-icons';
import Onboarding from './src/Onboarding';
import WelcomeScreen from './src/WelcomeScreen';
import NativeProfile from './src/NativeProfile';
import SettingsScreen from './src/SettingsScreen';
import CycleScreen from './src/CycleScreen';
import ResetPasswordScreen from './src/ResetPasswordScreen';
import PolkaCareScreen from './src/PolkaCareScreen';
import PartnerPanel from './src/PartnerPanel';
import ShiftTransition from './src/ShiftTransition';
import DiscoverScreen from './src/DiscoverScreen';
import {CommunityScreen,ChatsScreen,DiscoverScreen as PeopleDiscoverScreen} from './src/screens';
import ClubsMeetupsScreen from './src/ClubsMeetupsScreen';
import MeetingsScreen from './src/MeetingsScreen';
import {ReportForm,SafetyCenter} from './src/Safety';
import {loadLocalProfile,saveLocalProfile,deleteLocalProfile} from './src/localProfile';
import {cities,initialPosts} from './src/data';
import {colors as c,fonts as f,space as sp} from './src/theme';
import {Typography} from './src/ui';
import {defaultFeaturePreferences,loadFeaturePreferences} from './src/featurePreferences';
const tabs=[{key:'Start',icon:'home-outline',active:'home'},{key:'Poznaj',icon:'heart-outline',active:'heart'},{key:'Plany',icon:'calendar-outline',active:'calendar'},{key:'Grupy',icon:'people-outline',active:'people'},{key:'Profil',icon:'person-outline',active:'person'}];

export default function App(){return <SafeAreaProvider><PolkaApp/></SafeAreaProvider>}
function PolkaApp(){
  const insets=useSafeAreaInsets();
  const [fontsLoaded]=useFonts(Platform.OS==='web'?{}:{DMSans_400Regular,DMSans_600SemiBold,DMSans_700Bold,PlayfairDisplay_700Bold});
  const loaded=Platform.OS==='web'||fontsLoaded;
  const [account,setAccount]=useState(null);
  const [entryStarted,setEntryStarted]=useState(false);
  const [preBusiness,setPreBusiness]=useState(false);
  const [booting,setBooting]=useState(true);
  const [tab,setTab]=useState('Start');
  const [activeCity,setActiveCity]=useState('Warszawa');
  const [cityPickerOpen,setCityPickerOpen]=useState(false);
  const [blockedIds,setBlockedIds]=useState([]);
  const [reports,setReports]=useState([]);
  const [reportTarget,setReportTarget]=useState(null);
  const [safetyOpen,setSafetyOpen]=useState(false);
  const [partnerOpen,setPartnerOpen]=useState(false);
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [messagesOpen,setMessagesOpen]=useState(false);
  const [cycleOpen,setCycleOpen]=useState(false);
  const [careOpen,setCareOpen]=useState(false);
  const [resetPasswordOpen,setResetPasswordOpen]=useState(false);
  const [plansView,setPlansView]=useState('Plany');
  const [posts,setPosts]=useState(initialPosts);
  const [session,setSession]=useState(0);
  const [featurePreferences,setFeaturePreferences]=useState(defaultFeaturePreferences);
  const [sleepReminderOpen,setSleepReminderOpen]=useState(()=>{
    const hour=new Date().getHours();
    return hour>=22||hour<5;
  });
  useEffect(()=>{
    let alive=true;
    Promise.all([loadLocalProfile(),loadFeaturePreferences()]).then(([profile,prefs])=>{
      if(!alive)return;
      setAccount(profile);
      setFeaturePreferences(prefs);
      if(profile?.city)setActiveCity(profile.city);
    }).catch(()=>{
      if(alive)Alert.alert('Błąd odczytu profilu','Nie udało się wczytać lokalnych danych.');
    }).finally(()=>{if(alive)setBooting(false);});
    return ()=>{alive=false;};
  },[]);
  const saveProfile=async profile=>{
    const saved=await saveLocalProfile(profile);
    setAccount(saved);
    if(saved?.city)setActiveCity(saved.city);
    return saved;
  };
  const block=id=>setBlockedIds(prev=>prev.includes(id)?prev:[...prev,id]);
  const reset=async()=>{
    try{await deleteLocalProfile();}
    catch(error){Alert.alert('Nie usunięto wszystkich danych','Spróbuj ponownie. '+(error.message||''));return;}
    setAccount(null);setEntryStarted(false);setPreBusiness(false);setTab('Start');setActiveCity('Warszawa');setCityPickerOpen(false);setBlockedIds([]);setReports([]);
    setReportTarget(null);setSafetyOpen(false);setPartnerOpen(false);setSettingsOpen(false);setMessagesOpen(false);setCycleOpen(false);setCareOpen(false);setResetPasswordOpen(false);setPlansView('Plany');
    setPosts(initialPosts);setSession(v=>v+1);
  };
  if(!loaded||booting)return <View style={s.safe}/>;
  if(!account){
    if(preBusiness)return <SafeAreaView edges={['top','bottom']} style={s.safe}><StatusBar barStyle="dark-content" backgroundColor={c.canvas}/><PartnerPanel onClose={()=>setPreBusiness(false)}/></SafeAreaView>;
    if(!entryStarted)return <View style={s.safe}><StatusBar barStyle="light-content" translucent backgroundColor="transparent"/><WelcomeScreen onContinue={()=>setEntryStarted(true)} onBusiness={()=>setPreBusiness(true)}/></View>;
    return <SafeAreaView edges={['top','bottom']} style={s.safe}><StatusBar barStyle="dark-content" backgroundColor={c.canvas}/><Onboarding key={session} onComplete={saveProfile}/></SafeAreaView>;
  }
  const showTabs=!reportTarget&&!safetyOpen&&!partnerOpen&&!settingsOpen&&!messagesOpen&&!cycleOpen&&!careOpen&&!resetPasswordOpen;
  const clubsVisible=tab==='Grupy'&&showTabs;
  const content=reportTarget?
    <ReportForm target={reportTarget} onCancel={()=>setReportTarget(null)} onSave={report=>{setReports(prev=>[...prev,report]);setReportTarget(null);}}/>:
    safetyOpen?<SafetyCenter blockedIds={blockedIds} onUnblock={id=>setBlockedIds(prev=>prev.filter(v=>v!==id))} reports={reports} onClose={()=>setSafetyOpen(false)} onReset={reset}/>:
    partnerOpen?<PartnerPanel onClose={()=>setPartnerOpen(false)}/>:
    settingsOpen?<SettingsScreen onClose={()=>setSettingsOpen(false)} onSafety={()=>{setSettingsOpen(false);setSafetyOpen(true)}} onPartner={()=>{setSettingsOpen(false);setPartnerOpen(true)}} onPasswordReset={()=>{setSettingsOpen(false);setResetPasswordOpen(true)}} onFeaturePreferencesChange={setFeaturePreferences} onReset={reset}/>:
    resetPasswordOpen?<ResetPasswordScreen onClose={()=>{setResetPasswordOpen(false);setSettingsOpen(true)}}/>:
    cycleOpen?<CycleScreen onClose={()=>setCycleOpen(false)} onOpenCare={()=>{setCycleOpen(false);setCareOpen(true)}} onOpenGroups={()=>{setCycleOpen(false);setTab('Grupy')}}/>:
    careOpen?<PolkaCareScreen onClose={()=>setCareOpen(false)}/>:
    messagesOpen?<View style={s.fill}><ChatsScreen blockedIds={blockedIds} supportChat={featurePreferences.supportChat} onReport={setReportTarget} onClose={()=>setMessagesOpen(false)}/></View>:
    ({'Start':<View style={s.fill}><CommunityScreen city={activeCity} posts={posts} setPosts={setPosts} blockedIds={blockedIds} onReport={setReportTarget}/></View>,'Poznaj':<PeopleDiscoverScreen city={activeCity} blockedIds={blockedIds} zodiacEnabled={featurePreferences.zodiacPeopleMatching} userZodiac={featurePreferences.zodiacSign} styleEnabled={featurePreferences.stylePeopleMatching} userStyle={featurePreferences.stylePreference} onBlock={block} onReport={setReportTarget}/>,'Plany':<View style={s.fill}><View style={s.plansSwitch}><Pressable onPress={()=>setPlansView('Plany')} style={[s.plansSwitchItem,plansView==='Plany'&&s.plansSwitchActive]}><Typography style={[s.plansSwitchText,plansView==='Plany'&&s.plansSwitchTextActive]}>Plany</Typography></Pressable><Pressable onPress={()=>setPlansView('Spotkania')} style={[s.plansSwitchItem,plansView==='Spotkania'&&s.plansSwitchActive]}><Typography style={[s.plansSwitchText,plansView==='Spotkania'&&s.plansSwitchTextActive]}>Spotkania</Typography></Pressable></View>{plansView==='Plany'?<DiscoverScreen city={activeCity} blockedIds={blockedIds} onBlock={block} onReport={setReportTarget}/>:<MeetingsScreen city={activeCity} featurePreferences={featurePreferences} onReport={setReportTarget}/>}</View>,'Profil':<NativeProfile account={account} showCare={featurePreferences.polkaCare} onSave={saveProfile} onSafety={()=>setSafetyOpen(true)} onPartner={()=>setPartnerOpen(true)} onSettings={()=>setSettingsOpen(true)} onCycle={()=>setCycleOpen(true)} onCare={()=>setCareOpen(true)}/>})[tab];
  const screenKey=reportTarget?'report':safetyOpen?'safety':partnerOpen?'partner':settingsOpen?'settings':resetPasswordOpen?'reset-password':cycleOpen?'cycle':careOpen?'polka-care':messagesOpen?'messages':tab;
  return <SafeAreaView edges={showTabs?['top']:['top','bottom']} style={s.safe}><StatusBar barStyle="dark-content" backgroundColor={c.canvas}/>
    <ShiftTransition screenKey={screenKey}>
      <View style={s.fill}>
        {showTabs && (
        <View style={s.brandTopBar}>
          <Typography style={s.brandLogo}>Polka</Typography>
          <Pressable onPress={()=>setCityPickerOpen(true)} style={s.cityBlock} accessibilityRole="button" accessibilityLabel="Zmień miasto"><Ionicons name="location-outline" size={18} color={c.pink}/><Typography style={s.cityName}>{activeCity}</Typography><Ionicons name="chevron-down" size={17} color={c.muted}/></Pressable>
        </View>
      )}
        <View style={[s.fill,{display:clubsVisible?'flex':'none'}]}><ClubsMeetupsScreen key={session} city={activeCity} onReport={setReportTarget}/></View>
        {!clubsVisible&&<View style={s.fill}>{content}</View>}
      </View>
    </ShiftTransition>
    <Modal visible={cityPickerOpen} transparent animationType="fade" onRequestClose={()=>setCityPickerOpen(false)}><Pressable style={s.cityModalBackdrop} onPress={()=>setCityPickerOpen(false)}><View style={s.citySheet}><Typography style={s.citySheetTitle}>Wybierz miasto</Typography>{cities.map(city=><Pressable key={city} onPress={()=>{setActiveCity(city);setCityPickerOpen(false)}} style={s.cityOption}><Typography style={[s.cityOptionText,activeCity===city&&{color:c.pink,fontFamily:f.bold}]}>{city}</Typography>{activeCity===city&&<Ionicons name="checkmark" size={20} color={c.pink}/>}</Pressable>)}</View></Pressable></Modal>

    {showTabs && (
      <Pressable
        onPress={() => setMessagesOpen(true)}
        style={[s.floatingChatFab, { bottom: Math.max(insets.bottom, sp.sm) + 84 }]}
        accessibilityRole="button"
        accessibilityLabel="Otwórz wiadomości"
      >
        <Ionicons name="chatbubble-ellipses" size={24} color={c.white} />
        <View style={s.chatDot} />
      </Pressable>
    )}
    {showTabs&&<View style={[s.tabBar,{paddingBottom:Math.max(insets.bottom,sp.sm)}]}>{tabs.map(item=><Pressable key={item.key} accessibilityRole="tab" accessibilityLabel={item.key} accessibilityState={{selected:tab===item.key}} onPress={()=>setTab(item.key)} style={s.tab}><Ionicons name={tab===item.key?item.active:item.icon} size={23} color={tab===item.key?c.pink:c.muted}/><Typography style={[s.tabText,tab===item.key&&{color:c.pink,fontFamily:f.bold}]}>{item.key}</Typography></Pressable>)}</View>}
  
      <Modal visible={sleepReminderOpen} transparent animationType="fade" onRequestClose={()=>setSleepReminderOpen(false)}>
        <Pressable style={s.sleepBackdrop} onPress={()=>setSleepReminderOpen(false)}>
          <Pressable style={s.sleepCard} onPress={e=>e.stopPropagation()}>
            <View style={s.sleepBadge}><Typography style={s.sleepEmoji}>👑</Typography></View>
            <Typography style={s.sleepTitle}>Idź spać słoneczko, już czas</Typography>
            <Typography style={s.sleepSubtitle}>„Sleep for clear skin” 💖🌙</Typography>
            <Typography style={s.sleepDesc}>Twoja cera i regeneracja podziękują Ci rano. Odłóż telefon, załóż opaskę i odpocznij, księżniczko.</Typography>
            <Pressable onPress={()=>setSleepReminderOpen(false)} style={s.sleepButton}>
              <Typography style={s.sleepButtonText}>Dobranoc ✨</Typography>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>;
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:c.canvas},fill:{flex:1},brandTopBar:{height:68,paddingHorizontal:sp.lg,flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:c.canvas},brandLogo:{fontFamily:f.bold,fontWeight:"800",fontSize:31,letterSpacing:-1.5,color:c.ink},cityBlock:{flexDirection:'row',alignItems:'center',gap:6},cityName:{fontFamily:f.bold,fontSize:27,letterSpacing:-1.1,color:c.ink},cityModalBackdrop:{flex:1,backgroundColor:'rgba(0,0,0,.28)',justifyContent:'flex-start',alignItems:'flex-end',paddingTop:82,paddingRight:16},citySheet:{width:230,backgroundColor:c.white,borderRadius:22,padding:14,shadowColor:'#000',shadowOpacity:.14,shadowRadius:24,shadowOffset:{width:0,height:10},elevation:8},citySheetTitle:{fontFamily:f.bold,fontSize:17,color:c.ink,paddingHorizontal:6,paddingBottom:8},cityOption:{height:46,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:8,borderRadius:12},cityOptionText:{fontFamily:f.semibold,fontSize:15,color:c.ink},floatingChatFab:{position:'absolute',right:18,zIndex:99,width:56,height:56,borderRadius:28,backgroundColor:c.pink,alignItems:'center',justifyContent:'center',shadowColor:'#B8325A',shadowOpacity:0.38,shadowRadius:14,shadowOffset:{width:0,height:6},elevation:9},chatDot:{position:'absolute',top:11,right:12,width:9,height:9,borderRadius:4.5,backgroundColor:c.white,borderWidth:2,borderColor:c.pink},tabBar:{backgroundColor:c.white,borderTopWidth:1,borderColor:c.line,flexDirection:'row',paddingTop:sp.md,paddingHorizontal:sp.xs},tab:{flex:1,alignItems:'center',justifyContent:'center',gap:4,minHeight:48},tabText:{fontSize:10,color:c.muted,fontFamily:f.semibold},plansSwitch:{marginHorizontal:sp.lg,marginBottom:10,padding:4,borderRadius:16,backgroundColor:c.white,borderWidth:1,borderColor:c.line,flexDirection:'row'},plansSwitchItem:{flex:1,height:38,borderRadius:12,alignItems:'center',justifyContent:'center'},plansSwitchActive:{backgroundColor:c.blush},plansSwitchText:{fontFamily:f.semibold,fontSize:13,color:c.muted},plansSwitchTextActive:{fontFamily:f.bold,color:c.pink},
  sleepBackdrop:{flex:1,backgroundColor:'rgba(24,11,18,0.65)',justifyContent:'center',alignItems:'center',padding:sp.lg},
  sleepCard:{width:'100%',maxWidth:340,backgroundColor:c.white,borderRadius:28,padding:26,alignItems:'center',shadowColor:'#000',shadowOpacity:0.25,shadowRadius:30,shadowOffset:{width:0,height:12},elevation:12},
  sleepBadge:{width:84,height:84,borderRadius:42,backgroundColor:c.blush,alignItems:'center',justifyContent:'center',marginBottom:16},
  sleepEmoji:{fontSize:40,lineHeight:48,textAlign:'center'},
  sleepTitle:{fontFamily:f.bold,fontWeight:'800',fontSize:21,lineHeight:26,textAlign:'center',color:c.ink,marginBottom:6},
  sleepSubtitle:{fontFamily:f.semibold,fontWeight:'700',fontSize:15,color:c.pink,textAlign:'center',marginBottom:12},
  sleepDesc:{fontFamily:f.regular,fontSize:14,lineHeight:20,textAlign:'center',color:c.muted,marginBottom:22},
  sleepButton:{width:'100%',height:50,backgroundColor:c.pink,borderRadius:16,alignItems:'center',justifyContent:'center'},
  sleepButtonText:{fontFamily:f.bold,fontWeight:'700',fontSize:15,color:c.white}
});