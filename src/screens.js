
function formatPostTime(createdAt) {
  if (!createdAt) return 'przed chwilą';
  if (typeof createdAt === 'string' && (createdAt.includes('min') || createdAt.includes('godz') || createdAt.includes('wczoraj'))) {
    return createdAt;
  }
  const timestamp = typeof createdAt === 'number' ? createdAt : new Date(createdAt).getTime();
  if (isNaN(timestamp)) return String(createdAt);
  const diffMinutes = Math.max(1, Math.floor((Date.now() - timestamp) / 60000));
  if (diffMinutes < 5) return 'przed chwilą';
  if (diffMinutes < 60) return `${diffMinutes} min temu`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} godz. temu`;
  return `${Math.floor(diffHours / 24)} d. temu`;
}

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, FlatList, Image, KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioPlayer, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { colors as c, space as sp, radii as r, fonts as f } from './theme';
import { people, groups, cities } from './data';
import { Button, Chip, Field, PageHeading, Surface, Typography } from './ui';
import { supabase } from './lib/supabase';
import { createChatRealtime, newClientMessageId } from './services/chatRealtime';
import { addComment, createPost, createStory, deletePost, editPost, loadComments, loadFeed, loadStories, markStoryViewed, togglePostLike } from './services/socialApi';
import { acceptFriendRequest, loadFriendRequests, searchPeople, sendFriendRequest } from './services/friendsApi';
import { readCached, writeCached } from './cache';
import StoryCameraModal from './StoryCameraModal';
import StoryViewerModal from './StoryViewerModal';
import PublicProfileModal from './PublicProfileModal';
const W = Dimensions.get('window').width;
const avatar = (photo, size = 48) => <Image source={{ uri: photo || people[0]?.photo }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.blush }} />;
const authorId = post => post.authorId || people.find(p => p.name === post.author)?.id;
function Section({ title, children }) { return <Surface><Typography variant="subtitle" style={{ marginBottom: sp.sm }}>{title}</Typography>{children}</Surface> }
function TextAction({ icon, title, onPress, danger = false }) { return <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={s.textAction}><Ionicons name={icon} size={19} color={danger ? c.pink : c.muted} /><Typography style={{ color: danger ? c.pink : c.muted, fontFamily: f.semibold, fontSize: 13 }}>{title}</Typography></Pressable> }


export function DiscoverScreen({ city = 'Warszawa', blockedIds = [], onBlock, onReport, onMessage, sessionUserId = null, zodiacEnabled = true, userZodiac = null, styleEnabled = true, userStyle = null }) {
  const [index, setIndex] = useState(0), [saved, setSaved] = useState([]);
  const [remotePeople, setRemotePeople] = useState([]);
  const [peopleLoading, setPeopleLoading] = useState(!!sessionUserId);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [profileOpen, setProfileOpen] = useState(null);
  const [sentRequests, setSentRequests] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState({});
  const [matchedProfile, setMatchedProfile] = useState(null);
  const [dismissedIds, setDismissedIds] = useState([]);
  useEffect(() => {
    if (!sessionUserId) { setRemotePeople([]); setDismissedIds([]); setPeopleLoading(false); return; }
    let alive = true;
    setPeopleLoading(true);
    setRemotePeople([]);
    setIndex(0);
    (async () => {
      const [profilesResult, dismissalsResult, requests] = await Promise.all([
        supabase.from('profiles')
          .select('id,display_name,city,bio,avatar_path')
          .neq('id', sessionUserId)
          .eq('city', city)
          .eq('onboarding_complete', true)
          .limit(80),
        supabase.from('profile_dismissals')
          .select('dismissed_user_id')
          .eq('user_id', sessionUserId)
          .gt('expires_at', new Date().toISOString()),
        loadFriendRequests(sessionUserId)
      ]);
      if (profilesResult.error) throw profilesResult.error;
      if (dismissalsResult.error) throw dismissalsResult.error;
      const profiles = profilesResult.data || [];
      const activeDismissedIds = (dismissalsResult.data || []).map(row => row.dismissed_user_id);
      const incoming = {};
      const outgoing = [];
      (requests || []).forEach(req => {
        if (req.direction === 'incoming') incoming[req.otherId] = req;
        else if (req.direction === 'outgoing') outgoing.push(req.otherId);
      });
      if (alive) {
        setIncomingRequests(incoming);
        setSentRequests(outgoing);
      }
      const ids = (profiles || []).map(item => item.id);
      let interests = [], profilePhotos = [];
      if (ids.length) {
        const [interestResult,photoResult] = await Promise.all([
          supabase.from('profile_interests').select('profile_id,interest').in('profile_id', ids),
          supabase.from('profile_photos').select('user_id,storage_path,source_url,position').in('user_id', ids).order('position',{ascending:true})
        ]);
        if (interestResult.error) throw interestResult.error;
        if (photoResult.error) throw photoResult.error;
        interests = interestResult.data || [];
        profilePhotos = photoResult.data || [];
      }
      const rows = await Promise.all((profiles || []).map(async profile => {
        let photo = null;
        if (profile.avatar_path) {
          const signed = await supabase.storage.from('polka-avatars').createSignedUrl(profile.avatar_path, 3600);
          photo = signed.data?.signedUrl || null;
        }
        const galleryPhotos=(await Promise.all(profilePhotos.filter(row=>row.user_id===profile.id).map(async row=>{
          if(row.source_url)return row.source_url;
          const signed=await supabase.storage.from('polka-profile-photos').createSignedUrl(row.storage_path,3600);
          return signed.data?.signedUrl||null;
        }))).filter(Boolean);
        return {
          id: profile.id,
          name: profile.display_name || 'Polka',
          age: null,
          city: profile.city,
          photo: photo || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=900&q=85',
          bio: profile.bio || 'Hej! Jestem w Polce i chętnie poznam nowe osoby.',
          tags: interests.filter(row => row.profile_id === profile.id).map(row => row.interest),
          galleryPhotos,
          prompt: 'Napisz do mnie',
          answer: 'Najłatwiej zacząć od prostego hej 👋',
          remote: true
        };
      }));
      if (alive) { setRemotePeople(rows); setDismissedIds(activeDismissedIds); setIndex(0); setPeopleLoading(false); }
    })().catch(() => { if (alive) { setRemotePeople([]); setPeopleLoading(false); } });
    return () => { alive = false };
  }, [sessionUserId, city]);

  const zodiacSigns = ['Baran', 'Byk', 'Bliźnięta', 'Rak', 'Lew', 'Panna', 'Waga', 'Skorpion', 'Strzelec', 'Koziorożec', 'Wodnik', 'Ryby'];
  const zodiacForPerson = p => p?.zodiac || zodiacSigns[Math.abs(String(p?.id || p?.name || 'Polka').split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0)) % zodiacSigns.length];
  const styleForPerson = p => {
    if (p?.style) return p.style;
    const tags = p?.tags || [];
    if (tags.includes('Moda')) return 'Vintage';
    if (tags.includes('Sport') || tags.includes('Pilates')) return 'Sporty';
    if (tags.includes('Sztuka') || tags.includes('Fotografia')) return 'Artsy';
    if (tags.includes('Muzyka') || tags.includes('Koncerty')) return 'Streetwear';
    if (tags.includes('Książki')) return 'Minimal';
    if (tags.includes('Jedzenie') || tags.includes('Kawa') || tags.includes('Matcha')) return 'Casual';
    return 'Classy';
  };
  const styleMatchFor = p => {
    const theirs = styleForPerson(p);
    const mine = userStyle;
    if (!mine) return null;
    if (mine === theirs) return { theirs, label: 'podobny styl', copy: 'Macie bardzo zbliżoną estetykę — łatwo złapać wspólny vibe.' };
    const complementary = new Set(['Minimal|Vintage', 'Casual|Streetwear', 'Artsy|Vintage', 'Classy|Minimal', 'Sporty|Streetwear']);
    const key = [mine, theirs].sort().join('|');
    if (complementary.has(key)) return { theirs, label: 'dobrze się uzupełnia', copy: 'Różne estetyki, ale razem mogą wyglądać bardzo spójnie.' };
    return { theirs, label: 'inny klimat', copy: 'Macie różne podejście do stylu — może właśnie dlatego będzie ciekawie.' };
  };
  const pairKey = (a, b) => [a, b].sort().join('|');
  const strongPairs = new Set([
    pairKey('Wodnik', 'Ryby'), pairKey('Lew', 'Strzelec'), pairKey('Lew', 'Baran'), pairKey('Waga', 'Bliźnięta'),
    pairKey('Byk', 'Panna'), pairKey('Rak', 'Ryby'), pairKey('Skorpion', 'Ryby'), pairKey('Koziorożec', 'Byk'),
    pairKey('Wodnik', 'Bliźnięta'), pairKey('Waga', 'Wodnik')
  ]);
  const trickyPairs = new Set([
    pairKey('Waga', 'Skorpion'), pairKey('Lew', 'Byk'), pairKey('Rak', 'Wodnik'), pairKey('Panna', 'Strzelec'),
    pairKey('Baran', 'Rak'), pairKey('Bliźnięta', 'Koziorożec')
  ]);
  const astroMatchFor = p => {
    const theirs = zodiacForPerson(p);
    const key = pairKey(userZodiac, theirs);
    if (strongPairs.has(key)) return { theirs, label: 'dobry vibe', icon: 'sparkles', copy: 'Astro match sugeruje podobny rytm i łatwiejsze dogadanie.' };
    if (trickyPairs.has(key)) return { theirs, label: 'może iskrzyć', icon: 'flash', copy: 'Różne tempo i podejście — może być ciekawie, ale nie zawsze bez tarcia.' };
    return { theirs, label: 'neutralnie', icon: 'moon', copy: 'Ani wielki „match”, ani red flag — reszta zależy od Was, nie od znaków.' };
  };
  const sourcePeople = sessionUserId ? remotePeople : people;
  const availableTags = useMemo(() => Array.from(new Set(sourcePeople.filter(p => p.city === city).flatMap(p => p.tags || []))).sort(), [city, sourcePeople]);
  const filtered = sourcePeople.filter(p =>
    !blockedIds.includes(p.id) &&
    !dismissedIds.includes(p.id) &&
    !saved.includes(p.id) &&
    !sentRequests.includes(p.id) &&
    p.city === city &&
    (selectedTags.length === 0 || selectedTags.some(tag => (p.tags || []).includes(tag)))
  );
  const person = filtered.length ? filtered[index % filtered.length] : null;
  const xy = useRef(new Animated.ValueXY()).current;
  const vibeFor = p => {
    const tags = p?.tags || [];
    if (tags.includes('Podróże')) return 'podróżnicza';
    if (tags.includes('Sport')) return 'sportowa';
    if (tags.includes('Muzyka')) return 'imprezowa';
    if (tags.includes('Sztuka')) return 'kreatywna';
    if (tags.includes('Jedzenie')) return 'towarzyska';
    if (tags.includes('Książki')) return 'spokojna';
    return ['przedsiębiorcza', 'spontaniczna', 'ambitna', 'miejska'][Math.abs(String(p?.id || '').split('').reduce((a, ch) => a + ch.charCodeAt(0), 0)) % 4];
  };
  const dismissPerson = target => {
    if (!target) return;
    if (!sessionUserId || !target.remote) { setIndex(v => v + 1); return; }
    setDismissedIds(prev => prev.includes(target.id) ? prev : [...prev, target.id]);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    void supabase.from('profile_dismissals').upsert({
      user_id: sessionUserId,
      dismissed_user_id: target.id,
      created_at: new Date().toISOString(),
      expires_at: expiresAt
    }, { onConflict: 'user_id,dismissed_user_id' }).then(({ error }) => {
      if (error) setDismissedIds(prev => prev.filter(id => id !== target.id));
    });
  };
  const likePerson = async target => {
    if (!target) return;
    if (!sessionUserId || !target.remote) return;
    try {
      const incoming = incomingRequests[target.id];
      if (incoming?.id) {
        await acceptFriendRequest(incoming.id);
        setIncomingRequests(prev => {
          const next = { ...prev };
          delete next[target.id];
          return next;
        });
        setMatchedProfile(target);
        return;
      }
      const created = await sendFriendRequest(sessionUserId, target.id);
      if (created) setSentRequests(prev => prev.includes(target.id) ? prev : [...prev, target.id]);
    } catch (error) {
      Alert.alert('Nie zapisano polubienia', error.message || 'Spróbuj ponownie.');
    }
  };

  const decide = dir => {
    if (!person) return;
    const target = person;
    Animated.timing(xy, { toValue: { x: dir * W, y: 0 }, duration: 190, useNativeDriver: true }).start(() => {
      if (dir > 0) {
        setSaved(prev => prev.includes(target.id) ? prev : [...prev, target.id]);
        void likePerson(target);
        setIndex(0);
      } else {
        dismissPerson(target);
      }
      xy.setValue({ x: 0, y: 0 });
    });
  };
  const wantsHorizontalSwipe = g => Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy) * 1.05;
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, g) => wantsHorizontalSwipe(g),
    onMoveShouldSetPanResponderCapture: (_, g) => wantsHorizontalSwipe(g),
    onPanResponderGrant: () => xy.stopAnimation(),
    onPanResponderMove: Animated.event([null, { dx: xy.x, dy: xy.y }], { useNativeDriver: false }),
    onPanResponderTerminationRequest: () => false,
    onShouldBlockNativeResponder: () => true,
    onPanResponderRelease: (_, g) => Math.abs(g.dx) > 58 ? decide(g.dx > 0 ? 1 : -1) : Animated.spring(xy, { toValue: { x: 0, y: 0 }, friction: 7, useNativeDriver: true }).start(),
    onPanResponderTerminate: () => Animated.spring(xy, { toValue: { x: 0, y: 0 }, friction: 7, useNativeDriver: true }).start()
  }), [person?.id, incomingRequests, sessionUserId]);
  const runSearch = async value => {
    setSearchText(value);
    if (!sessionUserId || value.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try { setSearchResults(await searchPeople(value, sessionUserId, city)) }
    catch { setSearchResults([]) }
    finally { setSearching(false) }
  };
  const addFriend = async target => {
    if (!sessionUserId) return Alert.alert('Zaloguj się', 'Znajomi online wymagają konta.');
    try {
      await sendFriendRequest(sessionUserId, target.id);
      setSentRequests(prev => prev.includes(target.id) ? prev : [...prev, target.id]);
    } catch (error) { Alert.alert('Nie wysłano zaproszenia', error.message || 'Spróbuj ponownie.'); }
  };

  const confirmBlock = () => person && Alert.alert(`Zablokować ${person.name}?`, 'Profil zniknie z odkrywania.', [
    { text: 'Anuluj', style: 'cancel' }, { text: 'Zablokuj', style: 'destructive', onPress: () => onBlock(person.id) }
  ]);

  const stack = Array.from({length:Math.min(3,filtered.length)},(_,offset)=>filtered[(index+offset)%filtered.length]);
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[s.page, { paddingTop: 8, paddingBottom: 80 }]}>
    <View style={s.discoverControls}><View style={{ flex: 1 }}><Typography style={s.discoverHint}>Dziewczyny, które mogą pasować do Ciebie</Typography>{selectedTags.length > 0 && <Typography style={s.activeFilterHint}>{selectedTags.length} aktywne filtry</Typography>}</View><Pressable onPress={() => setSearchOpen(true)} style={s.filterButton} accessibilityLabel="Szukaj koleżanki"><Ionicons name="search-outline" size={22} color={c.ink} /></Pressable><Pressable onPress={() => setFiltersOpen(true)} style={s.filterButton} accessibilityLabel="Filtry"><Ionicons name="options-outline" size={22} color={selectedTags.length ? c.pink : c.ink} /></Pressable></View>
    {peopleLoading ? <View style={s.discoverLoading}><ActivityIndicator size="small" color={c.pink}/><Typography style={s.discoverLoadingText}>{`Szukam dziewczyn w ${city}…`}</Typography></View> : person ? <>
      <View style={s.stackWrap}>
        {stack.slice().reverse().map((p, revIndex) => {
          const realOffset = stack.length - 1 - revIndex;
          const isTop = realOffset === 0;
          const cardStyle = isTop ? [s.swipeCard, { transform: [{ translateX: xy.x }, { translateY: xy.y }, { rotate: xy.x.interpolate({ inputRange: [-W, 0, W], outputRange: ['-8deg', '0deg', '8deg'] }) }] }] : [
            s.swipeCard,
            s.stackCard,
            { transform: [{ translateY: realOffset * 11 }, { scale: 1 - realOffset * 0.035 }], opacity: 1 - realOffset * 0.12 }
          ];
          const Wrapper = isTop ? Animated.View : View;
          return <Wrapper key={p.id} {...(isTop ? pan.panHandlers : {})} style={cardStyle}>
            <Image source={{ uri: p.photo }} style={s.swipePhoto} resizeMode="cover" />
            <View style={s.cardScrim} />
            <View style={s.vibePill}><Typography style={s.vibeText}>{vibeFor(p)}</Typography></View>
            {isTop && <Pressable onPress={() => setProfileOpen(p)} style={s.cardTapHint} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Otwórz profil ${p.name}`}><Ionicons name="person-circle-outline" size={16} color={c.white}/><Typography style={s.cardTapHintText}>Profil</Typography></Pressable>}
            <Pressable onPress={() => isTop && setProfileOpen(p)} style={s.cardOpenArea} accessibilityRole="button" accessibilityLabel={`Otwórz profil ${p.name}`} />
            <View pointerEvents="none" style={s.cardIdentity}>
              <Typography style={s.cardName}>{p.name}{p.age ? `, ${p.age}` : ''}</Typography>
              <Typography style={s.cardMeta}>{p.city} · {(p.tags || []).slice(0, 2).join(' · ')}</Typography>
              {isTop && incomingRequests[p.id] && <View style={s.likesYouBadge}><Ionicons name="heart" size={13} color={c.white} /><Typography style={s.likesYouText}>Też chce Cię poznać</Typography></View>}
            </View>
          </Wrapper>
        })}
      </View>
      <View style={s.actions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Pomiń profil" onPress={() => decide(-1)} style={s.round}><Ionicons name="close" size={28} color={c.ink} /></Pressable>
        {person.remote && onMessage && <Pressable accessibilityRole="button" accessibilityLabel="Napisz wiadomość" onPress={() => onMessage(person.id)} style={s.round}><Ionicons name="chatbubble-ellipses-outline" size={24} color={c.pink} /></Pressable>}
        <Pressable accessibilityRole="button" accessibilityLabel="Polub profil" onPress={() => decide(1)} style={[s.round, s.heartRound]}><Ionicons name="heart" size={25} color={c.white} /></Pressable>
      </View>
      {(zodiacEnabled && userZodiac) || (styleEnabled && userStyle) ? <View style={s.matchSection}>
        <Typography style={s.matchSectionTitle}>Dopasowanie</Typography>
        {zodiacEnabled && userZodiac && (() => {
          const astro = astroMatchFor(person); return <View style={s.matchRow}>
            <View style={s.matchIcon}><Ionicons name={astro.icon} size={18} color={c.pink} /></View>
            <View style={{ flex: 1 }}>
              <Typography style={s.matchOverline}>ASTRO MATCH</Typography>
              <Typography style={s.matchTitle}>{userZodiac} + {astro.theirs}</Typography>
              <Typography style={s.matchLabel}>{astro.label}</Typography>
              <Typography style={s.matchCopy}>{astro.copy}</Typography>
            </View>
          </View>
        })()}
        {styleEnabled && userStyle && (() => {
          const style = styleMatchFor(person); return <View style={s.matchRow}>
            <View style={s.matchIcon}><Ionicons name="shirt-outline" size={18} color={c.pink} /></View>
            <View style={{ flex: 1 }}>
              <Typography style={s.matchOverline}>STYL MATCH</Typography>
              <Typography style={s.matchTitle}>{userStyle} + {style.theirs}</Typography>
              <Typography style={s.matchLabel}>{style.label}</Typography>
              <Typography style={s.matchCopy}>{style.copy}</Typography>
            </View>
          </View>
        })()}
      </View> : null}
      <Section title="O mnie"><Typography>{person.bio}</Typography></Section>
      {(person.galleryPhotos||[]).length>0&&<View style={s.profilePhotoBoard}>
        {(person.galleryPhotos||[]).map((uri,photoIndex)=><View key={uri||photoIndex} style={s.profilePhotoTile}>
          <Image source={{uri}} style={s.profilePhotoTileImage} resizeMode="cover"/>
        </View>)}
      </View>}
      <Section title="Lubię"><View style={s.wrap}>{person.tags.map(v => <Chip key={v} label={v} />)}</View></Section>
      <Section title={person.prompt}><Typography style={{ fontSize: 19, fontFamily: f.semibold }}>{person.answer}</Typography></Section>
      <View style={s.safetyRow}><TextAction icon="ban-outline" title="Zablokuj" danger onPress={confirmBlock} /><TextAction icon="flag-outline" title="Zgłoś" danger onPress={() => onReport({ kind: 'profile', id: person.id, label: `Profil: ${person.name}` })} /></View>
    </> : <Surface><Typography variant="subtitle">Brak profili</Typography><Typography style={{ color: c.muted }}>Zmień miasto lub sprawdź później.</Typography></Surface>}
    <Modal visible={searchOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSearchOpen(false)}>
      <View style={s.searchRoot}>
        <View style={s.searchHeader}><Pressable onPress={() => setSearchOpen(false)} style={s.fullChatIcon}><Ionicons name="close" size={24} color={c.ink} /></Pressable><Typography style={s.searchTitle}>Znajdź koleżankę</Typography><View style={s.fullChatIcon} /></View>
        <View style={s.searchBox}><Ionicons name="search-outline" size={20} color={c.muted} /><TextInput autoFocus value={searchText} onChangeText={runSearch} placeholder="Wpisz imię…" placeholderTextColor={c.muted} style={s.searchInput} />{searching && <ActivityIndicator size="small" color={c.pink} />}</View>
        <FlatList data={searchResults} keyExtractor={item => item.id} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }} ListEmptyComponent={searchText.trim().length >= 2 && !searching ? <Typography style={s.searchEmpty}>Nie znalazłam nikogo o tym imieniu w {city}.</Typography> : null} renderItem={({ item }) => <Pressable onPress={() => setProfileOpen(item)} style={s.searchResult}>
          {item.photo ? avatar(item.photo, 48) : <View style={[s.commentAvatar, { width: 48, height: 48, borderRadius: 24 }]}><Ionicons name="person" size={20} color={c.pink} /></View>}
          <View style={{ flex: 1 }}><Typography style={s.searchName}>{item.name}</Typography><Typography style={s.searchMeta}>{item.city}{item.headline ? ' · ' + item.headline : ''}</Typography></View>
          <Ionicons name="chevron-forward" size={19} color={c.muted} />
        </Pressable>} />
      </View>
    </Modal>

    <Modal visible={!!profileOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setProfileOpen(null)}>
      {!!profileOpen && <View style={s.personProfileRoot}>
        <View style={s.searchHeader}><Pressable onPress={() => setProfileOpen(null)} style={s.fullChatIcon}><Ionicons name="close" size={24} color={c.ink} /></Pressable><Typography style={s.searchTitle}>Profil</Typography><Pressable onPress={() => onReport?.({ kind: 'profile', id: profileOpen.id, label: `Profil: ${profileOpen.name}` })} style={s.fullChatIcon}><Ionicons name="ellipsis-horizontal" size={22} color={c.ink} /></Pressable></View>
        <ScrollView contentContainerStyle={s.personProfileContent}>
          <Image source={{ uri: profileOpen.photo || people[0]?.photo }} style={s.personProfilePhoto} />
          <Typography style={s.personProfileName}>{profileOpen.name}</Typography>
          <Typography style={s.personProfileCity}>{profileOpen.city}</Typography>
          {!!profileOpen.headline && <Typography style={s.personProfileHeadline}>{profileOpen.headline}</Typography>}
          {!!profileOpen.subtitle && <Typography style={s.personProfileSubtitle}>{profileOpen.subtitle}</Typography>}
          {!!profileOpen.bio && <Typography style={s.personProfileBio}>{profileOpen.bio}</Typography>}{(profileOpen.galleryPhotos||[]).length>0&&<View style={s.personGalleryBoard}>
            {(profileOpen.galleryPhotos||[]).map((uri,index)=><Image key={uri||index} source={{uri}} style={s.personGalleryPhoto} resizeMode="cover"/>)}
          </View>}
          <View style={s.personProfileActions}>
            <Button title={sentRequests.includes(profileOpen.id) ? 'Zaproszenie wysłane' : 'Dodaj do znajomych'} disabled={sentRequests.includes(profileOpen.id)} onPress={() => addFriend(profileOpen)} icon="person-add-outline" style={{ flex: 1 }} />
            {onMessage && profileOpen.remote && <Pressable onPress={() => { setProfileOpen(null); setSearchOpen(false); onMessage(profileOpen.id) }} style={s.personMessage}><Ionicons name="chatbubble-ellipses" size={22} color={c.pink} /></Pressable>}
          </View>
        </ScrollView>
      </View>}
    </Modal>

    <Modal visible={!!matchedProfile} transparent animationType="fade" onRequestClose={() => setMatchedProfile(null)}>
      <View style={s.matchModalBackdrop}>
        <View style={s.matchModalCard}>
          <View style={s.matchModalHeart}><Ionicons name="heart" size={34} color={c.white} /></View>
          <Typography style={s.matchModalEyebrow}>MACIE MATCH ✨</Typography>
          <Typography style={s.matchModalTitle}>Ty i {matchedProfile?.name} chcecie się poznać</Typography>
          <Typography style={s.matchModalCopy}>Możecie teraz zacząć rozmowę. Napisz pierwsze hej albo zobacz kolejny profil.</Typography>
          <View style={s.matchModalAvatars}>
            <View style={s.matchAvatarPlaceholder}><Ionicons name="person" size={30} color={c.pink} /></View>
            <View style={s.matchAvatarOverlap}>{matchedProfile?.photo ? <Image source={{uri:matchedProfile.photo}} style={s.matchAvatarImage}/> : <Ionicons name="person" size={30} color={c.pink}/>}</View>
          </View>
          {onMessage && matchedProfile?.remote && <Pressable onPress={() => { const id=matchedProfile.id; setMatchedProfile(null); onMessage(id); }} style={s.matchModalPrimary}><Ionicons name="chatbubble-ellipses" size={19} color={c.white}/><Typography style={s.matchModalPrimaryText}>Napisz wiadomość</Typography></Pressable>}
          <Pressable onPress={() => setMatchedProfile(null)} style={s.matchModalSecondary}><Typography style={s.matchModalSecondaryText}>Dalej poznawaj</Typography></Pressable>
        </View>
      </View>
    </Modal>

    <Modal visible={filtersOpen} transparent animationType="slide" onRequestClose={() => setFiltersOpen(false)}>
      <View style={s.filterBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setFiltersOpen(false)} />
        <View style={s.filterSheet}>
          <View style={s.filterHandle} />
          <View style={s.filterHeader}><Typography style={s.filterTitle}>Filtry</Typography><Pressable onPress={() => setFiltersOpen(false)} style={s.filterClose}><Ionicons name="close" size={23} color={c.ink} /></Pressable></View>
          <Typography style={s.filterSectionTitle}>Zainteresowania</Typography>
          <View style={s.filterChips}>{availableTags.map(tag => <Chip key={tag} label={tag} selected={selectedTags.includes(tag)} onPress={() => { setSelectedTags(prev => prev.includes(tag) ? prev.filter(v => v !== tag) : [...prev, tag]); setIndex(0) }} />)}</View>
          <View style={s.filterFooter}>
            <Pressable onPress={() => { setSelectedTags([]); setIndex(0) }} style={s.filterReset}><Typography style={s.filterResetText}>Wyczyść</Typography></Pressable>
            <Pressable onPress={() => setFiltersOpen(false)} style={s.filterApply}><Typography style={s.filterApplyText}>Pokaż {filtered.length}</Typography></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  </ScrollView>;
}

