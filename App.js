import React,{useState} from 'react';
import {Platform,Pressable,SafeAreaView,StatusBar,StyleSheet,View} from 'react-native';
import {useFonts,DMSans_400Regular,DMSans_600SemiBold,DMSans_700Bold} from '@expo-google-fonts/dm-sans';
import {PlayfairDisplay_700Bold} from '@expo-google-fonts/playfair-display';
import {Ionicons} from '@expo/vector-icons';
import Onboarding from './src/Onboarding';
import {DiscoverScreen,CommunityScreen,GroupsScreen,ChatsScreen,ProfileScreen} from './src/screens';
import {ReportForm,SafetyCenter} from './src/Safety';
import {initialPosts} from './src/data';
import {colors as c,fonts as f,space as sp} from './src/theme';
import {Typography} from './src/ui';
const tabs=[{key:'Odkrywaj',icon:'heart-outline',active:'heart'},{key:'Social',icon:'newspaper-outline',active:'newspaper'},{key:'Grupy',icon:'people-outline',active:'people'},{key:'Czaty',icon:'chatbubble-outline',active:'chatbubble'},{key:'Profil',icon:'person-outline',active:'person'}];
export default function App(){
  const [loaded]=useFonts({DMSans_400Regular,DMSans_600SemiBold,DMSans_700Bold,PlayfairDisplay_700Bold});
  const [account,setAccount]=useState(null);
  const [tab,setTab]=useState('Odkrywaj');
  const [blockedIds,setBlockedIds]=useState([]);
  const [reports,setReports]=useState([]);
  const [reportTarget,setReportTarget]=useState(null);
  const [safetyOpen,setSafetyOpen]=useState(false);
  const [posts,setPosts]=useState(initialPosts);
  const [session,setSession]=useState(0);
  const block=id=>setBlockedIds(prev=>prev.includes(id)?prev:[...prev,id]);
  const reset=()=>{
    setAccount(null);setTab('Odkrywaj');setBlockedIds([]);setReports([]);
    setReportTarget(null);setSafetyOpen(false);setPosts(initialPosts);setSession(v=>v+1);
  };
  if(!loaded)return <View style={{flex:1,backgroundColor:c.canvas}}/>;
  if(!account)return <SafeAreaView style={s.safe}><StatusBar barStyle="dark-content" backgroundColor={c.canvas}/><Onboarding key={session} onComplete={setAccount}/></SafeAreaView>;
  const content=reportTarget?
    <ReportForm target={reportTarget} onCancel={()=>setReportTarget(null)} onSave={report=>{setReports(prev=>[...prev,report]);setReportTarget(null);}}/>:
    safetyOpen?<SafetyCenter blockedIds={blockedIds} onUnblock={id=>setBlockedIds(prev=>prev.filter(v=>v!==id))} reports={reports} onClose={()=>setSafetyOpen(false)} onReset={reset}/>:
    ({'Odkrywaj':<DiscoverScreen blockedIds={blockedIds} onBlock={block} onReport={setReportTarget}/>,'Social':<CommunityScreen posts={posts} setPosts={setPosts} blockedIds={blockedIds} onReport={setReportTarget}/>,'Grupy':<GroupsScreen onReport={setReportTarget}/>,'Czaty':<ChatsScreen blockedIds={blockedIds} onReport={setReportTarget}/>,'Profil':<ProfileScreen account={account} onSafety={()=>setSafetyOpen(true)}/>})[tab];
  return <SafeAreaView style={s.safe}><StatusBar barStyle="dark-content" backgroundColor={c.canvas}/><View style={{flex:1}}>{content}</View>{!reportTarget&&!safetyOpen&&<View style={s.tabBar}>{tabs.map(item=><Pressable key={item.key} accessibilityRole="tab" accessibilityLabel={item.key} accessibilityState={{selected:tab===item.key}} onPress={()=>setTab(item.key)} style={s.tab}><Ionicons name={tab===item.key?item.active:item.icon} size={23} color={tab===item.key?c.pink:c.muted}/><Typography style={[s.tabText,tab===item.key&&{color:c.pink,fontFamily:f.bold}]}>{item.key}</Typography></Pressable>)}</View>}</SafeAreaView>;
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:c.canvas},tabBar:{backgroundColor:c.white,borderTopWidth:1,borderColor:c.line,flexDirection:'row',paddingTop:sp.md,paddingBottom:Platform.OS==='android'?sp.md:sp.sm,paddingHorizontal:sp.xs},tab:{flex:1,alignItems:'center',justifyContent:'center',gap:4,minHeight:48},tabText:{fontSize:10,color:c.muted,fontFamily:f.semibold}});
