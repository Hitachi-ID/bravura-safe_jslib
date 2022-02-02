import { HashPurpose } from '../enums/hashPurpose';
import { KdfType } from '../enums/kdfType';
import { TwoFactorProviderType } from '../enums/twoFactorProviderType';

import { Account, AccountData, AccountProfile, AccountTokens } from '../models/domain/account';
import { AuthResult } from '../models/domain/authResult';
import { SymmetricCryptoKey } from '../models/domain/symmetricCryptoKey';

import { SetKeyConnectorKeyRequest } from '../models/request/account/setKeyConnectorKeyRequest';
import { DeviceRequest } from '../models/request/deviceRequest';
import { KeyConnectorUserKeyRequest } from '../models/request/keyConnectorUserKeyRequest';
import { KeysRequest } from '../models/request/keysRequest';
import { PreloginRequest } from '../models/request/preloginRequest';
import { TokenRequest } from '../models/request/tokenRequest';

import { IdentityTokenResponse } from '../models/response/identityTokenResponse';
import { IdentityTwoFactorResponse } from '../models/response/identityTwoFactorResponse';

import { ApiService } from '../abstractions/api.service';
import { AppIdService } from '../abstractions/appId.service';
import { AuthService as AuthServiceAbstraction } from '../abstractions/auth.service';
import { CryptoService } from '../abstractions/crypto.service';
import { CryptoFunctionService } from '../abstractions/cryptoFunction.service';
import { EnvironmentService } from '../abstractions/environment.service';
import { I18nService } from '../abstractions/i18n.service';
import { KeyConnectorService } from '../abstractions/keyConnector.service';
import { LogService } from '../abstractions/log.service';
import { MessagingService } from '../abstractions/messaging.service';
import { PlatformUtilsService } from '../abstractions/platformUtils.service';
import { StateService } from '../abstractions/state.service';
import { TokenService } from '../abstractions/token.service';
import { VaultTimeoutService } from '../abstractions/vaultTimeout.service';

import { Utils } from '../misc/utils';

export const TwoFactorProviders = {
    [TwoFactorProviderType.Authenticator]: {
        type: TwoFactorProviderType.Authenticator,
        name: null as string,
        description: null as string,
        priority: 1,
        sort: 1,
        premium: false,
    },
    [TwoFactorProviderType.Email]: {
        type: TwoFactorProviderType.Email,
        name: null as string,
        description: null as string,
        priority: 0,
        sort: 6,
        premium: false,
    },
};

export class AuthService implements AuthServiceAbstraction {
    email: string;
    masterPasswordHash: string;
    localMasterPasswordHash: string;
    code: string;
    codeVerifier: string;
    ssoRedirectUrl: string;
    clientId: string;
    clientSecret: string;
    twoFactorProvidersData: Map<TwoFactorProviderType, { [key: string]: string; }>;
    selectedTwoFactorProviderType: TwoFactorProviderType = null;
    captchaToken: string;

    private key: SymmetricCryptoKey;

    constructor(private cryptoService: CryptoService, protected apiService: ApiService,
        protected tokenService: TokenService, protected appIdService: AppIdService,
        private i18nService: I18nService, protected platformUtilsService: PlatformUtilsService,
        private messagingService: MessagingService, private vaultTimeoutService: VaultTimeoutService,
        private logService: LogService, protected cryptoFunctionService: CryptoFunctionService,
        private keyConnectorService: KeyConnectorService, protected environmentService: EnvironmentService,
        protected stateService: StateService, private setCryptoKeys = true) {
    }

    init() {
        TwoFactorProviders[TwoFactorProviderType.Email].name = this.i18nService.t('emailTitle');
        TwoFactorProviders[TwoFactorProviderType.Email].description = this.i18nService.t('emailDesc');

        TwoFactorProviders[TwoFactorProviderType.Authenticator].name = this.i18nService.t('authenticatorAppTitle');
        TwoFactorProviders[TwoFactorProviderType.Authenticator].description =
            this.i18nService.t('authenticatorAppDesc');

    }

