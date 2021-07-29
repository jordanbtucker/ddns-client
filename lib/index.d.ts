declare type DetectAddressOptions = {
  /**
   * The URL of the IP address detection service.
   * @default 'https://domains.google.com/checkip'
   */
  detectAddressURL?: string

  /**
   * The IP address family.
   * @default 4
   */
  family?: 4 | 6
}

/**
 * Detects the public IP address of the client.
 * @param options
 * @returns A Promise that resolves with the detected IP address.
 */
export declare function detectAddress(
  options?: DetectAddressOptions,
): Promise<string>

declare type ResolveFQDNOptions = {
  /**
   * A list of DNS servers to use.
   * @default ['8.8.8.8', '8.8.4.4']
   */
  dnsServers?: string[]

  /**
   * The IP address family.
   * @default 4
   */
  family?: 4 | 6
}

/**
 * Resolves the IP addresses of a domain name.
 * @param fqdn The fully qualified domain name to resolve.
 * @param options
 * @returns A Promise that resolves with a list of IP addresses for the domain
 * name.
 */
export declare function resolveFQDN(
  fqdn: string,
  options?: ResolveFQDNOptions,
): Promise<string[]>

declare type UpdateFQDNOptions = {
  /**
   * The username for updating the domain name.
   */
  username: string

  /**
   * The password for updating the domain name.
   */
  password: string

  /**
   * The IP address to update the domain name with. If omitted, the IP address
   * will be detected.
   */
  address?: string

  /**
   * The URL of the IP address detection service.
   * @default 'https://domains.google.com/checkip'
   */
  detectAddressURL?: string | URL

  /**
   * A list of DNS servers to use.
   * @default ['8.8.8.8', '8.8.4.4']
   */
  dnsServers?: string[]

  /**
   * The IP address family.
   * @default 4
   */
  family?: 4 | 6

  /**
   * Update the IP address of the domain name even if it hasn't changed.
   * @default false
   */
  force?: boolean

  /**
   * The URL of the update service.
   * @default 'https://domains.google.com/nic/update'
   */
  updateURL?: string | URL
}

/**
 * Updates a domain name with a new IP address.
 * @param fqdn The fully qualified domain name to update.
 * @param options
 * @returns A promise that resolves with either the response from the update
 * server or `false` if no update was requested.
 */
export declare function updateFQDN(
  fqdn: string,
  options: UpdateFQDNOptions,
): Promise<string | false>
