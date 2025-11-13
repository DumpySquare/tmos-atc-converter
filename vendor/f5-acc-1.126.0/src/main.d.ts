/**
 * TypeScript declaration file for F5 Automation Config Converter main module.
 * 
 * @fileoverview Type definitions for the main API and configuration options
 * @author F5 Networks
 * @since 1.126.0
 */

/**
 * Configuration options for the main API conversion process.
 */
export interface ConversionConfig {
    /**
     * Enable Declarative Onboarding (DO) conversion mode.
     * When true, converts TMOS system configuration to DO format.
     * When false, converts to AS3 format.
     * @default false
     */
    declarativeOnboarding?: boolean;

    /**
     * Enable AS3 Next mode for enhanced conversion capabilities.
     * Provides additional metadata and improved conversion tracking.
     * @default false
     */
    next?: boolean;

    /**
     * Show extended output with additional metadata and conversion details.
     * @default false
     */
    showExtended?: boolean;

    /**
     * Enable safe mode for conservative conversion approach.
     * May reduce conversion scope but improve reliability.
     * @default false
     */
    safeMode?: boolean;

    /**
     * Disable analytics and telemetry data collection.
     * @default false
     */
    disableAnalytics?: boolean;
}

/**
 * Metadata information about the conversion process.
 */
export interface ConversionMetadata {
    /**
     * Number of TMOS objects successfully converted to AS3/DO format.
     */
    jsonCount: number;

    /**
     * Array of configuration keys that were successfully converted in AS3 Next mode.
     * Only present when `next: true` is specified in config.
     */
    keyNextConverted?: string[];

    /**
     * Array of configuration elements that could not be converted in AS3 Next mode.
     * Only present when `next: true` is specified in config.
     */
    as3NextNotConverted?: string[];

    /**
     * Additional conversion statistics and information.
     */
    [key: string]: any;
}

/**
 * Base AS3/DO declaration structure.
 */
export interface BaseDeclaration {
    /**
     * The class type of the declaration (e.g., 'ADC' for AS3, 'Device' for DO).
     */
    class: string;

    /**
     * Schema version for the declaration format.
     */
    schemaVersion: string;

    /**
     * Unique identifier for the declaration.
     */
    id: string;

    /**
     * Human-readable label for the declaration.
     */
    label: string;

    /**
     * Description or remark about the declaration.
     */
    remark: string;

    /**
     * Additional declaration properties based on AS3/DO schema.
     */
    [key: string]: any;
}

/**
 * AS3-specific declaration structure extending the base declaration.
 */
export interface AS3Declaration extends BaseDeclaration {
    class: 'ADC';
    
    /**
     * Common tenant containing shared AS3 objects.
     */
    Common?: {
        /**
         * Shared application containing converted TMOS objects.
         */
        Shared?: {
            class: 'Application';
            template: string;
            [key: string]: any;
        };
        [key: string]: any;
    };
}

/**
 * DO (Declarative Onboarding) specific declaration structure.
 */
export interface DODeclaration extends BaseDeclaration {
    class: 'Device';
    
    /**
     * Asynchronous processing flag for DO operations.
     */
    async?: boolean;

    /**
     * Common configuration containing system-level settings.
     */
    Common?: {
        class: 'Tenant';
        
        /**
         * System configuration settings.
         */
        System?: {
            class: 'System';
            hostname?: string;
            [key: string]: any;
        };

        /**
         * DNS configuration settings.
         */
        DNS?: {
            class: 'DNS';
            nameServers?: string[];
            search?: string[];
            [key: string]: any;
        };

        /**
         * Module provisioning configuration.
         */
        Provision?: {
            class: 'Provision';
            ltm?: string;
            apm?: string;
            [key: string]: any;
        };

        /**
         * NTP configuration settings.
         */
        NTP?: {
            class: 'NTP';
            timezone?: string;
            servers?: string[];
            [key: string]: any;
        };

        [key: string]: any;
    };
}

/**
 * Result object returned by the main API conversion function.
 */
export interface ConversionResult {
    /**
     * The converted AS3 or DO declaration based on configuration mode.
     */
    declaration: AS3Declaration | DODeclaration;

    /**
     * Metadata about the conversion process including statistics and details.
     */
    metadata: ConversionMetadata;
}

/**
 * Main API function for converting TMOS configuration to AS3 or DO format.
 * 
 * @param tmosConfig - Raw TMOS configuration string to be converted
 * @param config - Configuration options controlling the conversion process
 * @returns Promise that resolves to the conversion result containing declaration and metadata
 * 
 * @example
 * ```typescript
 * import { mainAPI } from './main';
 * 
 * const tmosConfig = `
 * ltm pool /Common/web_pool {
 *     members {
 *         /Common/10.0.0.1:80 {
 *             address 10.0.0.1
 *         }
 *     }
 * }`;
 * 
 * const config = {
 *     declarativeOnboarding: false,
 *     next: true,
 *     disableAnalytics: true
 * };
 * 
 * const result = await mainAPI(tmosConfig, config);
 * console.log(result.declaration);
 * console.log(`Converted ${result.metadata.jsonCount} objects`);
 * ```
 */
export function mainAPI(
    tmosConfig: string,
    config: ConversionConfig
): Promise<ConversionResult>;

/**
 * Default export of the main API function.
 */
export default mainAPI;