    async logIn(email: string, masterPassword: string, captchaToken?: string): Promise<AuthResult> {
        this.selectedTwoFactorProviderType = null;
        const key = await this.makePreloginKey(masterPassword, email);
        const hashedPassword = await this.cryptoService.hashPassword(masterPassword, key);
        const localHashedPassword = await this.cryptoService.hashPassword(masterPassword, key,
            HashPurpose.LocalAuthorization);
        return await this.logInHelper(email, hashedPassword, localHashedPassword, null, null, null, null, null,
            key, null, null, null, captchaToken, null);
    }

    async logInSso(code: string, codeVerifier: string, redirectUrl: string, orgId: string): Promise<AuthResult> {
        this.selectedTwoFactorProviderType = null;
        return await this.logInHelper(null, null, null, code, codeVerifier, redirectUrl, null, null,
            null, null, null, null, null, orgId);
    }

    async logInApiKey(clientId: string, clientSecret: string): Promise<AuthResult> {
        this.selectedTwoFactorProviderType = null;
        return await this.logInHelper(null, null, null, null, null, null, clientId, clientSecret,
            null, null, null, null, null, null);
    }

    async logInTwoFactor(twoFactorProvider: TwoFactorProviderType, twoFactorToken: string,
        remember?: boolean): Promise<AuthResult> {
        return await this.logInHelper(this.email, this.masterPasswordHash, this.localMasterPasswordHash, this.code,
            this.codeVerifier, this.ssoRedirectUrl, this.clientId, this.clientSecret, this.key, twoFactorProvider,
            twoFactorToken, remember, this.captchaToken, null);
    }

    async logInComplete(email: string, masterPassword: string, twoFactorProvider: TwoFactorProviderType,
        twoFactorToken: string, remember?: boolean, captchaToken?: string): Promise<AuthResult> {
        this.selectedTwoFactorProviderType = null;
        const key = await this.makePreloginKey(masterPassword, email);
        const hashedPassword = await this.cryptoService.hashPassword(masterPassword, key);
        const localHashedPassword = await this.cryptoService.hashPassword(masterPassword, key,
            HashPurpose.LocalAuthorization);
        return await this.logInHelper(email, hashedPassword, localHashedPassword, null, null, null, null, null, key,
            twoFactorProvider, twoFactorToken, remember, captchaToken, null);
    }

    async logInSsoComplete(code: string, codeVerifier: string, redirectUrl: string,
        twoFactorProvider: TwoFactorProviderType, twoFactorToken: string, remember?: boolean): Promise<AuthResult> {
        this.selectedTwoFactorProviderType = null;
        return await this.logInHelper(null, null, null, code, codeVerifier, redirectUrl, null,
            null, null, twoFactorProvider, twoFactorToken, remember, null, null);
    }

    async logInApiKeyComplete(clientId: string, clientSecret: string, twoFactorProvider: TwoFactorProviderType,
        twoFactorToken: string, remember?: boolean): Promise<AuthResult> {
        this.selectedTwoFactorProviderType = null;
        return await this.logInHelper(null, null, null, null, null, null, clientId, clientSecret, null,
            twoFactorProvider, twoFactorToken, remember, null, null);
    }

    logOut(callback: Function) {
        callback();
        this.messagingService.send('loggedOut');
    }

    getSupportedTwoFactorProviders(win: Window): any[] {
        const providers: any[] = [];
        if (this.twoFactorProvidersData == null) {
            return providers;
        }


        if (this.twoFactorProvidersData.has(TwoFactorProviderType.Authenticator)) {
            providers.push(TwoFactorProviders[TwoFactorProviderType.Authenticator]);
        }

        if (this.twoFactorProvidersData.has(TwoFactorProviderType.Email)) {
            providers.push(TwoFactorProviders[TwoFactorProviderType.Email]);
        }

        return providers;
    }

    getDefaultTwoFactorProvider(webAuthnSupported: boolean): TwoFactorProviderType {
        if (this.twoFactorProvidersData == null) {
            return null;
        }

        if (this.selectedTwoFactorProviderType != null &&
            this.twoFactorProvidersData.has(this.selectedTwoFactorProviderType)) {
            return this.selectedTwoFactorProviderType;
        }

        let providerType: TwoFactorProviderType = null;
        let providerPriority = -1;
        this.twoFactorProvidersData.forEach((_value, type) => {
            const provider = (TwoFactorProviders as any)[type];
            if (provider != null && provider.priority > providerPriority) {
                if (type === TwoFactorProviderType.WebAuthn && !webAuthnSupported) {
                    return;
                }

                providerType = type;
                providerPriority = provider.priority;
            }
        });

        return providerType;
    }

