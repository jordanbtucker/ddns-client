# ddns-client

A dynamic DNS client for [Dynamic DNS Update API] compatible services like
[DynDNS] and [Google Domains].

[dynamic dns update api]: https://help.dyn.com/remote-access-api/
[dyndns]: https://account.dyn.com/
[google domains]: https://domains.google.com/registrar/

## Usage

### CLI

#### Installation

```
npm install -g ddns-client
```

#### Updating a Domain Name

```
ddns-client update foo.example.com -u BJtkgqWBqBwcE6cX -p NXlOLv34MZVS0JH9
```

#### More Information

```
ddns-client help
```

### API

#### Installation

```
npm install ddns-client
```

#### Updating a Domain Name

```js
const ddns = require('ddns-client')

const response = await updateFQDN('foo.example.com', {
  username: 'BJtkgqWBqBwcE6cX',
  password: 'NXlOLv34MZVS0JH9',
})

if (response === false) {
  console.log('No update was required.')
} else {
  console.log(response)
}
```

#### More Information

See [index.d.ts].

[index.d.ts]: lib/index.d.ts
