'use strict'
const express = require('express')
const router = express.Router()
const { sendCreateMessage } = require('../services/api')

router.post('/sendMessage', function (req, res) {
  const db = req.app.get('db')
  const domain = req.app.get('domain')
  const acct = req.body.acct
  const apikey = req.body.apikey
  const message = req.body.message
  // check to see if your API key matches
  const result = db
    .prepare('select apikey from accounts where name = ?')
    .get(`${acct}@${domain}`)
  if (result.apikey === apikey) {
    sendCreateMessage(message, acct, domain, req, res)
  } else {
    res.status(403).json({ msg: 'wrong api key' })
  }
})

module.exports = router
