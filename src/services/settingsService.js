const { UserSettings } = require('../models');
const { encrypt, decrypt } = require('./encryption');

const ENCRYPTED_FIELDS = ['ttapi_api_key', 'content_api_key', 'pin_generator_key'];

async function get(userId) {
  const settings = await UserSettings.findOne({ where: { user_id: userId } });
  if (!settings) return null;
  return decryptAndMask(settings);
}

async function upsert(userId, data) {
  // Encrypt secret fields
  const encrypted = { ...data };
  for (const field of ENCRYPTED_FIELDS) {
    if (encrypted[field]) {
      encrypted[field] = encrypt(encrypted[field]);
    }
  }

  let settings = await UserSettings.findOne({ where: { user_id: userId } });
  if (settings) {
    // For fields not provided, keep existing values
    for (const field of ENCRYPTED_FIELDS) {
      if (!data[field]) {
        delete encrypted[field];
      }
    }
    await settings.update(encrypted);
  } else {
    settings = await UserSettings.create({ user_id: userId, ...encrypted });
  }

  return decryptAndMask(settings);
}

// Return settings with keys masked for display
function decryptAndMask(settings) {
  const json = settings.toJSON();
  for (const field of ENCRYPTED_FIELDS) {
    if (json[field]) {
      try {
        const decrypted = decrypt(json[field]);
        json[field] = maskKey(decrypted);
        json[`${field}_set`] = true;
      } catch {
        json[field] = '***error***';
        json[`${field}_set`] = false;
      }
    } else {
      json[field] = null;
      json[`${field}_set`] = false;
    }
  }
  return json;
}

// Get raw decrypted key for internal use by service clients
async function getRawKeys(userId) {
  const settings = await UserSettings.findOne({ where: { user_id: userId } });
  if (!settings) return null;
  const json = settings.toJSON();
  for (const field of ENCRYPTED_FIELDS) {
    if (json[field]) {
      try {
        json[field] = decrypt(json[field]);
      } catch {
        json[field] = null;
      }
    }
  }
  return json;
}

function maskKey(key) {
  if (!key || key.length < 8) return '****';
  return key.substring(0, 4) + '****' + key.substring(key.length - 4);
}

module.exports = { get, upsert, getRawKeys };
