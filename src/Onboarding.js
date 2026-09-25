import React,{useEffect,useState} from 'react';
import {Alert,BackHandler,Image,KeyboardAvoidingView,Platform,Pressable,ScrollView,StyleSheet,TextInput,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {cities,interests} from './data';
import {colors as c,space as sp,fonts as f,radii as r} from './theme';
import {Button,Chip,Field,PageHeading,Typography} from './ui';

export const PROFILE_PROMPTS=[
  'Green flag u nowej znajomej?',
  'Mój comfort spot w mieście?',
  'Idealny spontaniczny plan na piątek?',
  'Hot take, którego będę bronić?',
  'Co ostatnio totalnie Cię wkręciło?',
  'Gdybyśmy miały wolną sobotę, to…',
];

const steps=[
  ['TWÓJ CEL','Czego szukasz?','Wybierz to, co ma Ci dawać Polka.'],
  ['LOKALNIE','Twoje miasto','Plany, dziewczyny i wydarzenia blisko Ciebie.'],
  ['TWÓJ KLIMAT','Co lubisz robić?','Wybierz kilka rzeczy albo pomiń.'],
  ['PRZEDSTAW SIĘ','Jak masz na imię?','Tylko tyle potrzebujemy na start.'],
  ['POZNAJMY SIĘ','Dodaj coś od siebie','Odpowiedz, jeśli chcesz. Ten krok możesz pominąć.'],
  ['TWOJE ZDJĘCIE','Pokaż siebie','Dodaj naturalne zdjęcie albo pomiń.'],
  ['BEZPIECZNIE','Gotowe prawie','Potwierdź pełnoletność i przejdź do aplikacji.'],
];

export default function Onboarding({onComplete,onBack,online=false}){
  const [step,setStep]=useState(0);
  const [goal,setGoal]=useState('Nowe znajomości');
  const [city,setCity]=useState('Warszawa');
  const [selected,setSelected]=useState([]);
  const [name,setName]=useState('');
  const [adult,setAdult]=useState(false);
  const [photo,setPhoto]=useState(null);
  const [answers,setAnswers]=useState({});
  const [busy,setBusy]=useState(false);

  const validAnswers=Object.entries(answers).filter(([,answer])=>String(answer).trim().length>=3);
  const ready=step===3?name.trim().length>=2:step===6?adult:true;
  const optionalEmpty=(step===2&&!selected.length)||(step===4&&!validAnswers.length)||(step===5&&!photo);

  const handlePhotoOption=async source=>{
    try{
      let result;
      if(source==='camera'){
        const perm=await ImagePicker.requestCameraPermissionsAsync();
        if(perm.status!=='granted'){
          Alert.alert('Brak uprawnień','Zezwól Polce na dostęp do aparatu w ustawieniach telefonu.');
          return;
        }
        result=await ImagePicker.launchCameraAsync({
          mediaTypes:['images'],
          allowsEditing:true,
          quality:0.85
        });
      }else{
        const perm=await ImagePicker.requestMediaLibraryPermissionsAsync();
        if(perm.status!=='granted'){
          Alert.alert('Brak uprawnień','Zezwól Polce na dostęp do galerii w ustawieniach telefonu.');
          return;
        }
        result=await ImagePicker.launchImageLibraryAsync({
          mediaTypes:['images'],
          allowsEditing:true,
          quality:0.85
        });
      }
      if(result.canceled)return;
      const chosen=result.assets?.[0];
      if(!chosen?.uri)throw Error('Nie udało się pobrać zdjęcia.');
      if(chosen.fileSize&&chosen.fileSize>8*1024*1024)throw Error('Zdjęcie jest za duże. Wybierz plik do 8 MB.');
      setPhoto(chosen.uri);
    }catch(error){Alert.alert('Nie udało się dodać zdjęcia',error.message||'Spróbuj ponownie.');}
  };

  const pickPhoto=()=>{
    Alert.alert(
      'Dodaj zdjęcie profilowe',
      'Wybierz źródło zdjęcia:',
      [
        {text:'Zrób zdjęcie (aparat)',onPress:()=>handlePhotoOption('camera')},
        {text:'Wybierz z galerii',onPress:()=>handlePhotoOption('library')},
        {text:'Anuluj',style:'cancel'}
      ]
    );
  };

  const next=async()=>{
    if(!ready||busy)return;
    if(step<steps.length-1){setStep(v=>v+1);return;}
    setBusy(true);
    try{
      await onComplete({
        goal,city,interests:selected,name:name.trim(),photo,
        answers:Object.fromEntries(validAnswers),
        adultConfirmed:true
      });
    }catch(error){Alert.alert('Nie zapisano profilu',error.message||'Spróbuj ponownie.');}
    finally{setBusy(false);}
  };

  const handleBack=()=>{
    if(step>0){
      setStep(v=>v-1);
    }else if(onBack){
      Alert.alert(
        'Wrócić do logowania?',
        'Twój profil nie został jeszcze zapisany.',
        [
          {text:'Zostań',style:'cancel'},
          {text:'Wróć do logowania',style:'destructive',onPress:onBack}
        ]
      );
    }
  };

  useEffect(()=>{
    const backAction=()=>{
      if(step>0){
        setStep(v=>v-1);
        return true;
      }
      if(onBack){
        Alert.alert(
          'Wrócić do logowania?',
          'Twój profil nie został jeszcze zapisany.',
          [
            {text:'Zostań',style:'cancel'},
            {text:'Wróć do logowania',style:'destructive',onPress:onBack}
          ]
        );
        return true;
      }
      return false;
    };
    const sub=BackHandler.addEventListener('hardwareBackPress',backAction);
    return ()=>sub.remove();
  },[step,onBack]);

  return <KeyboardAvoidingView style={s.root} behavior={Platform.OS==='ios'?'padding':'height'} keyboardVerticalOffset={Platform.OS==='ios'?8:0}>
    <View style={s.top}>
      <Pressable accessibilityRole="button" accessibilityLabel="Wstecz" onPress={handleBack} style={s.back} hitSlop={12}>
        <Ionicons name="arrow-back" size={24} color={c.ink}/>
      </Pressable>
      <View style={s.logoCenter} pointerEvents="none">
        <Typography style={s.logo}>Polka</Typography>
      </View>
      <View style={s.stepWrap}>
        <Typography variant="caption" style={{color:c.muted}}>{step+1}/{steps.length}</Typography>
      </View>
    </View>
    <View style={s.progress}><View style={[s.progressFill,{width:`${(step+1)/steps.length*100}%`}]}/></View>

    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
      <PageHeading kicker={steps[step][0]} title={steps[step][1]}/>
      <Typography style={s.description}>{steps[step][2]}</Typography>

      {step===0&&<View style={s.wrap}>{['Nowe znajomości','Wspólne wyjścia','Nowe miasto','Grupy i hobby'].map(value=><Chip key={value} label={value} selected={goal===value} onPress={()=>setGoal(value)}/>)}</View>}
      {step===1&&<View style={s.wrap}>{cities.map(value=><Chip key={value} label={value} selected={city===value} onPress={()=>setCity(value)}/>)}</View>}
      {step===2&&<View style={s.wrap}>{interests.map(value=><Chip key={value} label={value} selected={selected.includes(value)} onPress={()=>setSelected(prev=>prev.includes(value)?prev.filter(item=>item!==value):[...prev,value])}/>)}</View>}
      {step===3&&<Field label="Imię" value={name} onChangeText={setName} placeholder="Jak się do Ciebie zwracać?"/>}
      {step===4&&PROFILE_PROMPTS.map((prompt,index)=><View key={prompt} style={s.prompt}><Typography variant="subtitle" style={{marginBottom:sp.sm}}>{prompt}</Typography><TextInput multiline maxLength={160} value={answers[index]||''} onChangeText={value=>setAnswers(prev=>({...prev,[index]:value}))} placeholder="Twoja odpowiedź…" placeholderTextColor={c.muted} style={s.answer}/></View>)}
      {step===5&&<View style={s.photo}>
        <Pressable onPress={pickPhoto} style={{alignItems:'center'}}>
          {photo?<Image source={{uri:photo}} style={s.preview}/>:<View style={s.photoPlaceholder}><Ionicons name="camera-outline" size={38} color={c.pink}/></View>}
        </Pressable>
        <View style={s.photoActionsRow}>
          <Pressable onPress={()=>handlePhotoOption('camera')} style={s.photoOptionBtn}>
            <Ionicons name="camera" size={18} color={c.pink}/>
            <Typography style={s.photoOptionText}>Aparat</Typography>
          </Pressable>
          <Pressable onPress={()=>handlePhotoOption('library')} style={s.photoOptionBtn}>
            <Ionicons name="images" size={18} color={c.pink}/>
            <Typography style={s.photoOptionText}>Galeria</Typography>
          </Pressable>
        </View>
        {photo&&<Button title="Usuń zdjęcie" secondary onPress={()=>setPhoto(null)} style={{marginTop:sp.sm}}/>}
      </View>}
      {step===6&&<View><Typography style={{lineHeight:24}}>{online?'Polka jest przeznaczona dla osób pełnoletnich. Profil zostanie zapisany na Twoim koncie Polki.':'Polka jest przeznaczona dla osób pełnoletnich. Korzystasz teraz w trybie lokalnym.'}</Typography><Pressable accessibilityRole="checkbox" accessibilityState={{checked:adult}} onPress={()=>setAdult(v=>!v)} style={s.check}><Ionicons name={adult?'checkbox':'square-outline'} size={25} color={c.pink}/><Typography style={{flex:1}}>Mam ukończone 18 lat.</Typography></Pressable></View>}
    </ScrollView>

    <View style={s.footer}><Button title={busy?'Zapisywanie…':step===steps.length-1?'Wejdź do Polki':optionalEmpty?'Pomiń':'Dalej'} onPress={next} disabled={!ready||busy} icon="arrow-forward"/></View>
  </KeyboardAvoidingView>;
}

const s=StyleSheet.create({
  root:{flex:1,backgroundColor:c.canvas},
  top:{position:'relative',height:54,paddingHorizontal:sp.lg,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  back:{minWidth:44,height:44,justifyContent:'center',alignItems:'flex-start',zIndex:2},
  logoCenter:{position:'absolute',left:0,right:0,top:0,bottom:0,alignItems:'center',justifyContent:'center',zIndex:1},
  logo:{fontFamily:f.bold,fontSize:22,letterSpacing:-1,color:c.ink,textAlign:'center'},
  stepWrap:{minWidth:44,height:44,alignItems:'flex-end',justifyContent:'center',zIndex:2},
  progress:{height:3,backgroundColor:c.line},
  progressFill:{height:3,backgroundColor:c.pink},
  content:{flexGrow:1,padding:sp.lg,paddingTop:sp.xl,paddingBottom:sp.xxl},
  description:{color:c.muted,marginBottom:sp.xl,fontSize:17,lineHeight:24},
  wrap:{flexDirection:'row',flexWrap:'wrap'},
  photo:{backgroundColor:c.white,borderWidth:1,borderColor:c.line,borderRadius:r.lg,padding:sp.xl,alignItems:'center'},
  photoPlaceholder:{width:150,height:150,borderRadius:28,backgroundColor:c.blush,alignItems:'center',justifyContent:'center'},
  preview:{width:150,height:150,borderRadius:28,backgroundColor:c.blush},
  photoActionsRow:{flexDirection:'row',gap:12,marginTop:sp.lg,marginBottom:sp.xs},
  photoOptionBtn:{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:c.blush,paddingHorizontal:16,paddingVertical:10,borderRadius:r.md,borderWidth:1,borderColor:c.line},
  photoOptionText:{fontFamily:f.bold,fontSize:14,color:c.pink},
  photoText:{color:c.pink,fontFamily:f.bold,marginTop:sp.base},
  prompt:{backgroundColor:c.white,borderWidth:1,borderColor:c.line,borderRadius:r.md,padding:sp.base,marginBottom:sp.md},
  answer:{fontFamily:f.regular,fontSize:16,color:c.ink,minHeight:65,textAlignVertical:'top'},
  check:{flexDirection:'row',gap:12,alignItems:'center',marginTop:28,padding:12},
  footer:{padding:sp.lg,borderTopWidth:1,borderColor:c.line,backgroundColor:c.white}
});
