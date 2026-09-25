import React,{useState} from 'react';
import {Alert,ImageBackground,KeyboardAvoidingView,Platform,Pressable,StyleSheet,TextInput,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useVideoPlayer,VideoView} from 'expo-video';
import {colors as c,fonts as f,radii as r,space as sp} from './theme';
import {Typography} from './ui';
import {signInEmail,signInGoogle,signUpEmail} from './services/authApi';

const HERO='https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1400&q=88';
const HERO_VIDEO='https://v1.pinimg.com/videos/iht/720p/16/45/f9/1645f970dcf565517796a967ba767b42.mp4';

export default function WelcomeScreen({onContinue,onBusiness}){
  const [emailMode,setEmailMode]=useState(false);
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [authMode,setAuthMode]=useState('signin');
  const [busy,setBusy]=useState(false);
  const valid=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())&&password.length>=8;

  const emailAuth=async()=>{
    if(!valid||busy)return;
    setBusy(true);
    try{
      if(authMode==='signup'){
        const data=await signUpEmail(email,password);
        if(!data.session)Alert.alert('Sprawdź e-mail','Kliknij link potwierdzający konto Polki, a potem wróć do aplikacji.');
      }else{
        await signInEmail(email,password);
      }
    }catch(error){Alert.alert('Nie udało się zalogować',error.message||'Spróbuj ponownie.');}
    finally{setBusy(false);}
  };

  const googleAuth=async()=>{
    if(busy)return;
    setBusy(true);
    try{await signInGoogle();}
    catch(error){Alert.alert('Logowanie Google',error.message||'Nie udało się rozpocząć logowania.');}
    finally{setBusy(false);}
  };
  const player=useVideoPlayer(HERO_VIDEO,p=>{
    p.loop=true;
    p.muted=true;
    p.play();
  });


  return <KeyboardAvoidingView style={s.root} behavior={Platform.OS==='ios'?'padding':'height'}>
    <View style={s.hero}>
      <ImageBackground source={{uri:HERO}} style={StyleSheet.absoluteFill} imageStyle={s.image}/>
      {Platform.OS === 'web' ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <video
            src={HERO_VIDEO}
            autoPlay
            loop
            muted
            playsInline
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        </View>
      ) : (
        <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false}/>
      )}
      <View style={s.overlay}/>
      <View style={s.brand}><Typography style={s.logo}>Polka</Typography></View>
      <View style={s.copy}>
        <Typography style={s.title}>Twoje miasto.{"\n"}Twoje dziewczyny.{"\n"}Twoje plany.</Typography>
        <Typography style={s.subtitle}>Kawa, koncert, spacer, pilates albo spontaniczny weekend. Zobacz kto też chce iść.</Typography>
      </View>
    </View>

    <View style={s.sheet}>
      {emailMode?<View>
        <Typography variant="subtitle" style={{marginBottom:sp.sm}}>{authMode==='signup'?'Załóż konto':'Zaloguj się e-mailem'}</Typography>
        <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="twoj@email.pl" placeholderTextColor={c.muted} style={s.input}/>
        <TextInput value={password} onChangeText={setPassword} autoCapitalize="none" secureTextEntry autoComplete={authMode==='signup'?'new-password':'current-password'} placeholder="Hasło · min. 8 znaków" placeholderTextColor={c.muted} style={[s.input,{marginTop:10}]}/>
        <Pressable disabled={!valid||busy} onPress={emailAuth} style={[s.primary,(!valid||busy)&&{opacity:.4}]}><Typography style={s.primaryText}>{busy?'Chwila…':authMode==='signup'?'Załóż konto':'Zaloguj się'}</Typography></Pressable>
        <Pressable onPress={()=>setAuthMode(v=>v==='signin'?'signup':'signin')} style={s.textButton}><Typography style={s.textButtonText}>{authMode==='signin'?'Nie masz konta? Załóż':'Masz konto? Zaloguj się'}</Typography></Pressable>
        <Pressable onPress={()=>setEmailMode(false)} style={s.textButton}><Typography style={s.textButtonText}>Wróć</Typography></Pressable>
      </View>:<>
        <Pressable disabled={busy} onPress={googleAuth} style={[s.google,busy&&{opacity:.5}]}><Ionicons name="logo-google" size={20} color={c.ink}/><Typography style={s.googleText}>Kontynuuj z Google</Typography></Pressable>
        <Pressable onPress={()=>setEmailMode(true)} style={s.primary}><Ionicons name="mail-outline" size={20} color={c.white}/><Typography style={s.primaryText}>Zaloguj się e-mailem</Typography></Pressable>
        <Pressable onPress={()=>onContinue?.({method:'skip'})} style={s.textButton}><Typography style={s.textButtonText}>Pomiń na razie</Typography></Pressable>
        <View style={s.divider}><View style={s.line}/><Typography variant="caption" style={{color:c.muted}}>albo</Typography><View style={s.line}/></View>
        <Pressable onPress={onBusiness} style={s.business}><Ionicons name="storefront-outline" size={19} color={c.ink}/><View style={{flex:1}}><Typography style={s.businessTitle}>Dla firm i organizacji</Typography><Typography variant="caption" style={{color:c.muted}}>Miejsce, oferta, wydarzenie lub partnerstwo</Typography></View><Ionicons name="chevron-forward" size={19} color={c.muted}/></Pressable>
      </>}
      <Typography variant="caption" style={s.legal}>Kontynuując, potwierdzasz ukończenie 18 lat. Konto jest chronione przez Supabase Auth; dane profilu zapisujemy po ukończeniu onboardingu.</Typography>
    </View>
  </KeyboardAvoidingView>;
}

