import React,{useEffect,useState} from 'react';
import {Alert,Image,Linking,Modal,Platform,Pressable,StatusBar,StyleSheet,View} from 'react-native';
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
import MoreScreen from './src/MoreScreen';
import PartnerPanel from './src/PartnerPanel';
import ShiftTransition from './src/ShiftTransition';
import DiscoverScreen from './src/DiscoverScreen';
import {CommunityScreen,ChatsScreen,DiscoverScreen as PeopleDiscoverScreen} from './src/screens';
import ClubsMeetupsScreen from './src/ClubsMeetupsScreen';
import MeetingsScreen from './src/MeetingsScreen';
import {ReportForm,SafetyCenter} from './src/Safety';
import {loadLocalProfile,saveLocalProfile,deleteLocalProfile} from './src/localProfile';
import {deleteAccount,getSession,handleAuthCallback,onAuthStateChange,signOut} from './src/services/authApi';
import {loadRemoteProfile,saveRemoteProfile} from './src/services/profileApi';
import {supabase} from './src/lib/supabase';
import {blockProfile as blockRemote,loadMyBlocks,loadMyReports,reportTarget,unblockProfile as unblockRemote} from './src/services/safetyApi';
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
  const [authSession,setAuthSession]=useState(null);
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
  const [pendingConversationId,setPendingConversationId]=useState(null);
  const [cycleOpen,setCycleOpen]=useState(false);
  const [careOpen,setCareOpen]=useState(false);
  const [moreOpen,setMoreOpen]=useState(false);
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
    const syncSession=async session=>{
      if(!alive)return;
      setAuthSession(session||null);
      if(session?.user?.id){
        try{
          const remote=await loadRemoteProfile(session.user.id);
          if(!alive)return;
          if(remote?.onboardingComplete){
            setAccount(remote);
            setEntryStarted(false);
            if(remote.city)setActiveCity(remote.city);
            Promise.all([loadMyBlocks(),loadMyReports()]).then(([blocks,onlineReports])=>{
              if(!alive)return;
              setBlockedIds(blocks);
              setReports(onlineReports);
            }).catch(()=>{});
          }else{
            setAccount(null);
            setEntryStarted(true);
          }
        }catch(error){
          if(alive)Alert.alert('Nie udało się wczytać konta',error.message||'Spróbuj ponownie.');
        }
      }else{
        const local=await loadLocalProfile();
        if(!alive)return;
        setAccount(local);
        if(local?.city)setActiveCity(local.city);
      }
    };

    Promise.all([getSession(),loadFeaturePreferences(),Linking.getInitialURL()]).then(async([session,prefs,url])=>{
      if(!alive)return;
      setFeaturePreferences(prefs);
      if(url){await handleAuthCallback(url).catch(()=>null);if(url.includes('reset-password'))setResetPasswordOpen(true);}
      const latest=await getSession();
      await syncSession(latest||session);
    }).catch(()=>{
      if(alive)Alert.alert('Błąd uruchamiania','Nie udało się wczytać sesji Polki.');
    }).finally(()=>{if(alive)setBooting(false);});

    const unsubAuth=onAuthStateChange((_event,session)=>{void syncSession(session)});
    const linkSub=Linking.addEventListener('url',({url})=>{
      void handleAuthCallback(url).then(()=>{if(url.includes('reset-password'))setResetPasswordOpen(true)}).catch(error=>Alert.alert('Logowanie',error.message||'Nie udało się dokończyć logowania.'));
    });
    return ()=>{alive=false;unsubAuth?.();linkSub.remove();};
  },[]);

  const saveProfile=async profile=>{
    const saved=authSession?.user?.id
      ? await saveRemoteProfile(authSession.user.id,profile)
      : await saveLocalProfile(profile);
    const merged={...saved,zodiac:profile.zodiac||saved?.zodiac||null,style:profile.style||saved?.style||null};
    setAccount(merged);
    setEntryStarted(false);
    if(merged?.city)setActiveCity(merged.city);
    if(merged.zodiac||merged.style){
      const nextPrefs={...featurePreferences};
      if(merged.zodiac)nextPrefs.zodiacSign=merged.zodiac;
      if(merged.style)nextPrefs.stylePreference=merged.style;
      setFeaturePreferences(nextPrefs);
      void saveFeaturePreferences(nextPrefs);
    }
    return merged;
  };
  const openDirectChat=async otherUserId=>{
    if(!authSession?.user?.id){
      Alert.alert('Zaloguj się','Wiadomości online są dostępne po zalogowaniu.');
      return;
    }
    try{
      const {data,error}=await supabase.rpc('polka_start_direct_conversation',{p_other_user:otherUserId});
      if(error)throw error;
      setPendingConversationId(data);
      setMessagesOpen(true);
    }catch(error){
      Alert.alert('Nie udało się otworzyć rozmowy',error.message||'Spróbuj ponownie.');
    }
  };
  const block=async id=>{
    setBlockedIds(prev=>prev.includes(id)?prev:[...prev,id]);
    if(authSession?.user?.id&&/^[0-9a-f-]{36}$/i.test(id)){
      try{await blockRemote(id)}
      catch(error){
        setBlockedIds(prev=>prev.filter(v=>v!==id));
        Alert.alert('Nie zablokowano profilu',error.message||'Spróbuj ponownie.');
      }
    }
  };
  const unblock=async id=>{
    setBlockedIds(prev=>prev.filter(v=>v!==id));
    if(authSession?.user?.id&&/^[0-9a-f-]{36}$/i.test(id)){
      try{await unblockRemote(id)}
      catch(error){
        setBlockedIds(prev=>prev.includes(id)?prev:[...prev,id]);
        Alert.alert('Nie odblokowano profilu',error.message||'Spróbuj ponownie.');
      }
    }
  };
  const handleSignOut=async()=>{
    try{
      if(authSession?.user){
        await signOut().catch(()=>{});
      }
      await deleteLocalProfile().catch(()=>{});
      setAccount(null);
      setAuthSession(null);
      setEntryStarted(false);
      setSettingsOpen(false);
    }catch(error){
      Alert.alert('Nie udało się wylogować',error.message||'Spróbuj ponownie.');
    }
  };
  const reset=async()=>{
    try{await deleteLocalProfile();}
    catch(error){Alert.alert('Nie usunięto wszystkich danych','Spróbuj ponownie. '+(error.message||''));return;}
    setAccount(null);setEntryStarted(false);setPreBusiness(false);setTab('Start');setActiveCity('Warszawa');setCityPickerOpen(false);setBlockedIds([]);setReports([]);
    setReportTarget(null);setSafetyOpen(false);setPartnerOpen(false);setSettingsOpen(false);setMessagesOpen(false);setCycleOpen(false);setCareOpen(false);setMoreOpen(false);setResetPasswordOpen(false);setPlansView('Plany');
    setPosts(initialPosts);setSession(v=>v+1);
  };
  if(!loaded||booting)return (
    <View style={s.splashRoot}>
      <StatusBar barStyle="light-content" backgroundColor="#CE0459"/>
      <Image source={require('./assets/splash.png')} style={s.splashLogo} resizeMode="contain"/>
    </View>
  );
  const handleCancelOnboarding=async()=>{
    try{
      if(authSession?.user){
        await signOut().catch(()=>{});
      }
    }catch{}
    setAuthSession(null);
    setAccount(null);
    setEntryStarted(false);
  };
  if(!account){
    if(preBusiness)return <SafeAreaView edges={['top','bottom']} style={s.safe}><StatusBar barStyle="dark-content" backgroundColor={c.canvas}/><PartnerPanel userId={authSession?.user?.id||null} onClose={()=>setPreBusiness(false)}/></SafeAreaView>;
    if(!entryStarted)return <View style={s.safe}><StatusBar barStyle="light-content" translucent backgroundColor="transparent"/><WelcomeScreen onContinue={({method}={})=>{if(method==='skip')setEntryStarted(true)}} onBusiness={()=>setPreBusiness(true)}/></View>;
    return <SafeAreaView edges={['top','bottom']} style={s.safe}><StatusBar barStyle="dark-content" backgroundColor={c.canvas}/><Onboarding key={session} online={!!authSession?.user} onComplete={saveProfile} onBack={handleCancelOnboarding}/></SafeAreaView>;
  }
  const showTabs=!reportTarget&&!safetyOpen&&!partnerOpen&&!messagesOpen&&!cycleOpen&&!careOpen&&!moreOpen;
  const clubsVisible=tab==='Grupy'&&showTabs;
  const content=reportTarget?
    <ReportForm target={reportTarget} online={!!authSession?.user} onCancel={()=>setReportTarget(null)} onSave={async report=>{
      if(authSession?.user&&/^[0-9a-f-]{36}$/i.test(report?.target?.id)){
        try{
          await reportTarget(report.target,report.reason,report.details);
          const onlineReports=await loadMyReports().catch(()=>[]);
          setReports(onlineReports);
          setReportTarget(null);
        }catch(error){Alert.alert('Nie wysłano zgłoszenia',error.message||'Spróbuj ponownie.');}
      }else{
        setReports(prev=>[...prev,report]);
        setReportTarget(null);
      }
    }}/> :
    safetyOpen?<SafetyCenter online={!!authSession?.user} blockedIds={blockedIds} onUnblock={unblock} reports={reports} onClose={()=>setSafetyOpen(false)} onReset={reset}/>:
    partnerOpen?<PartnerPanel userId={authSession?.user?.id||null} onClose={()=>setPartnerOpen(false)}/>:
    cycleOpen?<CycleScreen userId={authSession?.user?.id||null} cloudSync={!!featurePreferences.cycleCloudSync} onClose={()=>setCycleOpen(false)} onOpenCare={()=>{setCycleOpen(false);setCareOpen(true)}} onOpenGroups={()=>{setCycleOpen(false);setTab('Grupy')}}/>:
    careOpen?<PolkaCareScreen onClose={()=>setCareOpen(false)}/>:
    moreOpen?<MoreScreen onClose={()=>setMoreOpen(false)}/>:
    messagesOpen?<View style={s.fill}><ChatsScreen sessionUserId={authSession?.user?.id||null} initialConversationId={pendingConversationId} blockedIds={blockedIds} supportChat={featurePreferences.supportChat} onReport={setReportTarget} onClose={()=>{setMessagesOpen(false);setPendingConversationId(null)}}/></View>:
    ({'Start':<View style={s.fill}><CommunityScreen city={activeCity} sessionUserId={authSession?.user?.id||null} posts={posts} setPosts={setPosts} blockedIds={blockedIds} onReport={setReportTarget} onOpenChat={openDirectChat}/></View>,'Poznaj':<PeopleDiscoverScreen city={activeCity} sessionUserId={authSession?.user?.id||null} onMessage={openDirectChat} blockedIds={blockedIds} zodiacEnabled={featurePreferences.zodiacPeopleMatching} userZodiac={account?.zodiac||featurePreferences.zodiacSign} styleEnabled={featurePreferences.stylePeopleMatching} userStyle={account?.style||featurePreferences.stylePreference} onBlock={block} onReport={setReportTarget}/>,'Plany':<View style={s.fill}><View style={s.plansSwitch}><Pressable onPress={()=>setPlansView('Plany')} style={[s.plansSwitchItem,plansView==='Plany'&&s.plansSwitchActive]}><Typography style={[s.plansSwitchText,plansView==='Plany'&&s.plansSwitchTextActive]}>Plany</Typography></Pressable><Pressable onPress={()=>setPlansView('Spotkania')} style={[s.plansSwitchItem,plansView==='Spotkania'&&s.plansSwitchActive]}><Typography style={[s.plansSwitchText,plansView==='Spotkania'&&s.plansSwitchTextActive]}>Spotkania</Typography></Pressable></View>{plansView==='Plany'?<DiscoverScreen city={activeCity} sessionUserId={authSession?.user?.id||null} blockedIds={blockedIds} onBlock={block} onReport={setReportTarget}/>:<MeetingsScreen city={activeCity} sessionUserId={authSession?.user?.id||null} featurePreferences={featurePreferences} onReport={setReportTarget}/>}</View>,'Profil':<NativeProfile account={account} showCare={featurePreferences.polkaCare} onSave={saveProfile} onSafety={()=>setSafetyOpen(true)} onPartner={()=>setPartnerOpen(true)} onSettings={()=>setSettingsOpen(true)} onCycle={()=>setCycleOpen(true)} onCare={()=>setCareOpen(true)} onMore={()=>setMoreOpen(true)} onSignOut={handleSignOut}/>})[tab];
  const screenKey=reportTarget?'report':safetyOpen?'safety':partnerOpen?'partner':cycleOpen?'cycle':careOpen?'polka-care':moreOpen?'more':messagesOpen?'messages':tab;
  return <SafeAreaView edges={showTabs?['top']:['top','bottom']} style={s.safe}><StatusBar barStyle="dark-content" backgroundColor={c.canvas}/>
    <ShiftTransition screenKey={screenKey}>
      <View style={s.fill}>
        {showTabs && (
        <View style={s.brandTopBar}>
          <Typography style={s.brandLogo}>Polka</Typography>
          <Pressable onPress={()=>setCityPickerOpen(true)} style={s.cityBlock} accessibilityRole="button" accessibilityLabel="Zmień miasto"><Ionicons name="location-outline" size={18} color={c.pink}/><Typography style={s.cityName}>{activeCity}</Typography><Ionicons name="chevron-down" size={17} color={c.muted}/></Pressable>
        </View>
      )}
        <View style={[s.fill,{display:clubsVisible?'flex':'none'}]}><ClubsMeetupsScreen key={session} city={activeCity} sessionUserId={authSession?.user?.id||null} onReport={setReportTarget}/></View>
        {!clubsVisible&&<View style={s.fill}>{content}</View>}
      </View>
    </ShiftTransition>
    <Modal visible={cityPickerOpen} transparent animationType="fade" onRequestClose={()=>setCityPickerOpen(false)}><Pressable style={s.cityModalBackdrop} onPress={()=>setCityPickerOpen(false)}><View style={s.citySheet}><Typography style={s.citySheetTitle}>Wybierz miasto</Typography>{cities.map(city=><Pressable key={city} onPress={()=>{setActiveCity(city);setCityPickerOpen(false)}} style={s.cityOption}><Typography style={[s.cityOptionText,activeCity===city&&{color:c.pink,fontFamily:f.bold}]}>{city}</Typography>{activeCity===city&&<Ionicons name="checkmark" size={20} color={c.pink}/>}</Pressable>)}</View></Pressable></Modal>
    <Modal visible={settingsOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>setSettingsOpen(false)}>
      <SafeAreaView edges={['top','bottom']} style={s.safe}>
        <SettingsScreen
          onClose={()=>setSettingsOpen(false)}
          accountEmail={authSession?.user?.email||''}
          userId={authSession?.user?.id||null}
          isAuthenticated={!!authSession?.user}
          onSafety={()=>{setSettingsOpen(false);setSafetyOpen(true)}}
          onPartner={()=>{setSettingsOpen(false);setPartnerOpen(true)}}
          onPasswordReset={()=>{setSettingsOpen(false);setResetPasswordOpen(true)}}
          onSignOut={handleSignOut}
          onDeleteAccount={async()=>{
            try{
              await deleteAccount();
              await deleteLocalProfile().catch(()=>{});
              setAccount(null);setAuthSession(null);setEntryStarted(false);setSettingsOpen(false);
              Alert.alert('Konto usunięte','Twoje konto Polki zostało usunięte.');
            }catch(error){Alert.alert('Nie udało się usunąć konta',error.message||'Spróbuj ponownie.');}
          }}
          onFeaturePreferencesChange={setFeaturePreferences}
          onReset={reset}
        />
      </SafeAreaView>
    </Modal>
    <Modal visible={resetPasswordOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={()=>{setResetPasswordOpen(false);setSettingsOpen(true)}}>
      <SafeAreaView edges={['top','bottom']} style={s.safe}>
        <ResetPasswordScreen email={authSession?.user?.email||''} onClose={()=>{setResetPasswordOpen(false);setSettingsOpen(true)}}/>
      </SafeAreaView>
    </Modal>

    {showTabs && (
      <Pressable
        onPress={() => {setPendingConversationId(null);setMessagesOpen(true)}}
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
  sleepButtonText:{fontFamily:f.bold,fontWeight:'700',fontSize:15,color:c.white},
  splashRoot:{flex:1,backgroundColor:'#CE0459',alignItems:'center',justifyContent:'center'},
  splashLogo:{width:180,height:180}
});