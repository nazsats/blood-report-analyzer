// app/(tabs)/upload.tsx
import { useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, ScrollView,
    ActivityIndicator, Alert, Image, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { auth, API_BASE_URL } from '../../lib/firebaseClient';
import { Colors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';

const LOADING_STEPS = [
    'Scanning document structure...',
    'Identifying blood markers...',
    'Comparing with medical standards...',
    'Generating plain English insights...',
    'Finalizing your wellness report...',
];

export default function UploadScreen() {
    const [selectedFile, setSelectedFile] = useState<{
        uri: string; name: string; type: string; isImage: boolean;
    } | null>(null);
    const [uploading, setUploading] = useState(false);
    const [loadingStep, setLoadingStep] = useState(0);
    const router = useRouter();

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission required', 'Please allow access to your photo library.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: false,
            quality: 0.9,
        });
        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            setSelectedFile({
                uri: asset.uri,
                name: asset.fileName || `image_${Date.now()}.jpg`,
                type: asset.mimeType || 'image/jpeg',
                isImage: true,
            });
        }
    };

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission required', 'Please allow access to your camera.');
            return;
        }
        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: false,
            quality: 0.9,
        });
        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            setSelectedFile({
                uri: asset.uri,
                name: `photo_${Date.now()}.jpg`,
                type: 'image/jpeg',
                isImage: true,
            });
        }
    };

    const pickDocument = async () => {
        const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            setSelectedFile({
                uri: asset.uri,
                name: asset.name,
                type: 'application/pdf',
                isImage: false,
            });
        }
    };

    const handleAnalyze = async () => {
        if (!selectedFile) return;
        const user = auth.currentUser;
        if (!user) { Alert.alert('Not signed in', 'Please sign in first.'); return; }

        setUploading(true);
        setLoadingStep(0);
        const stepInterval = setInterval(() => {
            setLoadingStep(prev => prev < LOADING_STEPS.length - 1 ? prev + 1 : prev);
        }, 4000);

        try {
            const idToken = await user.getIdToken();
            const formData = new FormData();

            // If it's a PDF, try to extract text first
            let extractedText = "";
            if (!selectedFile.isImage) {
                try {
                    // Mobile-compatible way to get file text buffer in React Native
                    const response = await fetch(selectedFile.uri);
                    const blob = await response.blob();

                    if (Platform.OS === 'web') {
                        // @ts-ignore
                        const pdfjsLib = await import("pdfjs-dist/build/pdf.mjs");
                        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
                        const arrayBuffer = await blob.arrayBuffer();
                        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
                        const pdf = await loadingTask.promise;
                        for (let i = 1; i <= pdf.numPages; i++) {
                            const page = await pdf.getPage(i);
                            const textContent = await page.getTextContent();
                            const pageText = textContent.items.map((item: any) => item.str).join(" ");
                            extractedText += `--- Page ${i} ---\n${pageText}\n\n`;
                        }
                    }
                } catch (e) {
                    console.log("PDF text extraction failed or not supported natively:", e);
                }
            }

            formData.append('file', {
                uri: Platform.OS === 'ios' ? selectedFile.uri.replace('file://', '') : selectedFile.uri,
                name: selectedFile.name,
                type: selectedFile.type,
            } as any);

            if (extractedText) {
                formData.append('extractedText', extractedText);
            }

            const res = await fetch(`${API_BASE_URL}/api/analyze`, {
                method: 'POST',
                body: formData,
                headers: { Authorization: `Bearer ${idToken}` },
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Analysis failed');

            clearInterval(stepInterval);
            setUploading(false);
            setSelectedFile(null);
            router.push(`/results/${data.reportId}`);
        } catch (error: any) {
            clearInterval(stepInterval);
            setUploading(false);
            Alert.alert('Analysis Failed', error.message || 'Something went wrong. Please try again.');
        }
    };

    // --- Loading overlay ---
    if (uploading) {
        return (
            <View style={styles.loadingOverlay}>
                <View style={styles.loadingGlow} />
                <View style={styles.loadingIconRing}>
                    <Ionicons name="pulse" size={40} color={Colors.primaryLight} />
                </View>
                <Text style={styles.loadingTitle}>Analyzing Your Health</Text>
                <Text style={styles.loadingSubtitle}>Our AI is working through your blood report...</Text>
                <View style={styles.stepsList}>
                    {LOADING_STEPS.map((step, idx) => (
                        <View
                            key={idx}
                            style={[
                                styles.stepItem,
                                idx === loadingStep && styles.stepItemActive,
                                idx < loadingStep && styles.stepItemDone,
                            ]}
                        >
                            <View style={[styles.stepDot, idx < loadingStep && styles.stepDotDone, idx === loadingStep && styles.stepDotActive]}>
                                {idx < loadingStep
                                    ? <Ionicons name="checkmark" size={14} color="#fff" />
                                    : <Ionicons name="ellipse" size={8} color={idx === loadingStep ? Colors.primaryLight : Colors.textDim} />}
                            </View>
                            <Text style={[styles.stepText, idx === loadingStep && styles.stepTextActive, idx < loadingStep && styles.stepTextDone]}>
                                {step}
                            </Text>
                        </View>
                    ))}
                </View>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerBadge}>
                    <Ionicons name="sparkles" size={12} color={Colors.primaryLight} />
                    <Text style={styles.headerBadgeText}>AI Analysis Ready</Text>
                </View>
                <Text style={styles.title}>Upload Your{'\n'}<Text style={styles.titleAccent}>Blood Report</Text></Text>
                <Text style={styles.subtitle}>Supports PDF, JPG, and PNG · Processed in under 30 seconds</Text>
            </View>

            {/* File selected preview */}
            {selectedFile ? (
                <View style={styles.previewCard}>
                    {selectedFile.isImage ? (
                        <Image source={{ uri: selectedFile.uri }} style={styles.previewImage} resizeMode="contain" />
                    ) : (
                        <View style={styles.pdfPreview}>
                            <Ionicons name="document-text" size={48} color={Colors.primaryLight} />
                            <Text style={styles.pdfBadge}>PDF</Text>
                        </View>
                    )}
                    <View style={styles.fileInfoRow}>
                        <View style={styles.fileInfoLeft}>
                            <Ionicons name="document" size={16} color={Colors.primaryLight} />
                            <Text style={styles.fileName} numberOfLines={1}>{selectedFile.name}</Text>
                        </View>
                        <View style={styles.fileReadyBadge}>
                            <Ionicons name="checkmark-circle" size={14} color={Colors.accent} />
                            <Text style={styles.fileReadyText}>Ready</Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.analyzeBtn} onPress={handleAnalyze} activeOpacity={0.85}>
                        <Ionicons name="sparkles" size={18} color="#fff" />
                        <Text style={styles.analyzeBtnText}>Analyze My Report</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.clearBtn} onPress={() => setSelectedFile(null)}>
                        <Text style={styles.clearBtnText}>Choose a different file</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                /* Pick options */
                <View style={styles.pickCard}>
                    <View style={styles.pickIconContainer}>
                        <Ionicons name="cloud-upload-outline" size={48} color={Colors.primaryLight} />
                    </View>
                    <Text style={styles.pickTitle}>Select Your Report</Text>
                    <Text style={styles.pickSubtitle}>Choose from camera, gallery, or files</Text>

                    <View style={styles.optionRow}>
                        <TouchableOpacity style={styles.optionBtn} onPress={takePhoto} activeOpacity={0.8}>
                            <Ionicons name="camera-outline" size={28} color={Colors.primaryLight} />
                            <Text style={styles.optionLabel}>Camera</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.optionBtn} onPress={pickImage} activeOpacity={0.8}>
                            <Ionicons name="images-outline" size={28} color={Colors.primaryLight} />
                            <Text style={styles.optionLabel}>Gallery</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.optionBtn} onPress={pickDocument} activeOpacity={0.8}>
                            <Ionicons name="document-outline" size={28} color={Colors.primaryLight} />
                            <Text style={styles.optionLabel}>PDF</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Trust badges */}
            <View style={styles.badges}>
                {['🔒 Encrypted', '🏥 HIPAA Safe', '⚡ 30s Analysis', '🗑️ Auto-deleted after 30d'].map(b => (
                    <Text key={b} style={styles.badge}>{b}</Text>
                ))}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    content: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40 },
    header: { alignItems: 'center', marginBottom: 28 },
    headerBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: Colors.primaryMuted, borderWidth: 1, borderColor: Colors.primaryBorder,
        borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 16,
    },
    headerBadgeText: { fontSize: 13, fontWeight: '600', color: Colors.primaryLight },
    title: { fontSize: 36, fontWeight: '900', color: Colors.textPrimary, textAlign: 'center', lineHeight: 42, marginBottom: 8 },
    titleAccent: { color: Colors.primaryLight },
    subtitle: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
    pickCard: {
        backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
        borderRadius: 28, padding: 28, alignItems: 'center',
    },
    pickIconContainer: {
        width: 80, height: 80, borderRadius: 24,
        backgroundColor: Colors.primaryMuted, borderWidth: 1, borderColor: Colors.primaryBorder,
        alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    },
    pickTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginBottom: 6 },
    pickSubtitle: { fontSize: 13, color: Colors.textMuted, marginBottom: 28 },
    optionRow: { flexDirection: 'row', gap: 16 },
    optionBtn: {
        flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: Colors.border,
        borderRadius: 20, paddingVertical: 20, alignItems: 'center', gap: 8,
    },
    optionLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
    previewCard: {
        backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
        borderRadius: 28, padding: 20,
    },
    previewImage: { height: 200, borderRadius: 16, marginBottom: 16, backgroundColor: '#1a0d30' },
    pdfPreview: {
        height: 160, alignItems: 'center', justifyContent: 'center',
        backgroundColor: Colors.primaryMuted, borderRadius: 16, marginBottom: 16, position: 'relative',
    },
    pdfBadge: {
        position: 'absolute', top: 12, right: 12,
        backgroundColor: Colors.primary, color: '#fff', fontSize: 10, fontWeight: '800',
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    },
    fileInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    fileInfoLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
    fileName: { flex: 1, fontSize: 13, color: Colors.textSecondary },
    fileReadyBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    fileReadyText: { fontSize: 12, color: Colors.accent, fontWeight: '600' },
    analyzeBtn: {
        backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 16,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 10,
        shadowColor: Colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16,
    },
    analyzeBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
    clearBtn: { paddingVertical: 10, alignItems: 'center' },
    clearBtnText: { color: Colors.textMuted, fontSize: 14 },
    badges: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 24 },
    badge: { fontSize: 11, color: Colors.textDim },
    // Loading overlay styles
    loadingOverlay: {
        flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: 32, paddingTop: 60,
    },
    loadingGlow: {
        position: 'absolute', width: 300, height: 300, borderRadius: 150,
        backgroundColor: Colors.primaryMuted, top: '15%',
    },
    loadingIconRing: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: Colors.primaryMuted, borderWidth: 2, borderColor: Colors.primaryBorder,
        alignItems: 'center', justifyContent: 'center', marginBottom: 20,
    },
    loadingTitle: { fontSize: 26, fontWeight: '900', color: Colors.textPrimary, marginBottom: 8, textAlign: 'center' },
    loadingSubtitle: { fontSize: 14, color: Colors.textMuted, marginBottom: 32, textAlign: 'center' },
    stepsList: { width: '100%', gap: 12 },
    stepItem: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        padding: 14, borderRadius: 16, borderWidth: 1, borderColor: 'transparent',
    },
    stepItemActive: { backgroundColor: Colors.primaryMuted, borderColor: Colors.primaryBorder },
    stepItemDone: { backgroundColor: Colors.accentMuted },
    stepDot: {
        width: 32, height: 32, borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center',
    },
    stepDotActive: { backgroundColor: Colors.primary },
    stepDotDone: { backgroundColor: Colors.accentMuted },
    stepText: { fontSize: 14, color: Colors.textDim, fontWeight: '500' },
    stepTextActive: { color: Colors.primaryLight },
    stepTextDone: { color: Colors.accentLight },
});