const s=StyleSheet.create({
  root:{flex:1,backgroundColor:c.white},
  hero:{flex:1,minHeight:390,justifyContent:'space-between',padding:sp.lg,overflow:'hidden',backgroundColor:'#201318'},
  image:{resizeMode:'cover'},
  overlay:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(24,11,18,.34)'},
  brand:{flexDirection:'row',alignItems:'center',gap:10,marginTop:sp.md},
  logo:{fontFamily:f.bold,fontWeight:"800",fontSize:36,letterSpacing:-1.8,color:c.white},
  copy:{marginBottom:sp.xl},
  title:{fontFamily:f.bold,fontSize:42,lineHeight:42,letterSpacing:-1.8,color:c.white},
  subtitle:{fontFamily:f.regular,fontSize:16,lineHeight:22,color:'#FFF9',marginTop:12,maxWidth:350},
  sheet:{backgroundColor:c.white,borderTopLeftRadius:30,borderTopRightRadius:30,marginTop:-28,padding:sp.lg,paddingTop:sp.xl},
  google:{height:54,borderRadius:r.md,borderWidth:1,borderColor:c.line,backgroundColor:c.white,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10},
  googleText:{fontFamily:f.bold,fontSize:15},
  primary:{height:54,borderRadius:r.md,backgroundColor:c.pink,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10,marginTop:10},
  primaryText:{fontFamily:f.bold,fontSize:15,color:c.white},
  textButton:{height:48,alignItems:'center',justifyContent:'center'},
  textButtonText:{fontFamily:f.semibold,color:c.ink},
  divider:{flexDirection:'row',alignItems:'center',gap:10,marginVertical:4},
  line:{height:1,backgroundColor:c.line,flex:1},
  business:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:12},
  businessTitle:{fontFamily:f.bold,fontSize:14},
  input:{height:54,borderRadius:r.md,borderWidth:1,borderColor:c.line,paddingHorizontal:sp.base,fontFamily:f.regular,fontSize:16,color:c.ink},
  legal:{color:c.muted,textAlign:'center',lineHeight:17,marginTop:8}
});
