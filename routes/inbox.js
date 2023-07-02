'use strict'
const express = require('express')
const crypto = require('crypto')
const request = require('request')
const router = express.Router()

function signAndSend (message, name, domain, req, res, targetDomain) {
  // get the URI of the actor object and append 'inbox' to it
  const inbox = message.object.actor + '/inbox'
  const inboxFragment = inbox.replace('https://' + targetDomain, '')
  // get the private key
  const db = req.app.get('db')
  const result = db.prepare('select privkey from accounts where name = ?').get(`${name}@${domain}`)
  if (result === undefined) {
    return res.status(404).send(`No record found for ${name}.`)
  } else {
    const privkey = result.privkey
    const digestHash = crypto.createHash('sha256').update(JSON.stringify(message)).digest('base64')
    const signer = crypto.createSign('sha256')
    const d = new Date()
    const stringToSign = `(request-target): post ${inboxFragment}\nhost: ${targetDomain}\ndate: ${d.toUTCString()}\ndigest: SHA-256=${digestHash}`
    signer.update(stringToSign)
    signer.end()
    const signature = signer.sign(privkey)
    const signature_b64 = signature.toString('base64')
    const header = `keyId="https://${domain}/u/${name}",headers="(request-target) host date digest",signature="${signature_b64}"`
    request({
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
    }, function (error, response) {
      if (error) {
        console.log('Error:', error, response.body)
      } else {
        console.log('Response:', response.body)
      }
    })
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

router.post('/', function (req, res) {
  // pass in a name for an account, if the account doesn't exist, create it!
  const domain = req.app.get('domain')
  const myURL = new URL(req.body.actor)
  const targetDomain = myURL.hostname
  // TODO: add "Undo" follow event
  if (typeof req.body.object === 'string' && req.body.type === 'Follow') {
    const name = req.body.object.replace(`https://${domain}/u/`, '')
    sendAcceptMessage(req.body, name, domain, req, res, targetDomain)
    // Add the user to the DB of accounts that follow the account
    const db = req.app.get('db')
    // get the followers JSON for the user
    const result = db.prepare('select followers from accounts where name = ?').get(`${name}@${domain}`)
    if (result === undefined) {
      console.log(`No record found for ${name}.`)
    } else {
      // update followers
      let followers = parseJSON(result.followers)
      if (followers) {
        followers.push(req.body.actor)
        // unique items
        followers = [...new Set(followers)]
      } else {
        followers = [req.body.actor]
      }
      const followersText = JSON.stringify(followers)
      try {
        // update into DB
        const newFollowers = db.prepare('update accounts set followers=? where name = ?').run(followersText, `${name}@${domain}`)
        console.log('updated followers!', newFollowers)
      } catch (e) {
        console.log('error', e)
      }
    }
  }
})

module.exports = router
