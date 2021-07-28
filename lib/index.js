const {Resolver} = require('dns').promises

const DEFAULT_DETECT_ADDRESS_URL = 'https://domains.google.com/checkip'
const DEFAULT_UPDATE_URL = 'https://domains.google.com/nic/update'
const DEFAULT_DNS_SERVERS = ['8.8.8.8', '8.8.4.4']
const IPV4_REGEX =
  /((2(5[0-5]|[0-4]\d)|1\d\d|[1-9]\d|\d)\.){3}(2(5[0-5]|[0-4]\d)|1\d\d|[1-9]\d|\d)/
const IPV6_REGEX =
  /([0-9A-Fa-f]{1,4}:){7}[0-9A-Fa-f]{1,4}|([0-9A-Fa-f]{1,4}:){6}:[0-9A-Fa-f]{1,4}|([0-9A-Fa-f]{1,4}:){5}(:[0-9A-Fa-f]{1,4}){1,2}|([0-9A-Fa-f]{1,4}:){4}(:[0-9A-Fa-f]{1,4}){1,3}|([0-9A-Fa-f]{1,4}:){3}(:[0-9A-Fa-f]{1,4}){1,4}|([0-9A-Fa-f]{1,4}:){2}(:[0-9A-Fa-f]{1,4}){1,5}|[0-9A-Fa-f]{1,4}:(:[0-9A-Fa-f]{1,4}){1,6}|([0-9A-Fa-f]{1,4}:){1,7}:|:(:[0-9A-Fa-f]{1,4}){1,7}|::/
const GOOD_RESPONSE_REGEX = /^(good|nochg)\b/

/**
 * @typedef DetectAddressOptions
 * @property {string | URL} [detectAddressURL] The URL of the IP address
 * detection service. Defaults to `'https://domains.google.com/checkip'`.
 * @property {4 | 6} [family] The IP address family. Defaults to `4`.
 */

/**
 * Detects the public IP address of the client.
 * @param {DetectAddressOptions} [options]
 */
async function detectAddress({detectAddressURL, family} = {}) {
  if (detectAddressURL === undefined) {
    detectAddressURL = DEFAULT_DETECT_ADDRESS_URL
  }

  if (typeof detectAddressURL === 'string') {
    detectAddressURL = new URL(detectAddressURL)
  }

  if (family === undefined) {
    family = 4
  }

  if (family !== 4 && family !== 6) {
    throw new TypeError(`Unsupported family ${family}`)
  }

  const content = await fetch(detectAddressURL, {family})
  const ipRegex = family === 4 ? IPV4_REGEX : IPV6_REGEX
  const ipMatch = ipRegex.exec(content)
  if (!ipMatch) {
    throw new Error('IP address not found in response')
  }

  return ipMatch[0]
}

/**
 * @typedef ResolveFQDNOptions
 * @property {string[]} [dnsServers] A list of DNS servers to use. Defaults to
 * `['8.8.8.8', '8.8.4.4']`.
 * @property {4 | 6} [family] The IP address family. Defaults to `4`.
 */

/**
 * Resolves the IP addresses of a domain name.
 * @param {string} fqdn The fully qualified domain name to resolve.
 * @param {ResolveFQDNOptions} [options]
 */
async function resolveFQDN(fqdn, {dnsServers, family} = {}) {
  if (family === undefined) {
    family = 4
  }

  if (family !== 4 && family !== 6) {
    throw new TypeError(`Unsupported family ${family}`)
  }

  if (dnsServers === undefined) {
    dnsServers = DEFAULT_DNS_SERVERS
  }

  const resolver = new Resolver()
  resolver.setServers(dnsServers)

  const addresses =
    family === 4 ? await resolver.resolve4(fqdn) : await resolver.resolve6(fqdn)

  return addresses
}

/**
 * @typedef UpdateFQDNOptions
 * @property {string} username The username for updating the domain name.
 * @property {string} password The password for updating the domain name.
 * @property {string} [address] The IP address to update the domain name with.
 * If omitted, the IP address will be detected.
 * @property {string | URL} [detectAddressURL] The URL of the IP address
 * detection service. Defaults to `'https://domains.google.com/checkip'`.
 * @property {string[]} [dnsServers] A list of DNS servers to use. Defaults to
 * `['8.8.8.8', '8.8.4.4']`.
 * @property {4 | 6} [family] The IP address family. Defaults to `4`.
 * @property {boolean} [force] Update the IP address of the domain name even if
 * it hasn't changed. Defaults to `false`.
 * @property {string | URL} [updateURL] The URL of the update service. Defaults
 * to `'https://domains.google.com/nic/update'`
 */

/**
 * Updates a domain name with a new IP address.
 * @param {string} fqdn The fully qualified domain name to update.
 * @param {UpdateFQDNOptions} options
 * @returns {Promise<string | false>}
 */
async function updateFQDN(
  fqdn,
  {
    username,
    password,
    address,
    detectAddressURL,
    dnsServers,
    family,
    force,
    updateURL,
  } = {},
) {
  if (updateURL === undefined) {
    updateURL = DEFAULT_UPDATE_URL
  }

  if (typeof updateURL === 'string') {
    updateURL = new URL(updateURL)
  }

  if (!(updateURL instanceof URL)) {
    throw new TypeError('Invalid URL')
  }

  if (address === undefined) {
    address = await detectAddress({detectAddressURL, family})
  }

  const fqdnAddresses = await resolveFQDN(fqdn, {dnsServers, family})
  if (!fqdnAddresses.includes(address) || force) {
    if (username !== undefined) {
      updateURL.username = username
    }

    if (password !== undefined) {
      updateURL.password = password
    }

    updateURL.searchParams.set('hostname', fqdn)
    updateURL.searchParams.set('myip', address)

    const content = await fetch(updateURL)
    if (GOOD_RESPONSE_REGEX.test(content)) {
      return content
    } else {
      throw new Error(content)
    }
  }

  return false
}

/**
 * Gets the appropriate HTTP module for a URL.
 * @param {URL} url The URL to check.
 */
function getHTTPModule(url) {
  switch (url.protocol) {
    case 'http:':
      return require('http')
    case 'https:':
      return require('https')
    default:
      throw new TypeError('Invalid URL')
  }
}

/**
 * Fetches the resource of a URL as a string.
 * @param {URL} url The URL of the resource to fetch.
 * @param {import('http').RequestOptions} options
 */
function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const http = getHTTPModule(url)
    http.get(url, options, res => {
      if (res.statusCode >= 400) {
        return reject(new Error(`${res.statusCode} ${res.statusMessage}`))
      }

      let content = ''
      res.setEncoding('utf8')

      res.on('error', reject)

      res.on('data', data => {
        content += data
      })

      res.on('end', () => {
        resolve(content)
      })
    })
  })
}

module.exports = {
  detectAddress,
  resolveFQDN,
  updateFQDN,
}
