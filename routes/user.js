'use strict'
const express = require('express')
const router = express.Router()

router.get('/:name', function (req, res) {
  let name = req.params.name
  if (!name) {
    return res.status(400).send('Bad request.')
  } else {
    const db = req.app.get('db')
    const domain = req.app.get('domain')
    const username = name
    name = `${name}@${domain}`
    const result = db.prepare('select actor from accounts where name = ?').get(name)
    if (result === undefined) {
      return res.status(404).send(`No record found for ${name}.`)
    } else {
      const tempActor = JSON.parse(result.actor)
      // Added this followers URI for Pleroma compatibility, see https://github.com/dariusk/rss-to-activitypub/issues/11#issuecomment-471390881
      // New Actors should have this followers URI but in case of migration from an old version this will add it in on the fly
      if (tempActor.followers === undefined) {
        tempActor.followers = `https://${domain}/u/${username}/followers`
      }
      res.json(tempActor)
    }
  }
})

router.get('/:name/followers', function (req, res) {
  const name = req.params.name
  if (!name) {
    return res.status(400).send('Bad request.')
  } else {
    const db = req.app.get('db')
    const domain = req.app.get('domain')
    const result = db.prepare('select followers from accounts where name = ?').get(`${name}@${domain}`)
    console.log(result)
    result.followers = result.followers || '[]'
    const followers = JSON.parse(result.followers)
    const followersCollection = {
      type: 'OrderedCollection',
      totalItems: followers.length,
      id: `https://${domain}/u/${name}/followers`,
      first: {
        type: 'OrderedCollectionPage',
        totalItems: followers.length,
        partOf: `https://${domain}/u/${name}/followers`,
        orderedItems: followers,
        id: `https://${domain}/u/${name}/followers?page=1`
      },
      '@context': ['https://www.w3.org/ns/activitystreams']
    }
    res.json(followersCollection)
  }
})

router.get('/:name/outbox', function (req, res) {
  const name = req.params.name
  if (!name) {
    return res.status(400).send('Bad request.')
  } else {
    const domain = req.app.get('domain')
    const messages = []
    const outboxCollection = {
      type: 'OrderedCollection',
      totalItems: messages.length,
      id: `https://${domain}/u/${name}/outbox`,
      first: {
        type: 'OrderedCollectionPage',
        totalItems: messages.length,
        partOf: `https://${domain}/u/${name}/outbox`,
        orderedItems: messages,
        id: `https://${domain}/u/${name}/outbox?page=1`
      },
      '@context': ['https://www.w3.org/ns/activitystreams']
    }
    res.json(outboxCollection)
  }
})

module.exports = router
