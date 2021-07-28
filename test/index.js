const {deepStrictEqual, strictEqual} = require('assert')
const {PassThrough} = require('stream')
const t = require('tap')

const CUSTOM_HTTP_DETECT_ADDRESS_URL = 'http://example.com/checkip'
const CUSTOM_HTTPS_DETECT_ADDRESS_URL = 'https://example.com/checkip'
const CUSTOM_DNS_SERVERS = ['8.8.8.8', '8.8.4.4']
const TEST_IPV4_DETECTED_ADDRESS = '1.2.3.4'
const TEST_IPV6_DETECTED_ADDRESS = '0001:0002:0003:0004:0005:0006:0007:0008'
const TEST_IPV4_RESOLVED_ADDRESS = '1.2.3.5'
const TEST_IPV4_OTHER_ADDRESS = '5.6.7.8'
const TEST_IPV6_RESOLVED_ADDRESS = '0001:0002:0003:0004:0005:0006:0007:0009'
const TEST_IPV6_OTHER_ADDRESS = '0009:000a:000b:000c:000d:000e:000f:0010'
const TEST_FQDN = 'foo.example.com'
const TEST_USERNAME = 'foo'
const TEST_PASSWORD = 'bar'

class MockResolver {
  setServers(servers) {
    deepStrictEqual(servers, CUSTOM_DNS_SERVERS)
  }

  async resolve4(hostname) {
    strictEqual(hostname, TEST_FQDN)
    return [TEST_IPV4_RESOLVED_ADDRESS, TEST_IPV4_OTHER_ADDRESS]
  }

  async resolve6(hostname) {
    strictEqual(hostname, TEST_FQDN)
    return [TEST_IPV6_RESOLVED_ADDRESS, TEST_IPV6_OTHER_ADDRESS]
  }
}

/**
 *
 * @param {string | URL} url
 * @param {{family: 4 | 6}} options
 * @param {function} callback
 */
function mockHTTPGet(url, {family} = {}, callback) {
  if (typeof url === 'string') {
    url = new URL(url)
  }

  if (family === undefined) {
    family = 4
  }

  const res = new PassThrough()
  let content = ''
  if (url.pathname === '/checkip') {
    const address =
      family === 4 ? TEST_IPV4_DETECTED_ADDRESS : TEST_IPV6_DETECTED_ADDRESS
    content = `Your IP address is: ${address}`
  } else if (url.pathname === '/checkip/invalid') {
    content = 'This response does not contain an IP address'
  } else if (url.pathname === '/nic/update') {
    const params = url.searchParams
    const fqdn = params.get('hostname')
    const address = params.get('myip')

    if (url.username !== TEST_USERNAME || url.password !== TEST_PASSWORD) {
      content = 'badauth'
    } else if (fqdn === undefined) {
      content = 'notfqdn'
    } else if (fqdn !== TEST_FQDN) {
      content = 'nohost'
    } else if (address === undefined) {
      content = 'badagent'
    } else if (
      address === TEST_IPV4_RESOLVED_ADDRESS ||
      address === TEST_IPV6_RESOLVED_ADDRESS
    ) {
      content = `nochg ${address}`
    } else {
      content = `good ${address}`
    }
  } else {
    res.statusCode = 404
    res.statusMessage = 'Not Found'
  }

  callback(res)
  res.write(content)
  res.end()
}

const {detectAddress, resolveFQDN, updateFQDN} = t.mock('..', {
  dns: {promises: {Resolver: MockResolver}},
  http: {get: mockHTTPGet},
  https: {get: mockHTTPGet},
})

