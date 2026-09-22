import React,{useEffect,useRef,useState} from 'react';
import {AccessibilityInfo,Animated,StyleSheet} from 'react-native';

// Lightweight native-driver transition: only transform and opacity are animated.
// This is a tab transition, not the browser game's Shift-key sprint mechanic.
export default function ShiftTransition({screenKey,children}){
  const previous=useRef(screenKey);
  const progress=useRef(new Animated.Value(1)).current;
  const [reduceMotion,setReduceMotion]=useState(false);
  useEffect(()=>{
    let mounted=true;
    AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(mounted)setReduceMotion(!!value);}).catch(()=>{});
    const subscription=AccessibilityInfo.addEventListener?.('reduceMotionChanged',value=>setReduceMotion(!!value));
    return ()=>{mounted=false;subscription?.remove?.();};
  },[]);
  useEffect(()=>{
    if(previous.current===screenKey)return;
    previous.current=screenKey;
    progress.stopAnimation();
    if(reduceMotion){progress.setValue(1);return;}
    progress.setValue(0);
    const animation=Animated.timing(progress,{toValue:1,duration:190,useNativeDriver:true});
    animation.start();
    return ()=>animation.stop();
  },[screenKey,reduceMotion,progress]);
  return <Animated.View style={[styles.fill,{
    opacity:progress.interpolate({inputRange:[0,1],outputRange:[0.78,1]}),
    transform:[{translateX:progress.interpolate({inputRange:[0,1],outputRange:[16,0]})}]
  }]}>{children}</Animated.View>;
}
const styles=StyleSheet.create({fill:{flex:1}});
