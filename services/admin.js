'use strict'

function createActor (name, domain, pubkey) {
  return {
    '@context': [
      'https://www.w3.org/ns/activitystreams',
      'https://w3id.org/security/v1'
    ],

    id: `https://${domain}/u/${name}`,
    type: 'Person',
    preferredUsername: `${name}`,
    inbox: `https://${domain}/api/inbox`,
    outbox: `https://${domain}/u/${name}/outbox`,
    followers: `https://${domain}/u/${name}/followers`,

    publicKey: {
      id: `https://${domain}/u/${name}#main-key`,
      owner: `https://${domain}/u/${name}`,
      publicKeyPem: pubkey
    }
  }
}

function createWebfinger (name, domain) {
  return {
    subject: `acct:${name}@${domain}`,

    links: [
      {
        rel: 'self',
        type: 'application/activity+json',
        href: `https://${domain}/u/${name}`
      }
    ]
  }
}

module.exports = {
  createActor,
  createWebfinger
}