t.test('detectAddress()', async t => {
  t.test('using default options', async t => {
    const address = await detectAddress()
    t.equal(
      address,
      TEST_IPV4_DETECTED_ADDRESS,
      'should be detected IPv4 address',
    )
  })

  t.test('using custom HTTP URL', async t => {
    const address = await detectAddress({
      detectAddressURL: CUSTOM_HTTP_DETECT_ADDRESS_URL,
    })
    t.equal(
      address,
      TEST_IPV4_DETECTED_ADDRESS,
      'should be detected IPv4 address',
    )
  })

  t.test('using custom HTTPS URL', async t => {
    const address = await detectAddress({
      detectAddressURL: CUSTOM_HTTPS_DETECT_ADDRESS_URL,
    })
    t.equal(
      address,
      TEST_IPV4_DETECTED_ADDRESS,
      'should be detected IPv4 address',
    )
  })

  t.test('using URL object', async t => {
    const address = await detectAddress({
      detectAddressURL: new URL(CUSTOM_HTTP_DETECT_ADDRESS_URL),
    })
    t.equal(
      address,
      TEST_IPV4_DETECTED_ADDRESS,
      'should be detected IPv4 address',
    )
  })

  t.test('using IPv4', async t => {
    const address = await detectAddress({family: 4})
    t.equal(
      address,
      TEST_IPV4_DETECTED_ADDRESS,
      'should be detected IPv4 address',
    )
  })

  t.test('using IPv6', async t => {
    const address = await detectAddress({family: 6})
    t.equal(
      address,
      TEST_IPV6_DETECTED_ADDRESS,
      'should be detected IPv6 address',
    )
  })

  t.rejects(
    detectAddress({detectAddressURL: 'invalid'}),
    {message: 'Invalid URL'},
    'rejects on invalid url',
  )

  t.rejects(
    detectAddress({family: 5}),
    {message: 'Unsupported family'},
    'rejects on unsupported family',
  )

  t.rejects(
    detectAddress({detectAddressURL: 'http://example.com/checkip/invalid'}),
    {message: 'IP address not found in response'},
    'rejects on missing IP address',
  )

  t.rejects(
    detectAddress({detectAddressURL: 'http://example.com/not-found'}),
    {message: '404 Not Found'},
    'rejects on 404',
  )

  t.rejects(
    detectAddress({detectAddressURL: 'ftp://example.com/invalid'}),
    {message: 'Invalid URL'},
    'rejects on non-HTTP URLs',
  )
})

t.test('resolveFQDN()', async t => {
  t.test('using default options', async t => {
    const addresses = await resolveFQDN(TEST_FQDN)
    t.same(
      addresses,
      [TEST_IPV4_RESOLVED_ADDRESS, TEST_IPV4_OTHER_ADDRESS],
      'should be resolved IPv4 addresses',
    )
  })

  t.test('using custom DNS servers', async t => {
    const addresses = await resolveFQDN(TEST_FQDN, {
      dnsServers: CUSTOM_DNS_SERVERS,
    })
    t.same(
      addresses,
      [TEST_IPV4_RESOLVED_ADDRESS, TEST_IPV4_OTHER_ADDRESS],
      'should be resolved IPv4 addresses',
    )
  })

  t.test('using IPv4', async t => {
    const addresses = await resolveFQDN(TEST_FQDN, {family: 4})
    t.same(
      addresses,
      [TEST_IPV4_RESOLVED_ADDRESS, TEST_IPV4_OTHER_ADDRESS],
      'should be resolved IPv4 addresses',
    )
  })

  t.test('using IPv6', async t => {
    const addresses = await resolveFQDN(TEST_FQDN, {family: 6})
    t.same(
      addresses,
      [TEST_IPV6_RESOLVED_ADDRESS, TEST_IPV6_OTHER_ADDRESS],
      'should be resolved IPv6 addresses',
    )
  })

  t.rejects(
    resolveFQDN(TEST_FQDN, {family: 5}),
    {message: 'Unsupported family'},
    'rejects on unsupported family',
  )
})

t.test('updateFQDN()', async t => {
  t.test('using default options', async t => {
    const result = await updateFQDN(TEST_FQDN, {
      username: TEST_USERNAME,
      password: TEST_PASSWORD,
    })
    t.equal(
      result,
      `good ${TEST_IPV4_DETECTED_ADDRESS}`,
      'should be detected IPv4 address',
    )
  })

  t.test('supplying existing IP address', async t => {
    const result = await updateFQDN(TEST_FQDN, {
      username: TEST_USERNAME,
      password: TEST_PASSWORD,
      address: TEST_IPV4_RESOLVED_ADDRESS,
    })
    t.equal(result, false, 'should be false')
  })

  t.test('forcing existing IP address', async t => {
    const result = await updateFQDN(TEST_FQDN, {
      username: TEST_USERNAME,
      password: TEST_PASSWORD,
      address: TEST_IPV4_RESOLVED_ADDRESS,
      force: true,
    })
    t.equal(
      result,
      `nochg ${TEST_IPV4_RESOLVED_ADDRESS}`,
      'should be resolved IPv4 address',
    )
  })

  t.test('supplying new IP address', async t => {
    const result = await updateFQDN(TEST_FQDN, {
      username: TEST_USERNAME,
      password: TEST_PASSWORD,
      address: TEST_IPV4_DETECTED_ADDRESS,
    })
    t.equal(
      result,
      `good ${TEST_IPV4_DETECTED_ADDRESS}`,
      'should be detected IPv4 address',
    )
  })

  t.rejects(
    updateFQDN(TEST_FQDN, {updateURL: 1}),
    {message: 'Invalid URL'},
    'rejects on invalid URL',
  )

  t.rejects(
    updateFQDN(TEST_FQDN),
    {message: 'badauth'},
    'rejects on missing credentials',
  )
})
