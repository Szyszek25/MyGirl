import React,{useEffect,useState} from 'react';
import {Alert,Modal,Pressable,StatusBar,StyleSheet,View} from 'react-native';
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
const tabs=[{key:'Start',icon:'home-outline',active:'home'},{key:'Poznaj',icon:'heart-outline',active:'heart'},{key:'Plany',icon:'calendar-outline',active:'calendar'},{key:'Grupy',icon:'people-outline',active:'people'},{key:'Profil',icon:'person-outline',active:'person'}];

export default function App(){return <SafeAreaProvider><PolkaApp/></SafeAreaProvider>}
function PolkaApp(){
  const insets=useSafeAreaInsets();
  const [loaded]=useFonts({DMSans_400Regular,DMSans_600SemiBold,DMSans_700Bold,PlayfairDisplay_700Bold});
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
  const [resetPasswordOpen,setResetPasswordOpen]=useState(false);
  const [plansView,setPlansView]=useState('Plany');
  const [posts,setPosts]=useState(initialPosts);
  const [session,setSession]=useState(0);
  useEffect(()=>{
    let alive=true;
    loadLocalProfile().then(profile=>{if(alive){setAccount(profile);if(profile?.city)setActiveCity(profile.city);}}).catch(()=>{
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
    setReportTarget(null);setSafetyOpen(false);setPartnerOpen(false);setSettingsOpen(false);setMessagesOpen(false);setCycleOpen(false);setResetPasswordOpen(false);setPlansView('Plany');
    setPosts(initialPosts);setSession(v=>v+1);
  };
  if(!loaded||booting)return <View style={s.safe}/>;
  if(!account){
    if(preBusiness)return <SafeAreaView edges={['top','bottom']} style={s.safe}><StatusBar barStyle="dark-content" backgroundColor={c.canvas}/><PartnerPanel onClose={()=>setPreBusiness(false)}/></SafeAreaView>;
    if(!entryStarted)return <View style={s.safe}><StatusBar barStyle="light-content" translucent backgroundColor="transparent"/><WelcomeScreen onContinue={()=>setEntryStarted(true)} onBusiness={()=>setPreBusiness(true)}/></View>;
    return <SafeAreaView edges={['top','bottom']} style={s.safe}><StatusBar barStyle="dark-content" backgroundColor={c.canvas}/><Onboarding key={session} onComplete={saveProfile}/></SafeAreaView>;
  }
  const showTabs=!reportTarget&&!safetyOpen&&!partnerOpen&&!settingsOpen&&!messagesOpen&&!cycleOpen&&!resetPasswordOpen;
  const clubsVisible=tab==='Grupy'&&showTabs;
  const content=reportTarget?
    <ReportForm target={reportTarget} onCancel={()=>setReportTarget(null)} onSave={report=>{setReports(prev=>[...prev,report]);setReportTarget(null);}}/>:
    safetyOpen?<SafetyCenter blockedIds={blockedIds} onUnblock={id=>setBlockedIds(prev=>prev.filter(v=>v!==id))} reports={reports} onClose={()=>setSafetyOpen(false)} onReset={reset}/>:
    partnerOpen?<PartnerPanel onClose={()=>setPartnerOpen(false)}/>:
    settingsOpen?<SettingsScreen onClose={()=>setSettingsOpen(false)} onSafety={()=>{setSettingsOpen(false);setSafetyOpen(true)}} onPartner={()=>{setSettingsOpen(false);setPartnerOpen(true)}} onPasswordReset={()=>{setSettingsOpen(false);setResetPasswordOpen(true)}} onReset={reset}/>:
    resetPasswordOpen?<ResetPasswordScreen onClose={()=>{setResetPasswordOpen(false);setSettingsOpen(true)}}/>:
    cycleOpen?<CycleScreen onClose={()=>setCycleOpen(false)} onOpenGroups={()=>{setCycleOpen(false);setTab('Grupy')}}/>:
    messagesOpen?<View style={s.fill}><ChatsScreen blockedIds={blockedIds} onReport={setReportTarget} onClose={()=>setMessagesOpen(false)}/></View>:
    ({'Start':<View style={s.fill}><Pressable onPress={()=>setMessagesOpen(true)} style={s.messageShortcut} accessibilityRole="button" accessibilityLabel="Otwórz wiadomości"><Ionicons name="chatbubble-ellipses-outline" size={22} color={c.ink}/></Pressable><CommunityScreen city={activeCity} posts={posts} setPosts={setPosts} blockedIds={blockedIds} onReport={setReportTarget}/></View>,'Poznaj':<PeopleDiscoverScreen city={activeCity} blockedIds={blockedIds} onBlock={block} onReport={setReportTarget}/>,'Plany':<View style={s.fill}><View style={s.plansSwitch}><Pressable onPress={()=>setPlansView('Plany')} style={[s.plansSwitchItem,plansView==='Plany'&&s.plansSwitchActive]}><Typography style={[s.plansSwitchText,plansView==='Plany'&&s.plansSwitchTextActive]}>Plany</Typography></Pressable><Pressable onPress={()=>setPlansView('Spotkania')} style={[s.plansSwitchItem,plansView==='Spotkania'&&s.plansSwitchActive]}><Typography style={[s.plansSwitchText,plansView==='Spotkania'&&s.plansSwitchTextActive]}>Spotkania</Typography></Pressable></View>{plansView==='Plany'?<DiscoverScreen city={activeCity} blockedIds={blockedIds} onBlock={block} onReport={setReportTarget}/>:<MeetingsScreen city={activeCity} onReport={setReportTarget}/>}</View>,'Profil':<NativeProfile account={account} onSave={saveProfile} onSafety={()=>setSafetyOpen(true)} onPartner={()=>setPartnerOpen(true)} onSettings={()=>setSettingsOpen(true)} onCycle={()=>setCycleOpen(true)}/>})[tab];
  const screenKey=reportTarget?'report':safetyOpen?'safety':partnerOpen?'partner':settingsOpen?'settings':resetPasswordOpen?'reset-password':cycleOpen?'cycle':messagesOpen?'messages':tab;
  return <SafeAreaView edges={showTabs?['top']:['top','bottom']} style={s.safe}><StatusBar barStyle="dark-content" backgroundColor={c.canvas}/>
    <ShiftTransition screenKey={screenKey}>
      <View style={s.fill}>
        {showTabs&&<View style={s.brandTopBar}><Typography style={s.brandLogo}>Polka</Typography><Pressable onPress={()=>setCityPickerOpen(true)} style={s.cityBlock} accessibilityRole="button" accessibilityLabel="Zmień miasto"><Ionicons name="location-outline" size={18} color={c.pink}/><Typography style={s.cityName}>{activeCity}</Typography><Ionicons name="chevron-down" size={17} color={c.muted}/></Pressable></View>}
        <View style={[s.fill,{display:clubsVisible?'flex':'none'}]}><ClubsMeetupsScreen key={session} city={activeCity} onReport={setReportTarget}/></View>
        {!clubsVisible&&<View style={s.fill}>{content}</View>}
      </View>
    </ShiftTransition>
    <Modal visible={cityPickerOpen} transparent animationType="fade" onRequestClose={()=>setCityPickerOpen(false)}><Pressable style={s.cityModalBackdrop} onPress={()=>setCityPickerOpen(false)}><View style={s.citySheet}><Typography style={s.citySheetTitle}>Wybierz miasto</Typography>{cities.map(city=><Pressable key={city} onPress={()=>{setActiveCity(city);setCityPickerOpen(false)}} style={s.cityOption}><Typography style={[s.cityOptionText,activeCity===city&&{color:c.pink,fontFamily:f.bold}]}>{city}</Typography>{activeCity===city&&<Ionicons name="checkmark" size={20} color={c.pink}/>}</Pressable>)}</View></Pressable></Modal>
    {showTabs&&<View style={[s.tabBar,{paddingBottom:Math.max(insets.bottom,sp.sm)}]}>{tabs.map(item=><Pressable key={item.key} accessibilityRole="tab" accessibilityLabel={item.key} accessibilityState={{selected:tab===item.key}} onPress={()=>setTab(item.key)} style={s.tab}><Ionicons name={tab===item.key?item.active:item.icon} size={23} color={tab===item.key?c.pink:c.muted}/><Typography style={[s.tabText,tab===item.key&&{color:c.pink,fontFamily:f.bold}]}>{item.key}</Typography></Pressable>)}</View>}
  </SafeAreaView>;
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:c.canvas},fill:{flex:1},brandTopBar:{height:68,paddingHorizontal:sp.lg,flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:c.canvas},brandLogo:{fontFamily:f.bold,fontSize:31,letterSpacing:-1.5,color:c.ink},cityBlock:{flexDirection:'row',alignItems:'center',gap:6},cityName:{fontFamily:f.bold,fontSize:27,letterSpacing:-1.1,color:c.ink},cityModalBackdrop:{flex:1,backgroundColor:'rgba(0,0,0,.28)',justifyContent:'flex-start',alignItems:'flex-end',paddingTop:82,paddingRight:16},citySheet:{width:230,backgroundColor:c.white,borderRadius:22,padding:14,shadowColor:'#000',shadowOpacity:.14,shadowRadius:24,shadowOffset:{width:0,height:10},elevation:8},citySheetTitle:{fontFamily:f.bold,fontSize:17,color:c.ink,paddingHorizontal:6,paddingBottom:8},cityOption:{height:46,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:8,borderRadius:12},cityOptionText:{fontFamily:f.semibold,fontSize:15,color:c.ink},messageShortcut:{position:'absolute',right:18,top:14,zIndex:10,width:42,height:42,borderRadius:21,backgroundColor:c.white,borderWidth:1,borderColor:c.line,alignItems:'center',justifyContent:'center'},tabBar:{backgroundColor:c.white,borderTopWidth:1,borderColor:c.line,flexDirection:'row',paddingTop:sp.md,paddingHorizontal:sp.xs},tab:{flex:1,alignItems:'center',justifyContent:'center',gap:4,minHeight:48},tabText:{fontSize:10,color:c.muted,fontFamily:f.semibold},plansSwitch:{marginHorizontal:sp.lg,marginBottom:10,padding:4,borderRadius:16,backgroundColor:c.white,borderWidth:1,borderColor:c.line,flexDirection:'row'},plansSwitchItem:{flex:1,height:38,borderRadius:12,alignItems:'center',justifyContent:'center'},plansSwitchActive:{backgroundColor:c.blush},plansSwitchText:{fontFamily:f.semibold,fontSize:13,color:c.muted},plansSwitchTextActive:{fontFamily:f.bold,color:c.pink}});
