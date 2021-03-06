const Ledger = require('../index.js')
const crypto = require('brave-crypto')
const test = require('tape')

const options = { debugP: true, version: 'v2', environment: 'staging' }

test('recoverWallet', async (t) => {
  t.plan(6)
  const client = new Ledger(null, options)

  client.sync(function () {
    const signingKey = client.getKeypair()
    const passPhrase = client.getWalletPassphrase()
    const addresses = client.getWalletAddresses()

    const client2 = new Ledger(null, options)
    client2.sync(function () {
      const signingKey2 = client2.getKeypair()
      const addresses2 = client2.getWalletAddresses()

      t.notEqual(crypto.uint8ToHex(signingKey.secretKey), crypto.uint8ToHex(signingKey2.secretKey))
      t.notEqual(crypto.uint8ToHex(signingKey.publicKey), crypto.uint8ToHex(signingKey2.publicKey))
      t.notDeepEqual(addresses, addresses2)

      client2.recoverWallet(null, passPhrase.join(' '), function () {
        const signingKey3 = client2.getKeypair()
        const addresses3 = client2.getWalletAddresses()

        t.equal(crypto.uint8ToHex(signingKey.secretKey), crypto.uint8ToHex(signingKey3.secretKey))
        t.equal(crypto.uint8ToHex(signingKey.publicKey), crypto.uint8ToHex(signingKey3.publicKey))
        t.deepEqual(addresses, addresses3)
      })
    })
  })
})

test('transition', async (t) => {
  t.plan(3)
  const oldOptions = { debugP: true, version: 'v1', environment: 'staging' }
  const client = new Ledger(null, oldOptions)

  client.sync(function () {
    const newClient = new Ledger(null, options)
    newClient.sync(function () {
      const newPaymentId = newClient.getPaymentId()

      client.transition(newPaymentId, function (err, properties) {
        t.false(err)
        t.true(properties)
        t.true(properties.reconcileStamp)
      })
    })
  })
})

test('balance', async (t) => {
  t.plan(2)
  const client = new Ledger(null, options)

  client.sync(function () {
    client.getWalletProperties(function (err, resp) {
      t.false(err)
      t.equal(resp.probi, '0')
    })
  })
})

test('promotion', async (t) => {
  t.plan(9)
  const client = new Ledger(null, options)
  const client2 = new Ledger(null, options)

  client.sync(function () {
    client.getPromotion(null, null, function (err, resp) {
      t.false(err)
      t.true(resp.hasOwnProperty('promotionId'))
      const promotionId = resp.promotionId
      client.setPromotion(promotionId, function (err, resp) {
        t.false(err)
        t.true(resp.hasOwnProperty('probi'))
        const grantProbi = resp.probi
        client.getWalletProperties(function (err, resp) {
          t.false(err)
          t.equal(resp.probi, grantProbi)
          client2.getPromotion(null, client.getPaymentId(), function (err, resp) {
            t.true(err)
            client.setPromotion(promotionId, function (err, resp, respObj) {
              // resp is response body, respObj is response object
              t.true(err)
              t.equal(respObj.statusCode, 422)
            })
          })
        })
      })
    })
  })
})
