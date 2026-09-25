import React, { useState } from 'react';
import { Alert, ImageBackground, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { colors as c, fonts as f, radii as r, space as sp } from './theme';
import { Typography } from './ui';
import { resendVerificationOtp, signInApple, signInEmail, signInGoogle, signUpEmail, verifyEmailOtp } from './services/authApi';

const HERO = 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1400&q=88';
const HERO_VIDEO = 'https://v1.pinimg.com/videos/iht/720p/16/45/f9/1645f970dcf565517796a967ba767b42.mp4';

export default function WelcomeScreen({ onContinue, onBusiness }) {
  const [emailMode, setEmailMode] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState('signin');
  const [busy, setBusy] = useState(false);
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && password.length >= 8;

  const emailAuth = async () => {
    if (!valid || busy) return;
    setBusy(true);
    try {
      if (authMode === 'signup') {
        const data = await signUpEmail(email, password);
        if (!data.session) {
          setOtpStep(true);
        }
      } else {
        await signInEmail(email, password);
      }
    } catch (error) { Alert.alert('Nie udało się zalogować', error.message || 'Spróbuj ponownie.'); }
    finally { setBusy(false); }
  };

  const handleVerifyOtp = async () => {
    const clean = otpCode.trim();
    if (clean.length < 6 || busy) return;
    setBusy(true);
    try {
      await verifyEmailOtp(email, clean, 'signup');
    } catch (error) {
      Alert.alert('Błędny kod', error.message || 'Sprawdź wpisany kod i spróbuj ponownie.');
    } finally {
      setBusy(false);
    }
  };

  const handleResendOtp = async () => {
    if (!email.trim() || busy) return;
    setBusy(true);
    try {
      await resendVerificationOtp(email, 'signup');
      Alert.alert('Wysłano kod', 'Wysłaliśmy nowy 6-cyfrowy kod na Twój e-mail.');
    } catch (error) {
      Alert.alert('Błąd wysyłania', error.message || 'Nie udało się wysłać nowego kodu.');
    } finally {
      setBusy(false);
    }
  };

  const googleAuth = async () => {
    if (busy) return;
    setBusy(true);
    try { await signInGoogle(); }
    catch (error) { Alert.alert('Logowanie Google', error.message || 'Nie udało się rozpocząć logowania.'); }
    finally { setBusy(false); }
  };

  const appleAuth = async () => {
    if (busy) return;
    setBusy(true);
    try { await signInApple(); }
    catch (error) { Alert.alert('Logowanie Apple', error.message || 'Nie udało się rozpocząć logowania.'); }
    finally { setBusy(false); }
  };
  const player = useVideoPlayer(HERO_VIDEO, p => {
    p.loop = true;
    p.muted = true;
    p.play();
  });


  return <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={s.scrollContent}
      bounces={false}
      showsVerticalScrollIndicator={false}
    >
      <View style={[s.hero, (emailMode || otpStep) && s.heroCompact]}>
        <ImageBackground source={{ uri: HERO }} style={StyleSheet.absoluteFill} imageStyle={s.image} />
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
          <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />
        )}
        <View style={s.overlay} />
        <View style={s.brand}><Typography style={s.logo}>Polka</Typography></View>
        <View style={s.copy}>
          <Typography style={s.title}>Twoje miasto.{"\n"}Twoje dziewczyny.{"\n"}Twoje plany.</Typography>
          <Typography style={s.subtitle}>Kawa, koncert, spacer, pilates albo spontaniczny weekend. Zobacz kto też chce iść.</Typography>
        </View>
      </View>

      <View style={s.sheet}>
        {otpStep ? (
          <View>
            <Typography variant="subtitle" style={{ marginBottom: 4 }}>Wpisz kod weryfikacyjny</Typography>
            <Typography variant="caption" style={{ color: c.muted, marginBottom: sp.base }}>
              Wysłaliśmy 6-cyfrowy kod na adres {email || 'Twój e-mail'}. Wpisz go poniżej, aby aktywować konto:
            </Typography>
            <TextInput
              value={otpCode}
              onChangeText={v => setOtpCode(v.replace(/[^0-9]/g, '').slice(0, 6))}
              keyboardType="number-pad"
              placeholder="000000"
              placeholderTextColor={c.muted}
              style={[s.input, s.otpInput]}
              autoFocus
              maxLength={6}
            />
            <Pressable
              disabled={otpCode.trim().length < 6 || busy}
              onPress={handleVerifyOtp}
              style={[s.primary, (otpCode.trim().length < 6 || busy) && { opacity: .4 }]}
            >
              <Typography style={s.primaryText}>{busy ? 'Sprawdzanie…' : 'Zatwierdź kod'}</Typography>
            </Pressable>
            <Pressable disabled={busy} onPress={handleResendOtp} style={s.textButton}>
              <Typography style={s.textButtonText}>Wyślij kod ponownie</Typography>
            </Pressable>
            <Pressable onPress={() => setOtpStep(false)} style={s.textButton}>
              <Typography style={s.textButtonText}>Wróć / Zmień e-mail</Typography>
            </Pressable>
          </View>
        ) : emailMode ? (
          <View>
            <Typography variant="subtitle" style={{ marginBottom: sp.sm }}>{authMode === 'signup' ? 'Załóż konto' : 'Zaloguj się e-mailem'}</Typography>
            <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="twoj@email.pl" placeholderTextColor={c.muted} style={s.input} />
            <TextInput value={password} onChangeText={setPassword} autoCapitalize="none" secureTextEntry autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} placeholder="Hasło · min. 8 znaków" placeholderTextColor={c.muted} style={[s.input, { marginTop: 10 }]} />
            <Pressable disabled={!valid || busy} onPress={emailAuth} style={[s.primary, (!valid || busy) && { opacity: .4 }]}><Typography style={s.primaryText}>{busy ? 'Chwila…' : authMode === 'signup' ? 'Załóż konto' : 'Zaloguj się'}</Typography></Pressable>
            <Pressable onPress={() => setAuthMode(v => v === 'signin' ? 'signup' : 'signin')} style={s.textButton}><Typography style={s.textButtonText}>{authMode === 'signin' ? 'Nie masz konta? Załóż' : 'Masz konto? Zaloguj się'}</Typography></Pressable>
            <Pressable onPress={() => { if (!email.trim()) { Alert.alert('Wpisz e-mail', 'Podaj najpierw swój e-mail, aby wpisać otrzymany kod.'); return; } setOtpStep(true); }} style={s.textButton}>
              <Typography style={[s.textButtonText, { fontSize: 13, color: c.pink }]}>Masz już 6-cyfrowy kod? Wpisz go</Typography>
            </Pressable>
            <Pressable onPress={() => setEmailMode(false)} style={s.textButton}><Typography style={s.textButtonText}>Wróć</Typography></Pressable>
          </View>
        ) : <>
          <Pressable disabled={busy} onPress={googleAuth} style={[s.google, busy && { opacity: .5 }]}><Ionicons name="logo-google" size={20} color={c.ink} /><Typography style={s.googleText}>Kontynuuj z Google</Typography></Pressable>
          <Pressable disabled={busy} onPress={appleAuth} style={[s.apple, busy && { opacity: .5 }]}><Ionicons name="logo-apple" size={20} color={c.white} /><Typography style={s.appleText}>Kontynuuj z Apple</Typography></Pressable>
          <Pressable onPress={() => setEmailMode(true)} style={[s.primary, { marginBottom: 12 }]}><Ionicons name="mail-outline" size={20} color={c.white} /><Typography style={s.primaryText}>Zaloguj się e-mailem</Typography></Pressable>
          {/* <Pressable onPress={() => onContinue?.({ method: 'skip' })} style={s.textButton}><Typography style={s.textButtonText}>Pomiń na razie</Typography></Pressable> */}
          <View style={s.divider}><View style={s.line} /><Typography variant="caption" style={{ color: c.muted }}>albo</Typography><View style={s.line} /></View>
          <Pressable onPress={onBusiness} style={s.business}><Ionicons name="storefront-outline" size={19} color={c.ink} /><View style={{ flex: 1 }}><Typography style={s.businessTitle}>Dla firm i organizacji</Typography><Typography variant="caption" style={{ color: c.muted }}>Miejsce, oferta, wydarzenie lub partnerstwo</Typography></View><Ionicons name="chevron-forward" size={19} color={c.muted} /></Pressable>
        </>}
        <Typography variant="caption" style={s.legal}>Kontynuując, potwierdzasz regulamin Polka</Typography>
      </View>
    </ScrollView>
  </KeyboardAvoidingView>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.white },
  scrollContent: { flexGrow: 1 },
  heroCompact: { minHeight: 200, flex: 0 },
  hero: { flex: 1, minHeight: 390, justifyContent: 'space-between', padding: sp.lg, overflow: 'hidden', backgroundColor: '#201318' },
  image: { resizeMode: 'cover' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(24,11,18,.34)' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: sp.md },
  logo: { fontFamily: f.bold, fontWeight: "800", fontSize: 36, letterSpacing: -1.8, color: c.white },
  copy: { marginBottom: sp.xl },
  title: { fontFamily: f.bold, fontSize: 42, lineHeight: 42, letterSpacing: -1.8, color: c.white },
  subtitle: { fontFamily: f.regular, fontSize: 16, lineHeight: 22, color: '#FFF9', marginTop: 12, maxWidth: 350 },
  sheet: { backgroundColor: c.white, borderTopLeftRadius: 30, borderTopRightRadius: 30, marginTop: -28, padding: sp.lg, paddingTop: sp.xl, paddingBottom: Platform.OS === 'ios' ? 34 : sp.xl },
  google: { height: 54, borderRadius: r.md, borderWidth: 1, borderColor: c.line, backgroundColor: c.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  googleText: { fontFamily: f.bold, fontSize: 15 },
  apple: { height: 54, borderRadius: r.md, backgroundColor: '#111', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 10 },
  appleText: { fontFamily: f.bold, fontSize: 15, color: c.white },
  primary: { height: 54, borderRadius: r.md, backgroundColor: c.pink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 10 },
  primaryText: { fontFamily: f.bold, fontSize: 15, color: c.white },
  textButton: { height: 48, alignItems: 'center', justifyContent: 'center' },
  textButtonText: { fontFamily: f.semibold, color: c.ink },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 10 },
  line: { height: 1, backgroundColor: c.line, flex: 1 },
  business: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  businessTitle: { fontFamily: f.bold, fontSize: 14 },
  input: { height: 54, borderRadius: r.md, borderWidth: 1, borderColor: c.line, paddingHorizontal: sp.base, fontFamily: f.regular, fontSize: 16, color: c.ink },
  otpInput: { textAlign: 'center', fontSize: 24, letterSpacing: 8, fontFamily: f.bold, fontWeight: '700' },
  legal: { color: c.muted, textAlign: 'center', lineHeight: 17, marginTop: 8 }
});
