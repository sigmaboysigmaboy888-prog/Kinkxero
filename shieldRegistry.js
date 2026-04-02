{
  "example-shield-id-1": {
    "id": "example-shield-id-1",
    "number": "+6281234567890",
    "type": "multi_shield",
    "token": "ZXhhbXBsZV90b2tlbl9mb3JfZGVtb25zdHJhdGlvbl9wdXJwb3Nlc19vbmx5",
    "activatedAt": 1704067200000,
    "expiresAt": 1735603200000,
    "status": "ACTIVE",
    "protectionConfig": {
      "antiBan": {
        "enabled": true,
        "level": "MAXIMUM",
        "techniques": [
          "SESSION_FINGERPRINT_MASKING",
          "REQUEST_SIGNATURE_SPOOFING",
          "BAN_PREVENTION_LAYER",
          "WHATSAPP_META_PROTECTION"
        ]
      },
      "antiLimit": {
        "enabled": true,
        "level": "MAXIMUM",
        "techniques": [
          "RATE_LIMIT_BYPASS",
          "DYNAMIC_REQUEST_DELAY",
          "THROTTLE_NEUTRALIZER",
          "MULTI_CHANNEL_ROUTING"
        ]
      }
    },
    "totalProtected": 1547,
    "lastPing": 1704153600000,
    "metadata": {
      "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
      "ip": "192.168.1.1",
      "activatedVia": "web_dashboard"
    }
  }
}