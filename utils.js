const crypto = require('crypto')

function parseJSON (text) {
  try {
    return JSON.parse(text)
  } catch (e) {
    return null
  }
}

const randomHash = () => crypto.randomBytes(16).toString('hex')

module.exports = { parseJSON, randomHash }
