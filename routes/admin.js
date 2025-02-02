'use strict'
const express = require('express')
const router = express.Router()
const crypto = require('crypto')
const { createActor, createWebfinger } = require('../services/admin')
const { randomHash } = require('../utils')

router.post('/create', function (req, res) {
  // pass in a name for an account, if the account doesn't exist, create it!
  const account = req.body.account
  if (account === undefined) {
    return res.status(400).json({
      msg: 'Bad request. Please make sure "account" is a property in the POST body.'
    })
  }
  const db = req.app.get('db')
  const domain = req.app.get('domain')
  // create keypair
  crypto.generateKeyPair(
    'rsa',
    {
      modulusLength: 4096,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    },
    (err, publicKey, privateKey) => {
      const actorRecord = createActor(account, domain, publicKey)
      const webfingerRecord = createWebfinger(account, domain)
      const apikey = randomHash()

      if (err) {
        return res.status(400).json({ error: err })
      }

      try {
        db.prepare(
          'insert or replace into accounts(name, actor, apikey, pubkey, privkey, webfinger) values(?, ?, ?, ?, ?, ?)'
        ).run(
          `${account}@${domain}`,
          JSON.stringify(actorRecord),
          apikey,
          publicKey,
          privateKey,
          JSON.stringify(webfingerRecord)
        )
        res.status(200).json({ msg: 'ok', apikey })
      } catch (e) {
        res.status(200).json({ error: e })
      }
    }
  )
})

module.exports = router
