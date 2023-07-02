function parseJSON (text) {
  try {
    return JSON.parse(text)
  } catch (e) {
    return null
  }
}

module.exports = { parseJSON }
