// app/(tabs)/profile.tsx
import { useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebaseClient';
import { useAuth } from '../../hooks/useAuth';
import { Colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
    const { user } = useAuth();
    const [signingOut, setSigningOut] = useState(false);

    const handleSignOut = () => {
        Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Sign Out', style: 'destructive',
                onPress: async () => {
                    setSigningOut(true);
                    try { await signOut(auth); }
                    catch { Alert.alert('Error', 'Failed to sign out.'); setSigningOut(false); }
                },
            },
        ]);
    };

    const initial = user?.email?.[0]?.toUpperCase() ?? '?';
    const email = user?.email ?? 'Unknown';
    const displayName = user?.displayName ?? email.split('@')[0];

    const menuItems = [
        { icon: 'cloud-upload-outline', label: 'Upload Report', description: 'Analyze a new blood report' },
        { icon: 'time-outline', label: 'Report History', description: 'View all your past reports' },
        { icon: 'shield-checkmark-outline', label: 'Privacy & Security', description: 'Data encrypted end-to-end' },
        { icon: 'information-circle-outline', label: 'About BloodAI', description: 'Version 1.0.0' },
    ];

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Profile</Text>
            </View>

            {/* Avatar + Info */}
            <View style={styles.avatarCard}>
                {/* Decorative glow */}
                <View style={styles.glowCircle} />
                <View style={styles.avatarRing}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{initial}</Text>
                    </View>
                </View>
                <Text style={styles.displayName}>{displayName}</Text>
                <Text style={styles.email}>{email}</Text>
                <View style={styles.accountBadge}>
                    <Ionicons name="checkmark-circle" size={14} color={Colors.accent} />
                    <Text style={styles.accountBadgeText}>Verified Account</Text>
                </View>
            </View>

            {/* Menu items */}
            <View style={styles.menuCard}>
                {menuItems.map((item, idx) => (
                    <View key={item.label}>
                        <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
                            <View style={styles.menuIconWrap}>
                                <Ionicons name={item.icon as any} size={20} color={Colors.primaryLight} />
                            </View>
                            <View style={styles.menuText}>
                                <Text style={styles.menuLabel}>{item.label}</Text>
                                <Text style={styles.menuDesc}>{item.description}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={Colors.textDim} />
                        </TouchableOpacity>
                        {idx < menuItems.length - 1 && <View style={styles.menuDivider} />}
                    </View>
                ))}
            </View>

            {/* Sign out */}
            <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} disabled={signingOut} activeOpacity={0.8}>
                {signingOut
                    ? <ActivityIndicator color={Colors.danger} />
                    : <>
                        <Ionicons name="log-out-outline" size={18} color={Colors.danger} />
                        <Text style={styles.signOutText}>Sign Out</Text>
                    </>}
            </TouchableOpacity>

            {/* Footer */}
            <Text style={styles.footer}>BloodAI · All data is encrypted and private</Text>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    content: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40 },
    header: { marginBottom: 24 },
    headerTitle: { fontSize: 30, fontWeight: '900', color: Colors.textPrimary },
    avatarCard: {
        backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
        borderRadius: 28, padding: 32, alignItems: 'center', marginBottom: 20, overflow: 'hidden',
    },
    glowCircle: {
        position: 'absolute', width: 200, height: 200, borderRadius: 100,
        backgroundColor: Colors.primaryMuted, top: -60,
    },
    avatarRing: {
        padding: 4, borderRadius: 44, borderWidth: 2, borderColor: Colors.primaryBorder,
        marginBottom: 16,
    },
    avatar: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: Colors.primaryMuted,
        alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { fontSize: 28, fontWeight: '900', color: Colors.primaryLight },
    displayName: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
    email: { fontSize: 14, color: Colors.textMuted, marginBottom: 12 },
    accountBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: Colors.accentMuted, borderRadius: 20,
        paddingHorizontal: 12, paddingVertical: 5,
    },
    accountBadgeText: { fontSize: 12, color: Colors.accent, fontWeight: '600' },
    menuCard: {
        backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
        borderRadius: 24, marginBottom: 16, overflow: 'hidden',
    },
    menuItem: { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 14 },
    menuIconWrap: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: Colors.primaryMuted, borderWidth: 1, borderColor: Colors.primaryBorder,
        alignItems: 'center', justifyContent: 'center',
    },
    menuText: { flex: 1 },
    menuLabel: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
    menuDesc: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
    menuDivider: { height: 1, backgroundColor: Colors.borderLight, marginHorizontal: 18 },
    signOutBtn: {
        backgroundColor: Colors.dangerMuted, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
        borderRadius: 16, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center',
        alignItems: 'center', gap: 10, marginBottom: 20,
    },
    signOutText: { fontSize: 16, fontWeight: '700', color: Colors.danger },
    footer: { textAlign: 'center', fontSize: 11, color: Colors.textDim },
});
