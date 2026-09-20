import React, { useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Image, PanResponder, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFonts, DMSans_400Regular, DMSans_600SemiBold, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';

const P = '#CE347B';
const BG = '#FFFBF9';
const INK = '#241C22';
const MUTED = '#80757A';
const LINE = '#F0E3E8';
const W = Dimensions.get('window').width;
const TABS = [['Odkrywaj', '♡'], ['Społeczność', '◎'], ['Grupy', '▦'], ['Czaty', '◌'], ['Profil', '♙']];
// Licensed image sources need confirmation before production use. All people, profiles, posts and chats below are fictional DEMO content.
const PEOPLE = [
  { id: 1, name: 'Maja', age: 22, city: 'Warszawa', area: 'Mokotów', bio: 'Chodźmy na kawę i odkryjmy nowe miejsca.', tags: ['Kawiarnie', 'Sztuka', 'Spacery'], prompt: 'Idealna sobota?', answer: 'Targ śniadaniowy, wystawa i długa rozmowa.', photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1080&auto=format&fit=crop&q=82', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80' },
  { id: 2, name: 'Ola', age: 21, city: 'Kraków', area: 'Kazimierz', bio: 'Szukam ekipy na długie spacery.', tags: ['Podróże', 'Kino', 'Książki'], prompt: 'Daj się namówić na…', answer: 'Weekendowy wypad bez wielkiego planu.', photo: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=1080&auto=format&fit=crop&q=82', avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=240&auto=format&fit=crop&q=80' },
  { id: 3, name: 'Natalia', age: 24, city: 'Gdańsk', area: 'Wrzeszcz', bio: 'Nad morze, na koncert czy na trening?', tags: ['Fitness', 'Muzyka', 'Morze'], prompt: 'Najlepszy sposób na reset?', answer: 'Zachód słońca i spacer nad wodą.', photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1080&auto=format&fit=crop&q=82', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=240&auto=format&fit=crop&q=80' },
  { id: 4, name: 'Julia', age: 23, city: 'Wrocław', area: 'Śródmieście', bio: 'Poznajmy miasto od nowa.', tags: ['Fotografia', 'Vintage', 'Kawa'], prompt: 'Zawsze znajdę czas na…', answer: 'Pchli targ i spontaniczne zdjęcia.', photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=1080&auto=format&fit=crop&q=82', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=240&auto=format&fit=crop&q=80' },
  { id: 5, name: 'Zosia', age: 22, city: 'Poznań', area: 'Jeżyce', bio: 'Szukam dziewczyn do wspólnych planów.', tags: ['Książki', 'Pilates', 'Brunch'], prompt: 'Moja mała obsesja?', answer: 'Wyszukiwanie najlepszych śniadań w mieście.', photo: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=1080&auto=format&fit=crop&q=82', avatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=240&auto=format&fit=crop&q=80' },
];
const INITIAL_POSTS = [
  { id: 1, by: 'Maja', personId: 1, city: 'Warszawa', time: '2 godz.', text: 'Kto ma ochotę na kawę w weekend?', likes: 12 },
  { id: 2, by: 'Ola', personId: 2, city: 'Kraków', time: 'Wczoraj', text: 'Szukam dziewczyn na wspólne spacery.', likes: 8 },
  { id: 3, by: 'Natalia', personId: 3, city: 'Gdańsk', time: 'Wczoraj', text: 'Idziemy razem na koncert?', likes: 18 },
];
const GROUPS = [
  { id: 1, title: 'Coffee girls', city: 'Warszawa', line: 'Kawa i rozmowy', icon: '☕' },
  { id: 2, title: 'Girls club', city: 'Kraków', line: 'Twoja ekipa w mieście', icon: '✿' },
  { id: 3, title: 'Book club', city: 'Gdańsk', line: 'Czytamy razem', icon: '📖' },
  { id: 4, title: 'Weekend trips', city: 'Wrocław', line: 'Małe podróże', icon: '↗' },
];
const CHATS = [{ id: 1, name: 'Maja', photo: PEOPLE[0].avatar, message: 'Hej! Masz czas na kawę?' }, { id: 2, name: 'Ola', photo: PEOPLE[1].avatar, message: 'To może sobota?' }];
const FONT = { regular: 'DMSans_400Regular', medium: 'DMSans_600SemiBold', bold: 'DMSans_700Bold', display: 'PlayfairDisplay_700Bold' };
const Title = ({ children, style }) => <Text style={[{ fontFamily: FONT.display, fontSize: 39, color: INK, letterSpacing: -1.1 }, style]}>{children}</Text>;
const Copy = ({ children, style, strong = false }) => <Text style={[{ fontFamily: strong ? FONT.bold : FONT.regular, color: INK }, style]}>{children}</Text>;
const Avatar = ({ photo, size = 48 }) => photo ? <Image source={{ uri: photo }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#F4DCE8' }} /> : <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#F5D9E5', alignItems: 'center', justifyContent: 'center' }}><Copy style={{ color: P, fontSize: 24 }}>✿</Copy></View>;
const PinkButton = ({ children, onPress, subtle = false }) => <TouchableOpacity onPress={onPress} style={[s.button, subtle && s.buttonSubtle]}><Copy strong style={{ color: subtle ? P : '#fff', fontSize: 14 }}>{children}</Copy></TouchableOpacity>;
const Section = ({ eyebrow, title }) => <View style={{ marginBottom: 16 }}><Copy strong style={s.eyebrow}>{eyebrow}</Copy><Title>{title}</Title></View>;

export default function App() {
  const [ready] = useFonts({ DMSans_400Regular, DMSans_600SemiBold, DMSans_700Bold, PlayfairDisplay_700Bold });
  const [tab, setTab] = useState('Odkrywaj');
  const [city, setCity] = useState('Wszystkie');
  const [index, setIndex] = useState(0);
  const [liked, setLiked] = useState([]);
  const [joined, setJoined] = useState([]);
  const [posts, setPosts] = useState(INITIAL_POSTS);
  const [postLikes, setPostLikes] = useState([]);
  const [postDraft, setPostDraft] = useState('');
  const [activeChat, setActiveChat] = useState(null);
  const [chatDraft, setChatDraft] = useState('');
  const [sent, setSent] = useState([]);
  const [message, setMessage] = useState('');
  const xy = useRef(new Animated.ValueXY()).current;
  const filtered = useMemo(() => PEOPLE.filter(person => city === 'Wszystkie' || person.city === city), [city]);
  const person = filtered.length ? filtered[index % filtered.length] : null;
  const move = direction => {
    if (!person) return;
    Animated.timing(xy, { toValue: { x: direction * W, y: 12 }, duration: 180, useNativeDriver: true }).start(() => {
      if (direction > 0) setLiked(old => old.includes(person.id) ? old : [...old, person.id]);
      setIndex(old => old + 1);
      xy.setValue({ x: 0, y: 0 });
    });
  };
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 18 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderMove: Animated.event([null, { dx: xy.x, dy: xy.y }], { useNativeDriver: false }),
    onPanResponderRelease: (_, g) => Math.abs(g.dx) > 100 ? move(g.dx > 0 ? 1 : -1) : Animated.spring(xy, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start(),
  }), [person]);
  if (!ready) return <View style={{ flex: 1, backgroundColor: BG }} />;
  const alert = message ? <TouchableOpacity onPress={() => setMessage('')} style={s.alert}><Copy style={{ color: P }}>{message} ×</Copy></TouchableOpacity> : null;
  return <SafeAreaView style={s.root}><StatusBar barStyle="dark-content" backgroundColor={BG}/>
    {tab === 'Odkrywaj' && <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
      <Section eyebrow="MYGIRL  /  POLSKA" title="Poznaj się." />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.cities}>{['Wszystkie', 'Warszawa', 'Kraków', 'Gdańsk', 'Wrocław', 'Poznań'].map(c => <TouchableOpacity key={c} onPress={() => { setCity(c); setIndex(0); xy.setValue({ x: 0, y: 0 }); }} style={[s.chip, city === c && s.chipOn]}><Copy strong style={{ fontSize: 12, color: city === c ? '#fff' : INK }}>{c}</Copy></TouchableOpacity>)}</ScrollView>
      {person ? <><Animated.View {...pan.panHandlers} style={[s.card, { transform: [{ translateX: xy.x }, { translateY: xy.y }, { rotate: xy.x.interpolate({ inputRange: [-W, 0, W], outputRange: ['-10deg', '0deg', '10deg'] }) }] }]}>
        <Image source={{ uri: person.photo }} style={s.hero} resizeMode="cover" />
        <View style={s.demo}><Copy strong style={{ color: P, fontSize: 10, letterSpacing: 1 }}>DEMO</Copy></View>
      </Animated.View>
      <View style={s.profileHeader}><View style={{ flex: 1 }}><Title style={{ fontSize: 35 }}>{person.name}, {person.age}</Title><Copy style={s.muted}>⌖ {person.area}, {person.city}</Copy></View><TouchableOpacity style={s.heart} onPress={() => move(1)}><Copy style={{ color: '#fff', fontSize: 27 }}>♡</Copy></TouchableOpacity></View>
      <Copy style={s.bio}>{person.bio}</Copy>
      <View style={s.tags}>{person.tags.map(t => <View key={t} style={s.tag}><Copy style={{ color: P, fontSize: 13 }}>{t}</Copy></View>)}</View>
      <View style={s.prompt}><Copy strong style={s.eyebrow}>POZNAJ MNIE</Copy><Title style={{ fontSize: 27, marginTop: 8 }}>{person.prompt}</Title><Copy style={{ fontSize: 17, lineHeight: 26, marginTop: 12 }}>{person.answer}</Copy></View>
      <View style={s.actions}><PinkButton subtle onPress={() => move(-1)}>Pomiń ×</PinkButton><PinkButton onPress={() => move(1)}>Poznaj ♡</PinkButton></View>
      </> : <Copy>Brak profili w wybranym mieście.</Copy>}{alert}
      <Copy style={s.footnote}>Profile i fotografie poglądowe · demonstracja</Copy>
    </ScrollView>}
    {tab === 'Społeczność' && <ScrollView contentContainerStyle={s.page}>
      <Section eyebrow="MYGIRL  /  RAZEM" title="Społeczność." />
      <View style={s.compose}><TextInput value={postDraft} onChangeText={setPostDraft} placeholder="Co u Ciebie?" placeholderTextColor={MUTED} style={s.input} multiline /><PinkButton onPress={() => { if (!postDraft.trim()) return; setPosts(old => [{ id: Date.now(), by: 'Ty', city: 'Polska', time: 'Teraz', text: postDraft.trim(), likes: 0 }, ...old]); setPostDraft(''); }}>Dodaj ↗</PinkButton></View>
      {posts.map(post => <View key={post.id} style={s.post}><View style={s.author}><Avatar photo={PEOPLE.find(p => p.id === post.personId)?.avatar}/><View style={{ flex: 1 }}><Copy strong style={{ fontSize: 17 }}>{post.by}</Copy><Copy style={s.muted}>{post.city} · {post.time}</Copy></View><Copy style={s.muted}>•••</Copy></View><Copy style={{ fontSize: 20, lineHeight: 29, marginVertical: 19 }}>{post.text}</Copy><TouchableOpacity onPress={() => setPostLikes(old => old.includes(post.id) ? old.filter(id => id !== post.id) : [...old, post.id])}><Copy strong style={{ color: P }}>♡ {post.likes + (postLikes.includes(post.id) ? 1 : 0)}</Copy></TouchableOpacity></View>)}{alert}
    </ScrollView>}
    {tab === 'Grupy' && <ScrollView contentContainerStyle={s.page}>
      <Section eyebrow="MYGIRL  /  TWOJE MIEJSCE" title="Grupy." />
      {GROUPS.map(g => <View key={g.id} style={s.group}><View style={s.groupIcon}><Copy style={{ fontSize: 29, color: P }}>{g.icon}</Copy></View><View style={{ flex: 1 }}><Copy strong style={{ fontSize: 19 }}>{g.title}</Copy><Copy style={s.muted}>{g.city} · {g.line}</Copy></View><TouchableOpacity style={s.join} onPress={() => setJoined(old => old.includes(g.id) ? old.filter(id => id !== g.id) : [...old, g.id])}><Copy strong style={{ color: P, fontSize: 23 }}>{joined.includes(g.id) ? '✓' : '+'}</Copy></TouchableOpacity></View>)}{alert}
    </ScrollView>}
    {tab === 'Czaty' && <View style={[s.page, { flex: 1 }]}><Section eyebrow="MYGIRL  /  WIADOMOŚCI" title={activeChat ? activeChat.name : 'Czaty.'} />{activeChat ? <><TouchableOpacity onPress={() => setActiveChat(null)}><Copy strong style={{ color: P }}>← Wróć do rozmów</Copy></TouchableOpacity><ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 22 }}><View style={s.bubble}><Copy>{activeChat.message}</Copy></View>{sent.filter(m => m.id === activeChat.id).map((m, i) => <View key={i} style={[s.bubble, s.sent]}><Copy style={{ color: '#fff' }}>{m.text}</Copy></View>)}</ScrollView><View style={s.compose}><TextInput value={chatDraft} onChangeText={setChatDraft} placeholder="Wiadomość" style={[s.input, { flex: 1 }]} /><PinkButton onPress={() => { if (chatDraft.trim()) setSent(old => [...old, { id: activeChat.id, text: chatDraft.trim() }]); setChatDraft(''); }}>↗</PinkButton></View></> : CHATS.map(c => <TouchableOpacity key={c.id} style={s.group} onPress={() => setActiveChat(c)}><Avatar photo={c.photo} size={60}/><View style={{ flex: 1 }}><Copy strong style={{ fontSize: 18 }}>{c.name}</Copy><Copy style={s.muted}>{c.message}</Copy></View><Copy style={{ color: P }}>›</Copy></TouchableOpacity>)}<Copy style={s.footnote}>Rozmowy demonstracyjne · bez wysyłki</Copy></View>}
    {tab === 'Profil' && <ScrollView contentContainerStyle={s.page}><Section eyebrow="MYGIRL  /  JA" title="Twój profil."/><View style={s.profileBox}><Avatar size={100}/><Title style={{ marginTop: 16 }}>Twoja historia.</Title><Copy style={s.muted}>Zacznij od poznawania ludzi.</Copy><View style={s.stats}><View><Title style={{ fontSize: 31 }}>{liked.length}</Title><Copy style={s.muted}>Polubienia</Copy></View><View><Title style={{ fontSize: 31 }}>{joined.length}</Title><Copy style={s.muted}>Grupy</Copy></View></View></View><PinkButton subtle onPress={() => setMessage('Edycja profilu będzie dostępna po dodaniu kont.')}>Edytuj profil ↗</PinkButton>{alert}<Copy style={s.footnote}>Prototyp bez kont i prawdziwych użytkowniczek.</Copy></ScrollView>}
    <View style={s.nav}>{TABS.map(([label, icon]) => <TouchableOpacity key={label} accessibilityRole="tab" accessibilityState={{ selected: tab === label }} style={s.navItem} onPress={() => { setTab(label); setMessage(''); }}><Copy style={{ fontSize: 25, color: tab === label ? P : MUTED }}>{icon}</Copy><Copy strong style={{ color: tab === label ? P : MUTED, fontSize: 9 }}>{label}</Copy></TouchableOpacity>)}</View>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG }, page: { padding: 22, paddingTop: 24, paddingBottom: 38 }, eyebrow: { fontSize: 10, color: P, letterSpacing: 2 }, cities: { gap: 8, paddingVertical: 6, marginBottom: 16 }, chip: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', borderRadius: 22, borderWidth: 1, borderColor: LINE }, chipOn: { backgroundColor: P, borderColor: P },
  card: { height: Math.min(W * 1.12, 470), borderRadius: 20, overflow: 'hidden', backgroundColor: '#F2DCE6' }, hero: { width: '100%', height: '100%' }, demo: { position: 'absolute', left: 15, top: 15, backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 7 }, profileHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 22 }, heart: { width: 52, height: 52, borderRadius: 26, backgroundColor: P, alignItems: 'center', justifyContent: 'center' }, muted: { color: MUTED, fontSize: 13, marginTop: 4 }, bio: { fontSize: 18, lineHeight: 27, marginTop: 19 }, tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 19 }, tag: { backgroundColor: '#FBE8F0', paddingHorizontal: 13, paddingVertical: 9, borderRadius: 20 }, prompt: { backgroundColor: '#fff', borderRadius: 22, borderWidth: 1, borderColor: LINE, padding: 23, marginVertical: 8 }, actions: { flexDirection: 'row', gap: 12, marginTop: 20 }, button: { backgroundColor: P, borderRadius: 19, paddingVertical: 15, paddingHorizontal: 22, justifyContent: 'center', alignItems: 'center', flex: 1 }, buttonSubtle: { backgroundColor: '#FBE8F0' }, footnote: { color: MUTED, fontSize: 11, marginTop: 22, textAlign: 'center' }, alert: { padding: 12, backgroundColor: '#FBE8F0', borderRadius: 12, marginTop: 16 },
  compose: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 }, input: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: LINE, padding: 15, fontFamily: FONT.regular, color: INK, minHeight: 53, flex: 2 }, post: { backgroundColor: '#fff', borderWidth: 1, borderColor: LINE, borderRadius: 22, padding: 19, marginBottom: 13 }, author: { flexDirection: 'row', alignItems: 'center', gap: 12 }, group: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 19, borderBottomWidth: 1, borderBottomColor: LINE }, groupIcon: { width: 56, height: 56, backgroundColor: '#FBE8F0', borderRadius: 16, justifyContent: 'center', alignItems: 'center' }, join: { width: 43, height: 43, borderRadius: 22, backgroundColor: '#FBE8F0', alignItems: 'center', justifyContent: 'center' }, bubble: { alignSelf: 'flex-start', backgroundColor: '#F7EAF0', borderRadius: 18, padding: 15, marginBottom: 10, maxWidth: '83%' }, sent: { alignSelf: 'flex-end', backgroundColor: P }, profileBox: { backgroundColor: '#fff', borderRadius: 22, borderWidth: 1, borderColor: LINE, padding: 25, alignItems: 'center', marginBottom: 17 }, stats: { flexDirection: 'row', gap: 50, marginTop: 29 }, nav: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: LINE, backgroundColor: '#fff', paddingTop: 9, paddingBottom: 14 }, navItem: { flex: 1, alignItems: 'center', gap: 2 },
});