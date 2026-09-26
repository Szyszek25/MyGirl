import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as c, fonts as f, radii as r, space as sp } from './theme';
import { Typography } from './ui';
import { people } from './data';
import { supabase } from './lib/supabase';
import { createChatRealtime } from './services/chatRealtime';
import { loadFriendRequests, removeFriendRequest, sendFriendRequest } from './services/friendsApi';

function formatMemberSince(dateStr) {
  if (!dateStr) return 'W Polce od września 2026';
  try {
    const d = new Date(dateStr);
    const months = [
      'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
      'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'
    ];
    const m = months[d.getMonth()] || 'września';
    const y = d.getFullYear() || 2026;
    return `W Polce od ${m} ${y}`;
  } catch {
    return 'W Polce od września 2026';
  }
}

export default function PublicProfileModal({
  visible,
  authorName,
  authorId,
  initialData = null,
  onClose,
  onOpenChat,
  onReport,
  sessionUserId = null
}) {
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [existingConversationId, setExistingConversationId] = useState(null);
  const [friendSent, setFriendSent] = useState(false);
  const [outgoingRequestId, setOutgoingRequestId] = useState(null);
  const [friendBusy, setFriendBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;

    let alive = true;
    const name = authorName || initialData?.author || initialData?.name;
    const fallbackPerson = people.find(p => p.name?.toLowerCase() === name?.toLowerCase()) || initialData;

    setProfileData({
      id: authorId || fallbackPerson?.id,
      name: name || fallbackPerson?.name || 'Polka',
      photo: initialData?.avatar || initialData?.photo || fallbackPerson?.photo || people[0]?.photo,
      city: initialData?.city || fallbackPerson?.city || 'Warszawa',
      bio: fallbackPerson?.bio || 'Aktywna dziewczyna w społeczności Polka. Lubię dobre kawiarnie, spacery i nowe znajomości.',
      tags: fallbackPerson?.tags || ['Kawa', 'Spacery', 'Matcha'],
      prompt: fallbackPerson?.prompt || 'Idealny plan na weekend?',
      answer: fallbackPerson?.answer || 'Kawa w centrum, spacer i zero pośpiechu.',
      createdAt: fallbackPerson?.createdAt || initialData?.createdAt || '2026-09-01T12:00:00Z',
      galleryPhotos: (fallbackPerson?.galleryPhotos || initialData?.galleryPhotos || []).map(item => item?.url || item).filter(Boolean)
    });

    if (authorId && /^[0-9a-f-]{36}$/i.test(authorId)) {
      setLoading(true);
      supabase
        .from('profiles')
        .select('id, display_name, city, bio, avatar_path, created_at, profile_prompt, profile_answer')
        .eq('id', authorId)
        .single()
        .then(async ({ data, error }) => {
          if (!alive || error || !data) return;
          let avatarUrl = null;
          if (data.avatar_path) {
            if (/^https?:\/\//i.test(data.avatar_path)) {
              avatarUrl = data.avatar_path;
            } else {
              const { data: signed } = await supabase.storage
                .from('polka-avatars')
                .createSignedUrl(data.avatar_path, 3600);
              avatarUrl = signed?.signedUrl || null;
            }
          }

          const [{ data: interests }, { data: photoRows }] = await Promise.all([
            supabase.from('profile_interests').select('interest').eq('profile_id', authorId),
            supabase.from('profile_photos').select('storage_path,source_url,position').eq('user_id', authorId).order('position',{ascending:true})
          ]);
          const galleryPhotos = (await Promise.all((photoRows || []).map(async row => {
            if (row.source_url) return row.source_url;
            if (!row.storage_path) return null;
            const { data: signed } = await supabase.storage.from('polka-profile-photos').createSignedUrl(row.storage_path, 3600);
            return signed?.signedUrl || null;
          }))).filter(Boolean);

          setProfileData(prev => ({
            ...prev,
            name: data.display_name || prev.name,
            city: data.city || prev.city,
            bio: data.bio || prev.bio,
            photo: avatarUrl || prev.photo,
            createdAt: data.created_at || prev.createdAt,
            prompt: data.profile_prompt || prev.prompt,
            answer: data.profile_answer || prev.answer,
            tags: interests?.length ? interests.map(i => i.interest) : prev.tags,
            galleryPhotos
          }));
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
    }

    return () => {
      alive = false;
    };
  }, [visible, authorName, authorId, initialData]);

  useEffect(() => {
    if (!visible || !sessionUserId || !authorId || !/^[0-9a-f-]{36}$/i.test(authorId)) {
      setExistingConversationId(null);
      setFriendSent(false);
      setOutgoingRequestId(null);
      return;
    }
    let alive = true;
    (async () => {
      const [rooms, requests] = await Promise.all([
        createChatRealtime(supabase).listConversations(sessionUserId),
        loadFriendRequests(sessionUserId)
      ]);
      if (!alive) return;
      const direct = (rooms || []).find(room => room.kind === 'direct' && room.otherUserId === authorId);
      setExistingConversationId(direct?.id || null);
      const outgoing = (requests || []).find(row => row.direction === 'outgoing' && row.otherId === authorId);
      setFriendSent(!!outgoing);
      setOutgoingRequestId(outgoing?.id || null);
    })().catch(() => {});
    return () => { alive = false; };
  }, [visible, sessionUserId, authorId]);

  const handleAddFriend = async () => {
    if (!sessionUserId || !profileData?.id || friendBusy || friendSent) return;
    setFriendBusy(true);
    try {
      const request = await sendFriendRequest(sessionUserId, profileData.id);
      if (request?.id) setOutgoingRequestId(request.id);
      else {
        const requests = await loadFriendRequests(sessionUserId);
        setOutgoingRequestId((requests || []).find(row => row.direction === 'outgoing' && row.otherId === profileData.id)?.id || null);
      }
      setFriendSent(true);
    } finally {
      setFriendBusy(false);
    }
  };

  const handleCancelFriend = async () => {
    if (!sessionUserId || !profileData?.id || friendBusy || !friendSent) return;
    setFriendBusy(true);
    try {
      let requestId = outgoingRequestId;
      if (!requestId) {
        const requests = await loadFriendRequests(sessionUserId);
        requestId = (requests || []).find(row => row.direction === 'outgoing' && row.otherId === profileData.id)?.id || null;
      }
      if (requestId) await removeFriendRequest(requestId);
      setFriendSent(false);
      setOutgoingRequestId(null);
    } finally {
      setFriendBusy(false);
    }
  };

  if (!visible || !profileData) return null;

  const handleMessage = () => {
    onClose();
    if (onOpenChat) {
      onOpenChat(profileData.id || profileData.name);
    }
  };

  const handleReport = () => {
    if (onReport) {
      onReport({
        kind: 'profile',
        id: profileData.id || profileData.name,
        label: `Profil: ${profileData.name}`
      });
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={s.root}>
        {/* Top Header Bar */}
        <View style={s.navBar}>
          <Pressable onPress={onClose} style={s.iconBtn} hitSlop={12} accessibilityLabel="Zamknij">
            <Ionicons name="arrow-back" size={24} color={c.ink} />
          </Pressable>
          <Typography style={s.navTitle}>Profil</Typography>
          <Pressable onPress={handleReport} style={s.iconBtn} hitSlop={12} accessibilityLabel="Więcej opcji">
            <Ionicons name="ellipsis-horizontal" size={22} color={c.ink} />
          </Pressable>
        </View>

        {loading && (
          <View style={s.loadingBar}>
            <ActivityIndicator size="small" color={c.pink} />
          </View>
        )}

        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Card */}
          <View style={s.heroCard}>
            <View style={s.avatarContainer}>
              <Image
                source={{ uri: profileData.photo }}
                style={s.avatar}
                resizeMode="cover"
              />
              <View style={s.verifiedBadge}>
                <Ionicons name="checkmark" size={14} color={c.white} />
              </View>
            </View>

            <View style={s.nameRow}>
              <Typography style={s.name}>{profileData.name}</Typography>
            </View>

            <View style={s.metaRow}>
              <View style={s.cityPill}>
                <Ionicons name="location-sharp" size={13} color={c.pink} />
                <Typography style={s.cityText}>{profileData.city}</Typography>
              </View>

              <View style={s.sincePill}>
                <Ionicons name="sparkles" size={12} color="#D97706" />
                <Typography style={s.sinceText}>
                  {formatMemberSince(profileData.createdAt)}
                </Typography>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={s.quickActionsRow}>
              <Pressable onPress={handleMessage} style={[s.primaryMsgBtn, s.quickActionBtn]}>
                <Ionicons name="chatbubble-ellipses" size={18} color={c.white} />
                <Typography style={s.primaryMsgText}>{existingConversationId ? 'Otwórz czat' : 'Napisz'}</Typography>
              </Pressable>
              <Pressable disabled={friendBusy || !sessionUserId} onPress={friendSent ? handleCancelFriend : handleAddFriend} style={[s.friendActionBtn, s.quickActionBtn, friendSent && s.addFriendBtnSent]}>
                <Ionicons name={friendSent ? 'person-remove-outline' : 'person-add-outline'} size={18} color={c.pink} />
                <Typography style={[s.friendActionText, friendSent && s.addFriendTextSent]}>{friendBusy ? 'Chwila…' : friendSent ? 'Wycofaj' : 'Zaproś'}</Typography>
              </Pressable>
            </View>
          </View>

          {/* Bio Section */}
          <View style={s.sectionCard}>
            <Typography style={s.sectionHeader}>O MNIE</Typography>
            <Typography style={s.bioText}>{profileData.bio}</Typography>
          </View>

          {Boolean(profileData.galleryPhotos?.length) && (
            <View style={s.photoSection}>
              <Typography style={s.sectionHeader}>ZDJĘCIA</Typography>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.photoRail}>
                {profileData.galleryPhotos.map((uri, idx) => <Image key={uri || idx} source={{uri}} style={s.profilePhoto} resizeMode="cover" />)}
              </ScrollView>
            </View>
          )}

          {/* Interests Tags */}
          {Boolean(profileData.tags?.length) && (
            <View style={s.sectionCard}>
              <Typography style={s.sectionHeader}>ZAINTERESOWANIA</Typography>
              <View style={s.tagsWrap}>
                {profileData.tags.map((tag, idx) => (
                  <View key={idx} style={s.tagChip}>
                    <Typography style={s.tagText}>{tag}</Typography>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Prompt / Icebreaker Card */}
          {Boolean(profileData.prompt && profileData.answer) && (
            <View style={s.promptCard}>
              <View style={s.promptHeaderRow}>
                <Ionicons name="chatbubble-outline" size={16} color={c.pink} />
                <Typography style={s.promptQuestion}>{profileData.prompt}</Typography>
              </View>
              <Typography style={s.promptAnswer}>{profileData.answer}</Typography>
            </View>
          )}

          {/* Trust & Safety Info */}
          <View style={s.trustNotice}>
            <Ionicons name="shield-checkmark-outline" size={18} color={c.pink} />
            <View style={{ flex: 1 }}>
              <Typography style={s.trustTitle}>Bezpieczna społeczność dziewczyn</Typography>
              <Typography style={s.trustDesc}>
                Profile w Polce podlegają wytycznym bezpieczeństwa i wzajemnego szacunku.
              </Typography>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F7F3F5'
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 14 : 18,
    paddingBottom: 14,
    backgroundColor: c.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.line
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20
  },
  navTitle: {
    fontFamily: f.bold,
    fontSize: 16,
    color: c.ink
  },
  loadingBar: {
    paddingVertical: 4,
    alignItems: 'center',
    backgroundColor: c.white
  },
  scroll: {
    flex: 1
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
    gap: 14
  },

  /* Hero Card */
  heroCard: {
    backgroundColor: c.white,
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: c.line,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 14
  },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 3.5,
    borderColor: c.pink,
    backgroundColor: c.blush
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 2,
    right: 4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: c.pink,
    borderWidth: 2,
    borderColor: c.white,
    alignItems: 'center',
    justifyContent: 'center'
  },
  name: {
    fontFamily: f.bold,
    fontSize: 22,
    color: c.ink,
    marginBottom: 8
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 8
  },
  addFriendBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.pinkDark,
    backgroundColor: 'transparent'
  },
  addFriendText: {
    fontFamily: f.semibold,
    fontSize: 13,
    color: c.pinkDark
  },
  addFriendBtnSent: { backgroundColor: c.blush, borderColor: c.blush },
  addFriendTextSent: { color: c.pink },
  photoSection: { backgroundColor: c.white, borderRadius: 20, paddingVertical: 18, paddingHorizontal: 18, borderWidth: 1, borderColor: c.line },
  photoRail: { paddingTop: 10, gap: 10 },
  profilePhoto: { width: 210, aspectRatio: .78, borderRadius: 20, backgroundColor: c.blush },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20
  },
  cityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: c.blush,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999
  },
  cityText: {
    fontFamily: f.semibold,
    fontSize: 12,
    color: c.pink
  },
  sincePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999
  },
  sinceText: {
    fontFamily: f.semibold,
    fontSize: 12,
    color: '#92400E'
  },
  quickActionsRow: { flexDirection: 'row', gap: 10, width: '100%' },
  quickActionBtn: { flex: 1 },
  friendActionBtn: { minHeight: 48, borderRadius: 999, borderWidth: 1.5, borderColor: c.pink, backgroundColor: c.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  friendActionText: { fontFamily: f.semibold, fontSize: 15, color: c.pink },
  primaryMsgBtn: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: c.pink,
    borderRadius: 999,
    paddingVertical: 13,
    paddingHorizontal: 28,
    width: '100%',
    shadowColor: c.pink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3
  },
  primaryMsgText: {
    fontFamily: f.bold,
    fontSize: 15,
    color: c.white
  },

  /* Sections */
  sectionCard: {
    backgroundColor: c.white,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: c.line
  },
  sectionHeader: {
    fontFamily: f.bold,
    fontSize: 11,
    letterSpacing: 1.1,
    color: c.muted,
    marginBottom: 8
  },
  bioText: {
    fontFamily: f.regular,
    fontSize: 15,
    lineHeight: 22,
    color: c.ink
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  tagChip: {
    backgroundColor: c.canvas,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7
  },
  tagText: {
    fontFamily: f.semibold,
    fontSize: 13,
    color: c.ink
  },

  /* Prompt */
  promptCard: {
    backgroundColor: '#FFF7F9',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#FCE7F0'
  },
  promptHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8
  },
  promptQuestion: {
    fontFamily: f.bold,
    fontSize: 13,
    color: c.pink
  },
  promptAnswer: {
    fontFamily: f.regular,
    fontSize: 15,
    lineHeight: 22,
    color: c.ink
  },

  /* Trust Notice */
  trustNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: c.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: c.line
  },
  trustTitle: {
    fontFamily: f.bold,
    fontSize: 13,
    color: c.ink,
    marginBottom: 2
  },
  trustDesc: {
    fontFamily: f.regular,
    fontSize: 12,
    lineHeight: 17,
    color: c.muted
  }
});
