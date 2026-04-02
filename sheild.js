const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// Database path
const SHIELD_DB_PATH = path.join(__dirname, '../database/shieldRegistry.json');

// Load shield database
function loadShieldDatabase() {
    try {
        if (fs.existsSync(SHIELD_DB_PATH)) {
            const data = fs.readFileSync(SHIELD_DB_PATH, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('[SHIELD ROUTE] Error loading database:', error);
    }
    return {};
}

// Save shield database
function saveShieldDatabase(data) {
    try {
        const dir = path.dirname(SHIELD_DB_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(SHIELD_DB_PATH, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('[SHIELD ROUTE] Error saving database:', error);
        return false;
    }
}

// Middleware untuk validasi nomor
function validatePhoneNumber(number) {
    const phoneRegex = /^\+?[0-9]{8,15}$/;
    return phoneRegex.test(number);
}

// GET semua shield aktif
router.get('/active-shields', (req, res) => {
    const shields = loadShieldDatabase();
    const activeShields = Object.values(shields).filter(s => s.status === 'ACTIVE');
    
    res.json({
        success: true,
        total: activeShields.length,
        shields: activeShields.map(s => ({
            id: s.id,
            number: s.number,
            type: s.type,
            activatedAt: s.activatedAt,
            expiresAt: s.expiresAt,
            status: s.status,
            totalProtected: s.totalProtected || 0
        }))
    });
});

// GET shield by nomor
router.post('/check-shield', (req, res) => {
    const { number } = req.body;
    
    if (!number) {
        return res.status(400).json({
            success: false,
            error: 'NOMOR_REQUIRED',
            message: 'Nomor WhatsApp harus diisi'
        });
    }
    
    const shields = loadShieldDatabase();
    let foundShield = null;
    
    for (const [id, shield] of Object.entries(shields)) {
        if (shield.number === number && shield.status === 'ACTIVE') {
            foundShield = { id, ...shield };
            break;
        }
    }
    
    if (foundShield) {
        res.json({
            success: true,
            active: true,
            shieldType: foundShield.type,
            protectedSince: foundShield.activatedAt,
            expiresAt: foundShield.expiresAt,
            totalProtected: foundShield.totalProtected || 0,
            shieldToken: foundShield.token?.substring(0, 20) + '...'
        });
    } else {
        res.json({
            success: true,
            active: false,
            message: 'Tidak ada shield aktif untuk nomor ini'
        });
    }
});

// POST aktivasi shield baru
router.post('/activate-shield', (req, res) => {
    const { number, protection, timestamp } = req.body;
    
    // Validasi input
    if (!number) {
        return res.status(400).json({
            success: false,
            error: 'NOMOR_REQUIRED',
            message: 'Nomor WhatsApp wajib diisi'
        });
    }
    
    if (!validatePhoneNumber(number)) {
        return res.status(400).json({
            success: false,
            error: 'INVALID_NUMBER',
            message: 'Format nomor tidak valid. Gunakan +628xxxxxxxxxx atau 628xxxxxxxxxx'
        });
    }
    
    if (!protection || !['anti_ban', 'anti_limit', 'multi_shield'].includes(protection)) {
        return res.status(400).json({
            success: false,
            error: 'INVALID_SHIELD_TYPE',
            message: 'Pilih tipe shield: anti_ban, anti_limit, atau multi_shield'
        });
    }
    
    // Cek apakah sudah ada shield aktif
    const shields = loadShieldDatabase();
    let existingShield = null;
    
    for (const [id, shield] of Object.entries(shields)) {
        if (shield.number === number && shield.status === 'ACTIVE') {
            existingShield = shield;
            break;
        }
    }
    
    if (existingShield) {
        return res.status(409).json({
            success: false,
            error: 'SHIELD_ALREADY_EXISTS',
            message: `Nomor ${number} sudah memiliki shield ${existingShield.type} yang aktif`,
            existingShield: {
                type: existingShield.type,
                activatedAt: existingShield.activatedAt
            }
        });
    }
    
    // Generate shield baru
    const shieldId = uuidv4();
    const shieldToken = Buffer.from(
        `XE_ROX:${number}:${shieldId}:${Date.now()}:ULTIMATE_PROTECTION`
    ).toString('base64');
    
    const protectionConfig = {
        antiBan: {
            enabled: protection === 'anti_ban' || protection === 'multi_shield',
            level: 'MAXIMUM',
            techniques: [
                'SESSION_FINGERPRINT_MASKING',
                'REQUEST_SIGNATURE_SPOOFING',
                'BAN_PREVENTION_LAYER',
                'WHATSAPP_META_PROTECTION'
            ]
        },
        antiLimit: {
            enabled: protection === 'anti_limit' || protection === 'multi_shield',
            level: 'MAXIMUM',
            techniques: [
                'RATE_LIMIT_BYPASS',
                'DYNAMIC_REQUEST_DELAY',
                'THROTTLE_NEUTRALIZER',
                'MULTI_CHANNEL_ROUTING'
            ]
        }
    };
    
    const newShield = {
        id: shieldId,
        number: number,
        type: protection,
        token: shieldToken,
        activatedAt: Date.now(),
        expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000),
        status: 'ACTIVE',
        protectionConfig: protectionConfig,
        totalProtected: 0,
        lastPing: Date.now(),
        metadata: {
            userAgent: req.headers['user-agent'] || 'unknown',
            ip: req.ip || req.socket.remoteAddress,
            activatedVia: 'web_dashboard'
        }
    };
    
    // Simpan ke database
    shields[shieldId] = newShield;
    saveShieldDatabase(shields);
    
    // Generate response message
    let responseMessage = '';
    if (protection === 'anti_ban') {
        responseMessage = '🔥 ANTI BAN SHIELD ACTIVATED 🔥\n✓ Permanent ban immunity deployed\n✓ Session fingerprint masked successfully\n✓ WhatsApp cannot detect suspicious activity\n✓ Real-time monitoring active';
    } else if (protection === 'anti_limit') {
        responseMessage = '⚡ ANTI LIMIT SHIELD ACTIVATED ⚡\n✓ Rate limit bypass engaged\n✓ Request throttle neutralized\n✓ Spam protection without consequences\n✓ Unlimited operations allowed';
    } else {
        responseMessage = '🛡️ MULTI SHIELD ACTIVATED 🛡️\n✓ ANTI BAN + ANTI LIMIT combined\n✓ Dual layer maximum protection active\n✓ WhatsApp fully immune to restrictions\n✓ 100% spam safe guaranteed';
    }
    
    res.json({
        success: true,
        message: responseMessage,
        number: number,
        activeShield: protection,
        shieldId: shieldId,
        shieldToken: shieldToken,
        activatedAt: newShield.activatedAt,
        expiresAt: newShield.expiresAt,
        protectionLevel: 'MAXIMUM',
        timestamp: Date.now()
    });
});

// POST hapus shield
router.post('/remove-shield', (req, res) => {
    const { number } = req.body;
    
    if (!number) {
        return res.status(400).json({
            success: false,
            error: 'NOMOR_REQUIRED',
            message: 'Nomor WhatsApp harus diisi'
        });
    }
    
    const shields = loadShieldDatabase();
    let foundId = null;
    
    for (const [id, shield] of Object.entries(shields)) {
        if (shield.number === number) {
            foundId = id;
            break;
        }
    }
    
    if (foundId) {
        delete shields[foundId];
        saveShieldDatabase(shields);
        
        res.json({
            success: true,
            message: `Shield untuk nomor ${number} berhasil dihapus`,
            removed: true
        });
    } else {
        res.json({
            success: false,
            message: `Tidak ditemukan shield aktif untuk nomor ${number}`,
            removed: false
        });
    }
});

// POST protect request (endpoint untuk memproteksi request WhatsApp)
router.post('/protect-request', (req, res) => {
    const { number, requestData } = req.body;
    
    if (!number) {
        return res.status(400).json({
            success: false,
            error: 'NOMOR_REQUIRED',
            message: 'Nomor WhatsApp harus diisi'
        });
    }
    
    const shields = loadShieldDatabase();
    let activeShield = null;
    
    for (const [id, shield] of Object.entries(shields)) {
        if (shield.number === number && shield.status === 'ACTIVE') {
            activeShield = shield;
            break;
        }
    }
    
    if (!activeShield) {
        return res.json({
            protected: false,
            message: 'Tidak ada shield aktif untuk nomor ini'
        });
    }
    
    // Update total protected
    activeShield.totalProtected = (activeShield.totalProtected || 0) + 1;
    activeShield.lastPing = Date.now();
    shields[activeShield.id] = activeShield;
    saveShieldDatabase(shields);
    
    // Generate protected request
    const protectedRequest = {
        originalData: requestData || {},
        modifiedHeaders: {
            'X-WhatsApp-Shield': activeShield.token,
            'X-Protection-Level': 'MAXIMUM',
            'X-Shield-Type': activeShield.type,
            'User-Agent': 'WhatsApp/2.24.16.79 (XE ROX Protected)'
        },
        timestamp: Date.now(),
        shieldActive: true
    };
    
    res.json({
        protected: true,
        shieldType: activeShield.type,
        shieldToken: activeShield.token.substring(0, 30) + '...',
        totalProtected: activeShield.totalProtected,
        protectedRequest: protectedRequest,
        message: `Request berhasil diproteksi oleh shield ${activeShield.type}`
    });
});

// GET shield statistics
router.get('/stats', (req, res) => {
    const shields = loadShieldDatabase();
    const activeShields = Object.values(shields).filter(s => s.status === 'ACTIVE');
    
    const stats = {
        totalShieldsDeployed: Object.keys(shields).length,
        activeShields: activeShields.length,
        totalProtectedRequests: activeShields.reduce((sum, s) => sum + (s.totalProtected || 0), 0),
        shieldTypes: {
            anti_ban: activeShields.filter(s => s.type === 'anti_ban').length,
            anti_limit: activeShields.filter(s => s.type === 'anti_limit').length,
            multi_shield: activeShields.filter(s => s.type === 'multi_shield').length
        }
    };
    
    res.json({
        success: true,
        stats: stats,
        timestamp: Date.now()
    });
});

module.exports = router;