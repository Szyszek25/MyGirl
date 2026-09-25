import React,{useEffect,useState} from 'react';
import {Alert,KeyboardAvoidingView,Platform,Pressable,ScrollView,StyleSheet,TextInput,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {colors as c,fonts as f,space as sp} from './theme';
import {Typography} from './ui';
import {joinTemporaryRoom,loadTemporaryMessages,sendTemporaryMessage} from './services/tempChatApi';

export default function TemporaryChatScreen({room,userId,onClose,defaultAlias='Anonimowa uczestniczka'}){
  const [alias,setAlias]=useState(defaultAlias);
  const [joined,setJoined]=useState(false);
  const [draft,setDraft]=useState('');
  const [messages,setMessages]=useState([]);
  const [busy,setBusy]=useState(false);

  const refresh=async()=>{
    if(!room?.id||!joined)return;
    try{setMessages(await loadTemporaryMessages(room.id))}catch{}
  };

  useEffect(()=>{
    if(!joined)return;
    const timer=setInterval(()=>void refresh(),5000);
    return ()=>clearInterval(timer);
  },[joined,room?.id]);

  const enter=async()=>{
    if(!userId)return;
    try{
      await joinTemporaryRoom(room.id,userId,alias||defaultAlias);
      setJoined(true);
      const rows=await loadTemporaryMessages(room.id);
      setMessages(rows);
    }catch(error){Alert.alert('Nie udało się wejść do czatu',error.message||'Spróbuj ponownie.');}
  };

  const send=async()=>{
    if(!draft.trim()||busy)return;
    const body=draft.trim();
    setDraft('');setBusy(true);
    try{await sendTemporaryMessage(room.id,body);await refresh()}
    catch(error){setDraft(body);Alert.alert('Nie wysłano wiadomości',error.message||'Spróbuj ponownie.')}
    finally{setBusy(false)}
  };

  return <KeyboardAvoidingView style={s.root} behavior={Platform.OS==='ios'?'padding':'height'}>
    <View style={s.header}><Pressable onPress={onClose} style={s.icon}><Ionicons name="arrow-back" size={24} color={c.ink}/></Pressable><View style={{flex:1}}><Typography style={s.title}>{room?.title||'Czat tymczasowy'}</Typography><Typography style={s.meta}>znika automatycznie · tożsamość ukryta publicznie</Typography></View></View>
    {!joined?<View style={s.joinBox}>
      <View style={s.anonIcon}><Ionicons name="eye-off-outline" size={28} color={c.pink}/></View>
      <Typography style={s.joinTitle}>Wejdź jako anonimowa uczestniczka</Typography>
      <Typography style={s.joinCopy}>Inne osoby zobaczą tylko wybrany pseudonim. Polka nadal zachowuje powiązanie z kontem po stronie backendu na potrzeby bezpieczeństwa i zgłoszeń.</Typography>
      <TextInput value={alias} onChangeText={setAlias} maxLength={40} placeholder="Pseudonim" placeholderTextColor={c.muted} style={s.alias}/>
      <Pressable onPress={enter} style={s.joinButton}><Typography style={s.joinButtonText}>Wejdź do czatu</Typography></Pressable>
    </View>:<>
      <ScrollView style={s.messages} contentContainerStyle={s.messageContent}>
        <View style={s.expiry}><Ionicons name="timer-outline" size={15} color={c.pink}/><Typography style={s.expiryText}>Ten pokój jest tymczasowy i wygasa automatycznie.</Typography></View>
        {messages.map(message=><View key={message.id} style={message.mine?s.outWrap:s.inWrap}>
          {!message.mine&&<Typography style={s.author}>{message.alias}</Typography>}
          <View style={message.mine?s.outBubble:s.inBubble}><Typography style={message.mine?s.outText:s.inText}>{message.body}</Typography></View>
        </View>)}
      </ScrollView>
      <View style={s.composer}><TextInput value={draft} onChangeText={setDraft} multiline maxLength={1200} placeholder="Napisz anonimowo…" placeholderTextColor={c.muted} style={s.input}/><Pressable disabled={!draft.trim()||busy} onPress={send} style={[s.send,(!draft.trim()||busy)&&{opacity:.35}]}><Ionicons name="arrow-up" size={20} color={c.white}/></Pressable></View>
    </>}
  </KeyboardAvoidingView>;
}

const s=StyleSheet.create({
  root:{flex:1,backgroundColor:c.canvas},header:{minHeight:64,paddingHorizontal:12,backgroundColor:c.white,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:c.line,flexDirection:'row',alignItems:'center',gap:8},icon:{width:40,height:40,alignItems:'center',justifyContent:'center'},title:{fontFamily:f.bold,fontSize:15,color:c.ink},meta:{fontFamily:f.regular,fontSize:10,color:c.muted,marginTop:2},joinBox:{margin:sp.lg,padding:20,borderRadius:24,backgroundColor:c.white,borderWidth:1,borderColor:c.line},anonIcon:{width:54,height:54,borderRadius:18,backgroundColor:c.blush,alignItems:'center',justifyContent:'center'},joinTitle:{fontFamily:f.bold,fontSize:23,lineHeight:28,color:c.ink,marginTop:16},joinCopy:{fontFamily:f.regular,fontSize:13,lineHeight:20,color:c.muted,marginTop:8},alias:{height:50,borderRadius:15,borderWidth:1,borderColor:c.line,paddingHorizontal:14,fontFamily:f.regular,fontSize:14,color:c.ink,marginTop:18},joinButton:{height:50,borderRadius:15,backgroundColor:c.pink,alignItems:'center',justifyContent:'center',marginTop:10},joinButtonText:{fontFamily:f.bold,fontSize:14,color:c.white},messages:{flex:1},messageContent:{padding:sp.lg,paddingBottom:30},expiry:{alignSelf:'center',flexDirection:'row',gap:6,alignItems:'center',backgroundColor:c.blush,paddingHorizontal:10,paddingVertical:7,borderRadius:999,marginBottom:16},expiryText:{fontFamily:f.semibold,fontSize:10,color:c.pink},inWrap:{alignItems:'flex-start',marginBottom:10},outWrap:{alignItems:'flex-end',marginBottom:10},author:{fontFamily:f.bold,fontSize:10,color:c.muted,marginLeft:8,marginBottom:3},inBubble:{maxWidth:'80%',backgroundColor:c.white,borderWidth:1,borderColor:c.line,borderRadius:20,borderTopLeftRadius:6,paddingHorizontal:14,paddingVertical:10},outBubble:{maxWidth:'80%',backgroundColor:c.pink,borderRadius:20,borderTopRightRadius:6,paddingHorizontal:14,paddingVertical:10},inText:{fontFamily:f.regular,fontSize:14,lineHeight:20,color:c.ink},outText:{fontFamily:f.regular,fontSize:14,lineHeight:20,color:c.white},composer:{padding:10,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:c.line,backgroundColor:c.white,flexDirection:'row',alignItems:'flex-end',gap:8},input:{flex:1,minHeight:42,maxHeight:120,borderRadius:21,borderWidth:1,borderColor:c.line,backgroundColor:c.canvas,paddingHorizontal:14,paddingTop:10,paddingBottom:10,fontFamily:f.regular,fontSize:14,color:c.ink},send:{width:42,height:42,borderRadius:21,backgroundColor:c.pink,alignItems:'center',justifyContent:'center'}
});
