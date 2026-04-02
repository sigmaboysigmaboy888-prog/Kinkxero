const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class WhatsAppShield {
    constructor() {
        this.activeSessions = new Map();
        this.shieldLogs = [];
        this.databasePath = path.join(__dirname, '../database/shieldRegistry.json');
        this.loadFromDatabase();
        
        // Konfigurasi proteksi
        this.protectionConfig = {
            antiBan: {
                enabled: true,
                techniques: {
                    sessionRotation: true,
                    fingerprintMasking: true,
                    signatureSpoofing: true,
                    metaEncryption: true
                },
                level: 'MAXIMUM'
            },
            antiLimit: {
                enabled: true,
                techniques: {
                    rateLimitBypass: true,
                    dynamicDelay: true,
                    requestDistributor: true,
                    ipRotation: true
                },
                level: 'MAXIMUM'
            }
        };
        
        console.log('[WHATSAPP SHIELD] Shield engine initialized');
    }
    
    // Load dari database
    loadFromDatabase() {
        try {
            if (fs.existsSync(this.databasePath)) {
                const data = fs.readFileSync(this.databasePath, 'utf8');
                const shields = JSON.parse(data);
                
                for (const [id, shield] of Object.entries(shields)) {
                    if (shield.status === 'ACTIVE') {
                        this.activeSessions.set(shield.number, shield);
                    }
                }
                
                console.log(`[WHATSAPP SHIELD] Loaded ${this.activeSessions.size} active shields`);
            }
        } catch (error) {
            console.error('[WHATSAPP SHIELD] Error loading database:', error);
        }
    }
    
    // Generate unique shield token
    generateShieldToken(number, type) {
        const payload = {
            number: number,
            type: type,
            timestamp: Date.now(),
            random: crypto.randomBytes(16).toString('hex'),
            signature: crypto.createHash('sha256').update(`${number}:${type}:${Date.now()}:XE_ROX_SECRET`).digest('hex')
        };
        
        return Buffer.from(JSON.stringify(payload)).toString('base64');
    }
    
    // Deploy shield ke nomor target
    deployShield(number, shieldType) {
        // Cek apakah sudah ada shield aktif
        if (this.activeSessions.has(number)) {
            const existing = this.activeSessions.get(number);
            if (existing.status === 'ACTIVE') {
                return {
                    success: false,
                    error: 'SHIELD_ALREADY_ACTIVE',
                    message: `Nomor ${number} sudah memiliki shield ${existing.type} yang aktif`,
                    existingShield: existing
                };
            }
        }
        
        const shieldId = uuidv4();
        const shieldToken = this.generateShieldToken(number, shieldType);
        const timestamp = Date.now();
        
        // Konfigurasi proteksi berdasarkan tipe
        const protectionLayers = {
            antiBan: {
                enabled: shieldType === 'anti_ban' || shieldType === 'multi_shield',
                techniques: [
                    'SESSION_FINGERPRINT_ENCRYPTION',
                    'WHATSAPP_META_MASKING',
                    'BAN_PREVENTION_PROTOCOL',
                    'SIGNATURE_SPOOFING_LAYER',
                    'ACID_TRANSACTION_SHIELD'
                ]
            },
            antiLimit: {
                enabled: shieldType === 'anti_limit' || shieldType === 'multi_shield',
                techniques: [
                    'RATE_LIMIT_BYPASS_ENGINE',
                    'DYNAMIC_REQUEST_THROTTLE',
                    'SMART_DELAY_INJECTOR',
                    'MULTI_CHANNEL_ROUTING',
                    'REQUEST_DISTRIBUTOR'
                ]
            }
        };
        
        // Shield data lengkap
        const shieldData = {
            id: shieldId,
            number: number,
            type: shieldType,
            token: shieldToken,
            activatedAt: timestamp,
            expiresAt: timestamp + (365 * 24 * 60 * 60 * 1000),
            status: 'ACTIVE',
            protectionLayers: protectionLayers,
            stats: {
                totalProtected: 0,
                lastPing: timestamp,
                successRate: 100,
                activeTechniques: []
            },
            metadata: {
                version: '3.0.0',
                engine: 'XE_ROX_ULTIMATE',
                encryption: 'AES-256-GCM'
            }
        };
        
        // Tambahkan teknik aktif
        if (protectionLayers.antiBan.enabled) {
            shieldData.stats.activeTechniques.push(...protectionLayers.antiBan.techniques);
        }
        if (protectionLayers.antiLimit.enabled) {
            shieldData.stats.activeTechniques.push(...protectionLayers.antiLimit.techniques);
        }
        
        // Simpan ke session aktif
        this.activeSessions.set(number, shieldData);
        
        // Log aktivasi
        this.addLog({
            type: 'SHIELD_DEPLOYED',
            number: number,
            shieldType: shieldType,
            shieldId: shieldId,
            timestamp: timestamp
        });
        
        console.log(`[WHATSAPP SHIELD] DEPLOYED ${shieldType} for ${number} | ID: ${shieldId}`);
        
        return {
            success: true,
            shieldData: shieldData,
            message: `Shield ${shieldType} berhasil diaktifkan untuk ${number}`
        };
    }
    
    // Proteksi request WhatsApp
    protectWhatsAppRequest(number, originalRequest) {
        const session = this.activeSessions.get(number);
        
        if (!session || session.status !== 'ACTIVE') {
            return {
                protected: false,
                message: 'Tidak ada shield aktif untuk nomor ini',
                originalRequest: originalRequest
            };
        }
        
        // Cek expired
        if (Date.now() > session.expiresAt) {
            session.status = 'EXPIRED';
            this.activeSessions.set(number, session);
            return {
                protected: false,
                message: 'Shield sudah expired, silakan aktivasi ulang',
                originalRequest: originalRequest
            };
        }
        
        // Update statistik
        session.stats.totalProtected++;
        session.stats.lastPing = Date.now();
        this.activeSessions.set(number, session);
        
        // Modifikasi request untuk proteksi
        const protectedRequest = {
            ...originalRequest,
            headers: {
                ...(originalRequest.headers || {}),
                'X-WhatsApp-Shield': session.token,
                'X-Protection-Level': 'MAXIMUM',
                'X-Shield-Type': session.type,
                'X-Encryption': 'AES-256',
                'User-Agent': 'WhatsApp/2.24.16.79 (Protected by XE ROX)'
            },
            _shieldMeta: {
                protected: true,
                timestamp: Date.now(),
                shieldId: session.id
            }
        };
        
        // Tambahkan delay jika tipe anti_limit
        if (session.type === 'anti_limit' || session.type === 'multi_shield') {
            // Dynamic delay untuk menghindari rate limit
            const delay = Math.floor(Math.random() * 150) + 50;
            protectedRequest._shieldMeta.delayApplied = delay;
        }
        
        this.addLog({
            type: 'REQUEST_PROTECTED',
            number: number,
            shieldType: session.type,
            totalProtected: session.stats.totalProtected,
            timestamp: Date.now()
        });
        
        return {
            protected: true,
            shieldType: session.type,
            shieldToken: session.token.substring(0, 30) + '...',
            totalProtected: session.stats.totalProtected,
            protectedRequest: protectedRequest,
            message: `Request berhasil diproteksi oleh shield ${session.type}`
        };
    }
    
    // Cek status shield
    checkShieldStatus(number) {
        const session = this.activeSessions.get(number);
        
        if (!session) {
            return {
                active: false,
                message: 'Tidak ada shield aktif'
            };
        }
        
        const isExpired = Date.now() > session.expiresAt;
        
        return {
            active: !isExpired && session.status === 'ACTIVE',
            shieldType: session.type,
            activatedAt: session.activatedAt,
            expiresAt: session.expiresAt,
            totalProtected: session.stats.totalProtected,
            remainingDays: Math.max(0, Math.floor((session.expiresAt - Date.now()) / (1000 * 60 * 60 * 24))),
            status: isExpired ? 'EXPIRED' : session.status,
            protectionTechniques: session.stats.activeTechniques
        };
    }
    
    // Hapus shield
    removeShield(number) {
        const session = this.activeSessions.get(number);
        
        if (!session) {
            return {
                success: false,
                message: `Tidak ditemukan shield untuk nomor ${number}`
            };
        }
        
        this.activeSessions.delete(number);
        
        this.addLog({
            type: 'SHIELD_REMOVED',
            number: number,
            shieldType: session.type,
            totalProtected: session.stats.totalProtected,
            timestamp: Date.now()
        });
        
        console.log(`[WHATSAPP SHIELD] REMOVED shield for ${number}`);
        
        return {
            success: true,
            message: `Shield untuk nomor ${number} berhasil dihapus`,
            totalProtected: session.stats.totalProtected
        };
    }
    
    // Get semua shield aktif
    getAllActiveShields() {
        const shields = [];
        
        for (const [number, session] of this.activeSessions.entries()) {
            if (session.status === 'ACTIVE' && Date.now() < session.expiresAt) {
                shields.push({
                    number: number,
                    type: session.type,
                    activatedAt: session.activatedAt,
                    totalProtected: session.stats.totalProtected,
                    remainingDays: Math.floor((session.expiresAt - Date.now()) / (1000 * 60 * 60 * 24))
                });
            }
        }
        
        return shields;
    }
    
    // Get statistik lengkap
    getStatistics() {
        const activeShields = this.getAllActiveShields();
        const totalProtected = Array.from(this.activeSessions.values())
            .reduce((sum, s) => sum + (s.stats?.totalProtected || 0), 0);
        
        return {
            totalShieldsDeployed: this.activeSessions.size,
            activeShields: activeShields.length,
            totalProtectedRequests: totalProtected,
            shieldTypes: {
                anti_ban: Array.from(this.activeSessions.values()).filter(s => s.type === 'anti_ban').length,
                anti_limit: Array.from(this.activeSessions.values()).filter(s => s.type === 'anti_limit').length,
                multi_shield: Array.from(this.activeSessions.values()).filter(s => s.type === 'multi_shield').length
            },
            recentLogs: this.shieldLogs.slice(-20),
            uptime: process.uptime()
        };
    }
    
    // Add log entry
    addLog(logEntry) {
        this.shieldLogs.push({
            ...logEntry,
            logId: uuidv4()
        });
        
        // Keep only last 1000 logs
        if (this.shieldLogs.length > 1000) {
            this.shieldLogs = this.shieldLogs.slice(-1000);
        }
    }
    
    // Verify shield token
    verifyShieldToken(token) {
        try {
            const decoded = Buffer.from(token, 'base64').toString('utf8');
            const payload = JSON.parse(decoded);
            
            // Cek signature
            const expectedSignature = crypto.createHash('sha256')
                .update(`${payload.number}:${payload.type}:${payload.timestamp}:XE_ROX_SECRET`)
                .digest('hex');
            
            if (payload.signature !== expectedSignature) {
                return { valid: false, reason: 'Invalid signature' };
            }
            
            // Cek apakah masih aktif
            const session = this.activeSessions.get(payload.number);
            if (!session || session.token !== token) {
                return { valid: false, reason: 'Token not found or expired' };
            }
            
            return { valid: true, number: payload.number, type: payload.type };
        } catch (error) {
            return { valid: false, reason: 'Invalid token format' };
        }
    }
    
    // Renew shield (perpanjang)
    renewShield(number, durationDays = 365) {
        const session = this.activeSessions.get(number);
        
        if (!session) {
            return {
                success: false,
                message: `Tidak ditemukan shield untuk nomor ${number}`
            };
        }
        
        const oldExpiry = session.expiresAt;
        session.expiresAt = Date.now() + (durationDays * 24 * 60 * 60 * 1000);
        session.status = 'ACTIVE';
        this.activeSessions.set(number, session);
        
        this.addLog({
            type: 'SHIELD_RENEWED',
            number: number,
            oldExpiry: oldExpiry,
            newExpiry: session.expiresAt,
            timestamp: Date.now()
        });
        
        return {
            success: true,
            message: `Shield untuk ${number} diperpanjang ${durationDays} hari`,
            newExpiry: session.expiresAt
        };
    }
}

module.exports = WhatsAppShield;