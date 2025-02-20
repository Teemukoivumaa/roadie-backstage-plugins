/*
 * Copyright 2022 Larder Software Limited
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

import {
  EntityProvider,
  EntityProviderConnection,
} from '@backstage/plugin-catalog-backend';
import { Logger } from 'winston';
import { AccountConfig } from '../types';
import { Client } from '@okta/okta-sdk-nodejs';

import {
  ANNOTATION_LOCATION,
  ANNOTATION_ORIGIN_LOCATION,
} from '@backstage/catalog-model';

export type OktaScope = 'okta.groups.read' | 'okta.users.read';

export abstract class OktaEntityProvider implements EntityProvider {
  protected readonly accounts: AccountConfig[];
  protected readonly logger: Logger;
  protected connection?: EntityProviderConnection;

  public abstract getProviderName(): string;

  protected constructor(
    accounts: AccountConfig[],
    options: { logger: Logger },
  ) {
    this.accounts = accounts;
    this.logger = options.logger;
  }

  protected getClient(
    orgUrl: string,
    oauthScopes: OktaScope[] | undefined = undefined,
  ): Client {
    const account = this.accounts.find(
      acccountConfig => acccountConfig.orgUrl === orgUrl,
    );
    if (!account) {
      throw new Error(`accountConfig for ${orgUrl} not found`);
    }

    if (account.oauth && oauthScopes) {
      // use OAuth authentication strategy
      const { clientId, privateKey, keyId } = account.oauth;
      return new Client({
        orgUrl,
        authorizationMode: 'PrivateKey',
        clientId,
        scopes: oauthScopes,
        privateKey,
        keyId,
      });
    } else if (account.token) {
      // use api token authentication strategy
      return new Client({
        orgUrl,
        token: account.token,
      });
    }
    throw new Error(
      `accountConfig for ${orgUrl} missing api token or oath key`,
    );
  }

  public async connect(connection: EntityProviderConnection): Promise<void> {
    this.connection = connection;
  }

  protected async buildDefaultAnnotations() {
    return {
      [ANNOTATION_LOCATION]: this.getProviderName(),
      [ANNOTATION_ORIGIN_LOCATION]: this.getProviderName(),
    };
  }
}
