// app/results/[reportId].tsx
import { useEffect, useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Share,
} from 'react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebaseClient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, RISK_COLORS, scoreColor } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';

const FLAG_STYLES: Record<string, { bg: string; border: string; text: string }> = {
    high: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)', text: '#f87171' },
    low: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', text: '#fbbf24' },
    normal: { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)', text: '#34d399' },
    borderline: { bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.25)', text: '#a78bfa' },
};

export default function ResultsScreen() {
    const { reportId } = useLocalSearchParams<{ reportId: string }>();
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (!reportId) return;
        const unsub = onSnapshot(doc(db, 'reports', reportId), snap => {
            if (snap.exists()) setReport({ id: snap.id, ...snap.data() });
            setLoading(false);
        });
        return () => unsub();
    }, [reportId]);

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Check out my blood report analysis on BloodAI! Score: ${report?.overallScore}/10`,
                title: 'My Blood Report',
            });
        } catch { }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={Colors.primaryLight} />
            </View>
        );
    }

    if (!report) {
        return (
            <View style={styles.center}>
                <Text style={styles.notFound}>Report not found.</Text>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Text style={styles.backBtnText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const sc: number = report.overallScore;
    const risk = report.riskLevel && RISK_COLORS[report.riskLevel];
    const tests: any[] = Array.isArray(report.tests) ? report.tests : [];
    const abnormal = tests.filter(t => t.flag !== 'normal');
    const normal = tests.filter(t => t.flag === 'normal');

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Back button */}
            <TouchableOpacity style={styles.topBack} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
                <Text style={styles.topBackText}>History</Text>
            </TouchableOpacity>

            {/* Title */}
            <Text style={styles.fileName} numberOfLines={2}>{report.fileName || 'Blood Report'}</Text>

            {/* Score card */}
            {sc != null && (
                <View style={styles.scoreCard}>
                    <View style={styles.scoreGlow} />
                    <Text style={styles.scoreLabel}>Overall Health Score</Text>
                    <Text style={[styles.scoreValue, { color: scoreColor(sc) }]}>{sc}<Text style={styles.scoreMax}>/10</Text></Text>
                    {risk && (
                        <View style={[styles.riskBadge, { backgroundColor: risk.bg, borderColor: risk.border }]}>
                            <View style={[styles.riskDot, { backgroundColor: risk.dot }]} />
                            <Text style={[styles.riskText, { color: risk.text }]}>
                                {report.riskLevel.charAt(0).toUpperCase() + report.riskLevel.slice(1)} Risk
                            </Text>
                        </View>
                    )}
                    <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                        <Ionicons name="share-outline" size={16} color={Colors.primaryLight} />
                        <Text style={styles.shareBtnText}>Share Results</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Summary */}
            {report.summary && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        <Ionicons name="document-text-outline" size={16} color={Colors.primaryLight} /> Summary
                    </Text>
                    <Text style={styles.summaryText}>{report.summary}</Text>
                </View>
            )}

            {/* Test results */}
            {tests.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        <Ionicons name="pulse-outline" size={16} color={Colors.primaryLight} /> Test Results ({tests.length})
                    </Text>
                    {/* Abnormal first */}
                    {abnormal.length > 0 && (
                        <View style={styles.groupContainer}>
                            <Text style={styles.groupLabel}>⚠️ Needs Attention ({abnormal.length})</Text>
                            {abnormal.map((t, i) => <TestRow key={i} test={t} />)}
                        </View>
                    )}
                    {normal.length > 0 && (
                        <View style={styles.groupContainer}>
                            <Text style={styles.groupLabel}>✅ Normal ({normal.length})</Text>
                            {normal.map((t, i) => <TestRow key={i} test={t} />)}
                        </View>
                    )}
                </View>
            )}

            {/* Recommendations */}
            {Array.isArray(report.recommendations) && report.recommendations.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        <Ionicons name="star-outline" size={16} color={Colors.primaryLight} /> Recommendations
                    </Text>
                    {report.recommendations.map((rec: string, i: number) => (
                        <View key={i} style={styles.recRow}>
                            <Ionicons name="checkmark-circle" size={16} color={Colors.accent} style={{ marginTop: 2 }} />
                            <Text style={styles.recText}>{rec}</Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Future predictions */}
            {Array.isArray(report.futurePredictions) && report.futurePredictions.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        <Ionicons name="trending-up-outline" size={16} color={Colors.primaryLight} /> AI Predictions
                    </Text>
                    {report.futurePredictions.map((p: string, i: number) => (
                        <View key={i} style={styles.predRow}>
                            <Ionicons name="analytics-outline" size={14} color={Colors.secondary} style={{ marginTop: 2 }} />
                            <Text style={styles.predText}>{p}</Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Disclaimer */}
            <View style={styles.disclaimer}>
                <Ionicons name="information-circle-outline" size={14} color={Colors.textDim} />
                <Text style={styles.disclaimerText}>
                    This analysis is for informational purposes only and is not a substitute for professional medical advice.
                </Text>
            </View>
        </ScrollView>
    );
}

function TestRow({ test }: { test: any }) {
    const flag = test.flag?.toLowerCase() || 'normal';
    const style = FLAG_STYLES[flag] || FLAG_STYLES.normal;
    return (
        <View style={[styles.testRow, { borderColor: style.border, backgroundColor: style.bg }]}>
            <View style={{ flex: 1 }}>
                <Text style={styles.testName}>{test.name}</Text>
                <Text style={styles.testRange}>Reference: {test.referenceRange || '—'}</Text>
            </View>
            <View style={styles.testRight}>
                <Text style={[styles.testValue, { color: style.text }]}>{test.value} {test.unit || ''}</Text>
                <View style={[styles.flagBadge, { backgroundColor: style.bg, borderColor: style.border }]}>
                    <Text style={[styles.flagText, { color: style.text }]}>{flag.toUpperCase()}</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    content: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 50 },
    center: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center', gap: 16 },
    notFound: { color: Colors.textMuted, fontSize: 16 },
    backBtn: { backgroundColor: Colors.primaryMuted, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 },
    backBtnText: { color: Colors.primaryLight, fontWeight: '600' },
    topBack: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
    topBackText: { fontSize: 16, color: Colors.textPrimary, fontWeight: '600' },
    fileName: { fontSize: 22, fontWeight: '900', color: Colors.textPrimary, marginBottom: 20, lineHeight: 30 },
    scoreCard: {
        backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.primaryBorder,
        borderRadius: 28, padding: 28, alignItems: 'center', marginBottom: 20, overflow: 'hidden',
    },
    scoreGlow: {
        position: 'absolute', width: 180, height: 180, borderRadius: 90,
        backgroundColor: Colors.primaryMuted, top: -40,
    },
    scoreLabel: { fontSize: 13, color: Colors.textMuted, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
    scoreValue: { fontSize: 72, fontWeight: '900', lineHeight: 80 },
    scoreMax: { fontSize: 28, color: Colors.textMuted },
    riskBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginTop: 12,
    },
    riskDot: { width: 8, height: 8, borderRadius: 4 },
    riskText: { fontSize: 14, fontWeight: '700' },
    shareBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20,
        backgroundColor: Colors.primaryMuted, borderWidth: 1, borderColor: Colors.primaryBorder,
        borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8,
    },
    shareBtnText: { fontSize: 14, fontWeight: '600', color: Colors.primaryLight },
    section: {
        backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
        borderRadius: 24, padding: 20, marginBottom: 16,
    },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, marginBottom: 14, gap: 8 },
    summaryText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
    groupContainer: { marginBottom: 12 },
    groupLabel: { fontSize: 13, fontWeight: '700', color: Colors.textMuted, marginBottom: 10 },
    testRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 8,
    },
    testName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginBottom: 3 },
    testRange: { fontSize: 11, color: Colors.textDim },
    testRight: { alignItems: 'flex-end', gap: 5 },
    testValue: { fontSize: 15, fontWeight: '800' },
    flagBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    flagText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
    recRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    recText: { flex: 1, fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
    predRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
    predText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
    disclaimer: {
        flexDirection: 'row', gap: 8, marginTop: 8,
        backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 14,
    },
    disclaimerText: { flex: 1, fontSize: 11, color: Colors.textDim, lineHeight: 16 },
});
