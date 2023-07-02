'use strict'
const crypto = require('crypto')
const request = require('request')

function signAndSend (message, name, domain, req, res, targetDomain) {
  // get the URI of the actor object and append 'inbox' to it
  const inbox = message.object.actor + '/inbox'
  const inboxFragment = inbox.replace('https://' + targetDomain, '')
  // get the private key
  const db = req.app.get('db')
  const result = db
    .prepare('select privkey from accounts where name = ?')
    .get(`${name}@${domain}`)
  if (result === undefined) {
    return res.status(404).send(`No record found for ${name}.`)
  } else {
    const privkey = result.privkey
    const digestHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(message))
      .digest('base64')
    const signer = crypto.createSign('sha256')
    const d = new Date()
    const stringToSign = `(request-target): post ${inboxFragment}\nhost: ${targetDomain}\ndate: ${d.toUTCString()}\ndigest: SHA-256=${digestHash}`
    signer.update(stringToSign)
    signer.end()
    const signature = signer.sign(privkey)
    const signature_b64 = signature.toString('base64')
    const header = `keyId="https://${domain}/u/${name}",headers="(request-target) host date digest",signature="${signature_b64}"`
    request(
      {
        url: inbox,
        headers: {
          Host: targetDomain,
          Date: d.toUTCString(),
          Digest: `SHA-256=${digestHash}`,
          Signature: header
        },
        method: 'POST',
        json: true,
        body: message
      },
      function (error, response) {
        if (error) {
          console.log('Error:', error, response.body)
        } else {
          console.log('Response:', response.body)
        }
      }
    )
    return res.status(200)
  }
}

function sendAcceptMessage (thebody, name, domain, req, res, targetDomain) {
  const guid = crypto.randomBytes(16).toString('hex')
  const message = {
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: `https://${domain}/${guid}`,
    type: 'Accept',
    actor: `https://${domain}/u/${name}`,
    object: thebody
  }
  signAndSend(message, name, domain, req, res, targetDomain)
}

function parseJSON (text) {
  try {
    return JSON.parse(text)
  } catch (e) {
    return null
  }
}

module.exports = { parseJSON, sendAcceptMessage }
