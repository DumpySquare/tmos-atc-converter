/**
 * Copyright 2024 F5, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// test if string is an f5 IP, which means valid IPv4 or IPv6
// with optional %route-domain and/or /mask-length appended.
const IPv4rex = /^(((25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)[.]){3}(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d))(%(6553[0-5]|655[0-2]\d|65[0-4]\d{2}|6[0-4]\d{3}|[1-5]\d{4}|[1-9]\d{3}|[1-9]\d{2}|[1-9]?\d))?(\x2f(3[012]|2\d|1\d|\d))?$/;
const IPv6rex = /^(::(([0-9a-f]{1,4}:){0,5}((([0-9a-f]{1,4}:)?[0-9a-f]{1,4})|(((25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)[.]){3}(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d))))?)|([0-9a-f]{1,4}::(([0-9a-f]{1,4}:){0,4}((([0-9a-f]{1,4}:)?[0-9a-f]{1,4})|(((25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)[.]){3}(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d))))?)|([0-9a-f]{1,4}:[0-9a-f]{1,4}::(([0-9a-f]{1,4}:){0,3}((([0-9a-f]{1,4}:)?[0-9a-f]{1,4})|(((25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)[.]){3}(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d))))?)|([0-9a-f]{1,4}(:[0-9a-f]{1,4}){2}::(([0-9a-f]{1,4}:){0,2}((([0-9a-f]{1,4}:)?[0-9a-f]{1,4})|(((25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)[.]){3}(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d))))?)|([0-9a-f]{1,4}(:[0-9a-f]{1,4}){3}::(([0-9a-f]{1,4}:)?((([0-9a-f]{1,4}:)?[0-9a-f]{1,4})|(((25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)[.]){3}(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d))))?)|([0-9a-f]{1,4}(:[0-9a-f]{1,4}){4}::((([0-9a-f]{1,4}:)?[0-9a-f]{1,4})|(((25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)[.]){3}(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)))?)|([0-9a-f]{1,4}(:[0-9a-f]{1,4}){5}::([0-9a-f]{1,4})?)|([0-9a-f]{1,4}(:[0-9a-f]{1,4}){0,6}::)|(([0-9a-f]{1,4}:){7}[0-9a-f]{1,4})(%(6553[0-5]|655[0-2]\d|65[0-4]\d{2}|6[0-4]\d{3}|[1-5]\d{4}|[1-9]\d{3}|[1-9]\d{2}|[1-9]?\d))?(\x2f(12[0-8]|1[01]\d|[1-9]?\d))?$/;

export interface SplitAddressResult {
    address: string;
    port: string;
}

export interface ParsedIpAddress {
    ip: string;
    routeDomain: string;
    ipWithRoute: string;
    port: string;
}

class IpUtil {
    /**
     * Common functionality for IP address checking
     *
     * @param address - IPv4/6 address as string
     * @param regex - RegExp to use for testing the string
     * @returns boolean
     */
    private static isIPCommon(address: unknown, regex: RegExp): boolean {
        if (!address) return false;
        if (typeof address !== 'string') return false;

        const lowerAddress = address.toLowerCase();
        if (lowerAddress.match(/[^0-9a-f:.%\x2f]/) !== null) return false;

        return regex.test(lowerAddress);
    }

    /**
     * Checks if an address is IPv4
     *
     * @param address - address to check
     * @returns boolean
     */
    static isIPv4(address: unknown): boolean {
        return this.isIPCommon(address, IPv4rex);
    }

    /**
     * Checks if an address is IPv6
     *
     * @param address - address to check
     * @returns boolean
     */
    static isIPv6(address: unknown): boolean {
        return this.isIPCommon(address, IPv6rex);
    }

    /**
     * Splits an IPv4 or IPv6 address into an address and port pair
     *
     * @param combined - address:port pair
     * @returns { address: xx, port: x}
     */
    static splitAddress(combined: string): SplitAddressResult {
        let isAnyV4: boolean | undefined;
        let isAnyV6: boolean | undefined;
        let workingCombined = combined;

        if (workingCombined.startsWith('any6')) {
            isAnyV6 = true;
            workingCombined = workingCombined.replace('any6', '::');
        } else if (workingCombined.startsWith('any')) {
            isAnyV4 = true;
            workingCombined = workingCombined.replace('any', '0.0.0.0');
        }

        // If there is no port, we need something that we can find with the
        // regex below. At this point it doesn't matter that the separator matches
        // the IP type
        if (!(workingCombined.indexOf('.') >= 0 && workingCombined.indexOf(':') >= 0)) {
            if (workingCombined.split(':').length !== 2) {
                workingCombined += ':NO_PORT';
            }
        }

        const portMatch = workingCombined.match(/[.:]?[0-9a-z]+$/);
        let port: string;
        let address: string;
        if (portMatch) {
            port = portMatch[0];
            address = workingCombined.replace(port, '');
        } else {
            address = workingCombined;
            address = address.replace(':NO_PORT', '');
            port = '';
        }

        if (isAnyV4) {
            address = address.replace('0.0.0.0', 'any');
        } else if (isAnyV6) {
            address = address.replace('::', 'any6');
        }

        return { address, port: port ? port.slice(1) : '' };
    }

    /**
     * Returns the CIDR for the given netmask
     *
     * @param netmask - Network mask
     * @param noSlash - Whether or not to prefix a '/' on the CIDR. Default false.
     * @returns CIDR string or number
     */
    static getCidrFromNetmask(netmask: string, noSlash?: boolean): string | number {
        if (netmask === 'any' || netmask === 'any6') {
            return noSlash ? '0' : '/0';
        }
        let cidr = 0;
        let workingNetmask = netmask;

        if (workingNetmask.includes(':')) {
            const converted: number[] = [];
            // convert Ipv6 hex to decimal
            workingNetmask.split(':').forEach((chunk) => {
                const hexInt = parseInt(chunk, 16);
                converted.push(hexInt >> 8); // eslint-disable-line no-bitwise
                converted.push(hexInt & 0xff); // eslint-disable-line no-bitwise
            });

            workingNetmask = converted.join('.');
        }
        const maskNodes = workingNetmask.match(/(\d+)/g);
        if (maskNodes) {
            maskNodes.forEach((m) => {
                // eslint-disable-next-line no-bitwise
                cidr += (((parseInt(m, 10) >>> 0).toString(2)).match(/1/g) ?? []).length;
            });
        }
        return noSlash ? cidr : `/${cidr}`;
    }

    /**
     * Parses an IP address into its components
     *
     * @param address - Address to parse
     * @returns Object containing IP, route domain, CIDR, netmask, IP with route
     */
    static parseIpAddress(address: string | undefined): ParsedIpAddress {
        let workingAddress = address;
        if (workingAddress === 'any') workingAddress = '0.0.0.0';
        if (workingAddress === 'any6') workingAddress = '::';
        if (workingAddress === undefined) workingAddress = '';

        const parsedIp = workingAddress.match(/((\/[\w\D]+){0,3}\/)?([a-zA-Z0-9_.:]+)(%(\d+))?([.:][\da-z]+)?/) ?? [];

        // IPv6 f5 wildcard should be '::' but the above match will give it ':'
        // eslint-disable-next-line no-nested-ternary
        const ip = (typeof parsedIp[3] === 'undefined') ? '' : ((parsedIp[3] === ':') ? '::' : this.splitAddress(parsedIp[3]).address);
        // if parsedIp[4] is '' we want routeDomain set to ''
        const routeDomain = (typeof parsedIp[4] === 'undefined' || parsedIp[4] === '0') ? '' : `%${parsedIp[5]}`;
        const ipWithRoute = `${ip}${routeDomain}`;
        const port = this.splitAddress(workingAddress).port;

        return {
            ip,
            routeDomain,
            ipWithRoute,
            port
        };
    }
}

export default IpUtil;
module.exports = IpUtil;
