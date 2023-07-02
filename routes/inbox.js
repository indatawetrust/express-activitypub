'use strict'
const express = require('express')
const router = express.Router()
const { sendAcceptMessage } = require('../services/inbox')
const { parseJSON } = require('../utils')

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
    const result = db
      .prepare('select followers from accounts where name = ?')
      .get(`${name}@${domain}`)
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
        const newFollowers = db
          .prepare('update accounts set followers=? where name = ?')
          .run(followersText, `${name}@${domain}`)
        console.log('updated followers!', newFollowers)
      } catch (e) {
        console.log('error', e)
      }
    }
  }
})

module.exports = router
