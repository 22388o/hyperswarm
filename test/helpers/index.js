const tape = require('tape')
const HyperDHT = require('@hyperswarm/dht')
const Hyperswarm = require('../../')

module.exports = { test, swarm, destroy, destroyAll, timeoutPromise }
test.only = (name, fn) => test(name, fn, true, false)
test.skip = (name, fn) => test(name, fn, false, true)

const CONNECTION_TIMEOUT = 100

async function swarm (bootstrap, n = 32) {
  const nodes = []
  while (nodes.length < n) {
    const node = new Hyperswarm({ bootstrap })
    await node.ready()
    nodes.push(node)
  }
  return nodes
}

async function test (name, fn, only = false, skip = false) {
  if (only) tape.only(name, run)
  else if (skip) tape.skip(name, run)
  else tape(name, run)

  async function run (t) {
    const bootstrappers = []
    const nodes = []

    while (bootstrappers.length < 3) {
      bootstrappers.push(new HyperDHT({ ephemeral: true, bootstrap: [] }))
    }

    const bootstrap = []
    for (const node of bootstrappers) {
      await node.ready()
      bootstrap.push({ host: '127.0.0.1', port: node.address().port })
    }

    while (nodes.length < 3) {
      const node = new HyperDHT({ ephemeral: false, bootstrap })
      await node.ready()
      nodes.push(node)
    }

    await fn(bootstrap, t)

    destroy(bootstrappers)
    destroy(nodes)
  }
}

async function destroyAll (...swarms) {
  for (const swarm of swarms) {
    await swarm.clear()
  }
  for (const swarm of swarms) {
    await swarm.destroy()
  }
}

function destroy (...nodes) {
  for (const node of nodes) {
    if (Array.isArray(node)) destroy(...node)
    else node.destroy()
  }
}

function timeoutPromise (ms = CONNECTION_TIMEOUT) {
  let res = null
  let rej = null
  let timer = null

  const p = new Promise((resolve, reject) => {
    res = resolve
    rej = reject
  })
  p.resolve = res
  p.reject = rej
  p.reset = () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => p.reject(new Error('Timed out')), ms)
  }

  p.reset()
  return p
}
