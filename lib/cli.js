#!/usr/bin/env node
const pkg = require('../package.json')
const {detectAddress, resolveFQDN, updateFQDN} = require('./index')

async function main() {
  const args = parseArgs()

  switch (args.command) {
    case 'detect':
      await detect(args)
      break

    case 'resolve':
      if (args.defaults.length === 0) {
        displayUsage()
      } else {
        await resolve(args.defaults[0], args)
      }
      break

    case 'update':
      if (args.defaults.length === 0) {
        displayUsage()
      } else {
        await update(args.defaults[0], args)
      }
      break

    default:
      displayUsage()
      break
  }
}

async function detect({family, detectAddressURL}) {
  const address = await detectAddress({family, detectAddressURL})
  console.log(address)
}

async function resolve(fqdn, {family, dnsServers}) {
  const addresses = await resolveFQDN(fqdn, {family, dnsServers})
  for (const address of addresses) {
    console.log(address)
  }
}

async function update(
  fqdn,
  {
    family,
    username,
    password,
    address,
    dnsServers,
    detectAddressURL,
    updateURL,
    force,
  },
) {
  const response = await updateFQDN(fqdn, {
    family,
    username,
    password,
    address,
    dnsServers,
    detectAddressURL,
    updateURL,
    force,
  })

  if (typeof response === 'string' && response !== '') {
    console.log(response)
  }
}

function displayUsage() {
  console.log(`${pkg.name} v${pkg.version}

Usage:
${pkg.name} update <fqdn> <options>
    Update the IP address of a domain name.
  Arguments:
    <fqdn>          The fully qualified domain name to update.
  Options:
    --username, -u  The username for updating the IP address.
    --password, -p  The password for updating the IP address.
    --family,   -f  The IP address family. Default: 4
    --address,  -a  The IP address to update the domain name with.
                      If omitted, address will be detected.
    --force         Update the IP address of the domain name,
                      even if it hasn't changed.
    --update-url    The URL of the update service.
                      Default: https://domains.google.com/nic/update
    --detect-url    The URL of the IP address detection service.
                      Default: https://domains.google.com/checkip
    --dns-servers   A comma-separatered list of DNS servers to use.
                      Default: 8.8.8.8,8.8.4.4
  Output:
    The response from the update service, if an update was requested,
    otherwise nothing.
  Notes:
    An update will only be requested if the domain name resolves to a
    different address than the one provided or detected unless the
    --force argument is provided. Use --force sparingly or risk being
    blocked by the update service. See the detect and resolve commands
    for information on how addresses are detected and resolved.
  Example:
    $ ${pkg.name} update foo.example.com -u foo -p bar
    good 1.2.3.4

${pkg.name} detect <options>
    Detect the IP address of the client.
  Options:
    --family, -f  The IP address family. Default: 4
    --detect-url  The URL of the IP address detection service.
                    Default: https://domains.google.com/checkip
  Output:
    The detected IP address of the client.
  Notes:
    The --detect-url argument must represent a URL that includes the
    detected IP address in the initial response. The first IP address
    in the response will be the one detected.
  Example:
    $ ${pkg.name} detect -f 6
    1.2.3.4

${pkg.name} resolve <fqdn> <options>
    Resolve the IP addresses of a domain name.
  Arguments:
    <fqdn>         The fully qualified domain name to resolve.
  Options:
    --family, -f   The IP address family. Default: 4
    --dns-servers  A comma-separatered list of DNS servers to use.
                     Default: 8.8.8.8,8.8.4.4
  Output:
    A list of IP address that the domain name resolved to, one per line.
  Notes:
    It is recommended to use public DNS servers since local DNS servers
    may resolve local IP addresses of domain names.
  Example:
    $ ${pkg.name} resolve foo.example.com -f 6
    1.2.3.4
    5.7.6.8`)
}

function parseArgs() {
  const args = {defaults: []}
  args.command = process.argv[2]
  for (let i = 3; i < process.argv.length; i++) {
    const arg = process.argv[i]
    switch (arg) {
      case '--family':
      case '-f':
        args.family = Number(process.argv[++i])
        break

      case '--detect-url':
        args.detectAddressURL = process.argv[++i]
        break

      case '--update-url':
        args.updateURL = process.argv[++i]
        break

      case '--username':
      case '--user':
      case '-u':
        args.username = process.argv[++i]
        break

      case '--password':
      case '--pass':
      case '-p':
        args.password = process.argv[++i]
        break

      case '--address':
      case '-a':
        args.address = process.argv[++i]
        break

      case '--dns-servers':
      case '--dns':
        args.dnsServers = process.argv[++i].split(',')
        break

      case '--force':
        args.force = true
        break

      default:
        args.defaults.push(arg)
    }
  }

  return args
}

main().catch(err => {
  console.error(err)
  process.exitCode = 1
})
