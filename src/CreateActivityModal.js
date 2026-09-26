import React,{useMemo,useState} from 'react';
import {Modal,Pressable,ScrollView,StyleSheet,TextInput,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {colors as c,fonts as f,space as sp} from './theme';
import {Button,Typography} from './ui';

const pad=n=>String(n).padStart(2,'0');
const isoDate=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const labelDate=d=>d.toLocaleDateString('pl-PL',{weekday:'short',day:'numeric',month:'short'});
const nextDays=Array.from({length:21},(_,i)=>{const d=new Date();d.setDate(d.getDate()+i);return d;});
const times=Array.from({length:29},(_,i)=>{const mins=8*60+i*30;return `${pad(Math.floor(mins/60))}:${pad(mins%60)}`;});

export default function CreateActivityModal({visible,onClose,initialType='plan',city='Warszawa',busy=false,onSubmit}){
  const [type,setType]=useState(initialType);
  const [title,setTitle]=useState('');
  const [place,setPlace]=useState('');
  const [date,setDate]=useState('');
  const [time,setTime]=useState('');
  const [description,setDescription]=useState('');
  const [capacity,setCapacity]=useState('6');
  const [dateOpen,setDateOpen]=useState(false);
  const [timeOpen,setTimeOpen]=useState(false);
  React.useEffect(()=>{if(visible)setType(initialType)},[visible,initialType]);
  const selectedDate=useMemo(()=>nextDays.find(d=>isoDate(d)===date),[date]);
  const submit=()=>onSubmit?.({type,title:title.trim(),place:place.trim(),date,time,description:description.trim(),capacity});
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={s.backdrop} onPress={onClose}>
      <Pressable style={s.sheet} onPress={e=>e.stopPropagation()}>
        <View style={s.handle}/>
        <View style={s.header}><View><Typography style={s.title}>Utwórz</Typography><Typography style={s.subtitle}>Plan albo konkretne spotkanie</Typography></View><Pressable onPress={onClose} style={s.icon}><Ionicons name="close" size={24} color={c.ink}/></Pressable></View>
        <View style={s.segment}>
          <Pressable onPress={()=>setType('plan')} style={[s.segmentBtn,type==='plan'&&s.segmentActive]}><Typography style={[s.segmentText,type==='plan'&&s.segmentTextActive]}>Plan</Typography></Pressable>
          <Pressable onPress={()=>setType('meeting')} style={[s.segmentBtn,type==='meeting'&&s.segmentActive]}><Typography style={[s.segmentText,type==='meeting'&&s.segmentTextActive]}>Spotkanie</Typography></Pressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Typography style={s.label}>Co chcesz zrobić?</Typography>
          <TextInput value={title} onChangeText={setTitle} maxLength={120} placeholder="Np. Matcha + spacer" placeholderTextColor={c.muted} style={s.input}/>
          <Typography style={s.label}>Lokalizacja</Typography>
          <View style={s.inputIcon}><Ionicons name="location-outline" size={19} color={c.pink}/><TextInput value={place} onChangeText={setPlace} maxLength={160} placeholder="Np. Hala Koszyki / Mokotów" placeholderTextColor={c.muted} style={s.flexInput}/></View>
          <Typography style={s.label}>{type==='meeting'?'Data i godzina':'Termin (opcjonalnie)'}</Typography>
          <View style={s.row}>
            <Pressable onPress={()=>setDateOpen(v=>!v)} style={[s.picker,s.flex]}><Ionicons name="calendar-outline" size={18} color={c.pink}/><Typography style={date?s.pickerValue:s.pickerPlaceholder}>{selectedDate?labelDate(selectedDate):'Wybierz datę'}</Typography></Pressable>
            <Pressable onPress={()=>setTimeOpen(v=>!v)} style={[s.picker,{width:132}]}><Ionicons name="time-outline" size={18} color={c.pink}/><Typography style={time?s.pickerValue:s.pickerPlaceholder}>{time||'Godzina'}</Typography></Pressable>
          </View>
          {dateOpen&&<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.choices}>{nextDays.map(d=>{const v=isoDate(d);return <Pressable key={v} onPress={()=>{setDate(v);setDateOpen(false)}} style={[s.choice,date===v&&s.choiceActive]}><Typography style={[s.choiceText,date===v&&s.choiceTextActive]}>{labelDate(d)}</Typography></Pressable>})}</ScrollView>}
          {timeOpen&&<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.choices}>{times.map(v=><Pressable key={v} onPress={()=>{setTime(v);setTimeOpen(false)}} style={[s.choice,time===v&&s.choiceActive]}><Typography style={[s.choiceText,time===v&&s.choiceTextActive]}>{v}</Typography></Pressable>)}</ScrollView>}
          {type==='meeting'&&<><Typography style={s.label}>Liczba miejsc</Typography><TextInput value={capacity} onChangeText={setCapacity} keyboardType="number-pad" maxLength={2} style={s.input}/></>}
          <Typography style={s.label}>Opis</Typography>
          <TextInput value={description} onChangeText={setDescription} multiline maxLength={1200} placeholder="Dodaj klimat i szczegóły" placeholderTextColor={c.muted} style={[s.input,s.description]}/>
          <View style={s.city}><Ionicons name="location" size={14} color={c.pink}/><Typography style={s.cityText}>{city}</Typography></View>
          <Button title={busy?'Tworzę…':type==='meeting'?'Utwórz spotkanie':'Utwórz plan'} disabled={busy} onPress={submit} style={{marginTop:sp.md}}/>
        </ScrollView>
      </Pressable>
    </Pressable>
  </Modal>;
}
const s=StyleSheet.create({
  backdrop:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(0,0,0,.28)'},sheet:{backgroundColor:c.white,borderTopLeftRadius:28,borderTopRightRadius:28,padding:sp.lg,paddingBottom:34,maxHeight:'92%'},handle:{width:42,height:5,borderRadius:3,backgroundColor:c.line,alignSelf:'center',marginBottom:14},header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},title:{fontFamily:f.bold,fontSize:26,color:c.ink},subtitle:{fontFamily:f.regular,fontSize:12,color:c.muted,marginTop:2},icon:{width:40,height:40,alignItems:'center',justifyContent:'center'},segment:{flexDirection:'row',backgroundColor:c.canvas,borderRadius:16,padding:4,marginTop:16,marginBottom:6},segmentBtn:{flex:1,minHeight:44,borderRadius:13,alignItems:'center',justifyContent:'center'},segmentActive:{backgroundColor:c.blush},segmentText:{fontFamily:f.bold,fontSize:14,color:c.muted},segmentTextActive:{color:c.pink},label:{fontFamily:f.semibold,fontSize:13,color:c.ink,marginTop:12,marginBottom:7},input:{minHeight:50,borderRadius:15,borderWidth:1,borderColor:c.line,paddingHorizontal:14,fontFamily:f.regular,fontSize:14,color:c.ink},inputIcon:{minHeight:50,borderRadius:15,borderWidth:1,borderColor:c.line,paddingHorizontal:13,flexDirection:'row',alignItems:'center',gap:8},flexInput:{flex:1,fontFamily:f.regular,fontSize:14,color:c.ink},row:{flexDirection:'row',gap:10},flex:{flex:1},picker:{height:50,borderRadius:15,borderWidth:1,borderColor:c.line,paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:7},pickerValue:{fontFamily:f.semibold,fontSize:13,color:c.ink},pickerPlaceholder:{fontFamily:f.regular,fontSize:13,color:c.muted},choices:{gap:8,paddingVertical:9},choice:{borderWidth:1,borderColor:c.line,borderRadius:999,paddingHorizontal:12,paddingVertical:9},choiceActive:{backgroundColor:c.pink,borderColor:c.pink},choiceText:{fontFamily:f.semibold,fontSize:12,color:c.ink},choiceTextActive:{color:c.white},description:{height:86,textAlignVertical:'top',paddingTop:13},city:{alignSelf:'flex-start',flexDirection:'row',alignItems:'center',gap:5,backgroundColor:c.blush,borderRadius:999,paddingHorizontal:10,paddingVertical:7,marginTop:12},cityText:{fontFamily:f.bold,fontSize:11,color:c.pink}
});