export function CommunityScreen({ city = 'Warszawa', posts = [], setPosts, blockedIds = [], onReport, sessionUserId = null, onOpenChat }) {
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [draft, setDraft] = useState('');
  const [likes, setLikes] = useState([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [commentPost, setCommentPost] = useState(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [comments, setComments] = useState({});
  const [remotePosts, setRemotePosts] = useState([]);
  const [stories, setStories] = useState([]);
  const [storyOpen, setStoryOpen] = useState(null);
  const [loading, setLoading] = useState(!!sessionUserId);
  const [publishing, setPublishing] = useState(false);
  const [postMedia, setPostMedia] = useState(null);
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [showSpotifyInput, setShowSpotifyInput] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sentRequests, setSentRequests] = useState([]);

  useEffect(() => {
    if (!sessionUserId) { setIsAdmin(false); return; }
    let alive = true;
    supabase.rpc('polka_is_admin').then(({ data }) => { if (alive) setIsAdmin(!!data) }).catch(() => { if (alive) setIsAdmin(false) });
    return () => { alive = false };
  }, [sessionUserId]);

  const getCacheKeys = () => {
    const uid = (sessionUserId || 'anon').replace(/[^a-z0-9]/gi, '');
    const safeCity = city.toLowerCase().replace(/[^a-z0-9]/gi, '');
    return {
      feed: `feed_${safeCity}_${uid}`,
      stories: `stories_${safeCity}_${uid}`
    };
  };

  const loadCached = async () => {
    if (!sessionUserId) return false;
    try {
      const keys = getCacheKeys();
      const [cachedFeed, cachedStories] = await Promise.all([
        readCached(keys.feed),
        readCached(keys.stories)
      ]);
      const hasFeedCache = cachedFeed !== null;
      const hasStoriesCache = cachedStories !== null;
      if (hasFeedCache) setRemotePosts(Array.isArray(cachedFeed) ? cachedFeed : []);
      if (hasStoriesCache) setStories(Array.isArray(cachedStories) ? cachedStories : []);
      return hasFeedCache || hasStoriesCache;
    } catch {
      return false;
    }
  };

  const refresh = async (force = false) => {
    console.log('[refresh] start', { sessionUserId, city, force });
    if (!sessionUserId) { console.log('[refresh] no sessionUserId'); setLoading(false); return; }
    if (!force) await loadCached();
    setLoading(true);
    try {
      const [feed, storyRows] = await Promise.all([loadFeed(city, sessionUserId), loadStories(sessionUserId, city)]);
      console.log('[refresh] success', { feedCount: feed?.length, storiesCount: storyRows?.length });
      setRemotePosts(feed);
      setStories(storyRows);
      const keys = getCacheKeys();
      console.log('[cache] keys', keys);
      console.log('[cache] feed size', JSON.stringify(feed).length);
      console.log('[cache] stories size', JSON.stringify(storyRows).length);
      await Promise.all([
        writeCached(keys.feed, feed, 2 * 60 * 1000),
        writeCached(keys.stories, storyRows, 2 * 60 * 1000)
      ]);
    } catch (error) {
      console.error('[refresh] error', error);
      Alert.alert('Nie udało się odświeżyć', error?.message || 'Sprawdź połączenie i spróbuj ponownie.');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      const hasFreshCache = await loadCached();
      if (!alive) return;
      if (hasFreshCache) {
        setLoading(false);
        return;
      }
      await refresh(true);
    })();
    return () => { alive = false; };
  }, [city, sessionUserId]);

  const sourcePosts = remotePosts.length
    ? [...remotePosts, ...posts.filter(p => !remotePosts.some(r => r.body === p.body))]
    : posts;
  const visiblePosts = sourcePosts.filter(post => !blockedIds.includes(authorId(post)) && post.city === city);

  const pickPostMedia = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], allowsEditing: false, quality: .82 });
      if (!result.canceled && result.assets?.[0]?.uri) setPostMedia(result.assets[0]);
    } catch (error) { Alert.alert('Galeria', error.message || 'Nie udało się wybrać pliku.'); }
  };

  const takePostPhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return Alert.alert('Aparat', 'Włącz dostęp do aparatu w ustawieniach telefonu.');
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images', 'videos'], quality: .82 });
      if (!result.canceled && result.assets?.[0]?.uri) setPostMedia(result.assets[0]);
    } catch (error) { Alert.alert('Aparat', error.message || 'Nie udało się zrobić zdjęcia.'); }
  };

  const [storyCreatorOpen, setStoryCreatorOpen] = useState(false);

  const openStoryCreator = () => {
    setStoryCreatorOpen(true);
  };

  const handlePublishStory = async ({ uri, caption }) => {
    if (sessionUserId) {
      await createStory({ userId: sessionUserId, uri, caption });
      await refresh();
    } else {
      setStories(prev => [{
        id: `local-story-${Date.now()}`,
        name: 'Ty',
        avatar: people[0]?.photo,
        mediaUrl: uri,
        caption: caption || 'Twoja relacja ✨',
        createdAt: new Date().toISOString()
      }, ...prev]);
    }
  };


  const publish = async () => {
    const body = draft.trim();
    if (!body || publishing) return;
    if (sessionUserId) {
      setPublishing(true);
      try {
        if (editingPost) {
          await editPost(editingPost.id, sessionUserId, body, spotifyUrl, postMedia);
        } else {
          await createPost({ userId: sessionUserId, body, imageUri: postMedia?.uri || null, spotifyUrl });
        }
        setDraft(''); setPostMedia(null); setSpotifyUrl(''); setShowSpotifyInput(false); setEditingPost(null); setComposerOpen(false);
        await refresh();
      } catch (error) {
        Alert.alert('Nie zapisano posta', error.message || 'Spróbuj ponownie.');
      } finally { setPublishing(false); }
      return;
    }
    if (editingPost) {
      setPosts(prev => prev.map(p => p.id === editingPost.id ? { ...p, body, spotifyUrl: spotifyUrl || null, image: postMedia?.uri || null } : p));
    } else {
      setPosts(prev => [{ id: String(Date.now()), author: 'Ty', authorId: 'local-demo', city, body, image: postMedia?.uri || null, spotifyUrl: spotifyUrl || null, likes: 0, createdAt: Date.now() }, ...prev]);
    }
    setDraft(''); setPostMedia(null); setSpotifyUrl(''); setShowSpotifyInput(false); setEditingPost(null); setComposerOpen(false);
  };

  const startEdit = item => {
    setEditingPost(item);
    setDraft(item.body || '');
    setSpotifyUrl(item.spotifyUrl || '');
    setShowSpotifyInput(!!item.spotifyUrl);
    setPostMedia(item.image ? { uri: item.image, mediaPath: item.mediaPath, mediaType: item.mediaType } : null);
    setComposerOpen(true);
  };

  const deleteOwnPost = item => Alert.alert('Usunąć wpis?', 'Ta operacja jest nieodwracalna.', [
    { text: 'Anuluj', style: 'cancel' },
    {
      text: 'Usuń', style: 'destructive', onPress: async () => {
        if (sessionUserId && item.remote) {
          try { await deletePost(item.id, sessionUserId); await refresh(); }
          catch (error) { Alert.alert('Nie usunięto posta', error.message || 'Spróbuj ponownie.'); }
        } else setPosts(prev => prev.filter(p => p.id !== item.id));
      }
    }
  ]);

  const seededComments = post => comments[post.id] || [
    { id: `${post.id}-c1`, author: 'Maja', body: 'Ja jestem chętna 🙋‍♀️', photo: people[0].photo },
    { id: `${post.id}-c2`, author: 'Ola', body: 'Brzmi super, o której dokładnie?', photo: people[1].photo }
  ];

  const openComments = async post => {
    setCommentPost(post);
    if (sessionUserId && post.remote) {
      try {
        const rows = await loadComments(post.id);
        setComments(prev => ({ ...prev, [post.id]: rows }));
      } catch { }
    }
  };

  const addCommentLocalOrRemote = async () => {
    if (!commentPost || !commentDraft.trim()) return;
    const body = commentDraft.trim();
    setCommentDraft('');
    if (sessionUserId && commentPost.remote) {
      try {
        await addComment(commentPost.id, sessionUserId, body);
        const rows = await loadComments(commentPost.id);
        setComments(prev => ({ ...prev, [commentPost.id]: rows }));
        setRemotePosts(prev => prev.map(p => p.id === commentPost.id ? { ...p, commentsCount: (p.commentsCount || 0) + 1 } : p));
      } catch (error) { setCommentDraft(body); Alert.alert('Nie dodano komentarza', error.message || 'Spróbuj ponownie.'); }
      return;
    }
    const next = { id: `${commentPost.id}-${Date.now()}`, author: 'Ty', body, photo: null, createdAt: new Date().toISOString() };
    setComments(prev => ({ ...prev, [commentPost.id]: [...seededComments(commentPost), next] }));
  };

  const toggleLike = async item => {
    if (sessionUserId && item.remote) {
      try {
        const nextLiked = await togglePostLike(item.id, sessionUserId, !!item.likedByMe);
        setRemotePosts(prev => prev.map(p => p.id === item.id ? { ...p, likedByMe: nextLiked, likes: Math.max(0, (p.likes || 0) + (nextLiked ? 1 : -1)) } : p));
      } catch (error) { Alert.alert('Nie zapisano polubienia', error.message || 'Spróbuj ponownie.'); }
      return;
    }
    setLikes(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]);
  };

  const [selectedStorySenderIndex, setSelectedStorySenderIndex] = useState(0);
  const [viewedStoryIds, setViewedStoryIds] = useState(() => new Set());

  const openStory = (sender, idx = 0) => {
    setSelectedStorySenderIndex(idx);
    setStoryOpen(sender);
  };

  const handleStoryViewed = storyId => {
    if (!storyId) return;
    setViewedStoryIds(prev => {
      if (prev.has(storyId)) return prev;
      const next = new Set(prev);
      next.add(storyId);
      return next;
    });
    setStories(prev => prev.map(story => story.id === storyId ? { ...story, viewed: true } : story));
    if (sessionUserId && /^[0-9a-f-]{36}$/i.test(String(storyId))) {
      void markStoryViewed(storyId, sessionUserId).catch(() => {});
    }
  };

  const storySenders = useMemo(() => {
    const map = new Map();

    // 1. Group any real stories from database / local user creation
    (stories || []).forEach(st => {
      const senderKey = (st.authorId || st.userId || st.author || st.name || 'user').toLowerCase().trim();
      const senderName = st.author || st.name || 'Dziewczyna';
      const senderAvatar = st.avatar || st.photo || people[0]?.photo;
      const mediaUrl = st.mediaUrl || st.uri || st.image;
      // Only create slide if there's actual story media (not fallback to avatar)
      if (!mediaUrl) return;
      const slide = {
        id: st.id || `st-${Math.random()}`,
        mediaUrl,
        mediaType: st.mediaType || (/\.(mp4|mov|webm)$/i.test(mediaUrl) ? 'video' : 'image'),
        caption: st.caption || '',
        createdAt: st.createdAt || new Date().toISOString(),
        viewed: !!st.viewed || viewedStoryIds.has(st.id)
      };

      if (!map.has(senderKey)) {
        map.set(senderKey, {
          key: senderKey,
          id: st.id,
          authorId: st.authorId || st.userId || null,
          name: senderName,
          avatar: senderAvatar,
          city: st.city || city,
          slides: [slide]
        });
      } else {
        map.get(senderKey).slides.push(slide);
      }
    });

    // 2. Demo senders (grouped by person, with multiple slides each, NEVER duplicating circles in rail!)
    const demoSenders = [
      {
        key: 'maja',
        name: 'Maja',
        avatar: people[0]?.photo,
        city: 'Warszawa',
        slides: [
          { id: 'maja-s1', mediaUrl: people[0]?.photo, caption: 'matcha run ☕' },
          { id: 'maja-s2', mediaUrl: people[1]?.photo, caption: 'kawiarnia na Mokotowie 🍰' }
        ]
      },
      {
        key: 'ola',
        name: 'Ola',
        avatar: people[1]?.photo,
        city: 'Kraków',
        slides: [
          { id: 'ola-s1', mediaUrl: people[1]?.photo, caption: 'spacer po mieście 🌸' }
        ]
      },
      {
        key: 'natalia',
        name: 'Natalia',
        avatar: people[2]?.photo,
        city: 'Wrocław',
        slides: [
          { id: 'nat-s1', mediaUrl: people[2]?.photo, caption: 'girls night ✨' },
          { id: 'nat-s2', mediaUrl: people[3]?.photo, caption: 'sushi time 🍣' }
        ]
      },
      {
        key: 'klara',
        name: 'Klara',
        avatar: people[3]?.photo,
        city: 'Gdańsk',
        slides: [
          { id: 'klara-s1', mediaUrl: people[3]?.photo, caption: 'book club 📚' }
        ]
      },
      {
        key: 'zuzia',
        name: 'Zuzia',
        avatar: people[4]?.photo,
        city: 'Poznań',
        slides: [
          { id: 'zuzia-s1', mediaUrl: people[4]?.photo, caption: 'pilates vibe 💪' }
        ]
      }
    ];

    demoSenders.forEach(demo => {
      const exists = Array.from(map.values()).some(
        s => s.name.toLowerCase().trim() === demo.name.toLowerCase().trim()
      );
      if (!exists) {
        map.set(demo.key, {
          ...demo,
          slides: demo.slides.map(slide => ({ ...slide, viewed: viewedStoryIds.has(slide.id) }))
        });
      }
    });

    return Array.from(map.values()).map(sender => ({
      ...sender,
      allViewed: sender.slides.length > 0 && sender.slides.every(slide => slide.viewed || viewedStoryIds.has(slide.id))
    }));
  }, [stories, people, city, viewedStoryIds]);

  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    {loading && <View style={s.feedLoading}><ActivityIndicator size="small" color={c.pink} /><Typography style={s.feedLoadingText}>Ładuję Polkę…</Typography></View>}
    <FlatList
      data={visiblePosts}
      keyExtractor={item => item.id}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={s.feedPage}
      refreshing={loading}
      onRefresh={refresh}
      ListHeaderComponent={
        <View style={{ backgroundColor: c.canvas }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.storiesScroll} contentContainerStyle={s.storiesRow}>
            <Pressable onPress={openStoryCreator} style={s.storyItem}>
              <View style={[s.storyRing, s.storyAddRing]}><View style={s.storyAdd}><Ionicons name="camera" size={22} color={c.pink} /></View></View>
              <Typography numberOfLines={1} style={s.storyName}>Dodaj</Typography>
            </Pressable>
            {storySenders.map((sender, idx) => <Pressable key={sender.key || sender.name} onPress={() => openStory(sender, idx)} style={s.storyItem}>
              <View style={[s.storyRing, sender.allViewed && s.storyRingViewed]}>
                {sender.avatar ? (
                  <Image source={{ uri: sender.avatar }} style={s.storyAvatar} />
                ) : (
                  <View style={[s.storyAvatar, { backgroundColor: c.blush, alignItems: 'center', justifyContent: 'center' }]}>
                    <Typography style={{ fontFamily: f.bold, fontSize: 16, color: c.pink }}>{(sender.name || 'P').charAt(0).toUpperCase()}</Typography>
                  </View>
                )}
              </View>
              <Typography numberOfLines={1} style={s.storyName}>{sender.name}</Typography>
            </Pressable>)}
          </ScrollView>
          <View style={s.feedHeader}>
            <Pressable onPress={() => { setEditingPost(null); setDraft(''); setSpotifyUrl(''); setShowSpotifyInput(false); setPostMedia(null); setComposerOpen(true) }} style={s.composerTrigger}>
              <View style={s.composerAvatar}><Ionicons name="person" size={18} color={c.pink} /></View>
              <Typography style={s.composerPlaceholder}>Napisz coś do dziewczyn w {city}…</Typography>
              <Ionicons name="add-circle" size={24} color={c.pink} />
            </Pressable>
          </View>
          <View style={s.feedSeparator} />
        </View>
      }
      renderItem={({ item }) => <View style={s.feedPost}>
        <View style={s.postHeader}>
          <Pressable
            style={s.postHeaderLeft}
            onPress={() => setSelectedProfile({
              name: item.author,
              authorId: item.authorId,
              avatar: item.avatar || people.find(p => p.name === item.author)?.photo,
              city: item.city,
              createdAt: item.createdAt
            })}
          >
            {item.avatar || people.find(p => p.name === item.author)?.photo ? (
              avatar(item.avatar || people.find(p => p.name === item.author)?.photo, 42)
            ) : (
              avatar(people[0]?.photo, 42)
            )}
            <View style={s.postMeta}>
              <View style={s.postAuthorRow}>
                <Typography style={s.postAuthor}>{item.author}</Typography>
                {item.authorId && item.authorId !== sessionUserId && item.author !== 'Ty' && !sentRequests.includes(item.authorId) && (
                  <Pressable onPress={() => addFriend({ id: item.authorId, name: item.author })} style={s.addFriendBtn}>
                    <Typography style={s.addFriendText}>Dodaj do znajomego</Typography>
                  </Pressable>
                )}
                {item.authorId && item.authorId !== sessionUserId && item.author !== 'Ty' && sentRequests.includes(item.authorId) && (
                  <Typography style={s.addFriendSent}>Zaproszenie wysłane</Typography>
                )}
              </View>
              <View style={s.postLocationRow}>
                <Typography variant="caption" style={{ color: c.muted }}>{formatPostTime(item.createdAt || item.time || '2 godz. temu')}</Typography>
                <Typography variant="caption" style={{ color: c.muted, marginHorizontal: 6 }}>·</Typography>
                <Typography variant="caption" style={{ color: c.muted }}>{item.city}</Typography>
              </View>
            </View>
          </Pressable>
        </View>
        <Typography style={s.postBody}>{item.body}</Typography>
        {!!item.image && (
          <View style={[
            s.postImageWrap,
            (item.aspectRatio === '4:5' || item.aspectRatio === 'vertical' || item.image?.includes('pinimg.com'))
              ? s.postImageVertical
              : s.postImageHorizontal
          ]}>
            <Image source={{ uri: item.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          </View>
        )}
        {!!item.spotifyUrl && <View style={s.spotifyCard}><Ionicons name="musical-notes" size={20} color={c.pink} /><View style={{ flex: 1 }}><Typography style={s.spotifyTitle}>Spotify</Typography><Typography numberOfLines={1} style={s.spotifyUrl}>{item.spotifyUrl}</Typography></View></View>}
        {item.moderationStatus === 'pending' && <View style={s.pendingBadge}><Typography style={s.pendingText}>Czeka na publikację</Typography></View>}
        <View style={s.postActions}>
          <View style={s.postActionLeft}>
            <TextAction icon={(item.likedByMe || likes.includes(item.id)) ? 'heart' : 'heart-outline'} title={String((item.likes || 0) + (!item.remote && likes.includes(item.id) ? 1 : 0))} onPress={() => toggleLike(item)} />
            <TextAction icon="chatbubble-outline" title={String(item.remote ? (item.commentsCount || 0) : seededComments(item).length)} onPress={() => openComments(item)} />
          </View>
          {(item.authorId === sessionUserId || item.author === 'Ty' || (isAdmin && item.remote))
            ? <View style={{ flexDirection: 'row' }}><TextAction icon="create-outline" title={isAdmin && item.authorId !== sessionUserId ? 'Edytuj jako admin' : 'Edytuj'} onPress={() => startEdit(item)} /><TextAction icon="trash-outline" title="Usuń" danger onPress={() => deleteOwnPost(item)} /></View>
            : <TextAction icon="flag-outline" title="Zgłoś" danger onPress={() => onReport({ kind: 'post', id: item.id, label: `Wpis: ${item.author}` })} />}
        </View>
        <Pressable onPress={() => openComments(item)} style={s.commentPreview}><Typography style={s.commentPreviewText}>Zobacz komentarze</Typography></Pressable>
      </View>}
      ListEmptyComponent={!loading ? <View style={s.feedEmpty}><Typography style={s.emptyFeedTitle}>Jeszcze cicho w {city}</Typography><Typography style={s.emptyFeedText}>Napisz pierwszy post albo zmień miasto u góry.</Typography></View> : null}
    />

    <StoryViewerModal
      visible={!!storyOpen}
      senders={storySenders}
      initialSenderIndex={selectedStorySenderIndex}
      sessionUserId={sessionUserId}
      onStoryViewed={handleStoryViewed}
      onClose={() => setStoryOpen(null)}
    />

    <StoryCameraModal
      visible={storyCreatorOpen}
      city={city}
      onClose={() => setStoryCreatorOpen(false)}
      onPublish={handlePublishStory}
    />

    <PublicProfileModal
      visible={!!selectedProfile}
      authorName={selectedProfile?.name}
      authorId={selectedProfile?.authorId}
      initialData={selectedProfile}
      onClose={() => setSelectedProfile(null)}
      onOpenChat={onOpenChat}
      onReport={onReport}
    />

    <Modal visible={!!commentPost} animationType="slide" onRequestClose={() => setCommentPost(null)}>
      {!!commentPost && <KeyboardAvoidingView style={s.commentsRoot} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={s.commentsHeader}>
          <Pressable onPress={() => setCommentPost(null)} style={s.commentsBack}><Ionicons name="arrow-back" size={24} color={c.ink} /></Pressable>
          <Typography style={s.commentsTitle}>Komentarze</Typography>
          <Pressable onPress={() => onReport?.({ kind: 'post', id: commentPost.id, label: `Wpis: ${commentPost.author}` })} style={s.commentsBack}><Ionicons name="ellipsis-horizontal" size={22} color={c.ink} /></Pressable>
        </View>
        <ScrollView style={s.commentsScroll} contentContainerStyle={s.commentsContent} keyboardShouldPersistTaps="handled">
          <View style={s.commentPostBox}>
            <View style={s.postHeader}>
              {commentPost.avatar ? (
                avatar(commentPost.avatar, 42)
              ) : (
                <View style={[s.composerAvatar, { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FAF6F0', borderWidth: 1, borderColor: '#EFE7DE' }]}>
                  <Typography style={{ fontFamily: f.bold, fontSize: 16, color: c.pink }}>
                    {(commentPost.author || 'P').charAt(0).toUpperCase()}
                  </Typography>
                </View>
              )}
              <View style={{ flex: 1 }}><Typography style={s.postAuthor}>{commentPost.author}</Typography><Typography variant="caption" style={{ color: c.muted }}>{commentPost.city}</Typography></View>
            </View>
            <Typography style={s.postBody}>{commentPost.body}</Typography>
            {!!commentPost.image && <Image source={{ uri: commentPost.image }} style={s.commentPostImage} resizeMode="cover" />}
          </View>
          {seededComments(commentPost).map(comment => <View key={comment.id} style={s.commentRow}>
            {comment.photo ? avatar(comment.photo, 38) : <View style={s.commentAvatar}><Ionicons name="person" size={17} color={c.pink} /></View>}
            <View style={s.commentBubble}><Typography style={s.commentAuthor}>{comment.author}</Typography><Typography style={s.commentBody}>{comment.body}</Typography><View style={s.commentMetaRow}><Typography style={s.commentMeta}>{formatPostTime(comment.createdAt || Date.now())}</Typography><Typography style={s.commentMeta}>Odpowiedz</Typography></View></View>
          </View>)}
        </ScrollView>
        <View style={s.commentComposer}>
          <View style={s.commentAvatar}><Ionicons name="person" size={17} color={c.pink} /></View>
          <TextInput value={commentDraft} onChangeText={setCommentDraft} placeholder="Napisz komentarz…" placeholderTextColor={c.muted} multiline maxLength={800} style={s.commentInput} />
          <Pressable onPress={addCommentLocalOrRemote} disabled={!commentDraft.trim()} style={[s.commentSend, !commentDraft.trim() && { opacity: .35 }]}><Ionicons name="arrow-up" size={19} color={c.white} /></Pressable>
        </View>
      </KeyboardAvoidingView>}
    </Modal>

    <Modal visible={composerOpen} transparent animationType="slide" onRequestClose={() => setComposerOpen(false)}>
      <KeyboardAvoidingView style={s.postModalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setComposerOpen(false)} />
        <View style={s.postSheet}>
          <View style={s.postSheetHandle} />
          <View style={s.postSheetTop}>
            <Pressable onPress={() => setComposerOpen(false)}><Typography style={s.cancelText}>Anuluj</Typography></Pressable>
            <Typography style={s.postSheetTitle}>{editingPost ? 'Edytuj post' : 'Nowy post'}</Typography>
            <Pressable disabled={!draft.trim() || publishing} onPress={publish}><Typography style={[s.publishText, (!draft.trim() || publishing) && { opacity: .35 }]}>{publishing ? 'Chwila…' : 'Publikuj'}</Typography></Pressable>
          </View>
          <View style={s.postAudience}><Ionicons name="location-outline" size={16} color={c.pink} /><Typography style={s.postAudienceText}>{city}</Typography></View>
          <TextInput autoFocus multiline value={draft} onChangeText={value => setDraft(value.slice(0, 1200))} placeholder={`Co dzieje się w ${city}?`} placeholderTextColor={c.muted} style={s.postInput} />
          {!!postMedia?.uri && <View style={s.postComposerPreviewWrap}>
            <Image source={{ uri: postMedia.uri }} style={s.postComposerPreview} resizeMode="cover" />
            <Pressable onPress={() => setPostMedia(null)} style={s.postComposerRemoveMedia} hitSlop={8}><Ionicons name="close" size={17} color={c.white} /></Pressable>
          </View>}
          {showSpotifyInput && <View style={s.spotifyInputRow}>
            <Ionicons name="musical-notes" size={18} color={c.pink} />
            <TextInput value={spotifyUrl} onChangeText={setSpotifyUrl} autoCapitalize="none" placeholder="Wklej link do Spotify…" placeholderTextColor={c.muted} style={s.spotifyInputCompact} />
            {!!spotifyUrl && <Pressable onPress={() => setSpotifyUrl('')} hitSlop={8}><Ionicons name="close-circle" size={18} color={c.muted} /></Pressable>}
          </View>}
          <View style={s.composerToolbar}>
            <Pressable accessibilityRole="button" accessibilityLabel="Galeria" onPress={pickPostMedia} style={[s.composerToolBtn, !!postMedia && s.composerToolBtnActive]}><Ionicons name="images-outline" size={21} color={postMedia ? c.pink : c.ink} /></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Aparat" onPress={takePostPhoto} style={s.composerToolBtn}><Ionicons name="camera-outline" size={21} color={c.ink} /></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Spotify" onPress={() => setShowSpotifyInput(v => !v)} style={[s.composerToolBtn, (showSpotifyInput || !!spotifyUrl) && s.composerToolBtnActive]}><Ionicons name="musical-notes-outline" size={21} color={(showSpotifyInput || !!spotifyUrl) ? c.pink : c.ink} /></Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  </KeyboardAvoidingView>;
}

export function GroupsScreen({ onReport }) {
  const [joined, setJoined] = useState([]);
  return <FlatList data={groups} keyExtractor={item => item.id} contentContainerStyle={s.page} ListHeaderComponent={<PageHeading kicker="RAZEM" title="Twoje grupy." />}
    renderItem={({ item }) => <Surface><View style={s.groupRow}><View style={s.groupIcon}><Ionicons name={item.icon} size={28} color={c.pink} /></View><View style={{ flex: 1 }}><Typography variant="subtitle">{item.name}</Typography><Typography variant="caption" style={{ color: c.muted, marginTop: 4 }}>{item.city} · {item.description}</Typography></View></View>
      <Button title={joined.includes(item.id) ? 'Dołączono (demo)' : 'Dołącz'} secondary style={{ marginTop: sp.base }} onPress={() => setJoined(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id])} />
      <TextAction icon="flag-outline" title="Zgłoś grupę (demo)" onPress={() => onReport({ kind: 'group', id: item.id, label: `Grupa: ${item.name}` })} />
    </Surface>}
    ListFooterComponent={<Typography variant="caption" style={s.disclaimer}>Grupy i zgłoszenia demonstracyjne. Brak serwera i moderacji grup.</Typography>} />;
}

function VoiceMessageBubble({ message, outgoing = false }) {
  const player = useAudioPlayer(message.mediaUrl || null);
  const seconds = Math.max(1, Math.round((message.durationMs || message.duration_ms || 0) / 1000));
  const play = () => {
    if (!message.mediaUrl) return;
    try { player.seekTo(0); player.play(); } catch { }
  };
  return <Pressable onPress={play} disabled={!message.mediaUrl} style={[s.voiceBubble, outgoing && s.voiceBubbleOutgoing]}>
    <View style={[s.voicePlay, outgoing && s.voicePlayOutgoing]}><Ionicons name="play" size={17} color={outgoing ? c.pink : c.white} /></View>
    <View style={s.voiceWave}>{[10, 18, 13, 23, 16, 27, 12, 20, 15, 24, 11].map((h, i) => <View key={i} style={[s.voiceBar, { height: h }, outgoing && s.voiceBarOutgoing]} />)}</View>
    <Typography style={[s.voiceDuration, outgoing && s.voiceDurationOutgoing]}>{seconds}s</Typography>
  </Pressable>;
}

export function ChatsScreen({ sessionUserId = null, initialConversationId = null, blockedIds = [], supportChat = true, onReport, onClose }) {
  const [active, setActive] = useState(null);
  const initialOpened = useRef(false);
  const chatScrollRef = useRef(null);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState({});
  const [remoteRooms, setRemoteRooms] = useState([]);
  const [remoteMessages, setRemoteMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder, 200);
  const chatApi = useMemo(() => sessionUserId ? createChatRealtime(supabase) : null, [sessionUserId]);

  useEffect(() => {
    const lastOutgoingId = [...visibleMessages].reverse().find(message => message.side === 'out')?.id || null;

  if (active) {
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 120);
    }
  }, [active, remoteMessages.length, messages]);

  const demoChats = [
    { id: 'maja', name: 'Maja', photo: people[0].photo, last: 'Hej! Widzimy się jutro? 💗', time: '18:42', unread: 2 },
    { id: 'meet-matcha', name: 'Matcha + spacer', photo: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=300&q=80', last: 'Maja: widzimy się przy wejściu o 17:30 ☕', time: '18:15', unread: 4 },
    { id: 'meet-karaoke', name: 'Girls night + karaoke', photo: 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=300&q=80', last: 'Natalia: mamy jeszcze dwa miejsca 🎤', time: '17:48', unread: 7 },
    { id: 'cycle-support', name: 'Cykl i samopoczucie', photo: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=300&q=82', last: 'Maja: spokojnie, u mnie też czasem się przesuwa 💗', time: '18:31', unread: 9, group: true },
    { id: 'group', name: 'Coffee Girls', photo: people[1].photo, last: 'Ola: mam stolik na 18:30', time: '17:10', unread: 5 },
    { id: 'meet-pilates', name: 'Pilates + brunch', photo: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=300&q=80', last: 'Klara: pamiętajcie o matach 🧘‍♀️', time: '15:22', unread: 1 },
    { id: 'meet-books', name: 'Book club + kawa', photo: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300&q=80', last: 'Sara: wrzucam lokalizację kawiarni', time: 'wczoraj', unread: 0 }
  ].filter(chat => !blockedIds.includes(chat.id) && (supportChat || chat.id !== 'cycle-support'));

  const remoteChatRows = remoteRooms.map(room => ({
    id: room.id,
    name: room.name,
    photo: people[0]?.photo,
    last: room.last,
    time: formatPostTime(room.time),
    unread: 0,
    group: room.kind === 'group',
    otherUserId: room.otherUserId || null,
    remote: true
  }));
  const chats = sessionUserId
    ? Array.from(remoteChatRows.reduce((map, chat) => {
        const key = !chat.group && chat.otherUserId ? `direct:${chat.otherUserId}` : `room:${chat.id}`;
        if (!map.has(key)) map.set(key, chat);
        return map;
      }, new Map()).values())
    : demoChats;

  const seededChatMessages = {
    'cycle-support': [
      { id: 'cs1', side: 'in', author: 'Maja', body: 'A tak na poważnie to; komuś też często przesuwa się okres??' },
      { id: 'cs2', side: 'out', author: 'Ty', body: 'mi właśnie przesuwa się kilka dni i zaczynam się stresować 😭' },
      { id: 'cs3', side: 'in', author: 'Ola', body: 'mnie się spóźnia jak mam dużo stresu i ostatnio zaczęłam to notować, żeby wiedzieć czy to przypadek czy jednak regularny problem' },
      { id: 'cs4', side: 'in', author: 'Natalia', body: 'Ja też miałam ostatnio później niż zwykle. Najbardziej uspokaja mnie porównanie z poprzednimi cyklami 💗' },
      { id: 'cs5', side: 'in', author: 'Klara', body: 'Jak coś mocno odbiega od Twojego zwykłego rytmu albo długo się utrzymuje, to ja bym po prostu zapytała lekarza zamiast się nakręcać.' },
      { id: 'cs6', side: 'out', author: 'Ty', body: 'no właśnie zaczęłam notować objawy w Polka Care, żeby mieć wszystko pod ręką' },
      { id: 'cs7', side: 'in', author: 'Maja', body: 'o i bardzo fajnie! Jak będziesz na wizycie u ginekologa, to już będziesz miała wszystkie potrzebne informacje przy sobie' }
    ],
    'maja': [
      { id: 'm1', side: 'in', author: 'Maja', body: 'Hej! Miło Cię poznać 🌸' },
      { id: 'm2', side: 'in', author: 'Maja', body: 'Masz już jakiś plan na weekend?' }
    ]
  };

  const supportAuthorPhoto = author => {
    const found = people.find(p => p.name === author);
    if (found?.photo) return found.photo;
    const photos = {
      Maja: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&q=82',
      Ola: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&q=82',
      Natalia: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=160&q=82',
      Klara: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=160&q=82'
    };
    return photos[author] || people[0]?.photo;
  };

  useEffect(() => {
    if (!chatApi || !sessionUserId) { setRemoteRooms([]); return; }
    let alive = true;
    chatApi.listConversations(sessionUserId)
      .then(rows => {
        if (!alive) return;
        setRemoteRooms(rows);
        if (initialConversationId && !initialOpened.current) {
          const room = rows.find(item => item.id === initialConversationId);
          if (room) {
            initialOpened.current = true;
            setActive({
              id: room.id, name: room.name, photo: people[0]?.photo, last: room.last,
              time: formatPostTime(room.time), unread: 0, group: room.kind === 'group', remote: true
            });
          }
        }
      })
      .catch(() => { if (alive) setRemoteRooms([]) });
    return () => { alive = false; void chatApi.stop(); };
  }, [chatApi, sessionUserId, initialConversationId]);

  useEffect(() => {
    if (!active?.remote || !chatApi) { setRemoteMessages([]); return; }
    let alive = true;
    let unsubscribe = () => { };
    chatApi.history(active.id).then(rows => { if (alive) setRemoteMessages(rows) }).catch(() => { });
    chatApi.watch(active.id, message => {
      if (!alive) return;
      setRemoteMessages(prev => {
        if (message.deleted) return prev.filter(item => item.id !== message.id);
        if (prev.some(item => item.id === message.id)) return prev;
        return [...prev, message];
      });
    }).then(stop => { unsubscribe = stop }).catch(() => { });
    return () => { alive = false; unsubscribe?.(); };
  }, [active?.id, active?.remote, chatApi]);

  const startVoice = async () => {
    if (!active?.remote || !chatApi || !sessionUserId || sending) return;
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Mikrofon', 'Włącz dostęp do mikrofonu, aby nagrywać głosówki.');
        return;
      }
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
    } catch (error) { Alert.alert('Nie udało się rozpocząć nagrania', error.message || 'Spróbuj ponownie.'); }
  };

  const stopVoice = async () => {
    if (!recorderState.isRecording || sending) return;
    const duration = Math.max(250, recorderState.durationMillis || 0);
    setSending(true);
    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
      if (!uri) throw new Error('Nie udało się odczytać nagrania.');
      const sent = await chatApi.sendVoice({
        roomId: active.id,
        senderId: sessionUserId,
        uri,
        durationMs: duration,
        clientMessageId: newClientMessageId()
      });
      setRemoteMessages(prev => prev.some(item => item.id === sent.id) ? prev : [...prev, sent]);
    } catch (error) { Alert.alert('Nie wysłano głosówki', error.message || 'Spróbuj ponownie.'); }
    finally { setSending(false); }
  };

  const send = async () => {
    if (!active || !draft.trim() || sending) return;
    const body = draft.trim();
    setDraft('');
    if (active.remote && chatApi && sessionUserId) {
      setSending(true);
      try {
        const sent = await chatApi.send({ roomId: active.id, senderId: sessionUserId, body, clientMessageId: newClientMessageId() });
        setRemoteMessages(prev => prev.some(item => item.id === sent.id) ? prev : [...prev, { ...sent, body, sender_id: sessionUserId, conversation_id: active.id }]);
      } catch (error) {
        setDraft(body);
        Alert.alert('Nie wysłano wiadomości', error.message || 'Spróbuj ponownie.');
      } finally { setSending(false); }
      return;
    }
    setMessages(prev => ({ ...prev, [active.id]: [...(prev[active.id] || []), body] }));
  };

  const visibleMessages = active?.remote
    ? remoteMessages.map(message => ({
      id: message.id,
      side: message.sender_id === sessionUserId ? 'out' : 'in',
      author: message.sender_id === sessionUserId ? 'Ty' : active.name,
      body: message.body,
      messageType: message.message_type || 'text',
      mediaUrl: message.media_url || null,
      durationMs: message.duration_ms || null
    }))
    : (seededChatMessages[active?.id] || [
      { id: 'demo-1', side: 'in', author: active?.name || 'Polka', body: 'Hej! Miło Cię poznać 🌸' },
      { id: 'demo-2', side: 'in', author: active?.name || 'Polka', body: 'Masz już jakiś plan na weekend?' }
    ]);

  if (active) {
    return <KeyboardAvoidingView style={s.fullChat} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 44 : 0}>
      <View style={s.fullChatHeader}>
        <Pressable onPress={() => setActive(null)} style={s.fullChatIcon} accessibilityLabel="Wróć do rozmów"><Ionicons name="arrow-back" size={24} color={c.ink} /></Pressable>
        {avatar(active.photo || people[0]?.photo, 42)}
        <View style={{ flex: 1 }}><Typography style={s.fullChatName}>{active.name}</Typography><Typography style={s.fullChatStatus}>{active.remote ? 'wiadomości online' : 'rozmowa demonstracyjna'}</Typography></View>
        <Pressable onPress={() => onReport?.({ kind: 'chat', id: active.id, label: `Rozmowa: ${active.name}` })} style={s.fullChatIcon}><Ionicons name="ellipsis-horizontal" size={23} color={c.ink} /></Pressable>
      </View>

      <ScrollView ref={chatScrollRef} onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })} style={s.messageArea} contentContainerStyle={s.messageContent} keyboardShouldPersistTaps="handled">
        {!active.remote && <View style={s.dayPill}><Typography style={s.dayText}>Dzisiaj</Typography></View>}
        {visibleMessages.map(message => message.side === 'out'
          ? <View key={message.id} style={s.outgoingWrap}>
            {message.messageType === 'voice' ? <VoiceMessageBubble message={message} outgoing /> : <View style={s.outgoingBubble}><Typography style={s.outgoingText}>{message.body}</Typography></View>}
            {message.id === lastOutgoingId && <View style={s.deliveryStatusRow}>
              <Ionicons name="checkmark-done" size={13} color={c.pink} />
              <Typography style={s.deliveryStatusText}>Dostarczono</Typography>
            </View>}
          </View>
          : <View key={message.id} style={s.incomingMessageRow}>
            {active.group && <Image source={{ uri: supportAuthorPhoto(message.author) }} style={s.groupMessageAvatar} />}
            <View style={s.incomingMessageBody}>
              {active.group && <Typography style={s.groupMessageAuthor}>{message.author}</Typography>}
              {message.messageType === 'voice' ? <VoiceMessageBubble message={message} /> : <View style={s.incomingBubble}><Typography style={s.bubbleText}>{message.body}</Typography></View>}
            </View>
          </View>)}
        {!active.remote && (messages[active.id] || []).map((message, i, arr) => <View key={'local-' + i} style={s.outgoingWrap}>
          <View style={s.outgoingBubble}><Typography style={s.outgoingText}>{message}</Typography></View>
          {i === arr.length - 1 && <View style={s.deliveryStatusRow}>
            <Ionicons name="checkmark-done" size={13} color={c.pink} />
            <Typography style={s.deliveryStatusText}>Dostarczono</Typography>
          </View>}
        </View>)}
        {sending && <View style={s.outgoingWrap}>
          <View style={[s.outgoingBubble, { opacity: 0.7 }]}>
            <Typography style={s.outgoingText}>Wysyłanie…</Typography>
          </View>
          <View style={s.deliveryStatusRow}>
            <Typography style={s.deliveryStatusText}>Wysyłanie…</Typography>
          </View>
        </View>}
      </ScrollView>

      <View style={s.fullComposer}>
        {recorderState.isRecording
          ? <View style={s.recordingState}><View style={s.recordingDot} /><Typography style={s.recordingText}>Nagrywanie {Math.max(1, Math.round((recorderState.durationMillis || 0) / 1000))}s</Typography></View>
          : <TextInput value={draft} onChangeText={setDraft} placeholder="Napisz wiadomość…" placeholderTextColor={c.muted} accessibilityLabel="Wiadomość" multiline maxLength={1200} style={s.fullMessageInput} />}
        {!draft.trim() && active.remote
          ? <Pressable accessibilityRole="button" accessibilityLabel={recorderState.isRecording ? 'Zatrzymaj i wyślij głosówkę' : 'Nagraj głosówkę'} disabled={sending} onPress={recorderState.isRecording ? stopVoice : startVoice} style={[s.voiceRecordButton, recorderState.isRecording && s.voiceRecordButtonActive, sending && { opacity: .4 }]}><Ionicons name={recorderState.isRecording ? 'stop' : 'mic'} color={c.white} size={20} /></Pressable>
          : <Pressable accessibilityRole="button" accessibilityLabel="Wyślij wiadomość" disabled={!draft.trim() || sending} onPress={send} style={[s.fullSend, (!draft.trim() || sending) && { opacity: .35 }]}><Ionicons name="arrow-up" color={c.white} size={21} /></Pressable>}
      </View>
    </KeyboardAvoidingView>;
  }

  return <View style={s.chatListRoot}>
    <View style={s.chatListHeader}>
      <Pressable onPress={onClose} style={s.fullChatIcon} accessibilityLabel="Zamknij wiadomości"><Ionicons name="arrow-back" size={24} color={c.ink} /></Pressable>
      <Typography style={s.chatListTitle}>Wiadomości</Typography>
      <View style={s.chatHeaderButton}><Ionicons name={sessionUserId ? 'cloud-done-outline' : 'cloud-offline-outline'} size={21} color={sessionUserId ? c.pink : c.muted} /></View>
    </View>
    <FlatList
      data={chats}
      keyExtractor={item => item.id}
      contentContainerStyle={s.chatList}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={sessionUserId ? <Typography style={{ paddingHorizontal: sp.lg, paddingVertical: 9, color: c.muted, fontSize: 11 }}>Twoje rozmowy są przechowywane bezpiecznie. </Typography> : null}
      renderItem={({ item }) => <Pressable accessibilityRole="button" onPress={() => setActive(item)} style={s.chatListRow}>
        {avatar(item.photo || people[0]?.photo, 54)}
        <View style={s.chatListBody}>
          <View style={s.chatTitleRow}><Typography style={s.chatName}>{item.name}</Typography><Typography style={s.chatTime}>{item.time}</Typography></View>
          <View style={s.chatPreviewRow}><Typography numberOfLines={1} style={s.chatPreview}>{item.last}</Typography>{item.unread > 0 && <View style={s.unread}><Typography style={s.unreadText}>{item.unread}</Typography></View>}</View>
        </View>
      </Pressable>}
    />
  </View>;
}

