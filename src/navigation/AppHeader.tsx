import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {colors as c, fonts as f, space as sp} from '../theme';
import {Typography} from '../ui';

type Props = {
  city: string;
  onPressCity: () => void;
  onPressInbox: () => void;
};

export default function AppHeader({city,onPressCity,onPressInbox}: Props){
  return (
    <View style={s.root}>
      <Typography style={s.logo}>Polka</Typography>
      <View style={s.actions}>
        <Pressable onPress={onPressCity} style={s.city} accessibilityRole="button" accessibilityLabel="Zmień miasto">
          <Ionicons name="location-outline" size={17} color={c.pink}/>
          <Typography style={s.cityText}>{city}</Typography>
          <Ionicons name="chevron-down" size={16} color={c.muted}/>
        </Pressable>
        <Pressable onPress={onPressInbox} style={s.iconButton} accessibilityRole="button" accessibilityLabel="Przychodzące">
          <Ionicons name="mail-outline" size={22} color={c.ink}/>
        </Pressable>
      </View>
    </View>
  );
}

const s=StyleSheet.create({
  root:{height:64,paddingHorizontal:sp.lg,flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:c.canvas},
  logo:{fontFamily:f.bold,fontWeight:'800',fontSize:31,letterSpacing:-1.5,color:c.ink},
  actions:{flexDirection:'row',alignItems:'center',gap:8},
  city:{flexDirection:'row',alignItems:'center',gap:5,maxWidth:190},
  cityText:{fontFamily:f.bold,fontSize:18,letterSpacing:-.5,color:c.ink},
  iconButton:{width:40,height:40,borderRadius:20,alignItems:'center',justifyContent:'center',backgroundColor:c.white,borderWidth:1,borderColor:c.line}
});
