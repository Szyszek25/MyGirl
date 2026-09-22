import React,{useEffect,useState} from 'react';
import {Alert,Pressable,StatusBar,StyleSheet,View} from 'react-native';
import {SafeAreaProvider,SafeAreaView,useSafeAreaInsets} from 'react-native-safe-area-context';
import {useFonts,DMSans_400Regular,DMSans_600SemiBold,DMSans_700Bold} from '@expo-google-fonts/dm-sans';
import {PlayfairDisplay_700Bold} from '@expo-google-fonts/playfair-display';
import {Ionicons} from '@expo/vector-icons';
import Onboarding from './src/Onboarding';
import NativeProfile from './src/NativeProfile';
import PartnerPanel from './src/PartnerPanel';
import ShiftTransition from './src/ShiftTransition';
import DiscoverScreen from './src/DiscoverScreen';
import {CommunityScreen,ChatsScreen} from './src/screens';
import ClubsMeetupsScreen from './src/ClubsMeetupsScreen';
import {ReportForm,SafetyCenter} from './src/Safety';
import {loadLocalProfile,saveLocalProfile,deleteLocalProfile} from './src/localProfile';
import {initialPosts} from './src/data';
import {colors as c,fonts as f,space as sp} from './src/theme';
import {Typography} from './src/ui';
const tabs=[{key:'Odkrywaj',icon:'heart-outline',active:'heart'},{key:'Social',icon:'newspaper-outline',active:'newspaper'},{key:'Grupy',icon:'people-outline',active:'people'},{key:'Czaty',icon:'chatbubble-outline',active:'chatbubble'},{key:'Profil',icon:'person-outline',active:'person'}];

export default function App(){return <SafeAreaProvider><MyGirlApp/></SafeAreaProvider>}
function MyGirlApp(){
  const insets=useSafeAreaInsets();
  const [loaded]=useFonts({DMSans_400Regular,DMSans_600SemiBold,DMSans_700Bold,PlayfairDisplay_700Bold});
  const [account,setAccount]=useState(null);
  const [booting,setBooting]=useState(true);
  const [tab,setTab]=useState('Odkrywaj');
  const [blockedIds,setBlockedIds]=useState([]);
  const [reports,setReports]=useState([]);
  const [reportTarget,setReportTarget]=useState(null);
  const [safetyOpen,setSafetyOpen]=useState(false);
  const [partnerOpen,setPartnerOpen]=useState(false);
  const [posts,setPosts]=useState(initialPosts);
  const [session,setSession]=useState(0);
  useEffect(()=>{
    let alive=true;
    loadLocalProfile().then(profile=>{if(alive)setAccount(profile);}).catch(()=>{
      if(alive)Alert.alert('Błąd odczytu profilu','Nie udało się wczytać lokalnych danych.');
    }).finally(()=>{if(alive)setBooting(false);});
    return ()=>{alive=false;};
  },[]);
  const saveProfile=async profile=>{
    const saved=await saveLocalProfile(profile);
    setAccount(saved);
    return saved;
  };
  const block=id=>setBlockedIds(prev=>prev.includes(id)?prev:[...prev,id]);
  const reset=async()=>{
    try{await deleteLocalProfile();}
    catch(error){Alert.alert('Nie usunięto wszystkich danych','Spróbuj ponownie. '+(error.message||''));return;}
    setAccount(null);setTab('Odkrywaj');setBlockedIds([]);setReports([]);
    setReportTarget(null);setSafetyOpen(false);setPartnerOpen(false);
    setPosts(initialPosts);setSession(v=>v+1);
  };
  if(!loaded||booting)return <View style={s.safe}/>;
  if(!account)return <SafeAreaView edges={['top','bottom']} style={s.safe}><StatusBar barStyle="dark-content" backgroundColor={c.canvas}/><Onboarding key={session} onComplete={saveProfile}/></SafeAreaView>;
  const showTabs=!reportTarget&&!safetyOpen&&!partnerOpen;
  const clubsVisible=tab==='Grupy'&&showTabs;
  const content=reportTarget?
    <ReportForm target={reportTarget} onCancel={()=>setReportTarget(null)} onSave={report=>{setReports(prev=>[...prev,report]);setReportTarget(null);}}/>:
    safetyOpen?<SafetyCenter blockedIds={blockedIds} onUnblock={id=>setBlockedIds(prev=>prev.filter(v=>v!==id))} reports={reports} onClose={()=>setSafetyOpen(false)} onReset={reset}/>:
    partnerOpen?<PartnerPanel onClose={()=>setPartnerOpen(false)}/>:
    ({'Odkrywaj':<DiscoverScreen blockedIds={blockedIds} onBlock={block} onReport={setReportTarget}/>,'Social':<CommunityScreen posts={posts} setPosts={setPosts} blockedIds={blockedIds} onReport={setReportTarget}/>,'Czaty':<ChatsScreen blockedIds={blockedIds} onReport={setReportTarget}/>,'Profil':<NativeProfile account={account} onSave={saveProfile} onSafety={()=>setSafetyOpen(true)} onPartner={()=>setPartnerOpen(true)}/>})[tab];
  const screenKey=reportTarget?'report':safetyOpen?'safety':partnerOpen?'partner':tab;
  return <SafeAreaView edges={showTabs?['top']:['top','bottom']} style={s.safe}><StatusBar barStyle="dark-content" backgroundColor={c.canvas}/>
    <ShiftTransition screenKey={screenKey}>
      <View style={s.fill}>
        <View style={[s.fill,{display:clubsVisible?'flex':'none'}]}><ClubsMeetupsScreen key={session} onReport={setReportTarget}/></View>
        {!clubsVisible&&<View style={s.fill}>{content}</View>}
      </View>
    </ShiftTransition>
    {showTabs&&<View style={[s.tabBar,{paddingBottom:Math.max(insets.bottom,sp.sm)}]}>{tabs.map(item=><Pressable key={item.key} accessibilityRole="tab" accessibilityLabel={item.key} accessibilityState={{selected:tab===item.key}} onPress={()=>setTab(item.key)} style={s.tab}><Ionicons name={tab===item.key?item.active:item.icon} size={23} color={tab===item.key?c.pink:c.muted}/><Typography style={[s.tabText,tab===item.key&&{color:c.pink,fontFamily:f.bold}]}>{item.key}</Typography></Pressable>)}</View>}
  </SafeAreaView>;
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:c.canvas},fill:{flex:1},tabBar:{backgroundColor:c.white,borderTopWidth:1,borderColor:c.line,flexDirection:'row',paddingTop:sp.md,paddingHorizontal:sp.xs},tab:{flex:1,alignItems:'center',justifyContent:'center',gap:4,minHeight:48},tabText:{fontSize:10,color:c.muted,fontFamily:f.semibold}});