export function ProfileScreen({ account, onSafety }) {
  return <ScrollView contentContainerStyle={s.page}>
    <Surface style={{ alignItems: 'center', paddingVertical: sp.xl }}><View style={s.profile}><Ionicons name="person-outline" size={54} color={c.pink} /></View><Typography variant="heading" style={{ marginTop: sp.base }}>{account.name}</Typography><Typography style={{ color: c.muted }}>{account.city}</Typography></Surface>
    <Section title="Chcę poznać"><Typography>{account.goal}</Typography></Section>
    <Section title="Zainteresowania"><View style={s.wrap}>{account.interests.map(i => <Chip key={i} label={i} />)}</View></Section>
    <Button title="Bezpieczeństwo i moje dane" icon="shield-checkmark-outline" onPress={onSafety} />
    <Typography variant="caption" style={s.disclaimer}>Prototyp bez kont i przechowywania na serwerze. Usuwanie danych demonstracyjnych znajdziesz w ustawieniach bezpieczeństwa.</Typography>
  </ScrollView>;
}
const s = StyleSheet.create({
  page: { padding: sp.lg, paddingBottom: sp.xxl, backgroundColor: c.canvas, flexGrow: 1 },
  feedPage: { paddingBottom: 110, backgroundColor: '#F7F3F5' },
  feedLoading: { position: 'absolute', top: 6, alignSelf: 'center', zIndex: 30, flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: c.white, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: c.line },
  feedLoadingText: { fontFamily: f.semibold, fontSize: 11, color: c.muted },
  storiesScroll: { backgroundColor: c.canvas },
  storiesRow: { paddingHorizontal: sp.lg, paddingTop: 8, paddingBottom: 12, gap: 12, backgroundColor: c.canvas },
  storyItem: { width: 68, alignItems: 'center' },
  storyRing: { width: 62, height: 62, borderRadius: 31, borderWidth: 3, borderColor: c.pink, padding: 2, alignItems: 'center', justifyContent: 'center' },
  storyRingViewed: { borderColor: '#B8B1B4' },
  storyAddRing: { borderColor: c.line },
  storyAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: c.blush },
  storyAdd: { width: 52, height: 52, borderRadius: 26, backgroundColor: c.white, alignItems: 'center', justifyContent: 'center' },
  storyName: { fontFamily: f.semibold, fontSize: 10, color: c.ink, marginTop: 5, maxWidth: 66 },
  deliveryStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-end', marginTop: 3, marginRight: 4 },
  deliveryStatusText: { fontFamily: f.regular, fontSize: 10, color: c.muted },
  storyViewerBackdrop: { flex: 1, backgroundColor: 'rgba(18,9,14,.95)', alignItems: 'center', justifyContent: 'center', padding: 12 },
  storyViewerCard: { width: '100%', maxWidth: 430, height: '88%', borderRadius: 28, overflow: 'hidden', backgroundColor: '#1b1116' },
  storyViewerTop: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 3, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: 'rgba(0,0,0,.18)' },
  storyViewerName: { fontFamily: f.bold, fontSize: 13, color: c.white },
  storyViewerMedia: { width: '100%', height: '100%' },
  storyCaption: { position: 'absolute', left: 16, right: 16, bottom: 22, color: c.white, fontFamily: f.semibold, fontSize: 15, textAlign: 'center', backgroundColor: 'rgba(0,0,0,.28)', padding: 10, borderRadius: 14 },
  spotifyCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: c.line, borderRadius: 16, padding: 12, marginBottom: 10, backgroundColor: c.canvas },
  spotifyTitle: { fontFamily: f.bold, fontSize: 12, color: c.ink },
  spotifyUrl: { fontFamily: f.regular, fontSize: 11, color: c.muted, marginTop: 2 },
  pendingBadge: { alignSelf: 'flex-start', backgroundColor: c.blush, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 8 },
  pendingText: { fontFamily: f.bold, fontSize: 10, color: c.pink },
  postComposerPreviewWrap: { width: 110, height: 110, borderRadius: 16, marginTop: 10, marginBottom: 4, overflow: 'hidden', backgroundColor: c.blush, position: 'relative', borderWidth: 1, borderColor: c.line },
  postComposerPreview: { width: '100%', height: '100%' },
  postComposerRemoveMedia: { position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.62)', alignItems: 'center', justifyContent: 'center' },
  composerToolbar: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: c.line, paddingTop: 12, marginTop: 8 },
  composerToolBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: c.canvas, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' },
  composerToolBtnActive: { backgroundColor: c.blush, borderColor: c.pink },
  spotifyInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, backgroundColor: c.canvas, borderWidth: 1, borderColor: c.line, borderRadius: 14, paddingHorizontal: 12, height: 42 },
  spotifyInputCompact: { flex: 1, fontFamily: f.regular, fontSize: 13, color: c.ink },
  feedHeader: { paddingHorizontal: sp.lg, paddingTop: 6, paddingBottom: 12, backgroundColor: c.canvas },
  feedSeparator: { height: StyleSheet.hairlineWidth, backgroundColor: c.line, marginHorizontal: sp.lg },
  composerTrigger: { minHeight: 54, backgroundColor: c.white, borderWidth: 1, borderColor: c.line, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12 },
  composerAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: c.blush, alignItems: 'center', justifyContent: 'center' },
  composerPlaceholder: { flex: 1, fontFamily: f.regular, fontSize: 14, color: c.muted },
  feedPost: { paddingHorizontal: sp.lg, paddingTop: 16, paddingBottom: 14, marginBottom: 8, backgroundColor: c.white, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.line },
  postTime: { fontSize: 11, color: c.muted, fontFamily: f.semibold, alignSelf: 'flex-start', marginTop: 4 }, postAuthor: { fontFamily: f.bold, fontSize: 15, color: c.ink },
  postAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  addFriendBtn: { paddingHorizontal: 8, paddingVertical: 2 },
  addFriendText: { fontFamily: f.semibold, fontSize: 12, color: c.pinkDark },
  addFriendSent: { fontFamily: f.semibold, fontSize: 12, color: c.success },
  postBody: { fontFamily: f.regular, fontSize: 17, lineHeight: 24, color: c.ink, marginTop: 12, marginBottom: 12 },
  postImageWrap: { width: '100%', borderRadius: 18, overflow: 'hidden', backgroundColor: c.blush, marginBottom: 10 },
  postImageHorizontal: { width: '100%', aspectRatio: 16 / 9 },
  postImageVertical: { width: '100%', aspectRatio: 4 / 5 },
  postImage: { width: '100%', height: 230, borderRadius: 18, backgroundColor: c.blush, marginBottom: 10 },
  commentPostBox: { paddingHorizontal: sp.lg, paddingVertical: 16, backgroundColor: c.white, borderBottomWidth: 1, borderBottomColor: c.line },
  commentPostImage: { width: '100%', height: 240, borderRadius: 18, backgroundColor: c.blush, marginBottom: 8 },
  feedEmpty: { padding: 36, alignItems: 'center' },
  emptyFeedTitle: { fontFamily: f.bold, fontSize: 18, color: c.ink },
  emptyFeedText: { fontFamily: f.regular, fontSize: 14, color: c.muted, marginTop: 5, textAlign: 'center' },
  postModalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.28)' },
  postSheet: { backgroundColor: c.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: sp.lg, paddingTop: 10, minHeight: 330 },
  postSheetHandle: { width: 42, height: 5, borderRadius: 3, backgroundColor: c.line, alignSelf: 'center', marginBottom: 14 },
  postSheetTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  postSheetTitle: { fontFamily: f.bold, fontSize: 17, color: c.ink },
  cancelText: { fontFamily: f.semibold, fontSize: 14, color: c.muted },
  publishText: { fontFamily: f.bold, fontSize: 14, color: c.pink },
  postAudience: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: c.blush, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 12 },
  postAudienceText: { fontFamily: f.bold, fontSize: 12, color: c.pink },
  postInput: { minHeight: 150, fontFamily: f.regular, fontSize: 20, lineHeight: 28, color: c.ink, textAlignVertical: 'top' },
  discoverControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 },
  matchSection: { marginTop: 2, marginBottom: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.line },
  matchSectionTitle: { fontFamily: f.bold, fontSize: 13, color: c.ink, paddingTop: 13, paddingBottom: 2 },
  matchRow: { paddingVertical: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line },
  matchIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: c.blush, alignItems: 'center', justifyContent: 'center' },
  matchOverline: { fontFamily: f.bold, fontSize: 9, letterSpacing: 1.1, color: c.muted },
  matchTitle: { fontFamily: f.bold, fontSize: 15, color: c.ink, marginTop: 2 },
  matchLabel: { fontFamily: f.bold, fontSize: 13, color: c.pink, marginTop: 3 },
  matchCopy: { fontFamily: f.regular, fontSize: 12, lineHeight: 17, color: c.muted, marginTop: 3 },
  discoverHint: { fontFamily: f.semibold, fontSize: 14, color: c.muted },
  activeFilterHint: { fontFamily: f.semibold, fontSize: 11, color: c.pink, marginTop: 2 },
  filterButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: c.white, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' },
  searchRoot: { flex: 1, backgroundColor: c.canvas },
  searchHeader: { height: 60, paddingHorizontal: 12, backgroundColor: c.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line },
  searchTitle: { fontFamily: f.bold, fontSize: 17, color: c.ink },
  searchBox: { margin: sp.lg, height: 50, borderRadius: 16, borderWidth: 1, borderColor: c.line, backgroundColor: c.white, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 },
  searchInput: { flex: 1, fontFamily: f.regular, fontSize: 15, color: c.ink },
  searchResult: { minHeight: 70, paddingHorizontal: sp.lg, backgroundColor: c.white, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line, flexDirection: 'row', alignItems: 'center', gap: 12 },
  searchName: { fontFamily: f.bold, fontSize: 15, color: c.ink },
  searchMeta: { fontFamily: f.regular, fontSize: 12, color: c.muted, marginTop: 3 },
  searchEmpty: { fontFamily: f.regular, fontSize: 13, color: c.muted, textAlign: 'center', padding: 30 },
  personProfileRoot: { flex: 1, backgroundColor: c.canvas },
  personProfileContent: { padding: sp.lg, paddingBottom: 60, alignItems: 'center' },
  personProfilePhoto: { width: '100%', height: 420, borderRadius: 28, backgroundColor: c.blush },
  personProfileName: { fontFamily: f.bold, fontSize: 34, letterSpacing: -1.2, color: c.ink, marginTop: 18 },
  personProfileCity: { fontFamily: f.semibold, fontSize: 13, color: c.muted, marginTop: 4 },
  personProfileHeadline: { fontFamily: f.bold, fontSize: 18, color: c.pink, textAlign: 'center', marginTop: 12 },
  personProfileSubtitle: { fontFamily: f.regular, fontSize: 13, color: c.muted, textAlign: 'center', marginTop: 4 },
  personProfileBio: { fontFamily: f.regular, fontSize: 15, lineHeight: 22, color: c.ink, textAlign: 'center', marginTop: 14 },
  personProfileActions: { width: '100%', flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 22 },
  personMessage: { width: 52, height: 52, borderRadius: 16, borderWidth: 1, borderColor: c.line, backgroundColor: c.white, alignItems: 'center', justifyContent: 'center' },
  filterBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.3)' },
  filterSheet: { backgroundColor: c.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: sp.lg, paddingBottom: 28, maxHeight: '76%' },
  filterHandle: { width: 42, height: 5, borderRadius: 3, backgroundColor: c.line, alignSelf: 'center', marginBottom: 16 },
  filterHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  filterTitle: { fontFamily: f.bold, fontSize: 24, color: c.ink },
  filterClose: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  filterSectionTitle: { fontFamily: f.bold, fontSize: 14, color: c.ink, marginBottom: 10 },
  filterChips: { flexDirection: 'row', flexWrap: 'wrap' },
  filterFooter: { flexDirection: 'row', gap: 10, marginTop: 12 },
  filterReset: { height: 50, paddingHorizontal: 18, borderRadius: 16, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' },
  filterResetText: { fontFamily: f.bold, fontSize: 14, color: c.ink },
  filterApply: { height: 50, flex: 1, borderRadius: 16, backgroundColor: c.pink, alignItems: 'center', justifyContent: 'center' },
  filterApplyText: { fontFamily: f.bold, fontSize: 14, color: c.white },
  discoverLoading: { minHeight: 505, alignItems: 'center', justifyContent: 'center', gap: 10 },
  discoverLoadingText: { fontFamily: f.semibold, fontSize: 13, color: c.muted },
  stackWrap: { height: 505, marginTop: 8, marginBottom: 0, position: 'relative' },
  swipeCard: { position: 'absolute', left: 0, right: 0, top: 0, height: 490, borderRadius: 28, overflow: 'hidden', backgroundColor: c.white, borderWidth: 1, borderColor: c.line, shadowColor: '#27151D', shadowOpacity: .12, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 4 },
  stackCard: { pointerEvents: 'none' },
  cardOpenArea: { position: 'absolute', left: '28%', right: '28%', top: '22%', bottom: '18%', zIndex: 2 },
  cardTapHint: { position: 'absolute', top: 16, right: 16, zIndex: 3, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(20,14,18,.36)', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999 },
  cardTapHintText: { color: c.white, fontFamily: f.semibold, fontSize: 11 },
  swipePhoto: { width: '100%', height: '100%' },
  profilePhotoBoard:{gap:14,marginBottom:sp.md},
  profilePhotoTile:{width:'100%',aspectRatio:0.82,borderRadius:26,overflow:'hidden',backgroundColor:c.blush,borderWidth:1,borderColor:c.line},
  profilePhotoTileImage:{width:'100%',height:'100%'},
  personGalleryBoard:{width:'100%',gap:12,marginTop:18},
  personGalleryPhoto:{width:'100%',aspectRatio:0.82,borderRadius:24,backgroundColor:c.blush},
  cardScrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,.14)' },
  vibePill: { position: 'absolute', top: 16, left: 16, backgroundColor: 'rgba(255,255,255,.9)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  vibeText: { fontFamily: f.bold, fontSize: 12, color: c.ink },
  cardIdentity: { position: 'absolute', left: 18, right: 18, bottom: 18 },
  cardName: { fontFamily: f.bold, fontSize: 34, lineHeight: 38, color: c.white, letterSpacing: -1.4 },
  cardMeta: { fontFamily: f.semibold, fontSize: 14, color: 'rgba(255,255,255,.92)', marginTop: 4 },
  heartRound: { backgroundColor: c.pink, borderColor: c.pink },
  likesYouBadge: { marginTop: 10, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(200,79,122,.95)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  likesYouText: { color: c.white, fontFamily: f.bold, fontSize: 11 },
  matchModalBackdrop: { flex: 1, backgroundColor: 'rgba(24,11,18,.66)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  matchModalCard: { width: '100%', maxWidth: 380, backgroundColor: c.white, borderRadius: 30, padding: 26, alignItems: 'center' },
  matchModalHeart: { width: 68, height: 68, borderRadius: 34, backgroundColor: c.pink, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  matchModalEyebrow: { fontFamily: f.bold, color: c.pink, fontSize: 12, letterSpacing: 1.5 },
  matchModalTitle: { fontFamily: f.bold, color: c.ink, fontSize: 27, lineHeight: 31, textAlign: 'center', marginTop: 8 },
  matchModalCopy: { color: c.muted, fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 10 },
  matchModalAvatars: { flexDirection: 'row', marginVertical: 22, paddingLeft: 18 },
  matchAvatarPlaceholder: { width: 64, height: 64, borderRadius: 32, backgroundColor: c.blush, borderWidth: 4, borderColor: c.white, alignItems: 'center', justifyContent: 'center' },
  matchAvatarOverlap: { width: 64, height: 64, borderRadius: 32, backgroundColor: c.blush, borderWidth: 4, borderColor: c.white, marginLeft: -18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  matchAvatarImage: { width: '100%', height: '100%' },
  matchModalPrimary: { width: '100%', minHeight: 52, borderRadius: 16, backgroundColor: c.pink, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  matchModalPrimaryText: { color: c.white, fontFamily: f.bold, fontSize: 15 },
  matchModalSecondary: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 5 },
  matchModalSecondaryText: { color: c.ink, fontFamily: f.semibold, fontSize: 14 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  profileCard: { borderRadius: r.lg, backgroundColor: c.white, overflow: 'hidden', borderWidth: 1, borderColor: c.line },
  heroPhoto: { width: '100%', height: Math.min(W * 1.2, 470), backgroundColor: c.blush },
  heroName: { backgroundColor: c.white, padding: sp.base },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 30, marginTop: -18, marginBottom: 14, zIndex: 12 },
  round: { width: 55, height: 55, borderRadius: 30, backgroundColor: c.white, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' },
  groupIcon: { width: 60, height: 60, borderRadius: 20, backgroundColor: c.blush, alignItems: 'center', justifyContent: 'center' },
  disclaimer: { color: c.muted, marginTop: sp.base, lineHeight: 19 },
  messageInput: { flex: 1, borderWidth: 1, borderColor: c.line, backgroundColor: c.white, borderRadius: r.md, padding: sp.md, color: c.ink, fontFamily: f.regular },
  send: { backgroundColor: c.pink, width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  profile: { height: 110, width: 110, borderRadius: 55, backgroundColor: c.blush, alignItems: 'center', justifyContent: 'center' },
  textAction: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: sp.sm, paddingHorizontal: sp.xs },
  safetyRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: sp.sm },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: sp.md, marginBottom: sp.md },
  postHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  postMeta: { flex: 1 },
  postLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  postAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  postActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 2 },
  postActionLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  commentPreview: { paddingTop: 6, paddingBottom: 2 },
  commentPreviewText: { fontFamily: f.semibold, fontSize: 12, color: c.muted },
  commentsRoot: { flex: 1, backgroundColor: c.white },
  commentsHeader: { height: 60, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line },
  commentsBack: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  commentsTitle: { fontFamily: f.bold, fontSize: 17, color: c.ink },
  commentsScroll: { flex: 1, backgroundColor: c.canvas },
  commentsContent: { paddingBottom: 24 },
  commentPostBox: { paddingHorizontal: sp.lg, paddingVertical: 16, backgroundColor: c.white, borderBottomWidth: 1, borderBottomColor: c.line },
  commentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: sp.lg, paddingTop: 14 },
  commentAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: c.blush, alignItems: 'center', justifyContent: 'center' },
  commentBubble: { flex: 1, backgroundColor: c.white, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: c.line },
  commentAuthor: { fontFamily: f.bold, fontSize: 13, color: c.ink },
  commentBody: { fontFamily: f.regular, fontSize: 14, lineHeight: 20, color: c.ink, marginTop: 2 },
  commentMetaRow: { flexDirection: 'row', gap: 14, marginTop: 8 },
  commentMeta: { fontFamily: f.semibold, fontSize: 11, color: c.muted },
  commentComposer: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12, flexDirection: 'row', alignItems: 'flex-end', gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line, backgroundColor: c.white },
  commentInput: { flex: 1, maxHeight: 110, minHeight: 42, borderRadius: 21, backgroundColor: c.canvas, borderWidth: 1, borderColor: c.line, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, fontFamily: f.regular, fontSize: 14, color: c.ink, textAlignVertical: 'center' },
  commentSend: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.pink, alignItems: 'center', justifyContent: 'center' },
  groupRow: { flexDirection: 'row', gap: sp.base, alignItems: 'center' },
  chatRow: { flexDirection: 'row', alignItems: 'center', gap: sp.md },
  chatBack: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: sp.base },
  compose: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  chatListRoot: { flex: 1, backgroundColor: c.canvas },
  chatListHeader: { height: 60, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: c.white, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line },
  chatListTitle: { fontFamily: f.bold, fontSize: 24, letterSpacing: -.8, color: c.ink },
  chatHeaderButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: c.white, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' },
  chatList: { paddingBottom: 40 },
  chatListRow: { minHeight: 76, paddingHorizontal: sp.lg, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.white, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line },
  chatListBody: { flex: 1, minWidth: 0 },
  chatTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chatName: { fontFamily: f.bold, fontSize: 15, color: c.ink },
  chatTime: { fontFamily: f.regular, fontSize: 11, color: c.muted },
  chatPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  chatPreview: { flex: 1, fontFamily: f.regular, fontSize: 13, color: c.muted },
  unread: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: c.pink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  unreadText: { fontFamily: f.bold, fontSize: 10, color: c.white },
  fullChat: { flex: 1, backgroundColor: c.white },
  fullChatHeader: { minHeight: 64, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line },
  fullChatIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  fullChatName: { fontFamily: f.bold, fontSize: 15, color: c.ink },
  fullChatStatus: { fontFamily: f.regular, fontSize: 11, color: c.muted, marginTop: 1 },
  messageArea: { flex: 1, backgroundColor: '#FFF9FA' },
  messageContent: { padding: sp.lg, paddingBottom: 30 },
  dayPill: { alignSelf: 'center', backgroundColor: c.white, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 16, borderWidth: 1, borderColor: c.line },
  dayText: { fontFamily: f.semibold, fontSize: 11, color: c.muted },
  incomingWrap: { alignItems: 'flex-start', marginBottom: 8 },
  incomingMessageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 10 },
  groupMessageAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: c.blush },
  incomingMessageBody: { flex: 1, alignItems: 'flex-start' },
  groupMessageAuthor: { fontFamily: f.bold, fontSize: 10, color: c.muted, marginLeft: 8, marginBottom: 3 },
  outgoingWrap: { alignItems: 'flex-end', marginBottom: 8 },
  incomingBubble: { maxWidth: '78%', backgroundColor: c.white, borderRadius: 20, borderTopLeftRadius: 6, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: c.line },
  outgoingBubble: { maxWidth: '78%', backgroundColor: c.pink, borderRadius: 20, borderTopRightRadius: 6, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleText: { fontFamily: f.regular, fontSize: 15, lineHeight: 20, color: c.ink },
  outgoingText: { fontFamily: f.regular, fontSize: 15, lineHeight: 20, color: c.white },
  fullComposer: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 10, flexDirection: 'row', alignItems: 'flex-end', gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line, backgroundColor: c.white },
  attachButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.blush, alignItems: 'center', justifyContent: 'center' },
  fullMessageInput: { flex: 1, maxHeight: 120, minHeight: 42, borderRadius: 21, backgroundColor: c.canvas, borderWidth: 1, borderColor: c.line, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, fontFamily: f.regular, fontSize: 15, color: c.ink, textAlignVertical: 'center' },
  fullSend: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.pink, alignItems: 'center', justifyContent: 'center' },
  voiceRecordButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: c.pink, alignItems: 'center', justifyContent: 'center' },
  voiceRecordButtonActive: { backgroundColor: '#9A1D45' },
  recordingState: { flex: 1, height: 42, borderRadius: 21, backgroundColor: c.blush, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14 },
  recordingDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: c.pink },
  recordingText: { fontFamily: f.bold, fontSize: 13, color: c.pink },
  voiceBubble: { minWidth: 190, maxWidth: 260, height: 48, borderRadius: 20, borderTopLeftRadius: 6, backgroundColor: c.white, borderWidth: 1, borderColor: c.line, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 10 },
  voiceBubbleOutgoing: { backgroundColor: c.pink, borderColor: c.pink, borderTopLeftRadius: 20, borderTopRightRadius: 6 },
  voicePlay: { width: 30, height: 30, borderRadius: 15, backgroundColor: c.pink, alignItems: 'center', justifyContent: 'center' },
  voicePlayOutgoing: { backgroundColor: c.white },
  voiceWave: { flex: 1, height: 28, flexDirection: 'row', alignItems: 'center', gap: 3 },
  voiceBar: { width: 3, borderRadius: 2, backgroundColor: c.pink, opacity: .8 },
  voiceBarOutgoing: { backgroundColor: c.white },
  voiceDuration: { fontFamily: f.bold, fontSize: 10, color: c.muted },
  voiceDurationOutgoing: { color: c.white }
});