    async makePreloginKey(masterPassword: string, email: string): Promise<SymmetricCryptoKey> {
        email = email.trim().toLowerCase();
        let kdf: KdfType = null;
        let kdfIterations: number = null;
        try {
            const preloginResponse = await this.apiService.postPrelogin(new PreloginRequest(email));
            if (preloginResponse != null) {
                kdf = preloginResponse.kdf;
                kdfIterations = preloginResponse.kdfIterations;
            }
        } catch (e) {
            if (e == null || e.statusCode !== 404) {
                throw e;
            }
        }
        return this.cryptoService.makeKey(masterPassword, email, kdf, kdfIterations);
    }

    authingWithApiKey(): boolean {
        return this.clientId != null && this.clientSecret != null;
    }

    authingWithSso(): boolean {
        return this.code != null && this.codeVerifier != null && this.ssoRedirectUrl != null;
    }

    authingWithPassword(): boolean {
        return this.email != null && this.masterPasswordHash != null;
    }

    private async logInHelper(email: string, hashedPassword: string, localHashedPassword: string, code: string,
        codeVerifier: string, redirectUrl: string, clientId: string, clientSecret: string, key: SymmetricCryptoKey,
        twoFactorProvider?: TwoFactorProviderType, twoFactorToken?: string, remember?: boolean, captchaToken?: string,
        orgId?: string): Promise<AuthResult> {
        const storedTwoFactorToken = await this.tokenService.getTwoFactorToken(email);
        const appId = await this.appIdService.getAppId();
        const deviceRequest = new DeviceRequest(appId, this.platformUtilsService);

        let emailPassword: string[] = [];
        let codeCodeVerifier: string[] = [];
        let clientIdClientSecret: [string, string] = [null, null];

        if (email != null && hashedPassword != null) {
            emailPassword = [email, hashedPassword];
        } else {
            emailPassword = null;
        }
        if (code != null && codeVerifier != null && redirectUrl != null) {
            codeCodeVerifier = [code, codeVerifier, redirectUrl];
        } else {
            codeCodeVerifier = null;
        }
        if (clientId != null && clientSecret != null) {
            clientIdClientSecret = [clientId, clientSecret];
        } else {
            clientIdClientSecret = null;
        }

        let request: TokenRequest;
        if (twoFactorToken != null && twoFactorProvider != null) {
            request = new TokenRequest(emailPassword, codeCodeVerifier, clientIdClientSecret, twoFactorProvider,
                twoFactorToken, remember, captchaToken, deviceRequest);
        } else if (storedTwoFactorToken != null) {
            request = new TokenRequest(emailPassword, codeCodeVerifier, clientIdClientSecret,
                TwoFactorProviderType.Remember, storedTwoFactorToken, false, captchaToken, deviceRequest);
        } else {
            request = new TokenRequest(emailPassword, codeCodeVerifier, clientIdClientSecret, null,
                null, false, captchaToken, deviceRequest);
        }

        const response = await this.apiService.postIdentityToken(request);

        this.clearState();
        const result = new AuthResult();
        result.captchaSiteKey = (response as any).siteKey;
        if (!!result.captchaSiteKey) {
            return result;
        }
        result.twoFactor = !!(response as any).twoFactorProviders2;

        if (result.twoFactor) {
            // two factor required
            this.email = email;
            this.masterPasswordHash = hashedPassword;
            this.localMasterPasswordHash = localHashedPassword;
            this.code = code;
            this.codeVerifier = codeVerifier;
            this.ssoRedirectUrl = redirectUrl;
            this.clientId = clientId;
            this.clientSecret = clientSecret;
            this.key = this.setCryptoKeys ? key : null;
            const twoFactorResponse = response as IdentityTwoFactorResponse;
            this.twoFactorProvidersData = twoFactorResponse.twoFactorProviders2;
            result.twoFactorProviders = twoFactorResponse.twoFactorProviders2;
            this.captchaToken = twoFactorResponse.captchaToken;
            return result;
        }

        const tokenResponse = response as IdentityTokenResponse;
        result.resetMasterPassword = tokenResponse.resetMasterPassword;
        result.forcePasswordReset = tokenResponse.forcePasswordReset;

        const accountInformation = await this.tokenService.decodeToken(tokenResponse.accessToken);
        await this.stateService.addAccount({
            profile: {
                ...new AccountProfile(),
                ...{
                    userId: accountInformation.sub,
                    email: accountInformation.email,
                    apiKeyClientId: clientId,
                    apiKeyClientSecret: clientSecret,
                    hasPremiumPersonally: accountInformation.premium,
                    kdfIterations: tokenResponse.kdfIterations,
                    kdfType: tokenResponse.kdf,
                },
            },
            tokens: {
                ...new AccountTokens(),
                ...{
                    accessToken: tokenResponse.accessToken,
                    refreshToken: tokenResponse.refreshToken,
                },
            },
        });

        if (tokenResponse.twoFactorToken != null) {
            await this.tokenService.setTwoFactorToken(tokenResponse.twoFactorToken, email);
        }

        if (this.setCryptoKeys) {
            if (key != null) {
                await this.cryptoService.setKey(key);
            }
            if (localHashedPassword != null) {
                await this.cryptoService.setKeyHash(localHashedPassword);
            }

            // Skip this step during SSO new user flow. No key is returned from server.
            if (code == null || tokenResponse.key != null) {

                if (tokenResponse.keyConnectorUrl != null) {
                    await this.keyConnectorService.getAndSetKey(tokenResponse.keyConnectorUrl);
                } else if (tokenResponse.apiUseKeyConnector) {
                    const keyConnectorUrl = this.environmentService.getKeyConnectorUrl();
                    await this.keyConnectorService.getAndSetKey(keyConnectorUrl);
                }

                await this.cryptoService.setEncKey(tokenResponse.key);

                // User doesn't have a key pair yet (old account), let's generate one for them
                if (tokenResponse.privateKey == null) {
                    try {
                        const keyPair = await this.cryptoService.makeKeyPair();
                        await this.apiService.postAccountKeys(new KeysRequest(keyPair[0], keyPair[1].encryptedString));
                        tokenResponse.privateKey = keyPair[1].encryptedString;
                    } catch (e) {
                        this.logService.error(e);
                    }
                }

                await this.cryptoService.setEncPrivateKey(tokenResponse.privateKey);
            } else if (tokenResponse.keyConnectorUrl != null) {
                const password = await this.cryptoFunctionService.randomBytes(64);

                const k = await this.cryptoService.makeKey(Utils.fromBufferToB64(password), await this.tokenService.getEmail(), tokenResponse.kdf, tokenResponse.kdfIterations);
                const keyConnectorRequest = new KeyConnectorUserKeyRequest(k.encKeyB64);
                await this.cryptoService.setKey(k);

                const encKey = await this.cryptoService.makeEncKey(k);
                await this.cryptoService.setEncKey(encKey[1].encryptedString);

                const [pubKey, privKey] = await this.cryptoService.makeKeyPair();

                try {
                    await this.apiService.postUserKeyToKeyConnector(tokenResponse.keyConnectorUrl, keyConnectorRequest);
                } catch (e) {
                    throw new Error('Unable to reach key connector');
                }

                const keys = new KeysRequest(pubKey, privKey.encryptedString);
                const setPasswordRequest = new SetKeyConnectorKeyRequest(
                    encKey[1].encryptedString, tokenResponse.kdf, tokenResponse.kdfIterations, orgId, keys
                );
                await this.apiService.postSetKeyConnectorKey(setPasswordRequest);
            }
        }

        if (this.vaultTimeoutService != null) {
            await this.stateService.setBiometricLocked(false);
        }
        this.messagingService.send('loggedIn');
        return result;
    }

    private clearState(): void {
        this.key = null;
        this.email = null;
        this.masterPasswordHash = null;
        this.localMasterPasswordHash = null;
        this.code = null;
        this.codeVerifier = null;
        this.ssoRedirectUrl = null;
        this.clientId = null;
        this.clientSecret = null;
        this.twoFactorProvidersData = null;
        this.selectedTwoFactorProviderType = null;
    }
}
